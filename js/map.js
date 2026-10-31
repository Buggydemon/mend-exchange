/* =====================================================================
   MEND — gap radar map
   Leaflet with Esri Canvas basemaps, flat severity discs sized by value,
   and diamond pins for makers. All content is built as DOM nodes.
   ===================================================================== */
window.Mend = window.Mend || {};

(function () {
  "use strict";

  let map = null;
  let tileLayers = [];
  let demandLayer = null;
  let factoryLayer = null;
  let showFactories = true;
  const markers = new Map();
  let resizeTimer = 0;

  /* Esri Canvas basemaps: no key required. The label overlay is a separate
     reference service because Esri's Canvas reference is blank below zoom 3. */
  const REF =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
  const TILES = {
    light: {
      base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    },
    dark: {
      base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    },
  };

  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function radiusFor(budget) {
    const cap = window.innerWidth < 720 ? 19 : 28;
    return Math.min(cap, 7 + Math.sqrt(budget / 1e6) * 3.2);
  }

  function popupNode(d) {
    const box = document.createElement("div");
    const title = document.createElement("span");
    title.className = "pop-t";
    title.textContent = d.title;
    const meta = document.createElement("span");
    meta.className = "pop-m";
    meta.textContent = d.buyer + " · " + Mend.usd(d.budget) + " · " + d.city;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "pop-link";
    open.dataset.act = "open-demand";
    open.dataset.id = d.id;
    open.textContent = "Open brief →";
    box.append(title, meta, open);
    return box;
  }

  function addTileLayer() {
    if (!map) return;
    tileLayers.forEach((layer) => map.removeLayer(layer));
    tileLayers = [];

    const set = TILES[document.documentElement.dataset.theme === "dark" ? "dark" : "light"];
    const attribution =
      'Basemap &copy; <a href="https://www.esri.com/">Esri</a> — Esri, DeLorme, NAVTEQ';
    tileLayers = [
      L.tileLayer(set.base, { attribution, maxZoom: 16, className: "map-tiles" }),
      L.tileLayer(REF, { pane: "labels", maxZoom: 16, className: "map-labels" }),
    ];
    tileLayers.forEach((layer) => layer.addTo(map));
  }

  function renderDemands() {
    if (!map) return;
    demandLayer.clearLayers();
    markers.clear();

    const colors = { acute: token("--acute"), tight: token("--tight"), healthy: token("--healthy") };
    const stroke = token("--surface");
    const list = Mend.demandList();

    list.forEach((d) => {
      const marker = L.circleMarker([d.lat, d.lng], {
        radius: radiusFor(d.budget),
        fillColor: colors[d.severity] || colors.tight,
        fillOpacity: 0.9,
        color: stroke,
        weight: 1.5,
        opacity: 1,
        className: "gap-marker sev-" + d.severity + (Mend.state.selected === d.id ? " is-selected" : ""),
      });
      marker.bindPopup(popupNode(d), { closeButton: true, minWidth: 200, maxWidth: 250, offset: [0, 4] });
      marker.addTo(demandLayer);
      markers.set(d.id, marker);
    });

    const empty = document.getElementById("map-empty");
    if (empty) empty.hidden = list.length > 0;
  }

  function visibleMakers() {
    const f = Mend.state.filters;
    const q = f.q.trim().toLowerCase();
    return Mend.data.MANUFACTURERS.filter((m) => {
      if (f.category !== "all" && !m.categories.includes(f.category)) return false;
      if (f.region !== "all" && m.region !== f.region) return false;
      if (q && !(m.name + " " + m.city + " " + m.country).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderFactories() {
    if (!map) return;
    factoryLayer.clearLayers();
    visibleMakers().forEach((m) => {
      const icon = L.divIcon({
        className: "factory-pin" + (m.verified ? "" : " is-unverified"),
        html: "<i></i>",
        iconSize: [11, 11],
        iconAnchor: [5.5, 5.5],
      });
      const marker = L.marker([m.lat, m.lng], { icon, keyboard: false, title: m.name });
      marker.bindTooltip(
        "<b>" + Mend.esc(m.name) + "</b><br>" + Mend.esc(m.city) + " · " + m.leadTimeDays + " d lead",
        { direction: "top", offset: [0, -4], opacity: 1 }
      );
      marker.addTo(factoryLayer);
    });
  }

  function init() {
    if (map) return;
    const el = document.getElementById("map");
    if (!el) return;
    if (!window.L) {
      el.innerHTML = '<p class="map-fallback">The map needs a network connection. The demand table below carries the same data.</p>';
      return;
    }

    map = L.map(el, {
      zoomControl: true,
      scrollWheelZoom: false,
      worldCopyJump: true,
      minZoom: 1.5,
      maxZoom: 9,
      zoomSnap: 0.25,
    }).setView([16, 12], 2.25);
    map.attributionControl.setPrefix(false);
    map.createPane("labels");
    map.getPane("labels").style.zIndex = 350;
    map.getPane("labels").style.pointerEvents = "none";

    addTileLayer();
    demandLayer = L.layerGroup().addTo(map);
    factoryLayer = L.layerGroup();
    if (showFactories) factoryLayer.addTo(map);
    renderFactories();
    renderDemands();
    fit();

    let narrow = window.innerWidth < 720;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!map) return;
        map.invalidateSize();
        const next = window.innerWidth < 720;
        if (next !== narrow) {
          narrow = next;
          renderDemands();
          fit();
        }
      }, 160);
    });
  }

  function fit() {
    if (!map) init();
    if (!map) return;
    const list = Mend.demandList();
    if (!list.length) {
      map.setView([16, 12], 2.25);
      return;
    }
    if (list.length === 1) {
      map.setView([list[0].lat, list[0].lng], 5);
      return;
    }
    const bounds = L.latLngBounds(list.map((d) => [d.lat, d.lng]));
    map.fitBounds(bounds, { padding: [38, 38], maxZoom: 5 });
  }

  function select(id) {
    markers.forEach((marker, key) => {
      const el = marker.getElement();
      if (!el) return;
      el.classList.toggle("is-selected", key === id);
    });
  }

  function focus(id) {
    if (!map) init();
    if (!map) return;
    const marker = markers.get(id);
    if (!marker) return;
    select(id);
    const target = Math.max(map.getZoom(), 4.5);
    map.flyTo(marker.getLatLng(), target, { duration: 0.75 });
  }

  function refreshTheme() {
    if (!map) return;
    addTileLayer();
    renderDemands();
    renderFactories();
  }

  function setFactories(on) {
    showFactories = !!on;
    if (!map) return;
    if (showFactories) factoryLayer.addTo(map);
    else map.removeLayer(factoryLayer);
  }

  function render() {
    renderDemands();
    renderFactories();
  }

  Mend.map = { init, render, fit, focus, select, refreshTheme, setFactories };
})();
