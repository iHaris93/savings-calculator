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
  - The wizard card is shown first; once the user clicks **Show estimate**, the results card replaces the wizard. Choosing **Edit answers** or **Start over** returns to the wizard and hides results again.

- **Live comparison** (`live.html`)
  - Two-column "inputs vs results" layout designed for demos and screen-shares.
  - Updates instantly as you type.
  - Optimized for quick exploration and "what if we change X?" conversations.

Both modes:

- Use the **same math core** (`assets/calc-core.js`).
- Share the same **canonical URL parameter schema** (see below).
- Are just two different views over the **same scenario and inputs**.
- Offer an inline Guided/Live mode switch pill in the main content (no separate product header), so swapping views feels like staying on the same page.

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

**Important:** existing standard IP cameras can usually be **reused**. As long as they are compatible, there is **no rip-and-replace requirement** for every camera. The UI includes an explicit **Yes/No question** ("Do you already have standard IP cameras installed?") to make this reuse explicit in the math.

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

The newer dual-mode calculator treats software in a more explicit way than the original "single optional software cost" field. In Live mode, the user picks analytics via two checkboxes under **Sighthound software analytics**:

- Per-camera pricing (monthly, canonical values):
  - **LPR** checked, MMCG unchecked → `software = lpr` → `$30 / camera / month`.
  - **MMCG** checked, LPR unchecked → `software = mmcg` → `$30 / camera / month`.
  - Both checked → `software = both` → `$55 / camera / month`.
  - Both unchecked → `software = none` → `$0 / camera / month` (hardware-only view).

- Billing view:
  - `billing = monthly`:
    - Shows monthly totals based directly on the per-camera rates.
  - `billing = yearly`:
    - Shows 12× the monthly totals for the same configuration.
    - This is a pure display change; the underlying math is always monthly.

Important constraints:

- **Hardware vs software**: hardware totals and savings cards are **always hardware-only**. Software is kept in its own section both on-screen and in the PDF.
- **No "software saves you money" baked into hardware results**: even if software spend changes, the primary savings card never includes it.

### Scenarios: A, B, and C (driven by Yes/No questions)

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
- Live exposes them via two Yes/No questions:
  - "Do you already have standard IP cameras installed?"
  - "Do you currently use smart / edge cameras with built-in analytics?"

### Existing camera and smart-camera questions

In the Live UI there are two Yes/No questions that together drive the A/B/C scenarios:

- **“Do you already have standard IP cameras installed?”** → `hasExistingCameras`.
- **“Do you currently use smart / edge cameras with built-in analytics?”** → `hasSmartCameras`.

When `hasExistingCameras = 1`:

- We still compute `nodesNeeded` the same way.
- The camera hardware component in the Sighthound total becomes zero (cameras are reused):
  - Sighthound only charges for Compute Nodes in that scenario.
- The helper text and Scenario B note make it explicit that existing IP cameras are being reused and that no new camera hardware cost is added on the Sighthound side.

Conceptually:

``` 
if hasExistingCameras:
  sighthoundCameraHardwareTotal = 0
else:
  sighthoundCameraHardwareTotal = totalCameras × dumbCameraCost

sighthoundTotal = nodesNeeded × 3500 + sighthoundCameraHardwareTotal
```

If both questions would otherwise be answered “Yes”, the implementation automatically corrects the conflicting one to “No” and shows a small note explaining that a camera cannot be both standard and smart at the same time.

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

**A layered framework for AI-assisted development with consistent standards and workflows.**

Copyright © 2025-2026 Jonathan Taylor (visionik@pobox.com). See [LICENSE.md](./LICENSE.md) for usage terms.

## 🎯 What is Warping?

Warping is a structured approach to working with AI coding assistants (particularly Warp AI) that provides:

- **Consistent coding standards** across languages and projects
- **Reproducible workflows** via task-based automation
- **Self-improving guidelines** that evolve with your team
- **Hierarchical rule precedence** from general to project-specific
- **Lazy loading** - only read files relevant to current task (see [REFERENCES.md](./REFERENCES.md))

## 📝 Notation Legend

Warping uses compact notation for requirements:

- **!** = MUST (required, mandatory)
- **~** = SHOULD (recommended, strong preference)
- **≉** = SHOULD NOT (discouraged, avoid unless justified)
- **⊗** = MUST NOT (forbidden, never do this)

This notation appears in technical standard files (python.md, go.md, etc.) for scanability. Based on RFC 2119.

## 📚 The Layers

Warping uses a layered architecture where more specific rules override general ones:

```
user.md          ← Highest precedence (personal preferences)
  ↓
project.md       ← Project-specific rules and workflows
  ↓
python.md        ← Language-specific standards
go.md
  ↓
taskfile.md      ← Tool-specific guidelines
  ↓
main.md          ← General AI guidelines and agent behavior
  ↓
specification.md ← Lowest precedence (project requirements)
```

### 📁 Directory Structure

```
warping-0.2.0/
├── README.md              # This file
├── main.md                # Entry point - general AI guidelines
│
├── core/                  # Core framework files
│   ├── project.md         # Project template
│   ├── user.md            # User preferences (highest precedence)
│   └── ralph.md           # Ralph loop concept (draft)
│
├── coding/                # Coding standards
│   ├── coding.md          # General coding guidelines
│   └── testing.md         # Testing standards
│
├── languages/             # Language-specific standards
│   ├── cpp.md
│   ├── go.md
│   ├── python.md
│   └── typescript.md
│
├── interfaces/            # Interface types
│   ├── cli.md             # Command-line interfaces
│   ├── rest.md            # REST APIs
│   ├── tui.md             # Terminal UIs
│   └── web.md             # Web UIs
│
├── tools/                 # Tooling and workflow
│   ├── git.md             # Git conventions
│   ├── github.md          # GitHub workflows
│   ├── taskfile.md        # Task automation
│   └── telemetry.md       # Observability
│
├── swarm/                 # Multi-agent coordination
│   └── swarm.md           # Swarm guidelines
│
├── templates/             # Templates and examples
│   ├── make-spec.md       # Spec generation guide
│   ├── make-spec-example.md
│   └── specification.md   # Project spec template
│
└── meta/                  # Meta/process files
    ├── code-field.md      # Coding mindset
    ├── ideas.md           # Future directions
    ├── lessons.md         # Learnings
    └── suggestions.md     # Improvements
```

### 🔧 Core Files

**main.md** - Entry point, general AI guidelines
**coding/coding.md** - Software development standards
**coding/testing.md** - Testing standards
**core/project.md** - Project-specific template
**core/user.md** - Your personal preferences (highest precedence)

### 🐍 Languages

**languages/python.md** - Python standards (≥85% coverage, mypy strict, ruff/black)
**languages/go.md** - Go standards (≥85% coverage, Testify)
**languages/typescript.md** - TypeScript standards (strict mode, Vitest)
**languages/cpp.md** - C++ standards (C++20/23, Catch2/GoogleTest)

### 💻 Interfaces

**interfaces/cli.md** - Command-line interface patterns
**interfaces/rest.md** - REST API design
**interfaces/tui.md** - Terminal UI (Textual, ink)
**interfaces/web.md** - Web UI (React, Tailwind)

### 🛠️ Tools

**tools/taskfile.md** - Task automation best practices
**scm/git.md** - Commit conventions, safety
**scm/github.md** - GitHub workflows
**tools/telemetry.md** - Logging, tracing, metrics

### 🐝 Swarm

**swarm/swarm.md** - Multi-agent coordination patterns

### 📝 Templates

**templates/make-spec.md** - Specification generation
**templates/specification.md** - Project spec template

### 🧠 Meta

**meta/code-field.md** - Coding mindset and philosophy
**meta/lessons.md** - Codified learnings (AI-updatable)
**meta/ideas.md** - Future directions
**meta/suggestions.md** - Improvement suggestions

## 🚀 Getting Started

### Quick Start with `wrun`

Warping includes a CLI tool (`wrun`) for setup and configuration:

```bash
# 1. Install warping in your project
wrun install              # Creates ./warping/ directory structure

# 2. Configure your personal preferences (run from warping directory)
wrun bootstrap            # Creates user.md with your preferences

# 3. Configure project settings
wrun project              # Creates project.md with tech stack, standards

# 4. Generate specification (optional)
wrun spec                 # Creates PRD.md for AI-assisted spec interview

# Other commands
wrun reset                # Reset config files
wrun validate             # Check warping configuration
wrun doctor               # Check system dependencies
```

The commands flow naturally: **install → bootstrap → project → spec**

### 1. Set Up Your User Preferences

Or manually edit `user.md` to configure personal preferences:

```markdown
# User Preferences

## Name

Address the user as: **YourName**

## Custom Rules

- Your custom preferences here
```

### 2. Understand the Hierarchy

Rules cascade with precedence:

1. **user.md** (highest) - your personal overrides
2. **project.md** - project-specific rules
3. **Language files** (python.md, go.md) - language standards
4. **Tool files** (taskfile.md) - tool guidelines
5. **main.md** - general AI behavior
6. **specification.md** (lowest) - requirements

### 3. Reference in Warp

Upload these files to **Warp Drive** so they're available to AI sessions:

1. Open Warp
2. Access Warp Drive (notebooks feature)
3. Upload relevant warping/\*.md files
4. Reference them in your Warp rules/agent instructions

### 4. Use in Projects

For each project:

1. Copy or link the warping directory
2. Create/update `project.md` with project-specific rules
3. Create/update `specification.md` or link to specs
4. Let the AI reference these during development

### 5. Evolve Over Time

The warping process improves continuously:

- AI updates `lessons.md` when learning better patterns
- AI notes ideas in `ideas.md` for future consideration
- AI suggests improvements in `suggestions.md`
- You update `user.md` with new preferences
- You update language/tool files as standards evolve

## 💡 Key Principles

### Task-Centric Workflow with Taskfile

**Why Taskfile?**

Warping uses [Taskfile](https://taskfile.dev) as the universal task runner for several reasons:

1. **Makefiles are outdated**: Make syntax is arcane, portability is poor, and tabs vs spaces causes constant friction
2. **Polyglot simplicity**: When working across Python (make/invoke/poetry scripts), Go (make/mage), Node (npm scripts/gulp), etc., each ecosystem has different conventions. Taskfile provides one consistent interface
3. **Better than script sprawl**: A `/scripts` directory with dozens of bash files becomes chaotic—hard to discover, hard to document, hard to compose. Taskfile provides discoverability (`task --list`), documentation (`desc`), and composition (`deps`)
4. **Modern features**: Built-in file watching, incremental builds via checksums, proper error handling, variable templating, and cross-platform support

**Usage:**

```bash
task --list        # See available tasks
task check         # Pre-commit checks
task test:coverage # Run coverage
task dev           # Start dev environment
```

### Test-Driven Development (TDD)

Warping embraces TDD as the default development approach:

1. **Write the test first**: Define expected behavior before implementation
2. **Watch it fail**: Confirm the test fails for the right reason
3. **Implement**: Write minimal code to make the test pass
4. **Refactor**: Improve code quality while keeping tests green
5. **Repeat**: Build features incrementally with confidence

**Benefits:**

- Tests become specifications of behavior
- Better API design (you use the API before implementing it)
- High coverage naturally (≥85% is easy when tests come first)
- Refactoring confidence
- Living documentation

**In Practice:**

```bash
task test          # Run tests in watch mode during development
task test:coverage # Verify ≥75% coverage
task check         # Pre-commit: all quality checks including tests
```

### Quality First

- ≥85% test coverage (overall + per-module)
- Always run `task check` before commits
- Run linting, formatting, type checking
- Never claim checks passed without running them

### Spec-Driven Development (SDD)

Before writing any code, warping uses an AI-assisted specification process:

**The Process:**

1. **Start with make-spec.md**: A prompt template for creating specifications

   ```markdown
   I want to build **\_\_\_\_** that has the following features:

   1. Feature A
   2. Feature B
   3. Feature C
   ```

2. **AI Interview**: The AI (Claude or similar) asks focused, non-trivial questions to clarify:
   - Missing decisions and edge cases
   - Implementation details and architecture
   - UX considerations and constraints
   - Dependencies and tradeoffs

   Each question includes numbered options and an "other" choice for custom responses.

3. **Generate SPECIFICATION.md**: Once ambiguity is minimized, the AI produces a comprehensive spec with:
   - Clear phases, subphases, and tasks
   - Dependency mappings (what blocks what)
   - Parallel work opportunities
   - No code—just the complete plan

4. **Multi-Agent Development**: The spec enables multiple AI coding agents to work in parallel on independent tasks

**Why SDD?**

- **Clarity before coding**: Catch design issues early
- **Parallelization**: Clear dependencies enable concurrent work
- **Scope management**: Complete spec prevents scope creep
- **Onboarding**: New contributors/agents understand the full picture
- **AI-friendly**: Structured specs help AI agents stay aligned

**Example**: See `make-spec.md` template in Warp Drive for the interview process

### Convention Over Configuration

- Use Conventional Commits for all commits
- Use hyphens in filenames, not underscores
- Keep secrets in `secrets/` directory
- Keep docs in `docs/`, not project root

### Safety and Reversibility

- Never force-push without permission
- Assume production impact unless stated
- Prefer small, reversible changes
- Call out risks explicitly

## 📖 Example Workflows

### Starting a New Python Project

1. AI reads: `main.md` → `python.md` → `taskfile.md`
2. AI sets up: pytest, ruff, black, mypy, Taskfile
3. AI configures: ≥85% coverage, PEP standards
4. You customize: `project.md` with project specifics

### Working on an Existing Go Project

1. AI reads: `user.md` → `project.md` → `go.md` → `main.md`
2. AI follows: go.dev/doc/comment, Testify patterns
3. AI runs: `task check` before suggesting changes
4. AI respects: your user.md overrides

### Code Review Session

1. AI references quality standards from language file
2. AI runs `task quality` and `task test:coverage`
3. AI checks Conventional Commits compliance
4. AI suggests improvements → adds to `suggestions.md`

## 🔗 Integration with Warp AI

The warping process is designed for Warp AI's rule system:

1. **Upload to Warp Drive**: Keep main.md and relevant files in Warp Drive
2. **Create Warp Rules**: Reference warping files in your Warp rules
3. **Project-Specific Rules**: Add `AGENTS.md` or `WARP.md` in project root that references warping
4. **Automatic Context**: Warp AI loads rules automatically when working in your projects

## 📝 Contributing to Warping

As you use warping:

1. **lessons.md**: AI adds patterns discovered during development
2. **ideas.md**: AI notes potential improvements
3. **suggestions.md**: AI records project-specific suggestions
4. Review these periodically and promote good ideas to main guidelines

## 🎓 Philosophy

Warping embodies:

- **Correctness over convenience**: Optimize for long-term quality
- **Standards over flexibility**: Consistent patterns across projects
- **Evolution over perfection**: Continuously improve through learning
- **Clarity over cleverness**: Direct, explicit, maintainable code

---

