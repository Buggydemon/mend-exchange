# Mend — Supply-Gap Exchange

A working front-end prototype of a verified B2B exchange where unfilled demand for critical goods meets manufacturers in underserved regions, with financing attached to close the gap.

**Live:** https://buggydemon.github.io/mend-exchange/

Out of the box this runs in **demo mode**: every figure, buyer, and maker is illustrative mock data, and bids, posted demands, and watchlists live in the browser's `localStorage`. Point `js/config.js` at a Supabase project and the same front end becomes a **live exchange** — sign-in, cloud-stored bids and listings, and a shared activity feed. See [Connect the backend](#connect-the-backend-supabase) below.

## What's inside

- **Gap radar** — Leaflet map of open demand, sized by contract value and coloured by shortage severity, with certified maker pins.
- **Demand board** — filterable, sortable table of 12 contracts; search and category/region filters are shared with the map.
- **Bids** — place, save, and withdraw bids (free tier capped at 3 active bids per month), with validation and escrow guidance.
- **Maker directory** — 10 manufacturers with verification state, categories, lead times, and scale.
- **Finance hub** — guarantee and trade-finance programs matched to category and region.
- **Your desk** — KPIs, watchlist alerts, activity log, and a post-demand form.
- **Accounts (when configured)** — email sign-in and sign-up; bids, listings, and watchlists sync to the account.
- **Light/dark themes** — "ops terminal" paper-and-ink by default, night-shift palette on toggle, applied pre-paint to avoid a flash.

## Stack

Plain HTML, CSS, and JavaScript. No build step, no framework, no bundler.

- [Leaflet 1.9.4](https://leafletjs.com/) (pinned with SRI) with keyless Esri Canvas basemaps
- IBM Plex Sans/Mono from Google Fonts
- Hand-written design tokens and inline SVG icon sprite
- Classic scripts attached to `window.Mend`, so the site also runs from `file://`
- [Supabase](https://supabase.com/) (Postgres + Auth + row-level security) when configured — otherwise fully offline demo mode

## Structure

```
index.html            Semantic page shell, inline theme bootstrap, SVG sprite
assets/app.css        Design tokens, layout, components, responsive rules
js/config.js          Backend URL and anon key (empty = demo mode)
js/data.js            Mock demands, makers, finance programs, categories
js/core.js            State, storage, formatting, shared helpers
js/db.js              Supabase client: auth, catalog loads, remote writes
js/map.js             Leaflet setup, markers, theme switching, fit/focus
js/render.js          Table, chart, alert, and finance rendering
js/app.js             Init, events, drawer, modals, filters, theme, bids
supabase/schema.sql   Tables, RLS policies, triggers, bid-limit rule
supabase/seed.sql     The illustrative catalog as starter rows
```

## Run locally

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8080
```

Then visit http://localhost:8080. The map and fonts need network access.

## Connect the backend (Supabase)

The site stays in demo mode until `js/config.js` points at a project. To go live:

1. **Create a project** at [supabase.com](https://supabase.com) (the free tier is enough).
2. **Run the SQL.** In the project's *SQL Editor*, run `supabase/schema.sql` first, then `supabase/seed.sql`. The schema creates the tables, row-level-security policies, the bid-limit trigger, and the activity feed; the seed loads the illustrative catalog.
3. **Paste the keys.** Copy the *Project URL* and the *anon public* key from *Settings → API* into `js/config.js`:

   ```js
   Mend.config = {
     supabaseUrl: "https://your-project.supabase.co",
     supabaseAnonKey: "eyJ…",
   };
   ```

The anon key is public by design — every table is gated by row-level security, so anonymous visitors can read open demands but only see and change their own bids, listings, and watchlist. Never put the *service_role* key in the front end.

Once configured: sign-up creates a buyer account, the freemium limit (3 active bids per month) is enforced by a database trigger, and posted demands appear for everyone. Clear the config values and the site falls back to demo mode with no code changes.

## Deploy

The repository is published with GitHub Pages from the `master` branch root. Push to `master` and Pages rebuilds automatically; `.nojekyll` keeps files served as-is.
