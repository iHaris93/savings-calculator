# ROI Timeline Visualization Feature

## Overview
Add a two-line cumulative cost chart comparing "Today" vs "Sighthound" over time, with break-even calculation. Hidden by default in an expandable panel, included in PDF only if viewed.

## Requirements Summary
- **Cost model**: Software-only recurring (existing Sighthound pricing + new user-input for Today side)
- **Break-even**: Full solution vs full solution (hardware + software)
- **Visualization**: Two-line cumulative cost chart
- **Time horizon**: Auto-scale to break-even + runway
- **Placement**: Expandable panel, hidden by default
- **PDF**: Include only if user expanded the panel

## New Input Field
**Label**: "Current camera software cost (optional)"
**Helper**: "Enter what you pay today for analytics, storage, or camera licenses. Leave blank if included with hardware."
**Default**: $0
**URL param**: `todaySoftware` (number, per camera per month)

## Cost Formulas
**Today cumulative at month M**:
```
todayHardware + (todaySoftware × cameras × M)
```

**Sighthound cumulative at month M**:
```
sighthoundHardware + (sighthoundSoftware × cameras × M)
```

**Break-even month** (if lines cross):
```
M = (sighthoundHardware - todayHardware) / ((todaySoftware - sighthoundSoftware) × cameras)
```
Only valid if denominator ≠ 0 and M > 0.

## Implementation Tasks

### Phase 1: State & Input (calc-core.js, params-schema.js, state-sync.js)
1. Add `todaySoftware` param to schema with default 0
2. Update `computeScenarioResults()` to include ROI data
3. Add break-even calculation logic

### Phase 2: UI Input Field (index.html, live.html, guided.js, script.js)
1. Add "Current camera software cost" input in Step 3 (Guided) and Sighthound section (Live)
2. Wire to state sync
3. Only show in Scenario A (smart cameras comparison)

### Phase 3: Chart Component (new file: assets/roi-chart.js)
1. Create simple canvas-based line chart (no external deps)
2. Two lines: "Today" (slate) and "Sighthound" (sky blue)
3. Auto-scale X-axis: max(breakEvenMonth × 1.5, 24 months) or 60 months cap
4. Mark break-even point with dot + label
5. Footnote: "Some smart cameras bundle software with hardware. If so, Today costs remain flat."

### Phase 4: Expandable Panel (index.html, live.html)
1. Add collapsible "ROI Timeline" section below results
2. Track `roiExpanded` in URL state
3. Toggle button: "Show ROI timeline" / "Hide ROI timeline"

### Phase 5: PDF Integration (pdf-template.html, pdf-render.js)
1. Add ROI section to PDF template (hidden by default)
2. Render chart as static image or simplified table
3. Only include if `roiExpanded` is true in state

## File Changes
- `assets/params-schema.js` - add `todaySoftware` param
- `assets/calc-core.js` - add ROI/break-even calculations
- `assets/roi-chart.js` - new file, chart rendering
- `assets/pdf-render.js` - conditional ROI section
- `assets/pdf-template.html` - ROI section markup
- `index.html` - input field + expandable panel
- `live.html` - input field + expandable panel
- `assets/guided.js` - wire new input + panel
- `script.js` - wire new input + panel

## Chart Visual Spec
- Canvas size: 100% width, ~200px height
- X-axis: Months (0, 12, 24, 36...)
- Y-axis: Cumulative cost ($)
- Today line: slate-500, solid
- Sighthound line: sky-500, solid
- Break-even marker: emerald dot with "Break-even: X mo" label
- Grid: light dashed lines
- Legend: inline below chart

## Edge Cases
- **No break-even** (Sighthound always cheaper): Show "Sighthound is lower cost from day one"
- **No break-even** (Today always cheaper): Show lines diverging, no break-even marker
- **Software = none**: Hide ROI panel entirely (hardware-only, no recurring to compare)
- **Scenario B/C**: Hide ROI panel (no smart camera baseline to compare against)
