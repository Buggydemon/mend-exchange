# Mend — Supply-Gap Exchange

A working front-end prototype of a verified B2B exchange where unfilled demand for critical goods meets manufacturers in underserved regions, with financing attached to close the gap.

**Live:** https://buggydemon.github.io/mend-exchange/

Every figure, buyer, and maker is illustrative mock data. Bids, posted demands, watchlists, and theme preference are stored in the browser's `localStorage` — there is no backend.

## What's inside

- **Gap radar** — Leaflet map of open demand, sized by contract value and coloured by shortage severity, with certified maker pins.
- **Demand board** — filterable, sortable table of 12 contracts; search and category/region filters are shared with the map.
- **Bids** — place, save, and withdraw bids (free tier capped at 3 bids per month), with validation and escrow guidance.
- **Maker directory** — 10 manufacturers with verification state, categories, lead times, and scale.
- **Finance hub** — guarantee and trade-finance programs matched to category and region.
- **Your desk** — KPIs, watchlist alerts, activity log, and a post-demand form.
- **Light/dark themes** — "ops terminal" paper-and-ink by default, night-shift palette on toggle, applied pre-paint to avoid a flash.

## Stack

Plain HTML, CSS, and JavaScript. No build step, no framework, no bundler.

- [Leaflet 1.9.4](https://leafletjs.com/) (pinned with SRI) with keyless Esri Canvas basemaps
- IBM Plex Sans/Mono from Google Fonts
- Hand-written design tokens and inline SVG icon sprite
- Classic scripts attached to `window.Mend`, so the site also runs from `file://`

## Structure

```
index.html          Semantic page shell, inline theme bootstrap, SVG sprite
assets/app.css      Design tokens, layout, components, responsive rules
js/data.js          Mock demands, makers, finance programs, categories
js/core.js          State, storage, formatting, shared helpers
js/map.js           Leaflet setup, markers, theme switching, fit/focus
js/render.js        Table, chart, alert, and finance rendering
js/app.js           Init, events, drawer, modals, filters, theme, bids
```

## Run locally

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8080
```

Then visit http://localhost:8080. The map and fonts need network access.

## Deploy

The repository is published with GitHub Pages from the `master` branch root. Push to `master` and Pages rebuilds automatically; `.nojekyll` keeps files served as-is.
