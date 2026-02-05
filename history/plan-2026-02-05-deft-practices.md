# Apply Deft Practices to Savings Calculator
## Problem Statement
The codebase has several Deft practice violations:
- 2 HTML files exceed 1000-line MUST limit (`live.html`: 1198, `index.html`: 1037)
- 2 JS files exceed 500-line SHOULD limit (`guided.js`: 703, `script.js`: 559)
- Documentation files in root instead of `docs/`
- Duplicate framework directories (`warping/` and `deft/`)
## Current State
### Files Over Limits
- `live.html` (1198 lines) - MUST fix
- `index.html` (1037 lines) - MUST fix
- `assets/guided.js` (703 lines) - SHOULD fix
- `script.js` (559 lines) - SHOULD fix
### Docs in Wrong Location
These should move to `docs/`: PRD.md, REFERENCES.md, SKILL.md, SPECIFICATION.md, main.md
### Duplication
Both HTML files share ~170 lines of HubSpot CSS and ~110 lines of PDF template HTML.
## Proposed Changes
### Phase 1: Extract Shared CSS (reduces HTML by ~150 lines each)
1. Create `assets/hubspot-form.css` with shared HubSpot styling
2. Replace inline `<style>` blocks in both HTML files with `<link>` import
### Phase 2: Extract PDF Template (reduces HTML by ~110 lines each)
1. Create `assets/pdf-template.html` as a partial
2. Modify `pdf-render.js` to inject template dynamically
3. Remove duplicate PDF template HTML from both files
### Phase 3: Move Documentation
1. Move to `docs/`: PRD.md, REFERENCES.md, SKILL.md, SPECIFICATION.md, main.md
2. Update any internal links
### Phase 4: Clean Up Duplicates
1. Update AGENTS.md to reference `deft/main.md` instead of `warping/main.md`
2. Remove redundant `warping/` directory (after confirming it's not needed)
3. Update Taskfile.yml project name from "warping" to match actual project
### Phase 5: JavaScript Refactoring (SHOULD fix)
1. Split `assets/guided.js` into:
   - `guided-wizard.js` (~350 lines) - wizard navigation/step logic
   - `guided-render.js` (~350 lines) - results rendering
2. Split `script.js` into:
   - `live-inputs.js` (~280 lines) - input handlers
   - `live-render.js` (~280 lines) - rendering logic
## Expected Results
- `index.html`: ~780 lines (under 1000 ✓)
- `live.html`: ~940 lines (under 1000 ✓)
- All JS files under 500 lines (SHOULD ✓)
- Docs properly organized in `docs/`
- Single framework reference (deft)
## Risk Assessment
- **Low risk**: CSS extraction (visual regression only)
- **Medium risk**: PDF template extraction (functional testing needed)
- **Low risk**: Doc moves (no runtime impact)
- **Medium risk**: JS splitting (requires careful import ordering)
