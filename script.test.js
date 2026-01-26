const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('./assets/calc-core');

const {
  CAMERAS_PER_NODE,
  NODE_COST,
  calculateNodesNeeded,
  deriveScenario,
  getSoftwareMonthlyPricePerCamera,
  computeScenarioResults,
} = core;

const baseParams = {
  cameras: 0,
  hasExistingCameras: 0,
  hasSmartCameras: 0,
  smartShare: 0,
  smartCost: 3000,
  ipCost: 250,
  software: 'both',
  billing: 'monthly',
  expandBreakdown: 0,
  showAssumptions: 0,
};

// 1. Core correctly computes the number of nodes needed based on total cameras input

test('calculateNodesNeeded computes correct node count for various camera totals', () => {
  assert.equal(calculateNodesNeeded(0), 0);
  assert.equal(calculateNodesNeeded(1), 1);
  assert.equal(calculateNodesNeeded(CAMERAS_PER_NODE), 1);
  assert.equal(calculateNodesNeeded(CAMERAS_PER_NODE + 1), 2);
  assert.equal(calculateNodesNeeded(14), 4); // 14 cameras, 4 per node -> ceil(14/4) = 4
});

// 2. Scenario derivation respects smart/existing flags with correct precedence

test('deriveScenario maps flags to scenarios A/B/C as expected', () => {
  assert.equal(deriveScenario({ ...baseParams, hasSmartCameras: 1, hasExistingCameras: 0 }), 'a');
  assert.equal(deriveScenario({ ...baseParams, hasSmartCameras: 0, hasExistingCameras: 1 }), 'b');
  assert.equal(deriveScenario({ ...baseParams, hasSmartCameras: 0, hasExistingCameras: 0 }), 'c');
  // Smart cameras take precedence over existing standard IP cameras
  assert.equal(deriveScenario({ ...baseParams, hasSmartCameras: 1, hasExistingCameras: 1 }), 'a');
});

// 3. Software pricing helper chooses correct per-camera price

test('getSoftwareMonthlyPricePerCamera returns correct pricing for each selection', () => {
  assert.equal(getSoftwareMonthlyPricePerCamera('none'), 0);
  assert.equal(getSoftwareMonthlyPricePerCamera('lpr'), 30);
  assert.equal(getSoftwareMonthlyPricePerCamera('mmcg'), 30);
  assert.equal(getSoftwareMonthlyPricePerCamera('both'), 55);
  // Fallback to single-service pricing for unknown/undefined selections
  assert.equal(getSoftwareMonthlyPricePerCamera('unknown'), 30);
  assert.equal(getSoftwareMonthlyPricePerCamera(undefined), 30);
});

// 4. Scenario A hardware totals match legacy implementation for representative inputs

test('computeScenarioResults scenario A matches expected hardware totals', () => {
  const params = {
    ...baseParams,
    cameras: 16,
    hasSmartCameras: 1,
    hasExistingCameras: 0,
    smartCost: 3000,
    ipCost: 250,
    software: 'both',
    billing: 'monthly',
  };

  const result = computeScenarioResults(params);
  const { scenario, cameras, nodesNeeded, hardware } = result;

  assert.equal(scenario, 'a');
  assert.equal(cameras, 16);

  const expectedNodes = Math.ceil(16 / CAMERAS_PER_NODE);
  const expectedTodayTotal = 16 * 3000;
  const expectedSighthound = expectedNodes * NODE_COST + 16 * 250;
  const expectedSavings = expectedTodayTotal - expectedSighthound;
  const expectedPercent = expectedTodayTotal === 0 ? 0 : (expectedSavings / expectedTodayTotal) * 100;

  assert.equal(nodesNeeded, expectedNodes);
  assert.equal(hardware.todayTotal, expectedTodayTotal);
  assert.equal(hardware.sighthoundTotal, expectedSighthound);
  assert.equal(hardware.savings, expectedSavings);
  assert.ok(Math.abs(hardware.percentReduction - expectedPercent) < 1e-9);
  assert.equal(hardware.costPerCameraBefore, expectedTodayTotal / 16);
  assert.equal(hardware.costPerCameraAfter, expectedSighthound / 16);
});

// 5. Scenario B: existing standard IP cameras (nodes-only upfront)

test('computeScenarioResults scenario B nodes-only hardware behaves as expected', () => {
  const params = {
    ...baseParams,
    cameras: 12,
    hasSmartCameras: 0,
    hasExistingCameras: 1,
    smartCost: 3000,
    ipCost: 250,
    software: 'lpr',
    billing: 'monthly',
  };

  const result = computeScenarioResults(params);
  const { scenario, cameras, nodesNeeded, hardware } = result;

  assert.equal(scenario, 'b');
  assert.equal(cameras, 12);

  const expectedNodes = Math.ceil(12 / CAMERAS_PER_NODE);
  const expectedTodayTotal = 12 * 3000; // smart cameras baseline (unchanged from legacy math)
  const expectedSighthound = expectedNodes * NODE_COST; // nodes only

  assert.equal(nodesNeeded, expectedNodes);
  assert.equal(hardware.todayTotal, expectedTodayTotal);
  assert.equal(hardware.sighthoundTotal, expectedSighthound);
  assert.equal(hardware.costPerCameraAfter, expectedSighthound / 12);
});

// 6. Scenario C: new deployment (nodes + IP cameras; no current cameras)

test('computeScenarioResults scenario C includes nodes + cameras with no baseline', () => {
  const params = {
    ...baseParams,
    cameras: 8,
    hasSmartCameras: 0,
    hasExistingCameras: 0,
    smartCost: 3000,
    ipCost: 250,
    software: 'mmcg',
    billing: 'yearly',
  };

  const result = computeScenarioResults(params);
  const { scenario, cameras, nodesNeeded, hardware } = result;

  assert.equal(scenario, 'c');
  assert.equal(cameras, 8);

  const expectedNodes = Math.ceil(8 / CAMERAS_PER_NODE);
  const expectedSighthound = expectedNodes * NODE_COST + 8 * 250;
  const expectedTodayTotal = 8 * 3000; // smart cameras baseline (not shown in UI for scenario C)

  assert.equal(nodesNeeded, expectedNodes);
  assert.equal(hardware.todayTotal, expectedTodayTotal);
  assert.equal(hardware.sighthoundTotal, expectedSighthound);
  assert.equal(hardware.costPerCameraBefore, expectedTodayTotal / 8);
  assert.equal(hardware.costPerCameraAfter, expectedSighthound / 8);
});

// 7. Software totals reflect selection and camera count

test('computeScenarioResults software section respects selection and billing', () => {
  const paramsMonthly = {
    ...baseParams,
    cameras: 10,
    software: 'both',
    billing: 'monthly',
  };

  const monthlyResult = computeScenarioResults(paramsMonthly);
  assert.equal(monthlyResult.software.monthlyPerCamera, 55);
  assert.equal(monthlyResult.software.monthlyTotal, 10 * 55);
  assert.equal(monthlyResult.software.yearlyTotal, 12 * 10 * 55);

  const paramsNone = {
    ...baseParams,
    cameras: 10,
    software: 'none',
    billing: 'yearly',
  };

  const noneResult = computeScenarioResults(paramsNone);
  assert.equal(noneResult.software.monthlyPerCamera, 0);
  assert.equal(noneResult.software.monthlyTotal, 0);
  assert.equal(noneResult.software.yearlyTotal, 0);
});
