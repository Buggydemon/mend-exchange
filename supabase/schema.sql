-- =====================================================================
-- MEND — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`) once per
-- project, then run seed.sql. Safe to re-run: everything is idempotent.
--
-- Model:
--   profiles          one row per auth user (role: buyer | maker | admin)
--   demands           open contracts; seeded rows have owner null
--   makers            verified supplier directory (read-only to clients)
--   finance_programs  guarantee / trade-finance catalog (read-only)
--   bids              supplier offers on demands, freemium-capped
--   watchlist         per-user watched categories (match alerts)
--   activity          public exchange feed, written by triggers
-- =====================================================================

create extension if not exists pgcrypto;

-- ------------------------------- tables --------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       text not null default 'buyer' check (role in ('buyer', 'maker', 'admin')),
  company    text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.demands (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique,                       -- 'd1'.. for seeded rows
  title          text not null,
  buyer          text not null,
  buyer_type     text not null default 'Buyer',
  buyer_verified boolean not null default false,
  owner          uuid references auth.users (id) on delete set null,
  category       text not null,
  qty            integer not null check (qty > 0),
  unit           text not null default 'units',
  spec           text not null default '',
  city           text not null,
  country        text not null,
  region         text not null,
  lat            double precision not null,
  lng            double precision not null,
  deadline       date not null,
  budget         numeric(14,2) not null check (budget >= 0),
  severity       text not null check (severity in ('acute', 'tight', 'healthy')),
  source         text not null default 'Posted on Mend',
  note           text not null default '',
  status         text not null default 'open' check (status in ('open', 'closed', 'withdrawn')),
  bid_count      integer not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.makers (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique,
  name           text not null,
  city           text not null,
  country        text not null,
  region         text not null,
  lat            double precision not null,
  lng            double precision not null,
  categories     text[] not null default '{}',
  certs          text[] not null default '{}',
  capacity       integer not null default 0,
  capacity_unit  text not null default 'units',
  lead_time_days integer not null check (lead_time_days > 0),
  price_index    numeric(4,2) not null default 1.0,
  verified       boolean not null default false,
  export_ready   boolean not null default false,
  refs           integer not null default 0,
  blurb          text not null default ''
);

create table if not exists public.finance_programs (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique,
  name        text not null,
  type        text not null,
  ticket      text not null,
  regions     text[] not null default '{}',
  categories  text[] not null default '{}',
  description text not null default ''
);

create table if not exists public.bids (
  id         uuid primary key default gen_random_uuid(),
  demand_id  uuid not null references public.demands (id) on delete cascade,
  bidder     uuid not null references auth.users (id) on delete cascade,
  price      numeric(14,2) not null check (price > 0),
  days       integer not null check (days between 1 and 730),
  note       text not null default '',
  status     text not null default 'pending' check (status in ('pending', 'withdrawn', 'accepted')),
  created_at timestamptz not null default now()
);

create table if not exists public.watchlist (
  user_id  uuid not null references auth.users (id) on delete cascade,
  category text not null,
  primary key (user_id, category)
);

create table if not exists public.activity (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users (id) on delete set null,
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists bids_demand_idx    on public.bids (demand_id);
create index if not exists bids_bidder_idx    on public.bids (bidder, created_at desc);
create index if not exists demands_status_idx on public.demands (status);
create index if not exists activity_time_idx  on public.activity (created_at desc);

-- ------------------------------- helpers -------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

-- ------------------------------- triggers -------------------------------

-- One profile row per new auth user, carrying the signup metadata.
-- Role is forced to 'buyer': signup metadata is client-controlled, so
-- promoting to maker/admin happens only in the SQL editor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, company)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'buyer',
    coalesce(new.raw_user_meta_data ->> 'company', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Freemium: 3 pending bids per calendar month — withdrawing one frees the
-- slot again, matching the "Withdraw a bid or upgrade" message.
create or replace function public.enforce_bid_limit()
returns trigger
language plpgsql
as $$
declare
  used integer;
begin
  select count(*) into used
  from public.bids
  where bidder = auth.uid()
    and status = 'pending'
    and created_at >= date_trunc('month', now());
  if used >= 3 then
    raise exception 'Free bid limit reached — 3 bids per month. Withdraw a bid or upgrade in the Pro tier.';
  end if;
  return new;
end;
$$;

drop trigger if exists bids_enforce_limit on public.bids;
create trigger bids_enforce_limit
  before insert on public.bids
  for each row execute function public.enforce_bid_limit();

-- Keep demands.bid_count in step with bid inserts and withdrawals, and
-- write the public activity feed. Security definer: bidders may not have
-- UPDATE rights on the demand row itself.
create or replace function public.on_bid_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.demands set bid_count = bid_count + 1 where id = new.demand_id;
    insert into public.activity (user_id, text)
    values (new.bidder,
            'Bid submitted: $' || to_char(new.price, 'FM999,999,999') || ' on ' ||
            coalesce((select title from public.demands where id = new.demand_id), 'a demand'));
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    if new.status = 'withdrawn' then
      update public.demands set bid_count = greatest(bid_count - 1, 0) where id = new.demand_id;
    elsif old.status = 'withdrawn' then
      update public.demands set bid_count = bid_count + 1 where id = new.demand_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bids_on_change on public.bids;
create trigger bids_on_change
  after insert or update of status on public.bids
  for each row execute function public.on_bid_change();

create or replace function public.on_demand_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.activity (user_id, text)
  values (new.owner, 'New demand posted: ' || new.title || ' (' || new.city || ')');
  return new;
end;
$$;

drop trigger if exists demands_on_insert on public.demands;
create trigger demands_on_insert
  after insert on public.demands
  for each row execute function public.on_demand_insert();

-- --------------------------------- RLS ----------------------------------

alter table public.profiles        enable row level security;
alter table public.demands         enable row level security;
alter table public.makers          enable row level security;
alter table public.finance_programs enable row level security;
alter table public.bids            enable row level security;
alter table public.watchlist       enable row level security;
alter table public.activity        enable row level security;

-- profiles: private to their owner (admins see all)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role <> 'admin');

-- demands: open ones are public; owners manage their own listings.
-- User posts always start unverified — verification is Mend's job.
drop policy if exists demands_select on public.demands;
create policy demands_select on public.demands
  for select using (status = 'open' or owner = auth.uid());

drop policy if exists demands_insert on public.demands;
create policy demands_insert on public.demands
  for insert with check (owner = auth.uid() and buyer_verified = false);

drop policy if exists demands_update on public.demands;
create policy demands_update on public.demands
  for update using (owner = auth.uid())
  with check (owner = auth.uid() and buyer_verified = false);

-- makers / finance_programs: public catalog, admin-managed
drop policy if exists makers_select on public.makers;
create policy makers_select on public.makers
  for select using (true);

drop policy if exists makers_admin on public.makers;
create policy makers_admin on public.makers
  for insert with check (public.is_admin());

drop policy if exists makers_admin_upd on public.makers;
create policy makers_admin_upd on public.makers
  for update using (public.is_admin());

drop policy if exists makers_admin_del on public.makers;
create policy makers_admin_del on public.makers
  for delete using (public.is_admin());

drop policy if exists finance_select on public.finance_programs;
create policy finance_select on public.finance_programs
  for select using (true);

drop policy if exists finance_admin on public.finance_programs;
create policy finance_admin on public.finance_programs
  for insert with check (public.is_admin());

drop policy if exists finance_admin_upd on public.finance_programs;
create policy finance_admin_upd on public.finance_programs
  for update using (public.is_admin());

drop policy if exists finance_admin_del on public.finance_programs;
create policy finance_admin_del on public.finance_programs
  for delete using (public.is_admin());

-- bids: bidders see their own; demand owners see what was offered to them.
drop policy if exists bids_select on public.bids;
create policy bids_select on public.bids
  for select using (
    bidder = auth.uid()
    or exists (select 1 from public.demands d where d.id = demand_id and d.owner = auth.uid())
  );

drop policy if exists bids_insert on public.bids;
create policy bids_insert on public.bids
  for insert with check (bidder = auth.uid() and status = 'pending');

drop policy if exists bids_update on public.bids;
create policy bids_update on public.bids
  for update using (bidder = auth.uid()) with check (bidder = auth.uid());

-- watchlist: strictly per-user
drop policy if exists watchlist_select on public.watchlist;
create policy watchlist_select on public.watchlist
  for select using (user_id = auth.uid());

drop policy if exists watchlist_insert on public.watchlist;
create policy watchlist_insert on public.watchlist
  for insert with check (user_id = auth.uid());

drop policy if exists watchlist_delete on public.watchlist;
create policy watchlist_delete on public.watchlist
  for delete using (user_id = auth.uid());

-- activity: public exchange feed; signed-in users may contribute
drop policy if exists activity_select on public.activity;
create policy activity_select on public.activity
  for select using (true);

drop policy if exists activity_insert on public.activity;
create policy activity_insert on public.activity
  for insert with check (user_id = auth.uid());

-- -------------------------------- grants --------------------------------

grant select on public.demands, public.makers, public.finance_programs, public.activity
  to anon, authenticated;
grant select, insert, update on public.bids to authenticated;
grant select, insert, update, delete on public.demands to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.watchlist to authenticated;
grant insert on public.activity to authenticated;
