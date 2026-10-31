/* =====================================================================
   MEND — mock data
   Illustrative only. Values are USD. Kept as plain objects so the page
   runs from file:// with no build step.
   ===================================================================== */
window.Mend = window.Mend || {};

Mend.data = (function () {
  "use strict";

  /** Product categories. `code` is used in dense table cells and pins. */
  const CATEGORIES = [
    { id: "transformers", name: "Power Transformers", code: "PWR", unit: "units" },
    { id: "battery", name: "Battery Materials", code: "BAT", unit: "t" },
    { id: "solar", name: "Solar Racking", code: "SOL", unit: "kits" },
    { id: "nutrition", name: "Processed Nutrition", code: "NUT", unit: "t" },
    { id: "steel", name: "Structural Steel", code: "STL", unit: "t" },
  ];

  /** Regions used by filters. Centroids place user-posted demands. */
  const REGIONS = [
    { id: "West Africa", short: "W. AFRICA", lat: 9.5, lng: 2.5 },
    { id: "East Africa", short: "E. AFRICA", lat: 3.0, lng: 37.5 },
    { id: "Europe & Türkiye", short: "EU / TR", lat: 48.0, lng: 15.0 },
    { id: "North America", short: "N. AMERICA", lat: 38.0, lng: -95.0 },
    { id: "South Asia", short: "S. ASIA", lat: 21.0, lng: 78.0 },
  ];

  /** Severity scale: red = acute, amber = tight, green = healthy. */
  const SEVERITY = {
    acute: { label: "Acute", long: "Acute gap", rank: 0 },
    tight: { label: "Tight", long: "Tight", rank: 1 },
    healthy: { label: "Healthy", long: "Healthy", rank: 2 },
  };

  const MANUFACTURERS = [
    {
      id: "m1", name: "Lekki Power Equipment Ltd", city: "Lagos", country: "Nigeria",
      region: "West Africa", lat: 6.44, lng: 3.47, categories: ["transformers"],
      certs: ["IEC 60076", "ISO 9001", "SON MANCAP"], capacity: 120, capacityUnit: "units",
      leadTimeDays: 75, priceIndex: 0.92, verified: true, exportReady: true, refs: 14,
      blurb: "Distribution transformers 50 kVA–2.5 MVA, copper-wound, assembled in Lagos with local tank fabrication.",
    },
    {
      id: "m2", name: "Kano Steelworks & Fabrication", city: "Kano", country: "Nigeria",
      region: "West Africa", lat: 12.0, lng: 8.52, categories: ["steel", "solar"],
      certs: ["ISO 9001", "SON MANCAP", "EN 1090"], capacity: 800, capacityUnit: "t",
      leadTimeDays: 21, priceIndex: 0.88, verified: true, exportReady: false, refs: 22,
      blurb: "Hot-dip galvanised sections and ground-mount solar racking. Spare slots from Q1 2027.",
    },
    {
      id: "m3", name: "Accra Agro-Nutrition Co.", city: "Accra", country: "Ghana",
      region: "West Africa", lat: 5.6, lng: -0.19, categories: ["nutrition"],
      certs: ["ISO 22000", "HACCP", "FDA Ghana", "NAFDAC"], capacity: 300, capacityUnit: "t",
      leadTimeDays: 30, priceIndex: 0.95, verified: true, exportReady: true, refs: 9,
      blurb: "Peanut-based RUTF and fortified blended foods to UNICEF specification.",
    },
    {
      id: "m4", name: "Tema Solar Structures", city: "Tema", country: "Ghana",
      region: "West Africa", lat: 5.67, lng: -0.02, categories: ["solar", "steel"],
      certs: ["ISO 9001", "EN 1090"], capacity: 6000, capacityUnit: "kits",
      leadTimeDays: 28, priceIndex: 0.9, verified: false, exportReady: false, refs: 4,
      blurb: "Roll-formed racking kits for C&I and utility solar. Verification visit scheduled.",
    },
    {
      id: "m5", name: "Pune Transformer Works", city: "Pune", country: "India",
      region: "South Asia", lat: 18.52, lng: 73.86, categories: ["transformers"],
      certs: ["IEC 60076", "BIS", "ISO 9001"], capacity: 400, capacityUnit: "units",
      leadTimeDays: 90, priceIndex: 0.85, verified: true, exportReady: true, refs: 31,
      blurb: "High-volume 11/33 kV distribution units with amorphous-core options.",
    },
    {
      id: "m6", name: "Gujarat CellTech Pvt", city: "Ahmedabad", country: "India",
      region: "South Asia", lat: 23.02, lng: 72.57, categories: ["battery"],
      certs: ["ISO 9001", "IATF 16949", "UN 38.3"], capacity: 2000, capacityUnit: "t",
      leadTimeDays: 40, priceIndex: 0.91, verified: true, exportReady: true, refs: 17,
      blurb: "Cathode precursor and LFP cell materials; buys and refines black mass.",
    },
    {
      id: "m7", name: "Anatolia Grid Systems", city: "Ankara", country: "Türkiye",
      region: "Europe & Türkiye", lat: 39.93, lng: 32.86, categories: ["transformers"],
      certs: ["IEC 60076", "ISO 14001", "CE"], capacity: 250, capacityUnit: "units",
      leadTimeDays: 60, priceIndex: 1.0, verified: true, exportReady: true, refs: 26,
      blurb: "Power transformers to 160 MVA with OLTC; strong MENA and Africa delivery record.",
    },
    {
      id: "m8", name: "Bursa Steel Profiles", city: "Bursa", country: "Türkiye",
      region: "Europe & Türkiye", lat: 40.19, lng: 29.06, categories: ["steel", "solar"],
      certs: ["EN 1090", "ISO 9001", "CE"], capacity: 1500, capacityUnit: "t",
      leadTimeDays: 35, priceIndex: 0.97, verified: true, exportReady: true, refs: 19,
      blurb: "Cold-formed and hot-rolled profiles; Zn-Al-Mg coated tracker components.",
    },
    {
      id: "m9", name: "Rhein Circular Metals GmbH", city: "Duisburg", country: "Germany",
      region: "Europe & Türkiye", lat: 51.43, lng: 6.76, categories: ["battery"],
      certs: ["ISO 14001", "ISO 45001", "EU Battery Reg."], capacity: 600, capacityUnit: "t",
      leadTimeDays: 45, priceIndex: 1.18, verified: true, exportReady: true, refs: 12,
      blurb: "Hydrometallurgical recovery of Li, Co and Ni with EU battery-passport traceability.",
    },
    {
      id: "m10", name: "Ikeja Battery Recyclers", city: "Lagos", country: "Nigeria",
      region: "West Africa", lat: 6.6, lng: 3.35, categories: ["battery"],
      certs: ["ISO 14001", "NESREA Permit"], capacity: 200, capacityUnit: "t",
      leadTimeDays: 14, priceIndex: 0.8, verified: false, exportReady: false, refs: 3,
      blurb: "Collects and shreds Li-ion packs into black mass; lithium-rich feedstock awaiting export buyers.",
    },
  ];

  /** 12 open demands. `note` is the why-this-is-a-gap line in the brief. */
  const DEMANDS = [
    {
      id: "d1", title: "500 × 11/33kV distribution transformers", buyer: "Eko DISCO",
      buyerType: "Utility", buyerVerified: true, category: "transformers", qty: 500, unit: "units",
      spec: "IEC 60076 · 500 kVA · ONAN · copper windings",
      city: "Lagos", country: "Nigeria", region: "West Africa", lat: 6.45, lng: 3.39,
      deadline: "2027-01-20", budget: 9500000, severity: "acute", source: "Public tender", bids: 3,
      note: "Eko DISCO's 2027 reinforcement plan is short of locally wound 500 kVA units. Two regional makers hold IEC 60076 and both are booked past Q1.",
    },
    {
      id: "d2", title: "200 t lithium cobalt cathode scrap", buyer: "Baltic Cell Manufacturing",
      buyerType: "Manufacturer", buyerVerified: true, category: "battery", qty: 200, unit: "t",
      spec: "LCO cathode scrap · ≥ 55% Co+Li content · assay certificate",
      city: "Gdańsk", country: "Poland", region: "Europe & Türkiye", lat: 54.35, lng: 18.65,
      deadline: "2026-12-18", budget: 4200000, severity: "tight", source: "Procurement notice", bids: 5,
      note: "European cell makers are shifting from Asian cathode scrap to certified short-haul supply. Polish assay requirements favour EU recyclers.",
    },
    {
      id: "d3", title: "5,000 solar mounting kits", buyer: "Sahel EPC Ltd",
      buyerType: "EPC", buyerVerified: true, category: "solar", qty: 5000, unit: "kits",
      spec: "Ground-mount · hot-dip galvanised · 2P portrait for 550 W modules",
      city: "Abuja", country: "Nigeria", region: "West Africa", lat: 9.06, lng: 7.49,
      deadline: "2027-02-10", budget: 2750000, severity: "acute", source: "Infrastructure plan", bids: 2,
      note: "Sahel EPC has a 120 MW award but no racking contracted. West African hot-dip galvanising capacity is the binding constraint.",
    },
    {
      id: "d4", title: "120 × 33/0.415kV substation transformers", buyer: "Volta Grid Utility",
      buyerType: "Utility", buyerVerified: true, category: "transformers", qty: 120, unit: "units",
      spec: "IEC 60076 · 1 MVA · Dyn11 · ONAN",
      city: "Accra", country: "Ghana", region: "West Africa", lat: 5.56, lng: -0.21,
      deadline: "2027-03-05", budget: 3960000, severity: "tight", source: "Public tender", bids: 4,
      note: "Volta Grid is replacing oil-filled substation units. Local assembly exists, but 1 MVA test bays are scarce in the region.",
    },
    {
      id: "d5", title: "1,200 t ready-to-use therapeutic food", buyer: "Relief Nutrition Alliance",
      buyerType: "NGO", buyerVerified: true, category: "nutrition", qty: 1200, unit: "t",
      spec: "RUTF to UNICEF spec · 92 g sachets · Codex compliant",
      city: "Maiduguri", country: "Nigeria", region: "West Africa", lat: 11.85, lng: 13.16,
      deadline: "2026-12-05", budget: 3600000, severity: "acute", source: "NGO supply call", bids: 1,
      note: "Drought response needs 1,200 t inside 45 days. One regional RUTF line is certified to UNICEF spec; capacity is the gap, not price.",
    },
    {
      id: "d6", title: "40 × 132/33kV 60 MVA power transformers", buyer: "Lone Star Power Cooperative",
      buyerType: "Utility", buyerVerified: true, category: "transformers", qty: 40, unit: "units",
      spec: "IEEE C57.12 · 60 MVA · on-load tap changer",
      city: "Houston", country: "United States", region: "North America", lat: 29.76, lng: -95.37,
      deadline: "2027-06-30", budget: 64000000, severity: "acute", source: "Infrastructure plan", bids: 6,
      note: "Lone Star's 2027 order lands in a four-year national transformer backlog. US lead times run past 30 months; imported capacity is the arbiter.",
    },
    {
      id: "d7", title: "2,500 t galvanised structural steel", buyer: "Konza Infrastructure JV",
      buyerType: "EPC", buyerVerified: false, category: "steel", qty: 2500, unit: "t",
      spec: "S355 C-channels & I-beams · HDG to ISO 1461",
      city: "Nairobi", country: "Kenya", region: "East Africa", lat: -1.29, lng: 36.82,
      deadline: "2027-01-31", budget: 3100000, severity: "tight", source: "Procurement notice", bids: 3,
      note: "Konza's steel package is bid ahead of financial close and the buyer is still pending verification. Delivery precedes drawdown.",
    },
    {
      id: "d8", title: "400 × 11kV pole-mounted transformers", buyer: "Maharashtra DISCOM",
      buyerType: "Utility", buyerVerified: true, category: "transformers", qty: 400, unit: "units",
      spec: "IS 1180 · 100 kVA · amorphous core",
      city: "Mumbai", country: "India", region: "South Asia", lat: 19.07, lng: 72.88,
      deadline: "2027-02-28", budget: 3200000, severity: "healthy", source: "Public tender", bids: 9,
      note: "Amorphous-core tender is oversubscribed with nine bids. Local capacity covers the volume; this is a price contest, not a shortage.",
    },
    {
      id: "d9", title: "10,000 t battery-grade NMC black mass", buyer: "Carolina Cell Works",
      buyerType: "Manufacturer", buyerVerified: true, category: "battery", qty: 10000, unit: "t",
      spec: "NMC 622 black mass · ≤ 2% Al/Cu · traceable origin",
      city: "Charlotte", country: "United States", region: "North America", lat: 35.23, lng: -80.84,
      deadline: "2027-04-15", budget: 38000000, severity: "acute", source: "Procurement notice", bids: 2,
      note: "Carolina Cell Works needs traceable black mass at scale. Domestic recyclers cannot yet supply 10,000 t a year with full chain of custody.",
    },
    {
      id: "d10", title: "800 t RUTF for drought response", buyer: "Horn Relief Consortium",
      buyerType: "NGO", buyerVerified: false, category: "nutrition", qty: 800, unit: "t",
      spec: "Peanut-based RUTF · 24-month shelf life",
      city: "Addis Ababa", country: "Ethiopia", region: "East Africa", lat: 9.03, lng: 38.74,
      deadline: "2027-01-10", budget: 2400000, severity: "tight", source: "NGO supply call", bids: 2,
      note: "The call is time-boxed to the January distribution window while the buyer's verification is still open. Finance and origin certification matter more than price.",
    },
    {
      id: "d11", title: "12,000 ground-mount racking kits", buyer: "Rajasthan Solar Park SPV",
      buyerType: "EPC", buyerVerified: true, category: "solar", qty: 12000, unit: "kits",
      spec: "Single-axis tracker compatible · Zn-Al-Mg coated",
      city: "Jodhpur", country: "India", region: "South Asia", lat: 26.24, lng: 73.02,
      deadline: "2027-03-20", budget: 9600000, severity: "healthy", source: "Infrastructure plan", bids: 11,
      note: "Eleven bids and a long delivery window. Indian coated-steel capacity covers this comfortably; the differentiator is coating durability.",
    },
    {
      id: "d12", title: "1,800 t rebar & steel sections", buyer: "Port of Dakar Expansion",
      buyerType: "Government", buyerVerified: true, category: "steel", qty: 1800, unit: "t",
      spec: "B500B rebar + HEA sections · mill test certificates",
      city: "Dakar", country: "Senegal", region: "West Africa", lat: 14.72, lng: -17.47,
      deadline: "2027-02-15", budget: 1450000, severity: "healthy", source: "Public tender", bids: 7,
      note: "Port expansion needs mill certificates with the steel. Regional rebar capacity covers the tonnage; certification paperwork is the friction.",
    },
  ];

  /** Waste-to-value pairs. `fit` is a match score out of 100. */
  const SYMBIOSIS = [
    {
      id: "s1", from: { name: "Ikeja Battery Recyclers", city: "Lagos", country: "Nigeria" },
      to: { name: "Rhein Circular Metals GmbH", city: "Duisburg", country: "Germany" },
      material: "Li-ion black mass (NMC/LCO)", qty: 60, unit: "t", valuePerMonth: 228000, fit: 94,
      impact: "Buyer saves ~18% vs Asia-shipped feedstock",
    },
    {
      id: "s2", from: { name: "Kano Steelworks & Fabrication", city: "Kano", country: "Nigeria" },
      to: { name: "Onitsha Roofing Sheets Ltd", city: "Onitsha", country: "Nigeria" },
      material: "Galvanised steel offcuts ≥ 2 m", qty: 40, unit: "t", valuePerMonth: 26000, fit: 89,
      impact: "Offcuts become roofing purlins — zero landfill",
    },
    {
      id: "s3", from: { name: "Anatolia Grid Systems", city: "Ankara", country: "Türkiye" },
      to: { name: "Rhein Circular Metals GmbH", city: "Duisburg", country: "Germany" },
      material: "Copper winding scrap", qty: 8, unit: "t", valuePerMonth: 68000, fit: 86,
      impact: "Closed-loop copper with EU traceability",
    },
    {
      id: "s4", from: { name: "Accra Agro-Nutrition Co.", city: "Accra", country: "Ghana" },
      to: { name: "Kumasi BioPellet Ltd", city: "Kumasi", country: "Ghana" },
      material: "Peanut skins & husks", qty: 25, unit: "t", valuePerMonth: 3500, fit: 81,
      impact: "Biomass fuel; avoids open-field burning",
    },
    {
      id: "s5", from: { name: "Pune Transformer Works", city: "Pune", country: "India" },
      to: { name: "Nashik Motor Laminations", city: "Nashik", country: "India" },
      material: "CRGO electrical-steel trimmings", qty: 15, unit: "t", valuePerMonth: 18000, fit: 78,
      impact: "Trimmings re-slit into small-motor cores",
    },
    {
      id: "s6", from: { name: "Lekki Power Equipment Ltd", city: "Lagos", country: "Nigeria" },
      to: { name: "Lagos Oil Regeneration Co.", city: "Lagos", country: "Nigeria" },
      material: "Used transformer oil (regenerable)", qty: 12, unit: "kL", valuePerMonth: 9000, fit: 74,
      impact: "Regenerated oil re-enters the grid supply chain",
    },
  ];

  /** Financing programs. 'Global' / 'all' mean the program is not constrained. */
  const FINANCING = [
    {
      id: "f1", name: "AfDB Trade Finance Program", type: "Trade credit & risk participation",
      ticket: "US$1M–25M", regions: ["West Africa", "East Africa"], categories: ["all"],
      desc: "Credit lines and risk-sharing through partner banks for African importers and exporters.",
    },
    {
      id: "f2", name: "World Bank / IFC trade guarantees", type: "Letter-of-credit guarantees",
      ticket: "US$500k–50M", regions: ["Global"], categories: ["all"],
      desc: "Covers issuing-bank payment risk so suppliers ship against LCs from emerging-market buyers.",
    },
    {
      id: "f3", name: "DFI supply-chain trade credit", type: "Pre-shipment working capital",
      ticket: "US$250k–10M", regions: ["West Africa", "East Africa", "South Asia"],
      categories: ["transformers", "solar", "steel", "nutrition"],
      desc: "Working capital advanced against a confirmed Mend purchase order, so producers buy inputs before delivery.",
    },
    {
      id: "f4", name: "Export incentive schemes (NEXIM, EEG)", type: "Export loans & grants",
      ticket: "Up to 15% of FOB", regions: ["West Africa"], categories: ["all"],
      desc: "Concessional export finance and post-shipment grants for qualifying West African producers.",
    },
    {
      id: "f5", name: "Carbon-credit pre-financing", type: "Forward carbon offtake",
      ticket: "US$100k–5M", regions: ["Global"], categories: ["battery", "solar"],
      desc: "Advance against verified emission reductions from recycling and renewable-energy supply.",
    },
    {
      id: "f6", name: "Government localisation subsidies", type: "Capex & local-content support",
      ticket: "Varies by scheme", regions: ["West Africa", "South Asia", "North America"], categories: ["all"],
      desc: "Local-manufacturing funds and production-linked incentives that reward in-country value add.",
    },
  ];

  /** Matched deals feeding the commission ledger. */
  const TRANSACTIONS = [
    { id: "TX-1042", deal: "60 t RUTF → Relief Nutrition Alliance", supplier: "Accra Agro-Nutrition Co.", value: 180000, rate: 0.02, status: "Settled", date: "2026-09-14" },
    { id: "TX-1057", deal: "1,000 racking kits → Sahel EPC Ltd", supplier: "Kano Steelworks & Fabrication", value: 520000, rate: 0.02, status: "In escrow", date: "2026-10-02" },
    { id: "TX-1063", deal: "30 × 33kV transformers → Volta Grid Utility", supplier: "Pune Transformer Works", value: 690000, rate: 0.015, status: "Delivered", date: "2026-10-21" },
  ];

  const REVENUE = [
    { name: "Transaction fee", who: "Both sides", format: "1–3% of matched deal value" },
    { name: "Featured supplier listing", who: "Manufacturers", format: "$100–$1,000 monthly retainer" },
    { name: "Tender access", who: "Buyers", format: "Freemium — first 3 bids/month free" },
    { name: "Market intelligence", who: "Banks, DFIs, consultancies", format: "$2k–$20k annual subscription" },
    { name: "Verification fee", who: "Manufacturers", format: "One-time per certification check" },
  ];

  /** Seed activity; `mins` is relative to page load. */
  const SEED_ACTIVITY = [
    { mins: 12, text: "Verified badge granted to Bursa Steel Profiles — EN 1090 audit passed" },
    { mins: 47, text: "Gap radar: power transformers in West Africa escalated to acute" },
    { mins: 95, text: "TX-1063 marked delivered — 30 × 33kV transformers to Volta Grid" },
    { mins: 180, text: "New demand published: 5,000 solar mounting kits (Abuja)" },
    { mins: 320, text: "Symbiosis match found: Ikeja black mass → Rhein Circular Metals" },
    { mins: 1440, text: "TX-1057 funds placed in escrow — 1,000 racking kits" },
  ];

  return {
    CATEGORIES, REGIONS, SEVERITY, MANUFACTURERS, DEMANDS,
    SYMBIOSIS, FINANCING, TRANSACTIONS, REVENUE, SEED_ACTIVITY,
  };
})();
