# Sighthound Hardware Savings Calculator

Static web app comparing hardware costs: **smart AI cameras** vs **Sighthound Compute Nodes + standard IP cameras**.

---

## Quick Reference

| Mode | File | Purpose |
|------|------|--------|
| Guided | `index.html` | Step-by-step wizard for prospects |
| Live | `live.html` | Real-time two-column layout for demos |

**Shared core:** Both modes use identical math (`assets/calc-core.js`) and URL state schema.

---

## File Structure

```
├── index.html              # Guided estimate wizard
├── live.html               # Live comparison (instant updates)
├── assets/
│   ├── calc-core.js        # All calculation logic + constants
│   ├── params-schema.js    # URL parameter definitions + validation
│   ├── state-sync.js       # URL ↔ UI state synchronization
│   ├── roi-chart.js        # Canvas-based ROI timeline chart
│   ├── pdf-render.js       # Client-side PDF generation
│   ├── pdf-template.html   # PDF layout template
│   ├── guided.js           # Guided mode UI logic
│   ├── script.js           # Live mode UI logic
│   └── print.css           # Print/PDF styles
└── scripts/
    └── generate-pdf.js     # Headless PDF generation (Puppeteer)
```

---

## URL Parameters (Canonical Schema)

All parameters defined in `assets/params-schema.js`. Both modes read/write the same schema.

### Core Inputs

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cameras` | int | 0 | Total camera count (0–10,000) |
| `hasSmartCameras` | 0\|1 | 0 | Current setup uses smart/edge AI cameras |
| `hasExistingCameras` | 0\|1 | 0 | Has existing standard IP cameras to reuse |
| `smartCost` | number | 3000 | Per-camera cost: smart AI camera |
| `ipCost` | number | 250 | Per-camera cost: standard IP camera |

### Software Pricing

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `software` | enum | `both` | Analytics bundle: `none`, `lpr`, `mmcg`, `both` |
| `billing` | enum | `monthly` | Display: `monthly` or `yearly` |
| `todaySoftware` | number | 0 | Current monthly software cost (for ROI comparison) |

### UI State

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `expandBreakdown` | 0\|1 | 0 | Cost breakdown sections expanded |
| `roiExpanded` | 0\|1 | 0 | ROI timeline panel expanded |

### Special Flags

| Param | Type | Description |
|-------|------|-------------|
| `print` | 1 | Triggers headless PDF mode (sets `window.__PDF_READY__`) |

---

## Calculation Logic

### Constants (`calc-core.js`)

```javascript
CAMERAS_PER_NODE = 4
NODE_COST = 3500
SOFTWARE_PRICING = { none: 0, lpr: 30, mmcg: 30, both: 55 }  // per camera/month
```

### Hardware Formulas

```
nodesNeeded = ceil(cameras / 4)
currentTotal = cameras × smartCost                    // Scenario A only
sighthoundHardware = nodesNeeded × 3500 + (cameras × ipCost if new cameras needed)
savings = currentTotal − sighthoundHardware
```

### Scenarios (derived from flags)

| Scenario | Condition | "Today" Column | Sighthound Side |
|----------|-----------|----------------|-----------------|
| A | `hasSmartCameras=1` | `cameras × smartCost` | nodes + IP cameras |
| B | `hasExistingCameras=1` | "Already installed" | nodes only (cameras reused) |
| C | Both flags = 0 | "New deployment" | nodes + IP cameras |

### ROI Calculation (`computeRoi()`)

Computes 5-year cumulative costs comparing current setup vs Sighthound:

```javascript
// Monthly costs
currentMonthly = todaySoftware
sighthoundMonthly = cameras × SOFTWARE_PRICING[software]

// Year N cumulative
currentCost[year] = currentHardware + (currentMonthly × 12 × year)
sighthoundCost[year] = sighthoundHardware + (sighthoundMonthly × 12 × year)
```

**Break-even:** First month where `sighthoundCost ≤ currentCost`.

**ROI Messages** (returned by `computeRoi()`):
- `"You save money from day one"` — Sighthound cheaper at month 0
- `"Sighthound pays for itself in X years Y mo"` — break-even found within 5 years
- `"Your current setup costs less over 5 years"` — no break-even in 5 years

---

## Features

### 1. Hardware Cost Comparison
- Side-by-side current vs Sighthound totals
- Savings/extra cost with percentage
- Cost per camera before/after
- Expandable breakdown showing line-item math

### 2. Software Pricing
- LPR, MMCG, or bundled analytics
- Monthly/yearly billing toggle
- Separate from hardware totals (never mixed)

### 3. ROI Timeline Visualization
- Canvas-based two-line chart (current vs Sighthound cumulative costs)
- Year 1, 3, 5 markers
- Break-even indicator dot
- Expandable panel (persists via `roiExpanded` URL param)
- Requires `todaySoftware` input for meaningful comparison

### 4. PDF Export
- Client-side generation via `pdf-render.js`
- Loads `assets/pdf-template.html` via XHR
- Includes ROI chart as PNG (canvas → data URL)
- **Requires HTTP server** (XHR blocked on `file://` due to CORS)

### 5. Headless PDF Generation
- Append `print=1` to URL
- Page sets `window.__PDF_READY__ = true` when complete
- Use with Puppeteer/Playwright for server-side generation
- Error flags: `window.__PDF_ERROR__`, `window.__PDF_ERROR_DETAIL__`

### 6. HubSpot Integration
- "Email PDF copy" form captures estimator URL
- Webhook → backend → Puppeteer → S3 → email delivery

---

## Running Locally

### Basic (no PDF export)
```bash
# Open directly in browser
open index.html
```

### With PDF Support
```bash
# Start local server (required for PDF export)
python3 -m http.server 8080
# Then open http://localhost:8080/
```

### Headless PDF Generation
```bash
cd scripts && npm install
npm run pdf -- "http://localhost:8080/live.html?cameras=50&hasSmartCameras=1" "./out/estimate.pdf"
```

---

## Development Notes

### Math Changes
1. Update constants/formulas in `assets/calc-core.js`
2. Update this README to match
3. Test both Guided and Live modes

### Adding URL Parameters
1. Add to schema in `assets/params-schema.js`
2. Wire in `state-sync.js` (if needed)
3. Update UI bindings in `guided.js` and `script.js`

### PDF Template Changes
1. Edit `assets/pdf-template.html`
2. Test with local HTTP server
3. Verify print styles in `assets/print.css`

---

## Deployment

- **GitHub Pages:** Deploy from `main` branch, root folder
- **URL:** `https://sighthoundinc.github.io/hw-savings/`
- **Embedding:** Use relative paths (no leading `/`) for iframe compatibility

```html
<iframe
  src="https://sighthoundinc.github.io/hw-savings/"
  style="width: 100%; min-height: 700px; border: 0;"
  loading="lazy"
></iframe>
```

---

## Design Principles

1. **Hardware-only core:** Software costs are separate; savings card never includes software
2. **Honest results:** Negative savings shown as "Extra cost" with red styling
3. **No backend:** All logic runs client-side
4. **URL = state:** Any configuration is shareable via URL
5. **No build step:** Plain HTML/CSS/JS, Tailwind via CDN
