/* =====================================================================
   MEND — core: state, persistence, formatting, filters
   localStorage is wrapped in try/catch so the prototype keeps working
   (in memory) in private mode or when storage is full.
   ===================================================================== */
window.Mend = window.Mend || {};

(function () {
  "use strict";

  const D = Mend.data;
  const KEYS = {
    bids: "mend.v2.bids",
    posted: "mend.v2.posted",
    activity: "mend.v2.activity",
    watch: "mend.v2.watch",
    proposed: "mend.v2.symbiosis",
    theme: "mend.v2.theme",
  };
  const FREE_BIDS_PER_MONTH = 3;
  const PIPELINE_RATE = 0.02;

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* memory only */ }
    },
    raw(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    rawSet(key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* memory only */ }
    },
  };

  const state = {
    filters: { q: "", category: "all", region: "all", severity: "all", verified: false },
    sort: "severity",
    dir: { cert: "all", country: "all", lead: 120, sort: "name" },
    selected: null,
    bids: [],
    posted: [],
    activity: [],
    watch: [],
    proposed: [],
    theme: "light",
  };

  /* ------------------------------ helpers ------------------------------ */
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ESC[c]);
  }

  function usd(n) {
    if (!Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1e9) return "$" + trimZero((n / 1e9).toFixed(1)) + "B";
    if (abs >= 1e6) {
      const v = n / 1e6;
      return "$" + trimZero((v >= 10 ? v.toFixed(1) : v.toFixed(2))) + "M";
    }
    if (abs >= 1e3) return "$" + Math.round(n / 1e3) + "k";
    return "$" + Math.round(n);
  }
  function trimZero(s) { return s.replace(/\.?0+$/, ""); }

  const usdFullFmt = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  });
  function usdFull(n) { return usdFullFmt.format(n); }

  const intFmt = new Intl.NumberFormat("en-US");
  function num(n) { return intFmt.format(n); }

  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  }

  function daysLeft(iso) {
    const end = new Date(iso + "T23:59:59").getTime();
    return Math.ceil((end - Date.now()) / 864e5);
  }

  function deadlineLabel(iso) {
    const n = daysLeft(iso);
    return n < 0 ? "closed" : n === 0 ? "today" : n + "d left";
  }

  function ago(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 45) return "just now";
    const m = Math.round(s / 60);
    if (m < 60) return m + "m ago";
    const h = Math.round(m / 60);
    if (h < 24) return h + "h ago";
    return Math.round(h / 24) + "d ago";
  }

  function catById(id) {
    return D.CATEGORIES.find((c) => c.id === id) || { id, name: id, code: "—", unit: "units" };
  }
  function regionShort(region) {
    const r = D.REGIONS.find((x) => x.id === region);
    return r ? r.short : String(region || "—").toUpperCase();
  }
  function sevMeta(sev) {
    return D.SEVERITY[sev] || { label: sev, long: sev, rank: 9 };
  }
  function median(list) {
    if (!list.length) return 0;
    const s = list.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }
  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  const clockFmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lagos",
  });
  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos",
  });
  function clockNow() {
    return {
      time: clockFmt.format(new Date()),
      date: dateFmt.format(new Date()).toUpperCase().replace(",", ""),
    };
  }

  /* ------------------------------ data access -------------------------- */
  function allDemands() {
    return state.posted.concat(D.DEMANDS);
  }
  function demandById(id) {
    return allDemands().find((d) => d.id === id) || null;
  }
  function makerById(id) {
    return D.MANUFACTURERS.find((m) => m.id === id) || null;
  }
  function activeBidFor(demandId) {
    return state.bids.find((b) => b.demandId === demandId && b.status === "pending") || null;
  }
  function bidsThisMonth() {
    const now = new Date();
    return state.bids.filter((b) => {
      if (b.status !== "pending") return false;
      const d = new Date(b.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }
  function stats() {
    const demands = allDemands();
    const verified = D.MANUFACTURERS.filter((m) => m.verified);
    return {
      count: demands.length,
      total: demands.reduce((s, d) => s + d.budget, 0),
      acute: demands.filter((d) => d.severity === "acute").length,
      makers: verified.length,
      makersTotal: D.MANUFACTURERS.length,
      regions: new Set(demands.map((d) => d.region)).size,
      medianLead: median(verified.map((m) => m.leadTimeDays)),
    };
  }

  /* ------------------------------- filters ----------------------------- */
  function sortDemands(list) {
    const out = list.slice();
    if (state.sort === "value") return out.sort((a, b) => b.budget - a.budget);
    if (state.sort === "deadline") return out.sort((a, b) => a.deadline.localeCompare(b.deadline));
    return out.sort((a, b) => {
      const r = sevMeta(a.severity).rank - sevMeta(b.severity).rank;
      return r !== 0 ? r : b.budget - a.budget;
    });
  }

  function demandList() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase();
    const list = allDemands().filter((d) => {
      if (f.category !== "all" && d.category !== f.category) return false;
      if (f.region !== "all" && d.region !== f.region) return false;
      if (f.severity !== "all" && d.severity !== f.severity) return false;
      if (f.verified && !d.buyerVerified) return false;
      if (q) {
        const hay = [d.title, d.buyer, d.city, d.country, d.spec, d.source, catById(d.category).name]
          .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortDemands(list);
  }

  function makerList() {
    const f = state.filters;
    const dir = state.dir;
    const q = f.q.trim().toLowerCase();
    const list = D.MANUFACTURERS.filter((m) => {
      if (f.category !== "all" && !m.categories.includes(f.category)) return false;
      if (f.region !== "all" && m.region !== f.region) return false;
      if (dir.cert !== "all" && !m.certs.includes(dir.cert)) return false;
      if (dir.country !== "all" && m.country !== dir.country) return false;
      if (m.leadTimeDays > dir.lead) return false;
      if (q) {
        const hay = [m.name, m.city, m.country, m.blurb, m.certs.join(" "),
          m.categories.map((c) => catById(c).name).join(" ")].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (dir.sort === "lead") return list.sort((a, b) => a.leadTimeDays - b.leadTimeDays);
    if (dir.sort === "capacity") return list.sort((a, b) => b.capacity - a.capacity);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Does a financing program cover the active category/region filter? */
  function programFit(p) {
    const f = state.filters;
    const active = f.category !== "all" || f.region !== "all";
    const cat = p.categories.includes("all") || f.category === "all" || p.categories.includes(f.category);
    const region = p.regions.includes("Global") || f.region === "all" || p.regions.includes(f.region);
    return { active, cat, region, fit: active && cat && region };
  }

  /* ----------------------------- persistence --------------------------- */
  function seedActivity() {
    return D.SEED_ACTIVITY.map((a) => ({ ts: Date.now() - a.mins * 60000, text: a.text }));
  }

  function load() {
    const bids = store.get(KEYS.bids, []);
    const posted = store.get(KEYS.posted, []);
    const activity = store.get(KEYS.activity, null);
    const watch = store.get(KEYS.watch, null);
    const proposed = store.get(KEYS.proposed, []);

    state.bids = Array.isArray(bids) ? bids : [];
    state.posted = Array.isArray(posted) ? posted : [];
    state.activity = Array.isArray(activity) && activity.length ? activity : seedActivity();
    state.watch = Array.isArray(watch) ? watch : ["transformers", "nutrition"];
    state.proposed = Array.isArray(proposed) ? proposed : [];
    state.theme = document.documentElement.dataset.theme || store.raw(KEYS.theme) || "light";
  }

  function save(key) {
    if (key === "bids") store.set(KEYS.bids, state.bids);
    if (key === "posted") store.set(KEYS.posted, state.posted);
    if (key === "activity") store.set(KEYS.activity, state.activity.slice(0, 60));
    if (key === "watch") store.set(KEYS.watch, state.watch);
    if (key === "proposed") store.set(KEYS.proposed, state.proposed);
  }

  function logActivity(text) {
    state.activity.unshift({ ts: Date.now(), text });
    state.activity = state.activity.slice(0, 60);
    save("activity");
  }

  function toast(message, kind) {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind === "ok" ? " is-ok" : "");
    el.innerHTML =
      '<svg class="ic" aria-hidden="true"><use href="#i-' + (kind === "ok" ? "check" : "alert") + '"/></svg>' +
      "<span>" + esc(message) + "</span>";
    root.appendChild(el);
    while (root.children.length > 3) root.removeChild(root.firstElementChild);
    setTimeout(() => {
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 240);
    }, 3600);
  }

  load();

  Object.assign(Mend, {
    KEYS, FREE_BIDS_PER_MONTH, PIPELINE_RATE,
    store, state, load, save, logActivity, toast,
    esc, usd, usdFull, num, fmtDate, daysLeft, deadlineLabel, ago,
    catById, regionShort, sevMeta, median, uid, clockNow,
    allDemands, demandById, makerById, activeBidFor, bidsThisMonth, stats,
    demandList, makerList, programFit, seedActivity,
  });
})();
