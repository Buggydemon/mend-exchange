/* =====================================================================
   MEND — renderers
   Every string that comes from data or storage passes through Mend.esc.
   Section renderers are independent so a single action can repaint only
   what changed (e.g. a bid does not rebuild the map).
   ===================================================================== */
window.Mend = window.Mend || {};

(function () {
  "use strict";

  const D = Mend.data;
  const $ = (id) => document.getElementById(id);
  const icon = (name, cls) =>
    '<svg class="ic' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';

  /* ------------------------------- ticker ------------------------------ */
  function renderTicker() {
    const s = Mend.stats();
    const c = Mend.clockNow();
    $("tick-open").textContent = Mend.usd(s.total);
    $("tick-acute").textContent = String(s.acute).padStart(2, "0");
    $("tick-makers").textContent = s.makers + "/" + s.makersTotal;
    $("tick-regions").textContent = s.regions;
    $("tick-lead").textContent = s.medianLead + " d";
    $("today").textContent = c.date;

    $("book-open").textContent = Mend.usd(s.total);
    $("book-count").textContent = s.count;
    $("book-makers").textContent = s.makers + " / " + s.makersTotal;
    $("book-lead").textContent = s.medianLead + " d";
    $("book-note").textContent = "Illustrative data · " + c.time + " WAT";

    const year = $("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ------------------------------- radar rail -------------------------- */
  function renderRadar() {
    const list = Mend.demandList();
    $("radar-count").textContent = String(list.length).padStart(2, "0");
    const rail = $("hotspot-list");
    if (!list.length) {
      rail.innerHTML = '<p class="rail-empty">No gaps match these filters.</p>';
      return;
    }
    rail.innerHTML = list.map((d) => {
      const sev = Mend.sevMeta(d.severity);
      return (
        '<button class="rail-item' + (Mend.state.selected === d.id ? " is-on" : "") + '" ' +
        'data-act="open-demand" data-id="' + Mend.esc(d.id) + '">' +
          '<span class="rail-top">' +
            '<span class="rail-title">' + Mend.esc(d.title) + "</span>" +
            '<span class="rail-value">' + Mend.usd(d.budget) + "</span>" +
          "</span>" +
          '<span class="rail-meta">' +
            '<i class="dot sev-' + d.severity + '"></i>' + Mend.esc(sev.label) +
            '<span class="sep">/</span>' + Mend.esc(d.city) +
            '<span class="sep">/</span>' + Math.max(0, Mend.daysLeft(d.deadline)) + "d" +
          "</span>" +
        "</button>"
      );
    }).join("");
  }

  /* ------------------------------- demands ----------------------------- */
  function demandRow(d) {
    const sev = Mend.sevMeta(d.severity);
    const bid = Mend.activeBidFor(d.id);
    const urgent = Mend.daysLeft(d.deadline) <= 30;
    const action = d.mine
      ? '<span class="cell-dim">—</span>'
      : bid
        ? '<span class="row-bid is-sent">' + icon("check") + "Sent</span>"
        : '<button class="row-bid" data-act="bid" data-id="' + Mend.esc(d.id) + '" ' +
          'aria-label="Place a bid on ' + Mend.esc(d.title) + '">Bid ' + icon("arrow-right") + "</button>";

    return (
      '<tr data-demand="' + Mend.esc(d.id) + '">' +
        '<td data-label="Demand">' +
          '<button class="linkish cell-title" data-act="open-demand" data-id="' + Mend.esc(d.id) + '">' +
            Mend.esc(d.title) + "</button>" +
          '<span class="cell-sub">' + Mend.esc(d.spec) + "</span>" +
          (d.mine ? '<span class="tag tag-mine">Your listing</span>' : "") +
        "</td>" +
        '<td data-label="Buyer"><span>' + Mend.esc(d.buyer) + "</span>" +
          '<span class="cell-sub">' + Mend.esc(d.buyerType) +
          (d.buyerVerified ? " · verified" : " · pending") + "</span></td>" +
        '<td data-label="Location"><span>' + Mend.esc(d.city) + "</span>" +
          '<span class="cell-sub">' + Mend.esc(d.country) + "</span></td>" +
        '<td data-label="Value" class="r">' +
          '<span class="cell-money" title="' + Mend.esc(Mend.usdFull(d.budget)) + '">' + Mend.usd(d.budget) + "</span>" +
          '<span class="cell-sub">' + Mend.num(d.qty) + " " + Mend.esc(d.unit) + "</span></td>" +
        '<td data-label="Closes"><span class="cell-mono">' + Mend.fmtDate(d.deadline) + "</span>" +
          '<span class="cell-sub' + (urgent ? " cell-urgent" : "") + '">' + Mend.deadlineLabel(d.deadline) + "</span></td>" +
        '<td data-label="Gap"><span class="sev sev-' + d.severity + '"><i class="dot"></i>' + Mend.esc(sev.label) + "</span>" +
          '<span class="cell-sub">' + d.bids + " bid" + (d.bids === 1 ? "" : "s") + "</span></td>" +
        '<td data-label="" class="r">' + action + "</td>" +
      "</tr>"
    );
  }

  function renderDemands() {
    const list = Mend.demandList();
    $("demand-count").textContent = list.length;
    $("demand-body").innerHTML = list.map(demandRow).join("");
    const empty = list.length === 0;
    $("demand-empty").hidden = !empty;
    const wrap = $("demand-body").closest(".table-scroll");
    if (wrap) wrap.hidden = empty;
  }

  /* -------------------------------- bids ------------------------------- */
  function renderBids() {
    const bids = Mend.state.bids.slice().sort((a, b) => b.createdAt - a.createdAt);
    const body = $("bids-body");
    const empty = bids.length === 0;
    $("bids-count").textContent = bids.length;
    $("bids-empty").hidden = !empty;
    const wrap = body.closest(".table-scroll");
    if (wrap) wrap.hidden = empty;

    const used = Mend.bidsThisMonth();
    $("bids-note").textContent =
      used + " of " + Mend.FREE_BIDS_PER_MONTH + " free bids used this month" +
      (used >= Mend.FREE_BIDS_PER_MONTH ? " · limit reached" : "");

    body.innerHTML = bids.map((b) => {
      const d = Mend.demandById(b.demandId);
      const pct = d ? ((b.price - d.budget) / d.budget) * 100 : null;
      const deltaClass = pct == null ? "" : pct < 0 ? "pos" : pct > 0 ? "neg" : "";
      const deltaText = pct == null ? "—"
        : Math.abs(pct) < 0.05 ? "at budget"
        : Math.abs(pct).toFixed(1) + "% " + (pct < 0 ? "under" : "over");
      const out = b.status === "withdrawn";
      const statusTag = out
        ? '<span class="tag tag-out">Withdrawn</span>'
        : '<span class="tag tag-pending">Pending</span>';
      return (
        '<tr class="' + (out ? "is-out" : "") + '">' +
          '<td data-label="Demand">' +
            (d
              ? '<button class="linkish cell-title" data-act="open-demand" data-id="' + Mend.esc(d.id) + '">' +
                Mend.esc(d.title) + "</button>"
              : '<span class="cell-title">Demand no longer listed</span>') +
            '<span class="cell-sub">' + Mend.esc(d ? d.buyer : "—") + " · " + Mend.esc(d ? d.city : "") + "</span>" +
          "</td>" +
          '<td data-label="Your price" class="r"><span class="cell-money">' + Mend.usdFull(b.price) + "</span></td>" +
          '<td data-label="vs budget" class="r"><span class="cell-mono ' + deltaClass + '">' + deltaText + "</span></td>" +
          '<td data-label="Delivery" class="r"><span class="cell-mono">' + b.days + " d</span></td>" +
          '<td data-label="Status">' + statusTag + "</td>" +
          '<td data-label="" class="r">' +
            (out ? '<span class="cell-dim">—</span>'
              : '<button class="row-bid" data-act="withdraw" data-id="' + Mend.esc(b.id) + '">Withdraw</button>') +
          "</td>" +
        "</tr>"
      );
    }).join("");
  }

  /* -------------------------------- makers ----------------------------- */
  function renderMakers() {
    const list = Mend.makerList();
    const body = $("maker-body");
    $("maker-count").textContent = list.length;
    const empty = list.length === 0;
    $("maker-empty").hidden = !empty;
    const wrap = body.closest(".table-scroll");
    if (wrap) wrap.hidden = empty;

    body.innerHTML = list.map((m) => {
      const certs = m.certs.slice(0, 2)
        .map((c) => '<span class="tag">' + Mend.esc(c) + "</span>").join("");
      const more = m.certs.length > 2
        ? '<span class="cert-more">+' + (m.certs.length - 2) + "</span>" : "";
      return (
        '<tr class="' + (m.verified ? "" : "is-unverified") + '">' +
          '<td data-label="Maker"><span class="cell-title">' + Mend.esc(m.name) + "</span>" +
            '<span class="cell-sub clamp2">' + Mend.esc(m.blurb) + "</span></td>" +
          '<td data-label="Location"><span>' + Mend.esc(m.city) + "</span>" +
            '<span class="cell-sub">' + Mend.esc(m.country) + "</span></td>" +
          '<td data-label="Certs"><span class="cert-row">' + certs + more + "</span></td>" +
          '<td data-label="Capacity" class="r"><span class="cell-mono">' +
            Mend.num(m.capacity) + " " + Mend.esc(m.capacityUnit) + "</span></td>" +
          '<td data-label="Lead" class="r"><span class="cell-mono">' + m.leadTimeDays + " d</span></td>" +
          '<td data-label="Status">' +
            (m.verified
              ? '<span class="sev sev-healthy"><i class="dot"></i>Verified</span>'
              : '<span class="status-pending">Pending audit</span>') +
            '<span class="cell-sub">' + m.refs + " refs · " + (m.exportReady ? "export" : "domestic") + "</span></td>" +
          '<td data-label="" class="r"><button class="row-bid" data-act="contact" data-id="' +
            Mend.esc(m.id) + '" aria-label="Contact ' + Mend.esc(m.name) + '">Contact</button></td>' +
        "</tr>"
      );
    }).join("");
  }

  /* ------------------------------ symbiosis ---------------------------- */
  function renderSymbiosis() {
    $("symbiosis-count").textContent = D.SYMBIOSIS.length;
    $("symbiosis-list").innerHTML = D.SYMBIOSIS.map((s) => {
      const proposed = Mend.state.proposed.indexOf(s.id) !== -1;
      return (
        '<div class="flow">' +
          '<div class="flow-party from">' +
            '<p class="p-name">' + Mend.esc(s.from.name) + "</p>" +
            '<p class="p-loc">' + Mend.esc(s.from.city + ", " + s.from.country) + " · surplus</p>" +
          "</div>" +
          '<div class="flow-arrow">' + icon("arrow-right") + "</div>" +
          '<div class="flow-party to">' +
            '<p class="p-name">' + Mend.esc(s.to.name) + "</p>" +
            '<p class="p-loc">' + Mend.esc(s.to.city + ", " + s.to.country) + " · needs</p>" +
          "</div>" +
          '<div class="flow-mat">' + Mend.esc(s.material) +
            '<span class="cell-sub">' + Mend.esc(s.qty + " " + s.unit + " / mo · " + s.impact) + "</span></div>" +
          '<div class="flow-value">' + Mend.usd(s.valuePerMonth) + "<small>per month</small></div>" +
          '<div class="flow-act">' +
            '<span class="fitbar">Fit <span class="bar"><i style="width:' + s.fit + '%"></i></span>' + s.fit + "%</span>" +
            (proposed
              ? '<span class="sent">' + icon("check") + "Match sent</span>"
              : '<button class="btn btn-ghost btn-sm" data-act="propose" data-id="' + s.id + '">Propose</button>') +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* ------------------------------- finance ----------------------------- */
  function renderFinance() {
    const list = D.FINANCING;
    $("finance-count").textContent = list.length;
    $("finance-list").innerHTML = list.map((p) => {
      const fit = Mend.programFit(p);
      const cats = p.categories.indexOf("all") !== -1
        ? "Any category"
        : p.categories.map((c) => Mend.catById(c).code).join(" · ");
      const regions = p.regions.map((r) => (r === "Global" ? "Global" : Mend.regionShort(r))).join(" · ");
      return (
        '<div class="fin-row' + (fit.fit ? " is-fit" : "") + '">' +
          "<div><p class=\"fin-name\">" + Mend.esc(p.name) + "</p>" +
            '<p class="fin-type">' + Mend.esc(p.type) + "</p></div>" +
          '<p class="fin-ticket">' + Mend.esc(p.ticket) + "</p>" +
          '<p class="fin-regions">' + Mend.esc(regions) +
            '<span class="cell-sub">' + Mend.esc(cats) + "</span></p>" +
          '<div class="fin-fit">' +
            (fit.fit ? '<span class="tag tag-mine">Fits filter</span>' : "") +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* --------------------------------- desk ------------------------------ */
  function pendingPipeline() {
    const pending = Mend.state.bids.filter((b) => b.status === "pending");
    const ids = Array.from(new Set(pending.map((b) => b.demandId)));
    const value = ids.reduce((sum, id) => {
      const d = Mend.demandById(id);
      return sum + (d ? d.budget : 0);
    }, 0);
    return { pending, value, count: ids.length };
  }

  function renderDesk() {
    const pipe = pendingPipeline();
    const commission = D.TRANSACTIONS.reduce((s, t) => s + t.value * t.rate, 0);
    const inView = Mend.demandList().length;
    const kpis = [
      ["Active bids", String(pipe.pending.length).padStart(2, "0"),
        Mend.bidsThisMonth() + " of " + Mend.FREE_BIDS_PER_MONTH + " free used"],
      ["Pipeline value", Mend.usd(pipe.value),
        pipe.count ? pipe.count + " demand" + (pipe.count === 1 ? "" : "s") + " in play" : "No live bids"],
      ["Commission", Mend.usd(commission), "On " + D.TRANSACTIONS.length + " matched deals"],
      ["Gaps in view", String(inView).padStart(2, "0"), "of " + Mend.stats().count + " open demands"],
    ];
    $("desk-kpis").innerHTML = kpis.map((k) =>
      '<div class="kpi"><p class="kpi-k">' + k[0] + '</p><p class="kpi-v">' + k[1] +
      '</p><p class="kpi-note">' + k[2] + "</p></div>"
    ).join("");

    $("ledger-count").textContent = D.TRANSACTIONS.length;
    $("ledger-body").innerHTML = D.TRANSACTIONS.map((t) => {
      const live = t.status === "In escrow" ? "tag-pending" : "tag-live";
      return (
        "<tr>" +
          '<td data-label="Deal"><span class="cell-title">' + Mend.esc(t.deal) + "</span>" +
            '<span class="cell-sub">' + t.id + "</span></td>" +
          '<td data-label="Supplier">' + Mend.esc(t.supplier) + "</td>" +
          '<td data-label="Value" class="r"><span class="cell-money">' + Mend.usd(t.value) + "</span></td>" +
          '<td data-label="Fee" class="r"><span class="cell-mono">' + Mend.usd(t.value * t.rate) + "</span></td>" +
          '<td data-label="Status"><span class="tag ' + live + '">' + Mend.esc(t.status) + "</span></td>" +
          '<td data-label="Date" class="r"><span class="cell-mono">' + Mend.fmtDate(t.date) + "</span></td>" +
        "</tr>"
      );
    }).join("");

    renderActivity();
  }

  function renderActivity() {
    const list = $("activity-list");
    if (!list) return;
    list.innerHTML = Mend.state.activity.slice(0, 9).map((a) =>
      '<li class="act"><time datetime="' + new Date(a.ts).toISOString() + '">' + Mend.ago(a.ts) +
      "</time><span>" + Mend.esc(a.text) + "</span></li>"
    ).join("");
  }

  /* -------------------------------- alerts ----------------------------- */
  function renderAlerts() {
    const watch = Mend.state.watch;
    $("watch-chips").innerHTML = D.CATEGORIES.map((c) => {
      const on = watch.indexOf(c.id) !== -1;
      return (
        '<button class="watch' + (on ? " is-on" : "") + '" data-act="watch" data-id="' + c.id + '" ' +
        'aria-pressed="' + on + '" title="' + Mend.esc(c.name) + '">' +
        '<span class="tickmark" aria-hidden="true"></span>' + c.code + "</button>"
      );
    }).join("");

    const matches = watch.length
      ? Mend.allDemands().filter((d) => watch.indexOf(d.category) !== -1)
      : [];
    $("alert-count").textContent = matches.length;

    const badge = $("alerts-count");
    badge.textContent = matches.length > 9 ? "9+" : String(matches.length);
    badge.hidden = matches.length === 0;

    const list = $("alert-list");
    if (!watch.length) {
      list.innerHTML = '<p class="alert-empty">Pick a category above to start watching.</p>';
    } else if (!matches.length) {
      list.innerHTML = '<p class="alert-empty">No open gaps in your watchlist right now.</p>';
    } else {
      list.innerHTML = matches.slice(0, 5).map((d) =>
        '<button class="alert-row" data-act="open-demand" data-id="' + Mend.esc(d.id) + '">' +
          '<span class="alert-title">' + Mend.esc(d.title) + "</span>" +
          '<span class="alert-meta">' + Mend.esc(d.buyer) + " · " + Mend.usd(d.budget) +
          " · " + Mend.esc(d.city) + "</span>" +
        "</button>"
      ).join("");
    }
  }

  /* -------------------------------- revenue ---------------------------- */
  function renderRevenue() {
    const list = $("revenue-list");
    if (!list) return;
    list.innerHTML =
      '<div class="rev-head"><span>Stream</span><span>Who pays</span><span>Format</span></div>' +
      D.REVENUE.map((r) =>
        '<div class="rev"><span class="rev-name">' + Mend.esc(r.name) + "</span>" +
        '<span class="rev-who">' + Mend.esc(r.who) + "</span>" +
        '<span class="rev-format">' + Mend.esc(r.format) + "</span></div>"
      ).join("");
  }

  /* ------------------------------- controls ---------------------------- */
  function syncFilters() {
    const f = Mend.state.filters;
    const set = (id, value) => {
      const el = $(id);
      if (el && el.value !== value) el.value = value;
    };
    if ($("d-search").value !== f.q) $("d-search").value = f.q;
    if ($("m-search").value !== f.q) $("m-search").value = f.q;
    set("d-category", f.category);
    set("radar-category", f.category);
    set("d-region", f.region);
    set("d-severity", f.severity);
    set("d-sort", Mend.state.sort);
    $("d-verified").checked = f.verified;

    set("s-cert", Mend.state.dir.cert);
    set("s-country", Mend.state.dir.country);
    set("s-sort", Mend.state.dir.sort);
    const lead = $("s-lead");
    if (lead) lead.value = Mend.state.dir.lead;
    const leadOut = $("s-lead-out");
    if (leadOut) leadOut.textContent = Mend.state.dir.lead >= 120 ? "Any" : "≤ " + Mend.state.dir.lead + " d";

    document.querySelectorAll('[data-act="chip"]').forEach((chip) => {
      let on = false;
      if (chip.dataset.severity) on = f.severity === chip.dataset.severity;
      if (chip.dataset.category) on = f.category === chip.dataset.category;
      if (chip.dataset.region) on = f.region === chip.dataset.region;
      if (chip.dataset.verified) on = f.verified;
      chip.classList.toggle("is-on", on);
      chip.setAttribute("aria-pressed", String(on));
    });
  }

  function renderAll() {
    renderTicker();
    renderRadar();
    renderDemands();
    renderBids();
    renderMakers();
    renderSymbiosis();
    renderFinance();
    renderDesk();
    renderAlerts();
    renderRevenue();
    syncFilters();
  }

  Object.assign(Mend, {
    renderAll, renderTicker, renderRadar, renderDemands, renderBids,
    renderMakers, renderSymbiosis, renderFinance, renderDesk, renderActivity,
    renderAlerts, renderRevenue, syncFilters, pendingPipeline,
  });
})();
