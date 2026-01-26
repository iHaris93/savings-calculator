# Phase 1: Live mode migration to shared core + URL state

See Warp plan document for full context. Summary:
- Introduce `assets/calc-core.js` for all math/constants and a `computeScenarioResults(params)` entry point.
- Introduce `assets/params-schema.js` for canonical URL param schema, defaults, and normalization.
- Introduce `assets/state-sync.js` to own URL ↔ in-memory state sync via `history.replaceState` with debouncing.
- Refactor `script.js` into the Live DOM wiring layer that uses the new core modules.
- Update `index.html` scripts to load `params-schema.js`, `state-sync.js`, `calc-core.js`, then `script.js` at the end of `<body>` and remove the inline wiring script and `assets/state.js` usage.
- Update `script.test.js` to exercise the new core module and keep `.github/workflows/tests.yml` running `node script.test.js`.
