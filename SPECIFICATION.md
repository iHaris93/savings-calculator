# Hardware Savings Calculator – Product & Technical Specification

## 1. Purpose

Provide a simple, public-facing web calculator that compares hardware capital costs between:

1. Buying smart / Edge AI cameras for every location, vs.  
2. Using Sighthound Compute Nodes with standard IP cameras.

The tool is used in sales conversations, demos, and follow-ups to make Sighthound’s hardware economics clear, honest, and easy to explain without deep product knowledge.

## 2. Scope

- **In scope**
  - Single-page, static web app running entirely in the browser.
  - Inputs for camera count and two price points (smart vs standard IP).
  - Toggle for “we already have standard IP cameras installed”.
  - URL-based state sharing (camera count and prices).
  - Reset behavior that returns the calculator to a neutral, documented baseline.
  - Honest representation of both positive **and negative** savings.
  - A small, optional software section that compares monthly software spend.

- **Out of scope**
  - Any non-hardware costs beyond the simple optional monthly software comparison (full SaaS bundles, detailed licensing, cloud, bandwidth, storage, retention, labor, install, operations).
  - End-to-end TCO/ROI modeling.
  - Authentication, permissions, or backend services.
  - Heavy JS frameworks or build pipelines.

## 3. Users & Use Cases

### 3.1 Primary users

- Prospects and customers evaluating Sighthound hardware.
- Channel partners needing a simple explanation of edge compute economics.
- Sighthound sales and SEs for live demos and follow-up emails.

### 3.2 Core use cases

1. **Quick comparison in a meeting**
   - Sales enters approximate camera count and typical hardware prices.
   - Shows “today vs. with Sighthound” costs side-by-side.
   - Optionally opens breakdown to answer “how did you get these numbers?”.

2. **Email follow-up / shared link**
   - Sales configures a scenario.
   - Copies URL (with query params) to send in email.
   - Recipient opens link and sees pre-filled inputs and results.

3. **Scenario exploration by a prospect**
   - Prospect modifies camera count and prices to match their environment.
   - Uses existing camera toggle to model reuse vs. full refresh.
   - Checks whether Sighthound is cheaper or more expensive in their case.

## 4. Modes & Entry Points

The calculator is delivered as a dual-mode, single-site experience. Both modes share the same math, constants, and URL parameter model; they differ only in layout and interaction style.

### 4.1 Modes

- **Guided estimate**
  - Entry point: `index.html`.
  - Primary audience: prospects and partners who want a structured, narrative walkthrough.
  - UX:
    - Card / step-based flow with progressive disclosure and contextual copy.
    - Emphasizes explanation, assumptions, and scenario framing.
  - Behavior:
    - Reads and writes the canonical URL parameters defined in this SPEC.
    - Uses shared calculation core for all hardware and software math.
    - Can be deep-linked via URL; mode is indicated but does not affect math.

- **Live comparison**
  - Entry point: `live.html`.
  - Primary audience: Sighthound sales and SEs for live demos and “on-the-fly” comparisons.
  - UX:
    - Two-column layout: inputs on the left, results on the right.
    - Results update instantly as inputs change.
  - Behavior:
    - Reads and writes the same canonical URL parameters as Guided.
    - Uses the same calculation core and constants.
    - Designed to stay on a single screen for typical demo resolutions.

### 4.2 Shared mode switch

- Both `index.html` and `live.html` include a shared **mode switch** with two options, rendered inline in the main content rather than as a separate branded page header:
  - “Guided estimate”
  - “Live comparison”
- The active mode is visually highlighted; the inactive mode is rendered as a secondary pill-style button.
- The surrounding chrome is intentionally minimal so the calculator feels like a single, continuous experience when embedded.

### 4.3 Mode switching behavior

- Clicking the inactive mode:
  - Reads the current canonical parameter set from the URL and in-memory state.
  - Updates the `mode` parameter to the target view.
  - Navigates:
    - From Guided → Live: `live.html?{same-query-params}`.
    - From Live → Guided: `index.html?{same-query-params}`.
- **State preservation**
  - All inputs that affect results (camera count, costs, scenarios, software, billing, etc.) are preserved when switching modes.
  - Mode is a **presentation concern only**; it must not change underlying calculations.

## 5. Canonical URL Parameter Schema

All math-relevant state and key presentation choices are represented via a single, canonical URL parameter schema. Both Guided and Live modes are views over the same parameter set.

### 5.1 Principles

- Every input that affects numbers or visible summaries **must** be representable as URL parameters.
- The schema is **mode-agnostic**:
  - `mode` selects the view; all other parameters are shared.
- Parameters are stable: renames or removals require SPEC, README, implementation, and test updates.
- Invalid or unknown values must be safely normalized back to documented defaults.

### 5.2 Core/common parameters

- `mode`
  - Values: `guided` | `live`.
  - Default: determined by the entry HTML (`index.html` vs `live.html`).
  - Behavior: treated as a presentation concern only; **does not affect math**.

- `cameras`
  - Meaning: total number of camera streams in the scenario.
  - Type: integer `>= 0`.
  - Default: `0` (UI may suggest a non-zero starting value).
  - Maps to: `totalCameras` in calculation functions.

### 5.3 Existing deployment flags and scenario derivation

- `hasExistingCameras`
  - Values: `0` or `1`.
  - Meaning: whether there is an installed base of standard IP cameras.
  - Used for: detecting reuse scenarios (Scenario B) and deciding whether to include new camera hardware cost on the Sighthound side.

- `hasSmartCameras`
  - Values: `0` or `1`.
  - Meaning: whether the current environment includes smart / edge cameras with built-in analytics.
  - Used for: detecting smart-camera baseline scenarios (Scenario A).

The high-level scenario (`a`, `b`, or `c`) is **derived from these flags**, not stored as a separate URL parameter:

- `hasSmartCameras = 1` → Scenario A (smart cameras today vs Sighthound).
- `hasSmartCameras = 0` and `hasExistingCameras = 1` → Scenario B (existing standard IP cameras reused).
- Both flags `0` → Scenario C (new deployment).

### 5.4 Hardware cost parameters

- `smartCost`
  - Meaning: per-camera hardware cost (or equivalent uplift) for smart / edge cameras in the “today” comparison.
  - Type: number `>= 0`.
  - Default: canonical smart camera cost from the calculation core when omitted.

- `ipCost`
  - Meaning: per-camera hardware cost for standard IP cameras.
  - Type: number `>= 0`.
  - Default: canonical IP camera cost from the calculation core when omitted.

- `currency`
  - Values: currently `usd` only.
  - Default: `usd`.
  - Behavior: affects formatting only; does not change underlying math.

### 5.5 Software configuration parameters

- `software`
  - Meaning: selected Sighthound software package for the scenario.
  - Values:
    - `none` – no software bundle selected.
    - `lpr` – License Plate Recognition only.
    - `mmcg` – Make / Model / Color / Generation only.
    - `both` – combined LPR + MMCG bundle.
  - Default: `both` (or product decision; must be kept in sync across code, tests, and this SPEC).

- `billing`
  - Meaning: software billing view used in the UI.
  - Values:
    - `monthly`
    - `yearly`
  - Default: `monthly`.
  - Behavior:
    - Underlying software prices are defined per camera per **month**.
    - `yearly` view multiplies by 12 for display only; hardware math remains unchanged.

### 5.6 Presentation / UX parameters

- `expandBreakdown`
  - Values: `0` or `1`.
  - Meaning: whether the cost breakdown sections start expanded on initial load.
  - Default: `0` (collapsed).

- `showAssumptions`
  - Values: `0` or `1`.
  - Meaning: whether the assumptions / definitions panel is visible by default.
  - Default: `0`.

### 5.7 Behavior & normalization

- On page load:
  - Both modes parse `location.search` into a raw parameter object.
  - A shared normalizer:
    - Validates and coerces types (numbers, booleans, enums).
    - Applies defaults for any missing or invalid values.
- On input change:
  - In-memory params are updated.
  - URL is updated via `history.replaceState` without full reload.
  - Both modes must use the same helper to transform params back into a query string.

- Backward compatibility:
  - New parameters must be optional and safely defaulted.
  - Old URLs that omit new params must still produce sensible defaults and not throw errors.

## 6. Scenarios & Software Configuration

This section defines the canonical scenarios (A/B/C), software bundles, and how they interact with the hardware comparison.

### 6.1 Hardware scenarios

All scenarios ultimately feed the same underlying hardware formulas (see Functional Requirements). The differences are in assumptions about what already exists.

- **Scenario A – Smart cameras today vs Sighthound**
  - Detection: `hasSmartCameras = 1`.
  - Assumptions:
    - Deployment uses smart / edge cameras today.
    - Comparison is against Sighthound Compute Nodes + standard IP cameras.

- **Scenario B – Existing standard IP deployment**
  - Detection: `hasSmartCameras = 0` and `hasExistingCameras = 1`.
  - Assumptions:
    - Customer already has standard IP cameras installed.
    - Sighthound reuses this installed base.

- **Scenario C – New deployment**
  - Detection: `hasSmartCameras = 0` and `hasExistingCameras = 0`.
  - Assumptions:
    - No existing cameras; both smart and IP camera hardware are net new.

Each mode (Guided / Live) may present these scenarios differently (e.g., labels, helper text), but they must map back to these canonical values and assumptions.

### 6.2 Software bundles and pricing

Software pricing is fixed per camera stream and is kept separate from hardware totals.

- **Canonical per-camera software prices (monthly)**
  - LPR only: `$30 / camera / month`.
  - MMCG only: `$30 / camera / month`.
  - Both (LPR + MMCG bundle): `$55 / camera / month`.

These values:

- Are treated as **business-critical constants**.
- Live in the shared calculation core and must be reflected consistently in:
  - Implementation.
  - Tests.
  - README.
  - This SPEC.

### 6.3 Software selection and billing

- **Software selection (`software` param)**
  - Drives which per-camera price is used.
  - Affects only **recurring software summaries**, not hardware totals.

- **Billing view (`billing` param)**
  - `monthly`:
    - Shows monthly software totals directly from per-camera monthly rates.
  - `yearly`:
    - Shows 12× the monthly totals for the same configuration.
    - Purely a display choice; does not alter any underlying assumptions.

### 6.4 Interaction with hardware savings

- Hardware savings cards and totals:
  - Are always **hardware-only**.
  - Do not incorporate software costs directly.
- Software sections:
  - Present recurring software costs and/or differences between packages.
  - Must be clearly labeled as “software” and “recurring”.
  - Must not be confused with the primary hardware savings number.

## 10. PDF / Print Export

The calculator supports a shared print/PDF export used by both modes for follow-ups and documentation.

### 7.1 Goals

- Provide a single, consistent PDF that:
  - Captures key inputs (cameras, costs, scenario, software, billing).
  - Shows the same hardware and software outputs as the on-screen view.
  - Includes a concise assumptions and definitions section.
- Ensure sales can:
  - Export a clean summary from either Guided or Live.
  - Attach it to emails or proposals without manual editing.

### 7.2 Behavior

- **Trigger**
  - A dedicated “Download estimate as PDF” or equivalent call-to-action exists (at minimum) in Live mode.
  - Guided mode may reuse the same print behavior via the shared export module.

- **Rendering**
  - Export is implemented via the browser’s print subsystem (`window.print()`).
  - A dedicated print root (`pdfRoot`) is populated with:
    - Hardware totals (today vs Sighthound).
    - Savings and percent reduction.
    - Node count and per-camera hardware costs.
    - Software recurring totals (monthly and yearly).
    - A snapshot of key inputs.
    - A short assumptions & definitions list.
  - Screen-only UI elements (helper buttons, mode switch, non-essential copy) are hidden in print.

### 7.3 Data source and consistency

- All values rendered into the PDF:
  - Must be computed from the same canonical calculation functions used by the on-screen UI.
  - Must use the **same** canonical URL parameter object as the page.
- Any change to:
  - Hardware formulas.
  - Software pricing.
  - Node capacity assumptions.
  - Must be reflected in:
    - On-screen cards.
    - PDF export.
    - README.
    - This SPEC.
    - Associated tests.

### 7.4 Layout requirements

- Logo and title:
  - Sighthound logo and a “Hardware savings estimate” title appear at the top.
- Sections:
  - Hardware totals.
  - Savings vs today.
  - Deployment details (nodes, per-camera costs).
  - Software costs (monthly and yearly).
  - Inputs snapshot.
  - Assumptions & definitions.
- Clarity:
  - Hardware vs software are visually and textually separated.
  - Negative savings (extra cost) use the same labeling rules as the on-screen view.

### 7.5 Cross-browser expectations

- PDFs must render acceptably in:
  - Chrome.
  - Edge.
  - Safari.
- At minimum:
  - No truncated content.
  - No missing critical sections.
  - Typography and spacing remain readable on standard page sizes.

## 8. Functional Requirements

### 9.1 Inputs

- **Camera count**
  - Field: integer `totalCameras`.
  - Constraints: must be a whole number between 1 and 10,000.
  - UX: numeric input; invalid/non-numeric should be handled gracefully (e.g., treated as empty).

- **Smart AI camera price**
  - Field: `smartCameraCost`.
  - Type: currency / number input.
  - Default: defined constant in code (value must align with README/UX copy).
  - Persisted in the URL when changed.

- **Standard IP camera price**
  - Field: `dumbCameraCost`.
  - Type: currency / number input.
  - Default: defined constant in code.
  - Persisted in the URL when changed.

- **Current software cost per camera per month (optional)**
  - Field: `currentSoftwareCostPerCamera`.
  - Type: currency / number input.
  - Default: empty (ignored when blank).
  - Not persisted in the URL (local, rough comparison only).

- **Existing cameras question**
  - Label: “Do you already have standard IP cameras installed?”
  - Representation: radio group with explicit **Yes** / **No** options.
  - Backing field: boolean `hasExistingCameras` (URL param), derived from the selected answer.
  - Behavior:
    - When **Yes**, Sighthound side assumes **zero** new camera hardware cost (cameras are reused).
    - When **No**, Sighthound side includes new standard IP camera hardware (per `ipCost`).
    - Always still requires Compute Nodes based on camera count.
    - Affects formula for `sighthoundTotal` (see below), **but does not change node capacity or price**.

- **Smart / edge cameras question**
  - Label: “Do you currently use smart / edge cameras with built-in analytics?”
  - Representation: radio group with explicit **Yes** / **No** options.
  - Backing field: boolean `hasSmartCameras` (URL param), derived from the selected answer.
  - Behavior:
    - When **Yes**, the calculator treats the "today" architecture as smart / edge cameras (Scenario A).
    - When **No**, the smart-camera baseline is not assumed; combined with the existing cameras answer, this yields Scenario B or C.
    - If both questions would otherwise be "Yes", the implementation automatically corrects the conflicting one to **No** and shows a small note that a camera cannot be both standard and smart at the same time.

- **Optional “share details” / CTA-related checkbox**
  - Boolean controlling inclusion of extra context in shared links/emails.
  - Exact behavior determined by existing implementation; requirement: keep it explicit and opt-in.

### 4.2 Calculations

All core formulas must remain simple, transparent, and centralized in pure JS functions with test coverage.

Given:

- `totalCameras` – number of camera channels.
- `smartCameraCost` – price per smart/AI camera.
- `dumbCameraCost` – price per standard IP camera.
- `CAMERAS_PER_NODE = 4`.
- `NODE_COST = 3500`.

The app computes:

1. **Compute Nodes required**

   ```
   nodesNeeded = ceil(totalCameras / CAMERAS_PER_NODE)
   ```

   - Use `ceil`, not rounding or floor.
   - `0` cameras → `0` nodes, if allowed by current implementation (must match tests).

2. **Current (smart camera) total cost**

   ```
   currentTotal = totalCameras × smartCameraCost
   ```

3. **Sighthound total hardware cost**

   - If **no existing cameras**:

     ```
     sighthoundCameraHardwareTotal = totalCameras × dumbCameraCost
     ```

   - If **existing cameras**:

     ```
     sighthoundCameraHardwareTotal = 0
     ```

   - Combined:

     ```
     sighthoundTotal = nodesNeeded × NODE_COST + sighthoundCameraHardwareTotal
     ```

4. **Savings (can be negative)**

   ```
   savings = currentTotal − sighthoundTotal
   ```

5. **Percent reduction**

   ```
   percentReduction = (savings / currentTotal) × 100
   ```

   - Edge cases (e.g., `currentTotal = 0`) must be handled explicitly to avoid `NaN`/`Infinity`.

6. **Cost per camera**

   ```
   costPerCameraBefore = currentTotal / totalCameras
   costPerCameraAfter  = sighthoundTotal / totalCameras
   ```

   - Edge case: `totalCameras = 0` must not produce `NaN` or crash; define behavior (e.g., show `–` or omit metrics) and keep code/tests consistent.

### 4.3 Display Logic

- **Costs comparison card**
  - Shows:
    - “Today” (smart camera approach) total cost.
    - “With Sighthound” total cost.
  - Must be the **first** result card in the right column.

- **Savings card**
  - Title and styling depend on sign of `savings`:
    - `savings > 0`: label as “Savings vs today”, positive color (e.g., green).
    - `savings < 0`: label as “Extra cost vs today”, negative color (e.g., red).
    - `savings = 0`: neutral representation (e.g., “No difference vs today”).
  - Shows magnitude of `savings` and `percentReduction`.

- **Deployment details card**
  - Shows:
    - `nodesNeeded`.
    - `percentReduction`.
    - `costPerCameraBefore` and `costPerCameraAfter`.
  - Copy emphasizes assumptions (hardware-only, no SaaS, etc.) and reuse of cameras when toggle is on.

- **CTA / follow-up card**
  - Provides links to contact Sighthound or email support.
  - May depend on “share details” checkbox.
  - Must be the **last** card.

### 9.4 Software configuration (bundles + billing)

The earlier single “current software cost per camera” input has been replaced by an explicit selection of Sighthound analytics bundles. Software is always kept separate from hardware and is modeled as recurring per-camera pricing.

- **Canonical per-camera software prices (monthly)**
  - LPR (`software = lpr`): `$30 / camera / month`.
  - MMCG (`software = mmcg`): `$30 / camera / month`.
  - Both (`software = both`): `$55 / camera / month`.
  - None (`software = none`): `$0 / camera / month`.

- **UI representation (Live mode)**
  - Two independent checkboxes:
    - “LPR” (on/off)
    - “MMCG” (on/off)
  - Mapping to the `software` URL param:
    - Both off → `none` (hardware-only view).
    - LPR on, MMCG off → `lpr`.
    - MMCG on, LPR off → `mmcg`.
    - Both on → `both`.

- **Billing view (`billing` param)**
  - Values: `monthly` | `yearly`.
  - Behavior:
    - All prices are defined per camera **per month** in the calc core.
    - `billing = yearly` simply multiplies monthly totals by 12 for display.
    - Hardware math is not affected by billing frequency.

- **Display rules**
  - Hardware totals and savings are always hardware-only.
  - Software cards and breakdown lines:
    - Show per-camera and total recurring costs based on the selected bundle and billing view.
    - Use language like “Your software costs (recurring)” and keep hardware vs software clearly separated.

- **Fixed Sighthound assumption**
  - `SIGHTHOUND_SOFTWARE_COST_PER_CAMERA = 30` (USD per camera per month).

- **User-provided value**
  - `currentSoftwareCostPerCamera` – visitor’s own software spend per camera per month.

- **Derived values (monthly)**
  - `softwareCurrentMonthly = totalCameras × currentSoftwareCostPerCamera`.
  - `softwareSighthoundMonthly = totalCameras × SIGHTHOUND_SOFTWARE_COST_PER_CAMERA`.
  - `softwareDeltaMonthly = softwareCurrentMonthly − softwareSighthoundMonthly`.

- **Display rules**
  - Only show numeric values when `currentSoftwareCostPerCamera` is provided and valid (≥ 0).
  - Show:
    - “Your software per month: …”
    - “Estimated Sighthound software per month: …”
    - “Monthly software difference: … (savings / extra cost)”
  - These values **do not affect** the main hardware totals or savings card.

### 4.5 Breakdown Toggle

- **Collapsed by default**.
- Label: “Show breakdown” / “Hide breakdown”.
- When expanded:
  - Show the math for both sides:

    - **Smart cameras**:
      - `totalCameras × smartCameraCost = currentTotal`.

    - **Sighthound**:
      - `nodesNeeded × NODE_COST`.
      - `+ totalCameras × dumbCameraCost` when not reusing cameras, with explicit text.
      - Or an explicit note that existing standard IP cameras are reused and no new camera hardware is purchased.

- Purpose: allow skeptical or technical users to verify numbers without cluttering the default view.

### 4.5 URL State & Reset

- **URL state**
  - Camera count and both price inputs must be encoded in query parameters.
  - Opening a URL with parameters pre-fills inputs and immediately shows consistent results.
  - Extending state to additional options (e.g., existing cameras toggle) is allowed, but must be done in a backward-compatible way (old URLs still behave sensibly).

- **Reset behavior**
  - “Reset calculations” button:
    - Clears camera count.
    - Resets prices to documented defaults.
    - Unchecks existing cameras and “share details” checkboxes.
    - Clears **all** calculator-related query parameters from the URL.
  - After reset, the app must be in a known, documented baseline state suitable for first-time users.

## 5. UX & Layout Requirements

- **Layout**
  - On large screens:
    - Two-column layout:
      - Left: inputs.
      - Right: results.
    - Inputs should stay above the fold with results visible in typical demo setups.
  - On small screens:
    - Stack vertically, but **DOM order remains inputs then results**.

- **Result card ordering**
  1. Costs comparison.
  2. Savings card.
  3. Deployment details.
  4. CTA / follow-up.

- **Copy tone**
  - Clear, literal, and customer-safe.
  - Avoid marketing fluff; emphasize assumptions and clarity.
  - Explain that this is **hardware-only** and a **pre-sales estimation** tool.

- **Color & sign handling**
  - Positive savings: visually positive, but not exaggerated.
  - Negative savings: clearly labeled as “Extra cost vs today” with appropriate cautionary styling.
  - Avoid any design that could mislead users into thinking a negative result is positive.

## 6. Non-Functional Requirements

- **Tech stack**
  - Single `index.html` with Tailwind CSS via CDN and minimal custom CSS.
  - Plain browser JavaScript in `script.js`.
  - Unit tests in `script.test.js` using Node’s built-in `node:test`.
  - No front-end frameworks (React/Vue/etc.) and **no build step**.

- **Performance**
  - Fast initial load over typical network conditions (small static assets only).
  - All interactions should feel instant for typical input sizes.

- **Hosting**
  - Must work on any static host and via direct `file://` open in a modern browser.
  - No backend server assumptions.

- **Testability**
  - All core calculation functions must be pure and test-covered.
  - Changing formulas or assumptions requires updating tests and this specification (plus README) to keep everything in sync.

## 7. Constraints & Assumptions

- `CAMERAS_PER_NODE = 4` and `NODE_COST = 3500` are **business-critical constants**:
  - Change only when product capacity or pricing changes.
  - Any change must be reflected in:
    - Code constants.
    - Tests.
    - README and this specification.

- The calculator will be used live in sales demos:
  - Small changes in copy or layout can affect perceived value.
  - Favor transparency and conservatism in assumptions.

## 8. Future Extensions (Non-goals for Now)

- Preset scenario buttons (e.g., “retail store”, “warehouse”) that pre-fill form via URL or scripted helpers.
- Richer breakdown (e.g., multi-site deployments).
- Integration with more complete TCO/ROI tools that include non-hardware costs.
- Optional localization of currency formatting and text.

---

## 9. Implementation Plan

This section breaks the work into phases, subphases, and tasks so multiple contributors can work in parallel. It is a **plan only**; no code is included.

### Phase 0 – Discovery & Alignment

**Goal:** Confirm current behavior, align README, SPECIFICATION, and implementation.

- **Task 0.1 – Inventory existing implementation**
  - Review `index.html`, `script.js`, `script.test.js`, and any CSS.
  - Confirm current inputs, layout, and calculation behavior.
  - Document any deviations from this SPEC.

- **Task 0.2 – Align documentation**
  - Ensure README and SPECIFICATION describe the same assumptions and formulas.
  - Note any open questions or ambiguous behaviors (e.g., handling of 0 cameras).

**Dependencies:** None.

### Phase 1 – Core Calculation Logic

**Goal:** Ensure all math is centralized, pure, and fully tested.

#### 1.1 Calculation Module

- **Task 1.1.1 – Define pure calculation functions**
  - Implement or refactor functions such as `computeNodesNeeded`, `computeTotals`, `computeSavings`, `computePercentReduction`, `computeCostPerCamera`.
  - Inputs: `totalCameras`, `smartCameraCost`, `dumbCameraCost`, `existingCameras`, constants.
  - Outputs: structured result object used by UI.

- **Task 1.1.2 – Edge case handling**
  - Explicitly define behavior for:
    - `totalCameras = 0`.
    - `smartCameraCost = 0` or `dumbCameraCost = 0`.
    - `currentTotal = 0` when computing percent.
  - Make sure functions never return `NaN` or `Infinity` to the UI.

#### 1.2 Unit Tests

- **Task 1.2.1 – Baseline test coverage**
  - Add tests for typical scenarios (small, medium, large camera counts; with and without existing cameras).
  - Verify node count, totals, savings, percent, and per-camera cost.

- **Task 1.2.2 – Edge case tests**
  - Test 0 cameras, extreme but reasonable price values.
  - Test both positive and negative savings paths and 0 savings.

**Dependencies:** Phase 0.

### Phase 2 – UI & Layout

**Goal:** Match required layout, ordering, and UX behavior.

#### 2.1 Input Panel (Left Column)

- **Task 2.1.1 – Input fields**
  - Ensure camera count and price inputs exist with proper labels, placeholders, and validation messaging.

- **Task 2.1.2 – Toggles and checkboxes**
  - Implement/verify existing cameras toggle behavior.
  - Implement/verify “share details” checkbox behavior.

#### 2.2 Results Panel (Right Column)

- **Task 2.2.1 – Card ordering**
  - Ensure the following order: costs comparison, savings card, deployment details, CTA.

- **Task 2.2.2 – Styling for savings vs extra cost**
  - Implement styling that clearly distinguishes positive vs negative savings.
  - Implement neutral styling for 0 savings case.

- **Task 2.2.3 – Deployment details content**
  - Ensure nodes required, percent reduction, and cost per camera are clearly labeled.

#### 2.3 Responsive Layout

- **Task 2.3.1 – Large screen layout**
  - Ensure two-column layout is used on larger viewports.

- **Task 2.3.2 – Small screen layout**
  - Stack vertically while keeping DOM order and tab order logical.

**Dependencies:** Phase 1 (for calculation outputs).

### Phase 3 – Breakdown & Transparency Features

**Goal:** Provide clear, optional breakdown of the math.

#### 3.1 Breakdown Toggle

- **Task 3.1.1 – Toggle UI**
  - Ensure a collapsed-by-default “Show breakdown” control exists.

- **Task 3.1.2 – Detailed math view**
  - Implement view that shows:
    - Smart side formula and result.
    - Sighthound side node cost and camera cost (or reuse note).

#### 3.2 Copy & Explanations

- **Task 3.2.1 – Assumptions copy**
  - Add or refine explanatory text about assumptions (hardware-only, constants, no SaaS, etc.).

**Dependencies:** Phase 1 and 2.

### Phase 4 – URL State & Reset Behavior

**Goal:** Ensure state is shareable via URL and reset returns to baseline.

#### 4.1 URL Query Parameters

- **Task 4.1.1 – Encode inputs into URL**
  - On change of camera count or prices, update URL query params without full page reload.

- **Task 4.1.2 – Initialize from URL**
  - On page load, read URL parameters and pre-fill inputs, then compute results.

#### 4.2 Reset Logic

- **Task 4.2.1 – Implement reset button behavior**
  - Clear inputs and toggle states to defaults.
  - Remove calculator-related query parameters from URL.

- **Task 4.2.2 – Verify behavior from all states**
  - Test reset after loading from a URL.
  - Test reset after multiple input changes.

**Dependencies:** Phase 1 and 2.

### Phase 5 – QA, Docs, and Polish

**Goal:** Final verification and alignment.

#### 5.1 QA & Cross-browser Testing

- **Task 5.1.1 – Functional QA**
  - Test across typical scenarios and edge cases.
  - Confirm no JS errors in console.

- **Task 5.1.2 – Cross-browser QA**
  - Test on modern versions of Chrome, Edge, Safari, Firefox.

#### 5.2 Documentation

- **Task 5.2.1 – README alignment**
  - Ensure README matches final behavior and constants.

- **Task 5.2.2 – SPEC maintenance notes**
  - Add note: any change to formulas, constants, or assumptions must update SPEC, README, tests, and implementation together.

**Dependencies:** All earlier phases.
