# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Rule hierarchy for this repo

- Project agents should **start with `AGENTS.md`**, which delegates to the generic warping rules in `warping/main.md` (and related files).
- Those warping files (`warping/main.md`, `warping/python.md`, `warping/taskfile.md`, `warping/project.md`, `warping/user.md`) define global behavior, quality standards, and language/tool preferences.
- **This `WARP.md` is the source of truth for project-specific behavior for `hw-savings`** and should override any generic guidance that assumes a different tech stack (for example, Taskfile- or Python/CLI-specific commands).

## Commands & workflows

This project is a **static browser-only calculator**. There is no build step, package manager metadata, or Taskfile; all behavior runs directly in the browser with a small amount of Node-based test code.

### Running the calculator locally

- Open the calculator directly in a browser; no dev server is required.
  - From the repo root on macOS: `open index.html`
  - Or drag/drop `index.html` into Chrome, Edge, Safari, or Firefox.

### Tests (hardware savings math)

All automated tests target the pure calculation helpers in `script.js` using Node's built-in `node:test` module.

- **Run the full test suite** (from the repo root):
  - `node script.test.js`
- **Run a single test by name** using Node's test runner (Node 20+):
  - `node --test script.test.js --test-name-pattern 'validateInputs accepts valid values'`
- If you add more test files or change how tests are organized, update these commands here and in `README.md`.

### Build, lint, and formatting

- There is **no build pipeline** today; `index.html`, `script.js`, `styles.css`, and assets are served as-is.
- There is currently **no configured linter, formatter, or type checker** for the JavaScript.
  - Do not assume `npm`, `yarn`, `pnpm`, Taskfile, or other tooling exists unless you add it.
  - If you introduce tooling (e.g., ESLint, Prettier, a bundler), document the new commands here and in `README.md`.

## High-level architecture

### Overall structure

- This is a **single-page static web app** for comparing hardware strategies:
  - Scenario A: smart/edge AI cameras for every channel.
  - Scenario B: Sighthound Compute Nodes with existing standard IP cameras.
  - Scenario C: net-new deployments with Sighthound nodes + new standard IP cameras.
- There is **no backend**; all inputs, calculations, and UI updates run entirely in the browser.
- Hosting is expected to be via **GitHub Pages** and similar static hosting; the app is also embedded in Squarespace via an `<iframe>` (see `README.md` for exact URLs and snippets).

### Files that matter

- `index.html`
  - Owns **all markup and layout** for the calculator.
  - Uses **Tailwind CSS via CDN** plus a small inline `<style>` block for font and print/PDF behavior.
  - Layout:
    - Left column: **"Your setup"** – all user inputs (camera counts, existing/ smart camera toggles, IP camera cost, software selection, billing frequency, reset button).
    - Right column: **results and summary** – hardware cost comparison, primary savings/extra-cost card, deployment details (nodes, % reduction, per-camera cost), software cost overview, and export/CTA section.
  - Includes a **print-optimized layout**:
    - `@media print` rules restyle typography and spacing.
    - Reorders columns so results print above inputs and adds a print-only "Assumptions & definitions" section.
  - At the bottom, an inline `<script>` **wires the DOM to the calculator logic** exposed on `window.SighthoundCalculator`:
    - Reads inputs and toggles, handles three scenarios (A/B/C) based on the "existing standard IP" and "smart camera" toggles.
    - Calls `SighthoundCalculator.computeTotalsFromRaw` and related helpers to compute node counts, totals, savings, percent reduction, and per-camera costs.
    - Manages **URL query parameters** (`?cameras=...&smart=...&dumb=...`) so configurations can be shared or reloaded.
    - Implements **UI behaviors**:
      - Helper text toggles (ⓘ buttons) for most inputs.
      - "Show breakdown" / "Hide breakdown" progressive disclosure for detailed math.
      - Animated numeric transitions and subtle highlight rings so users can see which outputs changed in response to each input.
      - Export button that forces breakdown visibility and triggers `window.print()` for PDF export.

- `script.js`
  - Contains the **core domain logic and constants** used by both the browser UI and the Node tests:
    - `CAMERAS_PER_NODE`, `NODE_COST` (hardware assumptions).
    - Default smart and standard IP camera prices.
    - Sighthound software price points per camera per month for one service vs both services.
  - Exposes **pure, side-effect-free helpers**:
    - `parseNumberValue` / `parseNumberInput` – tolerant numeric parsing for user input.
    - `calculateNodesNeeded`, `calculateCurrentTotal`, `calculateSighthoundTotal`, `calculateSavings` – the basic hardware math.
    - `getSoftwareMonthlyPricePerCamera` – maps the UI software selection (`lpr`, `mmcg`, `both`) to a per-camera monthly dollar amount.
    - `validateInputs` – enforces range and type constraints on raw string inputs (camera counts and prices); returns `{ ok, reason, errorMessage?, values? }` for the UI to interpret.
    - `computeTotalsFromRaw` – orchestrates validation and all core calculations in one call, returning a structured `values` object used by the UI and tests.
    - `formatCurrency` and `formatPercent` – shared formatting helpers.
  - Attaches these functions and constants to `window.SighthoundCalculator` for the browser and also exports them via `module.exports` for Node.
  - This separation keeps **business logic testable and framework-agnostic**, while the DOM code in `index.html` focuses purely on presentation and interaction.

- `script.test.js`
  - Uses Node's `node:test` and `node:assert/strict` modules to exercise the pure helpers exported from `script.js`.
  - Coverage focuses on:
    - Node count calculations for various camera totals.
    - Hardware totals and savings math (`calculateCurrentTotal`, `calculateSighthoundTotal`, `calculateSavings`).
    - Input validation edge cases (empty/invalid camera counts, out-of-range prices).
    - End-to-end sanity for `computeTotalsFromRaw`.
    - Correct software pricing based on selection keys.
  - There are **no browser/DOM tests**; DOM behavior changes should usually be validated manually in the browser.

## When extending or modifying the app

- Keep **math and assumptions** centralized in `script.js` and covered by `script.test.js`. If you change constants or formulas, update tests and `README.md` together.
- Maintain the contract that **UI code talks to `window.SighthoundCalculator`** rather than re-implementing math in the inline script.
- Preserve the **URL-parameter-based state sharing** and print/PDF behavior unless you intentionally redesign those flows; several sales and embedding use cases rely on them.
- If you introduce build tooling, additional tests, or new entry points, document the new commands in this file so future Warp agents can discover and run them reliably.
