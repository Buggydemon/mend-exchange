/* =====================================================================
   MEND — backend client (Supabase)
   supabase-js is loaded from the CDN only when js/config.js points at a
   project. Rows are mapped onto the shapes the renderers already use, so
   app.js treats remote data and mock data identically. Without config the
   module never touches the network and the site stays in demo mode.
   ===================================================================== */
window.Mend = window.Mend || {};

(function () {
  "use strict";

  const CFG = Mend.config || {};
  const URL_ = (CFG.supabaseUrl || "").trim();
  const KEY = (CFG.supabaseAnonKey || "").trim();
  const LIB = "https://unpkg.com/@supabase/supabase-js@2.118.0/dist/umd/supabase.js";
  const LIB_INTEGRITY =
    "sha384-TcHRA3zBbn+Lexh5n+Oil4guNPOS3rjNDpGRAN46u/s/mB2IZ50ceC6TYDU2yvgK";

  /* Column list deliberately excludes demands.owner so one user cannot
     enumerate another's account id; "own" rows come from a second query. */
  const DEMAND_COLS =
    "id,slug,title,buyer,buyer_type,buyer_verified,category,qty,unit,spec," +
    "city,country,region,lat,lng,deadline,budget,severity,source,note,status,bid_count,created_at";

  let client = null;
  let forced = false;      // a test client was injected via _setClient
  let listener = null;
  let sessionUser = null;
  let idByRowId = {};      // demand uuid -> client-facing id (slug or uuid)

  function notConfigured() {
    return { message: "The Mend backend is not configured." };
  }

  function configured() {
    return forced || Boolean(client);
  }

  function session() {
    return sessionUser ? { id: sessionUser.id, email: sessionUser.email } : null;
  }

  function notify() {
    if (!listener) return;
    try { listener(session()); } catch (e) { /* listener owns its errors */ }
  }

  function setUser(u, force) {
    const prev = sessionUser;
    sessionUser = u || null;
    const changed = (!prev) !== (!sessionUser) ||
      (prev && sessionUser && prev.id !== sessionUser.id);
    if (changed || force) notify();
  }

  function loadLibrary() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = LIB;
      s.integrity = LIB_INTEGRITY;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load the Supabase client."));
      document.head.appendChild(s);
    });
  }

  async function init(onSession) {
    // A no-argument re-init (e.g. after _setClient in tests) keeps the
    // listener the app registered at boot.
    if (onSession || !listener) listener = onSession || null;
    if (forced && client) {
      const { data } = await client.auth.getSession();
      setUser(data && data.session ? data.session.user : null, true);
      if (client.auth.onAuthStateChange) {
        client.auth.onAuthStateChange((evt, s) => setUser(s ? s.user : null));
      }
      return true;
    }
    if (!URL_ || !KEY) { notify(); return false; }
    try {
      await loadLibrary();
      client = window.supabase.createClient(URL_, KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      const { data } = await client.auth.getSession();
      setUser(data && data.session ? data.session.user : null, true);
      client.auth.onAuthStateChange((evt, s) => setUser(s ? s.user : null));
      return true;
    } catch (e) {
      client = null;
      notify();
      return false;
    }
  }

  /* ------------------------------ auth --------------------------------- */

  async function signIn(email, password) {
    if (!client) throw notConfigured();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return true;
  }

  async function signUp(email, password, meta) {
    if (!client) throw notConfigured();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: (meta && meta.fullName) || "", company: (meta && meta.company) || "" } },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session && !!data.user };
  }

  async function signOut() {
    if (!client) throw notConfigured();
    await client.auth.signOut();
  }

  /* ----------------------------- mapping ------------------------------- */

  function demandRow(r, mine) {
    return {
      id: r.slug || r.id,
      rowId: r.id,
      title: r.title,
      buyer: r.buyer,
      buyerType: r.buyer_type,
      buyerVerified: r.buyer_verified,
      category: r.category,
      qty: r.qty,
      unit: r.unit,
      spec: r.spec,
      city: r.city,
      country: r.country,
      region: r.region,
      lat: Number(r.lat),
      lng: Number(r.lng),
      deadline: String(r.deadline).slice(0, 10),
      budget: Number(r.budget),
      severity: r.severity,
      source: r.source,
      bids: r.bid_count || 0,
      note: r.note || "",
      mine: !!mine,
    };
  }

  function makerRow(r) {
    return {
      id: r.slug || r.id,
      name: r.name,
      city: r.city,
      country: r.country,
      region: r.region,
      lat: Number(r.lat),
      lng: Number(r.lng),
      categories: r.categories || [],
      certs: r.certs || [],
      capacity: r.capacity,
      capacityUnit: r.capacity_unit,
      leadTimeDays: r.lead_time_days,
      priceIndex: Number(r.price_index),
      verified: r.verified,
      exportReady: r.export_ready,
      refs: r.refs,
      blurb: r.blurb || "",
    };
  }

  function financeRow(r) {
    return {
      id: r.slug || r.id,
      name: r.name,
      type: r.type,
      ticket: r.ticket,
      regions: r.regions || [],
      categories: r.categories || [],
      desc: r.description || "",
    };
  }

  function bidRow(r) {
    return {
      id: r.id,
      demandId: idByRowId[r.demand_id] || r.demand_id,
      price: Number(r.price),
      days: r.days,
      note: r.note || "",
      status: r.status,
      createdAt: Date.parse(r.created_at) || Date.now(),
    };
  }

  function activityRow(r) {
    return { ts: Date.parse(r.created_at) || Date.now(), text: r.text };
  }

  function replace(list, rows) {
    list.length = 0;
    Array.prototype.push.apply(list, rows);
    return list;
  }

  /* ------------------------------ reads -------------------------------- */

  async function loadCatalog() {
    if (!client) return false;
    try {
      const requests = [
        client.from("demands").select(DEMAND_COLS).eq("status", "open"),
        client.from("makers").select("*"),
        client.from("finance_programs").select("*"),
      ];
      if (sessionUser) {
        requests.push(client.from("demands").select(DEMAND_COLS).eq("owner", sessionUser.id));
      }
      const [openRes, makerRes, financeRes, ownRes] = await Promise.all(requests);
      if (openRes.error) throw openRes.error;
      if (makerRes.error) throw makerRes.error;
      if (financeRes.error) throw financeRes.error;
      if (ownRes && ownRes.error) throw ownRes.error;

      idByRowId = {};
      const ownById = {};
      (ownRes && ownRes.data ? ownRes.data : []).forEach((r) => { ownById[r.id] = r; });

      const rows = (openRes.data || []).slice();
      Object.keys(ownById).forEach((rid) => {
        if (!rows.some((r) => r.id === rid)) rows.push(ownById[rid]);
      });

      const demands = rows.map((r) => {
        const c = demandRow(r, !!ownById[r.id]);
        idByRowId[r.id] = c.id;
        return c;
      });

      replace(Mend.data.DEMANDS, demands);
      replace(Mend.data.MANUFACTURERS, (makerRes.data || []).map(makerRow));
      replace(Mend.data.FINANCING, (financeRes.data || []).map(financeRow));
      return true;
    } catch (e) {
      return false;
    }
  }

  async function loadUserData() {
    if (!client) return null;
    try {
      if (!sessionUser) {
        const a = await fetchActivity();
        return { bids: [], watch: [], activity: a || [] };
      }
      const [bidsRes, watchRes, activity] = await Promise.all([
        client.from("bids").select("*").eq("bidder", sessionUser.id)
          .order("created_at", { ascending: false }),
        client.from("watchlist").select("category").eq("user_id", sessionUser.id),
        fetchActivity(),
      ]);
      if (bidsRes.error) throw bidsRes.error;
      if (watchRes.error) throw watchRes.error;
      return {
        bids: (bidsRes.data || []).map(bidRow),
        watch: (watchRes.data || []).map((r) => r.category),
        activity: activity || [],
      };
    } catch (e) {
      return null;
    }
  }

  async function fetchActivity() {
    if (!client) return null;
    try {
      const { data, error } = await client.from("activity").select("*")
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []).map(activityRow);
    } catch (e) {
      return null;
    }
  }

  /* ------------------------------ writes ------------------------------- */

  async function createBid(payload) {
    if (!client) throw notConfigured();
    if (!sessionUser) throw { message: "Sign in to bid." };
    const { data, error } = await client.from("bids").insert({
      demand_id: payload.demandId,
      bidder: sessionUser.id,
      price: payload.price,
      days: payload.days,
      note: payload.note || "",
    }).select("*").single();
    if (error) throw error;
    return bidRow(data);
  }

  async function withdrawBid(bidId) {
    if (!client) throw notConfigured();
    if (!sessionUser) throw { message: "Sign in first." };
    const { data, error } = await client.from("bids")
      .update({ status: "withdrawn" }).eq("id", bidId).select("*").single();
    if (error) throw error;
    return bidRow(data);
  }

  async function createDemand(payload) {
    if (!client) throw notConfigured();
    if (!sessionUser) throw { message: "Sign in to publish a demand." };
    const buyer = payload.buyer && payload.buyer !== "Your organisation"
      ? payload.buyer
      : sessionUser.email;
    const { data, error } = await client.from("demands").insert({
      title: payload.title,
      buyer,
      buyer_type: payload.buyerType || "Buyer",
      owner: sessionUser.id,
      category: payload.category,
      qty: payload.qty,
      unit: payload.unit || "units",
      spec: payload.spec || "",
      city: payload.city,
      country: payload.country,
      region: payload.region,
      lat: payload.lat,
      lng: payload.lng,
      deadline: payload.deadline,
      budget: payload.budget,
      severity: payload.severity || "tight",
      source: payload.source || "Posted on Mend",
      note: payload.note || "",
    }).select(DEMAND_COLS).single();
    if (error) throw error;
    const row = demandRow(data, true);
    idByRowId[data.id] = row.id;
    return row;
  }

  async function setWatch(category, on) {
    if (!client) throw notConfigured();
    if (!sessionUser) throw { message: "Sign in to save alerts." };
    if (on) {
      const { error } = await client.from("watchlist")
        .insert({ user_id: sessionUser.id, category });
      // A duplicate toggle is fine — the row already exists.
      if (error && !/duplicate key|unique/i.test(error.message)) throw error;
      return true;
    }
    const { error } = await client.from("watchlist")
      .delete().eq("user_id", sessionUser.id).eq("category", category);
    if (error) throw error;
    return true;
  }

  /* --------------------------- test support ----------------------------- */

  /* Replaces the real client so wiring can be exercised end to end
     without a project. Not used in production flows. */
  function _setClient(fake) {
    client = fake;
    forced = true;
    idByRowId = {};
  }

  Object.assign(Mend, {
    db: {
      configured, init, session, signIn, signUp, signOut,
      loadCatalog, loadUserData, fetchActivity,
      createBid, withdrawBid, createDemand, setWatch,
      _setClient,
    },
  });
})();
