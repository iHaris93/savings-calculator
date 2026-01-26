# Hardware Savings Calculator

This repository contains a small, static web app that helps compare two hardware strategies for AI-enabled video systems:

- Buying smart / Edge AI cameras for every location
- Using Sighthound Compute Hardware with standard IP cameras

The calculator is intended for external, customer-facing use. It is often used in sales conversations, demos, and follow-up emails where we need to show hardware cost tradeoffs clearly and honestly.

The primary problem it solves is making it easy to compare hardware capital costs between these two approaches without asking the user to understand our product in depth.

---

## 1) Project overview

### What this calculator does

At a high level, the calculator:

- Takes a camera count and two price points (smart AI camera vs standard IP camera)
- Estimates how many Sighthound Compute Nodes are required
- Compares total hardware cost of:
  - "Today" (smart AI cameras everywhere)
  - "With Sighthound" (Compute Nodes + standard IP cameras)
- Shows savings (or extra cost), percent reduction, and cost per camera

All results are based on fixed, documented assumptions about hardware capacity and pricing (see below).

### Who it is for

- Prospects and customers evaluating Sighthound hardware
- Channel partners who need a simple way to explain edge compute economics
- Sighthound sales and SEs who want a quick, visual cost story in meetings

This is **public-facing**: copy and behavior should be safe to put in front of customers as-is.

### Modes: Guided estimate vs Live comparison

The calculator is delivered as a **dual-mode, single-site** experience:

- **Guided estimate** (`index.html`)
  - Narrative, step-by-step wizard.
  - Helps a prospect or partner answer a few structured questions and then see one coherent estimate.
  - Emphasizes assumptions, scenario framing, and explanations.

- **Live comparison** (`live.html`)
  - Two-column "inputs vs results" layout designed for demos and screen-shares.
  - Updates instantly as you type.
  - Optimized for quick exploration and "what if we change X?" conversations.

Both modes:

- Use the **same math core** (`assets/calc-core.js`).
- Share the same **canonical URL parameter schema** (see below).
- Are just two different views over the **same scenario and inputs**.

### What problem it solves

Buying smart AI cameras for every location pushes AI compute into each device, which is often expensive and inflexible. Sighthound’s approach centralizes AI compute into a dedicated node that can serve multiple standard IP cameras.

The calculator answers: *“If we move compute into a Sighthound node instead of buying smart cameras, how does our upfront hardware spend change?”*

---

## 2) Core concept

The tool compares two concrete hardware architectures:

### a) Smart / Edge AI cameras

- Each camera contains its own AI compute
- You buy as many smart cameras as you have camera channels
- Total cost scales linearly with camera count and smart camera price

### b) Sighthound Compute Node + standard IP cameras

- AI compute lives in a dedicated **Sighthound Compute Node**
- Each Compute Node can handle multiple standard IP cameras
- Cameras themselves are simpler and cheaper

**Important:** existing standard IP cameras can usually be **reused**. As long as they are compatible, there is **no rip-and-replace requirement** for every camera. The UI includes a toggle for "we already have standard IP cameras" to make this reuse explicit in the math.

---

## 3) Key assumptions (conceptual)

These assumptions are intentional and should not be changed casually. They are encoded in constants and unit tests.

- **Capacity:** Each Sighthound Compute Node supports **up to 4 cameras**
- **Node price:** Each Compute Node is fixed at **$3,500**
- **Scope:** The calculator is **hardware-only**
  - No SaaS, licensing, or cloud subscription fees in the core totals
  - No bandwidth, storage, or retention assumptions
  - No labor, installation, or ongoing operations
- **Audience:** This is a pre-sales estimation tool, not a full TCO/ROI model

If you need to change any of these (for example, if hardware pricing changes), update the constants in code **and** keep this section in sync so the behavior remains transparent.

---

## 4) Calculator logic

### Core formulas

The core math is deliberately simple and should stay that way.

Given:

- `totalCameras` – total camera channels in the deployment
- `smartCameraCost` – hardware price per smart AI camera
- `dumbCameraCost` – hardware price per standard IP camera

The calculator computes:

1. **Compute Nodes required**

   ```
   nodesNeeded = ceil(totalCameras / 4)
   ```

   - We use `ceil()` (round up) because you cannot buy a fraction of a Compute Node.
   - If you have 5–8 cameras, you still need 2 nodes; 9–12 cameras require 3 nodes, etc.

2. **Current (smart camera) total cost**

   ```
   currentTotal = totalCameras × smartCameraCost
   ```

3. **Sighthound hardware total (new deployment)**

   ```
   sighthoundTotal = nodesNeeded × 3500 + totalCameras × dumbCameraCost
   ```

   This is the base case where you are buying both the Compute Nodes and the standard IP cameras.

4. **Savings (or extra cost)**

   ```
   savings = currentTotal − sighthoundTotal
   ```

5. **Percent reduction**

   ```
   percentReduction = (savings / currentTotal) × 100
   ```

6. **Cost per camera (before and after)**

   ```
   costPerCameraBefore = currentTotal / totalCameras
   costPerCameraAfter  = sighthoundTotal / totalCameras
   ```

7. **Software pricing model (bundles + billing)**

The newer dual-mode calculator treats software in a more explicit way than the original "single optional software cost" field:

- Per-camera pricing (monthly, canonical values):
  - **LPR only** (`software = lpr`): `$30 / camera / month`
  - **MMCG only** (`software = mmcg`): `$30 / camera / month`
- **LPR + MMCG bundle** (`software = both`): `$55 / camera / month`
- **No analytics** (`software = none`): `$0 / camera / month` *(default)*

- Billing view:
  - `billing = monthly`:
    - Shows monthly totals based directly on the per-camera rates.
  - `billing = yearly`:
    - Shows 12× the monthly totals for the same configuration.
    - This is a pure display change; the underlying math is always monthly.

Important constraints:

- **Hardware vs software**: hardware totals and savings cards are **always hardware-only**. Software is kept in its own section both on-screen and in the PDF.
- **No "software saves you money" baked into hardware results**: even if software spend changes, the primary savings card never includes it.

### Scenarios: A, B, and C

Internally, the calculator supports three deployment scenarios. These are not separate codepaths; they are all handled by the same `computeScenarioResults(params)` function in `assets/calc-core.js`. The scenario is derived from the `hasSmartCameras` / `hasExistingCameras` flags:

- **Scenario A – Smart cameras today vs Sighthound**
  - Detection: `hasSmartCameras = 1`.
  - Assumptions:
    - Today you primarily deploy smart / edge cameras with built-in AI.
    - We compare that architecture directly against Sighthound Compute Nodes + standard IP cameras.
  - Behavior:
    - "Today" total = `cameras × smartCost`.
    - "With Sighthound" total = `nodes × NODE_COST + cameras × ipCost`.
    - Savings card, percent reduction, and per-camera **before/after** are shown.
    - This is the classic "smart vs Sighthound" story.

- **Scenario B – Existing standard IP deployment (reuse)**
  - Detection: `hasSmartCameras = 0` and `hasExistingCameras = 1`.
  - Assumptions:
    - You already own standard IP cameras.
    - Sighthound reuses this installed base; there is **no new camera hardware spend**.
  - Behavior:
    - "Existing camera hardware" is treated as already paid for.
    - Sighthound hardware total = `nodes × NODE_COST` only.
    - On-screen:
      - "Today" column: "Already installed" instead of a dollar value.
      - Savings % and "before" per-camera cost are **hidden** (we cannot honestly compute them).
      - Only "after" per-camera enablement cost is shown.
    - PDF output mirrors the same semantics (no synthetic "today" dollar total).

- **Scenario C – New deployment**
  - Detection: `hasSmartCameras = 0` and `hasExistingCameras = 0`.
  - Assumptions:
    - There is no existing camera hardware; both smart cameras and IP cameras would be net new.
  - Behavior:
    - Sighthound side: `nodes × NODE_COST + cameras × ipCost` (new deployment sized with nodes + IP cameras).
    - There is no real "today vs Sighthound" baseline yet.
    - On-screen and in the PDF:
      - "Today" is labeled as "No current cameras (new deployment)" and shown as a dash rather than a number.
      - Savings % and "before" per-camera cost are hidden.
      - Only Sighthound deployment totals and per-camera cost are highlighted.

Both Guided and Live are just different UIs over these same scenarios:

- Guided exposes them as:
  - Smart / edge cameras today.
  - Existing standard IP cameras.
  - New deployment.
- Live exposes them via two toggles:
  - "Do you already have standard IP cameras installed?"
  - "Do you currently use smart / edge cameras with built-in analytics?"

### Existing camera toggle

In the UI there is a toggle for **“We already have standard IP cameras installed in this system.”** When this is checked:

- We still compute `nodesNeeded` the same way.
- The camera hardware component in the Sighthound total becomes zero:
  - Sighthound only charges for Compute Nodes in that scenario.
- The helper text under the toggle changes to make it explicit that existing IP cameras are being reused and that no new camera hardware cost is added on the Sighthound side.

Conceptually:

``` 
if existingCameras:
  sighthoundCameraHardwareTotal = 0
else:
  sighthoundCameraHardwareTotal = totalCameras × dumbCameraCost

sighthoundTotal = nodesNeeded × 3500 + sighthoundCameraHardwareTotal
```

### Why negative savings are still shown

The calculator always shows the result, even when `savings` is negative (i.e., Sighthound hardware costs more than the smart camera baseline for a given scenario).

- This is **intentional**: the tool is for honest comparison, not only “good” examples.
- In the UI, negative savings are labeled as **“Extra cost vs today”** and styled in red; positive savings are labeled as **“Savings vs today”** and styled in green.
- The primary savings card background also changes (neutral/positive gradient vs subtle warning tint) so the overall state of the scenario is visually clear.
- This avoids misleading users into thinking Sighthound is *always* cheaper on hardware alone.

---

## 5) UX design decisions

### Two-column layout

On larger screens, the calculator uses a two-column layout:

- **Left column:** inputs (camera count, smart camera cost, IP camera cost)
- **Right column:** calculated results

Reasons:

- Keeps cause (inputs) and effect (results) visible side by side
- Reduces scrolling in demos and screen shares
- Matches common “form on the left, summary on the right” mental model

On smaller screens the layout stacks, but the source order is unchanged: inputs first, then results.

### Result ordering

Within the results column, cards appear in this order:

1. **Costs comparison** – current approach vs Sighthound total hardware cost
2. **Savings card** – main callout with savings or extra cost and directional arrow
3. **Deployment details** – nodes required, percent reduction, cost per camera
4. **CTA / follow-up** – links to contact Sighthound or email support

Reasons:

- Users first see **absolute costs** ("what am I spending now vs with Sighthound?")
- Then they see **delta** (savings or extra cost), framed clearly as a difference
- Finally, they can inspect **details** and take action (CTA)

This ordering is important – do not move the savings card above the absolute costs, or it becomes easy to misread the savings number as the total cost.

### Input and state cues

The UI deliberately includes several affordances to make the state of the calculator obvious:

- A short subheader under the main title explains, in one sentence, what the calculator does and how it is used.
- A compact "Step 1 / Step 2" strip under **How this works** reinforces the flow:
  - Step 1: enter camera counts and hardware costs.
  - Step 2: review savings and deployment details.
- A small note – "Updates instantly as you type" – encourages experimentation and confirms that the tool is reactive.
- The **Total cameras** input is explicitly marked with a **Required** pill so visitors know it must be filled in before any useful results appear.
- The software cost field is labeled as **Optional** and visually tagged as such, to avoid implying it is needed for the core hardware estimate.

### Progressive disclosure (breakdown)

The cost breakdown (how we arrived at the totals) is **hidden by default** behind a "Show breakdown" toggle.

- Default state shows only high-level numbers – clear for non-technical users
- When a user clicks **Show breakdown**, we display:
  - The smart camera side: camera count × smart camera price
  - The Sighthound side: number of nodes × node price, and cameras × IP camera price (or a note that existing cameras are reused)

Purpose:

- **Clarity first:** most users just need a trustworthy summary
- **Proof second:** power users and skeptics can expand to verify every step of the math

### Reset behavior and URL parameters

The **Reset calculations** button:

- Clears the camera count
- Resets camera prices back to their defaults
- Unchecks the existing cameras and “share details” checkboxes
- Clears all calculator-related URL query parameters

Clearing URL parameters is deliberate:

- Shared calculator links store the current state in the URL (camera count and prices)
- Resetting should return to a neutral starting point, not keep stale values in the address bar
- It avoids confusion when copying links after changing scenarios

---

## 6) Tech stack and why

The calculator is intentionally simple from a technology standpoint.

- **HTML:** single-page app in `index.html`
- **CSS:** Tailwind CSS via CDN, plus minimal custom styles
- **JavaScript:**
  - Plain browser JavaScript for all interaction and calculations
  - Core math logic in `script.js` with unit tests in `script.test.js`

There is **no front-end framework** (no React, Vue, etc.) and **no build step**.

Reasons for this choice:

- **Fast load:** only a single HTML file, Tailwind CDN, and a small amount of JS
- **Easy handoff:** any web developer can understand and modify the code without learning a specific framework
- **Simple hosting:** works on any static host or even directly from the filesystem
- **Minimal dependencies:** avoids keeping a JS toolchain up to date for such a small tool

If you are considering adding a framework or bundler, treat that as a significant architectural change and get buy-in first.

---

## 7) Do’s and Don’ts for future changes

### Do

- **Keep the math logic centralized**
  - Pure calculation functions live in `script.js` and are covered by `script.test.js`.
  - If you change the formulas, update the tests alongside the code.
- **Preserve fixed constants unless pricing truly changes**
  - `CAMERAS_PER_NODE` and `NODE_COST` should only change when product capacity or pricing changes.
- **Keep UI copy concise and public-facing**
  - Assume anything on the page can be shown in sales decks or shared with customers.
  - Favor clear, literal language over marketing slogans.
- **Maintain URL-based state sharing**
  - The calculator persists camera count and price inputs into URL parameters.
  - URL read/write logic is centralized in `assets/state.js` (`readState()`, `writeState(state)`, `buildUrl(targetPage)`).
  - When extending the app, keep this behavior intact so links remain shareable.

### Don’t

- **Don’t add SaaS, ROI, or operational cost assumptions** without explicit product/PM approval
  - The tool is intentionally hardware-only; more complex financial modeling belongs in a separate calculator.
- **Don’t change cameras-per-node logic** without validating hardware limits
  - Capacity assumptions must reflect real-world deployment guidance.
- **Don’t reorder results** in a way that makes savings look like the total cost
  - Cost comparison should stay before the savings callout.
- **Don’t introduce heavy frameworks or a complex build pipeline** without strong justification
  - Any such change should clearly pay for itself in maintainability or new capabilities.

---

## 8) Extensibility notes

### Safe areas to extend

These are generally low-risk changes as long as you keep the core assumptions and math intact:

- **Styling:**
  - Adjust Tailwind classes, spacing, colors, and typography.
  - Improve responsiveness while keeping the two-column structure and card ordering.
- **Copy:**
  - Clarify labels, helper text, and explanations.
  - Add more contextual text around who this is for and how to interpret results.
- **CTA behavior:**
  - Update links, add tracking parameters, or change CTA copy.
  - The checkbox that controls whether details are included in links/emails can be extended, but keep it explicit and opt-in.
- **Preset scenarios:**
  - Add buttons or links that pre-fill the form with common deployments (e.g., retail store, warehouse) using URL parameters or small helpers.

### Risky areas

Treat changes here carefully and keep tests and documentation in sync:

- **Core math:**
  - Any change to node capacity, pricing, or formulas for totals/savings.
- **Assumptions:**
  - Expanding beyond hardware-only, or changing what is assumed about existing cameras.
- **Savings labeling and sign logic:**
  - The UI intentionally distinguishes between savings and extra cost, with color and copy changes.
  - Avoid making changes that could make negative outcomes look positive or ambiguous.

### Canonical URL-backed state (Guided + Live)

Both `index.html` (Guided) and `live.html` (Live) read and write a **shared canonical param object** via `assets/params-schema.js` and `assets/state-sync.js`. Any change in one mode is reflected in the other as soon as you switch modes or copy the URL.

#### Core parameters

- `cameras`
  - Meaning: total number of camera streams in the scenario.
  - Type: integer, clamped `0–10,000`.
  - Used for: node count, hardware totals, software totals.

- `hasExistingCameras`
  - Meaning: whether there is an installed base of **standard IP cameras** that can be reused.
  - Values: `0` or `1`.
  - Used for: **Scenario B** detection (see above) and to decide whether to charge for new camera hardware.

- `hasSmartCameras`
  - Meaning: whether the current environment uses **smart / edge cameras** with built-in analytics.
  - Values: `0` or `1`.
  - Used for: **Scenario A** detection.

- `smartCost`
  - Meaning: per-camera hardware cost for smart / edge cameras in the "today" baseline.
  - Type: number `>= 0`. Default `3000`.
  - Used for: the "Today" (smart-camera) side of Scenario A and internal baselines.

- `ipCost`
  - Meaning: per-camera hardware cost for standard IP cameras.
  - Type: number `>= 0`. Default `250`.
  - Used for: Sighthound camera hardware totals in scenarios where new IP cameras are purchased.

> Note: there is **no separate `scenario` param** in the URL. Instead, the scenario is derived from these flags:
> - `hasSmartCameras=1` → Scenario A (smart cameras today vs Sighthound).
> - `hasExistingCameras=1` and no smart cameras → Scenario B (existing IP cameras reused).
> - Both flags `0` → Scenario C (new deployment).

#### Software and billing parameters

- `software`
  - Meaning: which Sighthound analytics bundle is selected.
  - Values:
    - `none` – no analytics (hardware-only view).
    - `lpr` – License Plate Recognition only.
    - `mmcg` – Make / Model / Color / Generation only.
    - `both` – bundled LPR + MMCG.
  - Default: `both`.
  - Used for: per-camera monthly software pricing via `SOFTWARE_PRICING` in `calc-core`.

- `billing`
  - Meaning: display mode for recurring software costs.
  - Values:
    - `monthly`
    - `yearly`
  - Default: `monthly`.
  - Behavior:
    - All pricing is defined **per camera per month** in `calc-core`.
    - `yearly` view simply shows 12× the monthly totals; hardware math is unchanged.

#### Presentation / UX parameters

- `expandBreakdown`
  - Meaning: whether cost breakdown sections start expanded.
  - Values: `0` or `1`.
  - Default: `0`. Only `1` is written to the URL.

- `showAssumptions`
  - Reserved for future use. Same 0/1 semantics as `expandBreakdown`.

#### URL formatting rules

The param helpers in `assets/params-schema.js` enforce a few normalization rules:

- Out-of-range or invalid values are coerced back to safe defaults.
- `cameras` is omitted from the URL when `0` so an empty state produces a clean URL.
- Boolean flags are only written when `1` (truthy); `0` is treated as "unset" and omitted.
- Unknown query parameters are ignored.

All read/write logic for this schema lives in:

- `assets/params-schema.js` – `readParamsFromUrl`, `normalizeParams`, `buildSearchFromParams`.
- `assets/state-sync.js` – `initState()` with a small observable state container and debounced `history.replaceState`.

---

## 9) How to run / edit

There is no build or server requirement.

- Open `index.html` directly in a modern browser (Chrome, Edge, Safari, Firefox).
- Edit HTML/CSS/JS in your editor of choice.
- For math changes, run the Node tests locally:
  - `node script.test.js` (using Node’s built-in `node:test` module).

All logic that affects customers runs entirely in the browser – there is no backend.

---

## 10) Final note

This calculator prioritizes **clarity, trust, and correctness** over visual flash or marketing.

- It should always be obvious what assumptions are being made.
- Numbers should be easy to sanity-check with a basic calculator.
- Negative outcomes should be shown just as honestly as positive ones.

Because this tool is often used live in sales conversations and demos, small changes to copy, math, or layout can have outsized impact on how Sighthound’s value is perceived. When in doubt, favor transparency and simplicity, and keep this README up to date with any behavior changes.

---

## GitHub Pages & Squarespace embedding

- Canonical repository: `https://github.com/sighthoundinc/hw-savings`
- Enable GitHub Pages for this repository:
  - In GitHub, go to **Settings → Pages**.
  - Under **Source**, choose **Deploy from branch**.
  - Select the `main` branch and `/ (root)` folder.
- Expected public URL:
  - `https://sighthoundinc.github.io/hw-savings/`
- Note: use **relative paths** for local assets (no leading `/`) because GitHub Pages serves this app from `/hw-savings/`.
  - When adding assets, prefer paths like `assets/...` instead of `/assets/...` so the app continues to work inside an `<iframe>`.

Squarespace embed example:

```html
<iframe
  src="https://sighthoundinc.github.io/hw-savings/"
  style="width: 100%; min-height: 700px; border: 0;"
  loading="lazy"
></iframe>
```

- In Squarespace, add a **Code** block and paste the `<iframe>` snippet.
- If you change the GitHub Pages settings or repository name, update the `src` URL to match.
## 11) Changelog

For a complete history of changes, see `CHANGELOG.md`.

- **2026-01-22**
  - Added visual emphasis to the Scenario A savings card using green/red styling while keeping underlying math unchanged.
  - Introduced smooth fade transitions when switching between smart/standard/new deployment scenarios so content no longer snaps.
  - Implemented value-change highlighting on key result cards (cost comparison, deployment details, software summary, savings) so changes caused by each input are immediately visible.
  - Kept the standard IP camera cost input always visible across scenarios, while still reusing existing cameras in Scenario B math.
  - Improved print/PDF behavior: stacked results above inputs, added a page break before **Your setup**, and adjusted spacing for more compact export.
  - Ensured hardware and software breakdown lines clearly show quantity × unit price (e.g., `Compute Nodes: 3 x $3,500.00 = $10,500.00`).
  - Added a Sighthound logo to the export header above the results section for branded PDF output.

- **2026-01-13**
  - Clarified the top-of-page hero copy to explain the calculator in one sentence.
  - Added a compact "Step 1 / Step 2" strip under *How this works* and a note that results update instantly.
  - Marked the **Total cameras** input as *Required* and the software cost field as *Optional* in the UI.
  - Improved savings card visual states so positive savings vs extra cost are clearly distinguished by color and background.
  - Tightened the existing cameras toggle helper text to make reuse of standard IP cameras explicit.
  - Made the optional monthly software comparison section appear only when a software cost per camera is provided, and documented this behavior.
