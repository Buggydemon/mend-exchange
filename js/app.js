/* =====================================================================
   MEND — interactions
   One delegated click handler drives every [data-act]. Filters are shared
   across the masthead, radar and demand table; overlays use small
   validate-then-commit flows backed by localStorage.
   ===================================================================== */
window.Mend = window.Mend || {};

(function () {
  "use strict";

  const D = Mend.data;
  const state = Mend.state;
  const $ = (id) => document.getElementById(id);
  const icon = (name) =>
    '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  let lastFocus = null;

  /* ------------------------------ boot -------------------------------- */
  function init() {
    populateSelects();
    applyTheme(state.theme, true);
    Mend.renderAll();
    deferMap();
    bind();
    tickClock();
    setInterval(tickClock, 30000);
    setInterval(() => {
      Mend.renderActivity();
      Mend.renderTicker();
    }, 60000);
  }

  /* Leaflet work is pushed past first paint; the map still initialises on its
     own so deep links and the "On map" action never depend on scrolling. */
  function deferMap() {
    if (!Mend.map) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      Mend.map.init();
    };
    setTimeout(start, 700);
    if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1400 });
  }

  function populateSelects() {
    const catOptions = D.CATEGORIES
      .map((c) => '<option value="' + c.id + '">' + Mend.esc(c.name) + "</option>").join("");
    const regionOptions = D.REGIONS
      .map((r) => '<option value="' + Mend.esc(r.id) + '">' + Mend.esc(r.id) + "</option>").join("");

    $("d-category").innerHTML = '<option value="all">All categories</option>' + catOptions;
    $("radar-category").innerHTML = '<option value="all">All categories</option>' + catOptions;
    $("d-region").innerHTML = '<option value="all">All regions</option>' + regionOptions;

    const certs = Array.from(new Set(D.MANUFACTURERS.flatMap((m) => m.certs))).sort();
    $("s-cert").innerHTML = '<option value="all">All certifications</option>' +
      certs.map((c) => '<option value="' + Mend.esc(c) + '">' + Mend.esc(c) + "</option>").join("");

    const countries = Array.from(new Set(D.MANUFACTURERS.map((m) => m.country))).sort();
    $("s-country").innerHTML = '<option value="all">All countries</option>' +
      countries.map((c) => '<option value="' + Mend.esc(c) + '">' + Mend.esc(c) + "</option>").join("");
  }

  function bind() {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("submit", onDocumentSubmit);
    document.addEventListener("change", onDocumentChange);
    document.addEventListener("input", onDocumentInput);

    const debouncedSearch = debounce((value) => setFilters({ q: value }, { fit: false }), 150);
    ["m-search", "d-search"].forEach((id) => {
      $(id).addEventListener("input", (e) => debouncedSearch(e.target.value));
    });

    const lead = $("s-lead");
    if (lead) {
      lead.addEventListener("input", () => {
        state.dir.lead = Number(lead.value);
        Mend.renderMakers();
        Mend.syncFilters();
      });
    }

    document.addEventListener("keydown", onKeydown);
    setupScrollSpy();
  }

  /* ---------------------------- delegation ----------------------------- */
  function onDocumentClick(e) {
    const insideAlerts = !!e.target.closest(".alerts-wrap");
    const actionEl = e.target.closest("[data-act]");
    if (actionEl) {
      handleAction(actionEl, e);
    } else {
      const row = e.target.closest("tr[data-demand]");
      if (row) openDrawer(row.dataset.demand);
    }
    if (!$("alerts-pop").hidden && !insideAlerts) closeAlerts();
  }

  function handleAction(el, e) {
    const act = el.dataset.act;
    const id = el.dataset.id;

    if (act === "post") return openPostModal();
    if (act === "close-modal") return closeModal();
    if (act === "close-drawer") return closeDrawer();
    if (act === "theme") return toggleTheme();
    if (act === "alerts") return toggleAlerts();
    if (act === "reset-filters") return resetFilters();
    if (act === "reset-dir") return resetDirectory();
    if (act === "fit-map") { closeAlerts(); return Mend.map && Mend.map.fit(); }
    if (act === "open-demand") { closeAlerts(); return openDrawer(id); }
    if (act === "bid") return openBidModal(id);
    if (act === "contact") return openContactModal(id);
    if (act === "withdraw") return withdrawBid(id);
    if (act === "propose") return proposeSymbiosis(id);
    if (act === "watch") return toggleWatch(id);
    if (act === "fly-demand") return Mend.map && Mend.map.focus(id);
    if (act === "chip") return applyChip(el);
    if (act === "goto") {
      e.preventDefault();
      closeAlerts();
      const target = document.getElementById(el.dataset.target);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }

  function onDocumentChange(e) {
    const t = e.target;
    switch (t.id) {
      case "d-category":
      case "radar-category":
        return setFilters({ category: t.value });
      case "d-region":
        return setFilters({ region: t.value });
      case "d-severity":
        return setFilters({ severity: t.value });
      case "d-verified":
        return setFilters({ verified: t.checked });
      case "d-sort":
        state.sort = t.value;
        Mend.renderRadar();
        Mend.renderDemands();
        Mend.syncFilters();
        return;
      case "toggle-factories":
        return Mend.map && Mend.map.setFactories(t.checked);
      case "s-cert":
        state.dir.cert = t.value;
        Mend.renderMakers();
        return Mend.syncFilters();
      case "s-country":
        state.dir.country = t.value;
        Mend.renderMakers();
        return Mend.syncFilters();
      case "s-sort":
        state.dir.sort = t.value;
        Mend.renderMakers();
        return Mend.syncFilters();
      default:
        return;
    }
  }

  function onDocumentInput(e) {
    if (e.target.id === "s-lead") {
      state.dir.lead = Number(e.target.value);
      Mend.renderMakers();
      Mend.syncFilters();
    }
  }

  function onDocumentSubmit(e) {
    const form = e.target.closest("form[data-form]");
    if (!form) return;
    e.preventDefault();
    if (form.dataset.form === "bid") submitBid(form);
    if (form.dataset.form === "contact") submitContact(form);
    if (form.dataset.form === "post") submitPost(form);
  }

  /* ------------------------------- filters ----------------------------- */
  function setFilters(patch, opts) {
    Object.assign(state.filters, patch);
    Mend.renderAll();
    if (Mend.map) {
      Mend.map.render();
      if (!opts || opts.fit !== false) Mend.map.fit();
    }
  }

  function resetFilters() {
    state.filters = { q: "", category: "all", region: "all", severity: "all", verified: false };
    state.sort = "severity";
    Mend.renderAll();
    if (Mend.map) { Mend.map.render(); Mend.map.fit(); }
  }

  function resetDirectory() {
    state.dir = { cert: "all", country: "all", lead: 120, sort: "name" };
    Mend.renderMakers();
    Mend.syncFilters();
  }

  function applyChip(chip) {
    const ds = chip.dataset;
    if (ds.severity) {
      setFilters({ severity: state.filters.severity === ds.severity ? "all" : ds.severity });
    } else if (ds.category) {
      setFilters({ category: state.filters.category === ds.category ? "all" : ds.category });
    } else if (ds.region) {
      setFilters({ region: state.filters.region === ds.region ? "all" : ds.region });
    } else if (ds.verified) {
      setFilters({ verified: !state.filters.verified });
    }
  }

  /* ------------------------------- alerts ------------------------------ */
  function toggleAlerts() {
    const pop = $("alerts-pop");
    if (pop.hidden) {
      Mend.renderAlerts();
      pop.hidden = false;
      $("alerts-btn").setAttribute("aria-expanded", "true");
    } else {
      closeAlerts();
    }
  }

  function closeAlerts() {
    const pop = $("alerts-pop");
    if (!pop.hidden) {
      pop.hidden = true;
      $("alerts-btn").setAttribute("aria-expanded", "false");
    }
  }

  function toggleWatch(id) {
    const i = state.watch.indexOf(id);
    if (i === -1) state.watch.push(id);
    else state.watch.splice(i, 1);
    Mend.save("watch");
    Mend.renderAlerts();
  }

  /* -------------------------------- theme ------------------------------ */
  function applyTheme(theme, silent) {
    document.documentElement.dataset.theme = theme;
    state.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#0f1114" : "#f4f3ef";
    const btn = $("theme-toggle");
    if (btn) btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    if (!silent) {
      Mend.store.rawSet(Mend.KEYS.theme, theme);
      if (Mend.map) Mend.map.refreshTheme();
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === "dark" ? "light" : "dark", false);
  }

  /* ------------------------------- clock ------------------------------- */
  function tickClock() {
    const c = Mend.clockNow();
    const clock = $("clock");
    if (clock) clock.textContent = c.time;
    const today = $("today");
    if (today) today.textContent = c.date;
  }

  /* ------------------------------- overlays ---------------------------- */
  function lockScroll() { document.body.style.overflow = "hidden"; }
  function unlockScroll() {
    if (!$("modal").classList.contains("is-open") && !$("drawer").classList.contains("is-open")) {
      document.body.style.overflow = "";
    }
  }

  function openModal(html) {
    lastFocus = document.activeElement;
    $("modal-content").innerHTML = html;
    $("modal").classList.add("is-open");
    $("modal").setAttribute("aria-hidden", "false");
    lockScroll();
    requestAnimationFrame(() => {
      const first = $("modal-content").querySelector("input, select, textarea");
      if (first) first.focus({ preventScroll: true });
    });
  }

  function closeModal() {
    $("modal").classList.remove("is-open");
    $("modal").setAttribute("aria-hidden", "true");
    unlockScroll();
    if (lastFocus && typeof lastFocus.focus === "function") {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* detached */ }
    }
  }

  function closeDrawer() {
    $("drawer").classList.remove("is-open");
    $("drawer").setAttribute("aria-hidden", "true");
    state.selected = null;
    Mend.renderRadar();
    if (Mend.map) Mend.map.select(null);
    unlockScroll();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      if ($("modal").classList.contains("is-open")) return closeModal();
      if ($("drawer").classList.contains("is-open")) return closeDrawer();
      if (!$("alerts-pop").hidden) return closeAlerts();
    }
    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      $("m-search").focus();
    }
  }

  /* ------------------------------- drawer ------------------------------ */
  function certifiedSuppliers(d) {
    return D.MANUFACTURERS
      .filter((m) => m.verified && m.categories.includes(d.category))
      .sort((a, b) => (b.region === d.region) - (a.region === d.region) || a.leadTimeDays - b.leadTimeDays)
      .slice(0, 3);
  }

  function financeForDemand(d) {
    return D.FINANCING.filter((p) =>
      (p.categories.includes("all") || p.categories.includes(d.category)) &&
      (p.regions.includes("Global") || p.regions.includes(d.region))
    ).slice(0, 2);
  }

  function openDrawer(id, opts) {
    const d = Mend.demandById(id);
    if (!d) return;
    const fly = !opts || opts.fly !== false;
    state.selected = id;
    Mend.renderRadar();
    if (Mend.map && fly) Mend.map.focus(id);

    const sev = Mend.sevMeta(d.severity);
    const cat = Mend.catById(d.category);
    const bid = Mend.activeBidFor(id);
    const suppliers = certifiedSuppliers(d);
    const others = Mend.allDemands().filter((x) => x.id !== id && x.category === d.category).slice(0, 2);
    const finance = financeForDemand(d);
    const verifiedCount = certifiedSuppliers({ category: d.category, region: d.region }).length;

    const supplierRows = suppliers.length
      ? suppliers.map((m) =>
          '<div class="supply-row"><div><span class="supply-name">' + Mend.esc(m.name) + "</span>" +
            '<span class="supply-meta">' + Mend.esc(m.city + ", " + m.country) +
            (m.region === d.region ? " · in region" : "") + "</span></div>" +
            '<span class="supply-lead">' + m.leadTimeDays + " d</span></div>"
        ).join("")
      : '<p class="dw-copy">No certified maker covers this spec yet. Widen the region filter or post a supply offer.</p>';

    const otherRows = others.length
      ? others.map((o) =>
          '<button class="linkish supply-row" data-act="open-demand" data-id="' + Mend.esc(o.id) + '">' +
            '<span><span class="supply-name">' + Mend.esc(o.title) + "</span>" +
            '<span class="supply-meta">' + Mend.esc(o.buyer) + " · " + Mend.esc(o.city) + "</span></span>" +
            '<span class="supply-lead">' + Mend.usd(o.budget) + "</span></button>"
        ).join("")
      : '<p class="dw-copy">No other open demand in this category.</p>';

    const financeRows = finance.length
      ? finance.map((p) =>
          '<div class="supply-row"><div><span class="supply-name">' + Mend.esc(p.name) + "</span>" +
            '<span class="supply-meta">' + Mend.esc(p.type) + "</span></div>" +
            '<span class="supply-lead">' + Mend.esc(p.ticket) + "</span></div>"
        ).join("")
      : '<p class="dw-copy">No program matches this category and region directly. See the finance hub for global guarantees.</p>';

    const verifyNote = d.buyerVerified
      ? ""
      : '<div class="dw-sec"><div class="gap-callout tight">' + icon("alert") +
        "<p><strong>Buyer verification pending.</strong> Mend recommends escrow for first delivery and a bank guarantee on the letter of credit.</p></div></div>";

    const footer = d.mine
      ? '<button class="btn btn-ghost" data-act="fly-demand" data-id="' + Mend.esc(d.id) + '">' + icon("pin") + " On map</button>" +
        '<button class="btn btn-primary" disabled>' + icon("check") + "Your listing</button>"
      : bid
        ? '<button class="btn btn-ghost" data-act="fly-demand" data-id="' + Mend.esc(d.id) + '">' + icon("pin") + " On map</button>" +
          '<button class="btn btn-primary" disabled>' + icon("check") + "Bid pending</button>"
        : '<button class="btn btn-ghost" data-act="fly-demand" data-id="' + Mend.esc(d.id) + '">' + icon("pin") + " On map</button>" +
          '<button class="btn btn-primary" data-act="bid" data-id="' + Mend.esc(d.id) + '">Place bid</button>';

    $("drawer-content").innerHTML =
      '<div class="dw-head sev-' + d.severity + '">' +
        '<div class="dw-top">' +
          '<div class="dw-kicker"><span class="sev sev-' + d.severity + '"><i class="dot"></i>' +
            Mend.esc(sev.long) + "</span><span>·</span><span>" + Mend.esc(d.source) + "</span>" +
            (d.mine ? '<span class="tag tag-mine">Your listing</span>' : "") + "</div>" +
          '<button class="icon-btn" data-act="close-drawer" aria-label="Close brief">' + icon("x") + "</button>" +
        "</div>" +
        '<h2 class="dw-title" id="drawer-title">' + Mend.esc(d.title) + "</h2>" +
        '<p class="dw-buyer"><b>' + Mend.esc(d.buyer) + "</b> · " + Mend.esc(d.buyerType) + " · " +
          Mend.esc(d.city + ", " + d.country) + "</p>" +
        '<div class="dw-stats">' +
          '<div class="dw-stat"><p class="dw-k">Value</p><p class="dw-v">' + Mend.usd(d.budget) + "</p></div>" +
          '<div class="dw-stat"><p class="dw-k">Closes</p><p class="dw-v">' + Mend.fmtDate(d.deadline) + "</p></div>" +
          '<div class="dw-stat"><p class="dw-k">Bids</p><p class="dw-v">' + (d.mine ? "—" : d.bids) + "</p></div>" +
        "</div>" +
      "</div>" +
      '<div class="dw-body">' +
        '<div class="dw-sec"><p class="dw-label">Gap read</p>' +
          '<div class="gap-callout">' + icon("alert") + "<p><strong>" + Mend.esc(sev.long) + " · " +
            verifiedCount + " certified maker" + (verifiedCount === 1 ? "" : "s") + ".</strong> " +
            Mend.esc(d.note) + "</p></div></div>" +
        '<div class="dw-sec"><p class="dw-label">Specification</p>' +
          '<p class="dw-spec">' + Mend.esc(d.spec) + "</p>" +
          '<p class="dw-copy" style="margin-top:8px">' + Mend.num(d.qty) + " " + Mend.esc(d.unit) +
            " · " + Mend.esc(cat.name) + " · " + Mend.esc(d.region) + "</p></div>" +
        '<div class="dw-sec"><p class="dw-label">Certified suppliers</p>' + supplierRows + "</div>" +
        '<div class="dw-sec"><p class="dw-label">Other open demand</p>' + otherRows + "</div>" +
        '<div class="dw-sec"><p class="dw-label">Financing fit</p>' + financeRows + "</div>" +
        verifyNote +
      "</div>" +
      '<div class="dw-foot">' + footer + "</div>";

    $("drawer").classList.add("is-open");
    $("drawer").setAttribute("aria-hidden", "false");
    lockScroll();
    const panel = $("drawer").querySelector(".drawer-panel");
    if (panel) panel.focus({ preventScroll: true });
  }

  /* ------------------------------ bid flow ----------------------------- */
  function openBidModal(id) {
    const d = Mend.demandById(id);
    if (!d) return;
    if (d.mine) return;
    if (Mend.activeBidFor(id)) {
      Mend.toast("You already have a pending bid on this demand.");
      return;
    }
    if (Mend.bidsThisMonth() >= Mend.FREE_BIDS_PER_MONTH) {
      Mend.toast("Free bid limit reached — 3 bids this month. Withdraw a bid or upgrade in the Pro tier.");
      return;
    }

    const suggested = Math.round((d.budget * 0.94) / 1000) * 1000;
    openModal(
      '<div class="m-head"><div><p class="m-kicker">Place bid</p>' +
        '<h2 class="m-title" id="modal-title">' + Mend.esc(d.title) + "</h2></div>" +
        '<button class="icon-btn" data-act="close-modal" aria-label="Close">' + icon("x") + "</button></div>" +
      '<form data-form="bid" novalidate>' +
        '<input type="hidden" name="demandId" value="' + Mend.esc(d.id) + '">' +
        '<div class="m-body">' +
          '<div class="m-summary"><div><span class="s-title">' + Mend.esc(d.buyer) + "</span>" +
            '<span class="s-meta">' + Mend.esc(d.city) + " · " + Mend.esc(d.region) +
            " · closes " + Mend.fmtDate(d.deadline) + "</span></div>" +
            '<span class="s-val">' + Mend.usd(d.budget) + "</span></div>" +
          '<div class="fields">' +
            '<div class="f2">' +
              '<div class="fld" data-fld="price"><label for="bid-price">Your price (USD)</label>' +
                '<input id="bid-price" name="price" type="number" min="1" step="1000" inputmode="decimal" value="' + suggested + '">' +
                '<span class="hint" id="bid-hint">Budget ' + Mend.usdFull(d.budget) + "</span>" +
                '<span class="err" data-err></span></div>' +
              '<div class="fld" data-fld="days"><label for="bid-days">Delivery (days)</label>' +
                '<input id="bid-days" name="days" type="number" min="1" max="730" step="1" value="45">' +
                '<span class="hint">1–730 days</span><span class="err" data-err></span></div>' +
            "</div>" +
            '<div class="fld" data-fld="note"><label for="bid-note">Note to buyer</label>' +
              '<textarea id="bid-note" name="note" maxlength="400" placeholder="Certifications, capacity, shipping terms…"></textarea>' +
              '<span class="hint">Optional · max 400 characters</span><span class="err" data-err></span></div>' +
          "</div>" +
          '<p class="form-note">No fee to bid. Commission applies only when a deal is matched. This prototype stores the bid in your browser.</p>' +
        "</div>" +
        '<div class="m-foot"><button type="button" class="btn btn-ghost" data-act="close-modal">Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Submit bid</button></div>' +
      "</form>"
    );

    const form = $("modal-content").querySelector("form");
    const price = form.elements.price;
    const hint = form.querySelector("#bid-hint");
    const update = () => {
      const value = Number(price.value);
      if (!value) {
        hint.textContent = "Budget " + Mend.usdFull(d.budget);
        hint.className = "hint";
        return;
      }
      const pct = ((value - d.budget) / d.budget) * 100;
      if (Math.abs(pct) < 0.05) {
        hint.textContent = "At the buyer's budget";
        hint.className = "hint";
      } else if (pct < 0) {
        hint.textContent = Math.abs(pct).toFixed(1) + "% under budget";
        hint.className = "hint ok";
      } else {
        hint.textContent = pct.toFixed(1) + "% over budget";
        hint.className = "hint bad";
      }
    };
    price.addEventListener("input", update);
    update();
  }

  function fieldBox(form, name) {
    return form.querySelector('[data-fld="' + name + '"]');
  }
  function setError(form, name, message) {
    const box = fieldBox(form, name);
    if (!box) return;
    box.classList.toggle("fld-invalid", !!message);
    const err = box.querySelector("[data-err]");
    if (err) err.textContent = message || "";
  }
  function clearErrors(form) {
    form.querySelectorAll(".fld-invalid").forEach((el) => el.classList.remove("fld-invalid"));
    form.querySelectorAll("[data-err]").forEach((el) => (el.textContent = ""));
  }

  function submitBid(form) {
    const id = form.elements.demandId.value;
    const d = Mend.demandById(id);
    if (!d) return;
    const price = Number(form.elements.price.value);
    const days = Number(form.elements.days.value);
    const note = form.elements.note.value.trim();
    clearErrors(form);

    let bad = false;
    if (!Number.isFinite(price) || price <= 0) {
      setError(form, "price", "Enter a price above zero.");
      bad = true;
    }
    if (!Number.isInteger(days) || days < 1 || days > 730) {
      setError(form, "days", "Enter a whole number between 1 and 730.");
      bad = true;
    }
    if (note.length > 400) {
      setError(form, "note", "Keep the note under 400 characters.");
      bad = true;
    }
    if (bad) return;

    if (Mend.bidsThisMonth() >= Mend.FREE_BIDS_PER_MONTH) {
      Mend.toast("Free bid limit reached — 3 bids this month.");
      return;
    }

    state.bids.unshift({
      id: Mend.uid("b"),
      demandId: id,
      price,
      days,
      note,
      status: "pending",
      createdAt: Date.now(),
    });
    Mend.save("bids");
    Mend.logActivity("Bid submitted: " + Mend.usdFull(price) + " on " + d.title);
    Mend.renderBids();
    Mend.renderDemands();
    Mend.renderDesk();
    closeModal();
    Mend.toast("Bid submitted — pending review by " + d.buyer + ".", "ok");
    if (state.selected === id && $("drawer").classList.contains("is-open")) {
      openDrawer(id, { fly: false });
    }
    Mend.renderRadar();
  }

  function withdrawBid(bidId) {
    const bid = state.bids.find((b) => b.id === bidId);
    if (!bid || bid.status !== "pending") return;
    bid.status = "withdrawn";
    Mend.save("bids");
    const d = Mend.demandById(bid.demandId);
    Mend.logActivity("Bid withdrawn: " + Mend.usdFull(bid.price) + (d ? " on " + d.title : ""));
    Mend.renderBids();
    Mend.renderDemands();
    Mend.renderDesk();
    Mend.toast("Bid withdrawn.");
    if (d && state.selected === d.id && $("drawer").classList.contains("is-open")) {
      openDrawer(d.id, { fly: false });
    }
    Mend.renderRadar();
  }

  /* ---------------------------- contact flow --------------------------- */
  function openContactModal(id) {
    const m = Mend.makerById(id);
    if (!m) return;
    openModal(
      '<div class="m-head"><div><p class="m-kicker">Direct intro</p>' +
        '<h2 class="m-title" id="modal-title">Contact ' + Mend.esc(m.name) + "</h2></div>" +
        '<button class="icon-btn" data-act="close-modal" aria-label="Close">' + icon("x") + "</button></div>" +
      '<form data-form="contact" novalidate>' +
        '<input type="hidden" name="makerId" value="' + Mend.esc(m.id) + '">' +
        '<div class="m-body">' +
          '<div class="m-summary"><div><span class="s-title">' + Mend.esc(m.city + ", " + m.country) + "</span>" +
            '<span class="s-meta">' + Mend.esc(m.certs.slice(0, 3).join(" · ")) + "</span></div>" +
            '<span class="s-val">' + m.leadTimeDays + " d</span></div>" +
          '<div class="fields">' +
            '<div class="f2">' +
              '<div class="fld" data-fld="name"><label for="c-name">Your name</label>' +
                '<input id="c-name" name="name" type="text" autocomplete="name" placeholder="Ada Okafor">' +
                '<span class="err" data-err></span></div>' +
              '<div class="fld" data-fld="email"><label for="c-email">Work email</label>' +
                '<input id="c-email" name="email" type="email" autocomplete="email" placeholder="you@company.com">' +
                '<span class="err" data-err></span></div>' +
            "</div>" +
            '<div class="fld" data-fld="message"><label for="c-msg">Message</label>' +
              '<textarea id="c-msg" name="message" placeholder="Volume, specification, delivery window…"></textarea>' +
              '<span class="hint">10–600 characters</span><span class="err" data-err></span></div>' +
          "</div>" +
          '<p class="form-note">Prototype only — no message leaves your browser. Mend would route this intro through a verified channel.</p>' +
        "</div>" +
        '<div class="m-foot"><button type="button" class="btn btn-ghost" data-act="close-modal">Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Send intro</button></div>' +
      "</form>"
    );
  }

  function submitContact(form) {
    const m = Mend.makerById(form.elements.makerId.value);
    if (!m) return;
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const message = form.elements.message.value.trim();
    clearErrors(form);

    let bad = false;
    if (name.length < 2) { setError(form, "name", "Enter your name."); bad = true; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(form, "email", "Enter a valid email address.");
      bad = true;
    }
    if (message.length < 10) {
      setError(form, "message", "Add at least 10 characters.");
      bad = true;
    } else if (message.length > 600) {
      setError(form, "message", "Keep the message under 600 characters.");
      bad = true;
    }
    if (bad) return;

    Mend.logActivity("Intro request sent to " + m.name + " (mock)");
    Mend.renderDesk();
    closeModal();
    Mend.toast("Intro queued — Mend would connect you with " + m.name, "ok");
  }

  /* --------------------------- post demand ----------------------------- */
  function openPostModal() {
    const isoDay = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    };
    const cats = D.CATEGORIES
      .map((c) => '<option value="' + c.id + '">' + Mend.esc(c.name) + "</option>").join("");
    const regions = D.REGIONS
      .map((r) => '<option value="' + Mend.esc(r.id) + '">' + Mend.esc(r.id) + "</option>").join("");

    openModal(
      '<div class="m-head"><div><p class="m-kicker">Buyer listing</p>' +
        '<h2 class="m-title" id="modal-title">Post a demand</h2></div>' +
        '<button class="icon-btn" data-act="close-modal" aria-label="Close">' + icon("x") + "</button></div>" +
      '<form data-form="post" novalidate>' +
        '<div class="m-body">' +
          '<div class="fields">' +
            '<div class="fld" data-fld="title"><label for="p-title">Demand title</label>' +
              '<input id="p-title" name="title" type="text" maxlength="90" placeholder="e.g. 300 × 11kV distribution transformers">' +
              '<span class="err" data-err></span></div>' +
            '<div class="f2">' +
              '<div class="fld" data-fld="category"><label for="p-cat">Category</label>' +
                '<select id="p-cat" name="category">' + cats + "</select><span class=\"err\" data-err></span></div>" +
              '<div class="fld" data-fld="qty"><label for="p-qty">Quantity</label>' +
                '<input id="p-qty" name="qty" type="number" min="1" step="1" placeholder="500">' +
                '<span class="err" data-err></span></div>' +
            "</div>" +
            '<div class="f2">' +
              '<div class="fld" data-fld="region"><label for="p-region">Region</label>' +
                '<select id="p-region" name="region">' + regions + "</select><span class=\"err\" data-err></span></div>" +
              '<div class="fld" data-fld="city"><label for="p-city">Delivery city</label>' +
                '<input id="p-city" name="city" type="text" maxlength="40" placeholder="Lagos">' +
                '<span class="err" data-err></span></div>' +
            "</div>" +
            '<div class="f2">' +
              '<div class="fld" data-fld="budget"><label for="p-budget">Budget (USD)</label>' +
                '<input id="p-budget" name="budget" type="number" min="1000" step="1000" placeholder="2500000">' +
                '<span class="err" data-err></span></div>' +
              '<div class="fld" data-fld="deadline"><label for="p-deadline">Close date</label>' +
                '<input id="p-deadline" name="deadline" type="date" min="' + isoDay(1) + '" value="' + isoDay(60) + '">' +
                '<span class="err" data-err></span></div>' +
            "</div>" +
            '<div class="fld" data-fld="spec"><label for="p-spec">Specification (optional)</label>' +
              '<textarea id="p-spec" name="spec" maxlength="160" placeholder="Standards, ratings, certificates…"></textarea>' +
              '<span class="hint">Max 160 characters</span><span class="err" data-err></span></div>' +
          "</div>" +
          '<p class="form-note">Your listing appears on the radar and in the live book. Gap severity is estimated from verified maker coverage.</p>' +
        "</div>" +
        '<div class="m-foot"><button type="button" class="btn btn-ghost" data-act="close-modal">Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Publish demand</button></div>' +
      "</form>"
    );
  }

  function submitPost(form) {
    const title = form.elements.title.value.trim();
    const category = form.elements.category.value;
    const qty = Number(form.elements.qty.value);
    const regionId = form.elements.region.value;
    const city = form.elements.city.value.trim();
    const budget = Number(form.elements.budget.value);
    const deadline = form.elements.deadline.value;
    const spec = form.elements.spec.value.trim();
    clearErrors(form);

    const cat = Mend.catById(category);
    const region = D.REGIONS.find((r) => r.id === regionId) || D.REGIONS[0];
    let bad = false;
    if (title.length < 6) { setError(form, "title", "Use at least 6 characters."); bad = true; }
    if (!Number.isInteger(qty) || qty <= 0) { setError(form, "qty", "Enter a whole quantity above zero."); bad = true; }
    if (city.length < 2) { setError(form, "city", "Enter a delivery city."); bad = true; }
    if (!Number.isFinite(budget) || budget < 1000) { setError(form, "budget", "Minimum budget is $1,000."); bad = true; }
    if (!deadline || new Date(deadline + "T23:59:59") <= new Date()) {
      setError(form, "deadline", "Pick a future close date.");
      bad = true;
    }
    if (spec.length > 160) { setError(form, "spec", "Keep the specification under 160 characters."); bad = true; }
    if (bad) return;

    const coverage = D.MANUFACTURERS.filter((m) =>
      m.verified && m.categories.includes(category) && m.region === regionId
    ).length;
    const severity = coverage === 0 ? "acute" : coverage === 1 ? "tight" : "healthy";
    const jitter = () => (Math.random() - 0.5) * 2;
    const id = Mend.uid("p");

    state.posted.unshift({
      id,
      title,
      buyer: "Your organisation",
      buyerType: "Buyer",
      buyerVerified: true,
      category,
      qty,
      unit: cat.unit,
      spec: spec || "Specification to be confirmed",
      city,
      country: region.id,
      region: region.id,
      lat: region.lat + jitter(),
      lng: region.lng + jitter(),
      deadline,
      budget,
      severity,
      source: "Posted on Mend",
      bids: 0,
      mine: true,
      createdAt: Date.now(),
      note: "Posted by you. " + coverage + " verified maker" + (coverage === 1 ? "" : "s") +
        " cover this category in " + region.id + ".",
    });
    Mend.save("posted");
    Mend.logActivity("New demand posted: " + title + " (" + city + ")");

    state.filters = { q: "", category: "all", region: "all", severity: "all", verified: false };
    state.sort = "severity";
    Mend.renderAll();
    if (Mend.map) { Mend.map.render(); Mend.map.fit(); }
    closeModal();
    Mend.toast("Demand published — it is live on the radar.", "ok");

    setTimeout(() => {
      const section = $("demands");
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      const row = document.querySelector('tr[data-demand="' + id + '"]');
      if (row) {
        row.classList.add("is-new");
        setTimeout(() => row.classList.remove("is-new"), 2600);
      }
    }, 220);
  }

  /* ------------------------------ symbiosis ---------------------------- */
  function proposeSymbiosis(id) {
    if (state.proposed.indexOf(id) !== -1) return;
    state.proposed.push(id);
    Mend.save("proposed");
    Mend.renderSymbiosis();
    const s = D.SYMBIOSIS.find((x) => x.id === id);
    if (s) Mend.logActivity("Symbiosis proposal sent: " + s.from.name + " → " + s.to.name);
    Mend.renderDesk();
    Mend.toast("Proposal sent — both makers will be introduced.", "ok");
  }

  /* ------------------------------- helpers ----------------------------- */
  function debounce(fn, ms) {
    let t = 0;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function setupScrollSpy() {
    const links = new Map();
    document.querySelectorAll(".nav a[data-nav]").forEach((a) => links.set(a.dataset.nav, a));
    const sections = Array.from(links.keys())
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.remove("is-active"));
        const link = links.get(entry.target.id);
        if (link) link.classList.add("is-active");
      });
    }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });

    sections.forEach((s) => io.observe(s));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
