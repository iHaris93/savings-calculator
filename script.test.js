const test = require('node:test');
const assert = require('node:assert/strict');

const calculator = require('./script');

const {
  CAMERAS_PER_NODE,
  NODE_COST,
  DEFAULT_SMART_CAMERA_COST,
  DEFAULT_DUMB_CAMERA_COST,
  calculateNodesNeeded,
  calculateCurrentTotal,
  calculateSighthoundTotal,
  calculateSavings,
  validateInputs,
  computeTotalsFromRaw,
} = calculator;

// 1. Calculator correctly computes the number of nodes needed based on total cameras input

test('calculateNodesNeeded computes correct node count for various camera totals', () => {
  assert.equal(calculateNodesNeeded(1), 1);
  assert.equal(calculateNodesNeeded(CAMERAS_PER_NODE), 1);
  assert.equal(calculateNodesNeeded(CAMERAS_PER_NODE + 1), 2);
  assert.equal(calculateNodesNeeded(14), 4); // 14 cameras, 4 per node -> ceil(14/4) = 4
});

// 2. Calculator calculates total current cost using smart camera cost and total cameras

test('calculateCurrentTotal multiplies total cameras by smart camera cost', () => {
  const totalCameras = 10;
  const smartCameraCost = 3000;
  const expected = totalCameras * smartCameraCost;

  assert.equal(calculateCurrentTotal(totalCameras, smartCameraCost), expected);
});

// 3. Calculator calculates Sighthound total cost using nodes needed, node cost, and dumb camera cost

test('calculateSighthoundTotal uses nodes, node cost, and dumb camera cost', () => {
  const totalCameras = 14;
  const dumbCameraCost = 250;
  const nodesNeeded = Math.ceil(totalCameras / CAMERAS_PER_NODE);

  const expected = nodesNeeded * NODE_COST + totalCameras * dumbCameraCost;
  assert.equal(calculateSighthoundTotal(totalCameras, dumbCameraCost), expected);
});

// 4. Calculator computes savings correctly as the difference between current total and Sighthound total

test('calculateSavings returns the difference between current and Sighthound totals', () => {
  const totalCameras = 20;
  const smartCameraCost = 3000;
  const dumbCameraCost = 250;

  const currentTotal = calculateCurrentTotal(totalCameras, smartCameraCost);
  const sighthoundTotal = calculateSighthoundTotal(totalCameras, dumbCameraCost);
  const expectedSavings = currentTotal - sighthoundTotal;

  assert.equal(calculateSavings(currentTotal, sighthoundTotal), expectedSavings);
});

// 5. Calculator handles input validation to reject invalid camera counts and costs

test('validateInputs accepts valid values', () => {
  const result = validateInputs({
    totalCamerasRaw: '14',
    smartCameraCostRaw: String(DEFAULT_SMART_CAMERA_COST),
    dumbCameraCostRaw: String(DEFAULT_DUMB_CAMERA_COST),
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, 'valid');
  assert.equal(result.values.totalCameras, 14);
});

test('validateInputs rejects empty total camera count (shows placeholder)', () => {
  const result = validateInputs({
    totalCamerasRaw: '',
    smartCameraCostRaw: '',
    dumbCameraCostRaw: '',
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'emptyTotalCameras');
});

test('validateInputs rejects non-integer or out-of-range total camera counts', () => {
  const cases = ['0', '-1', '10001', '1.5', 'abc'];

  for (const value of cases) {
    const result = validateInputs({
      totalCamerasRaw: value,
      smartCameraCostRaw: '',
      dumbCameraCostRaw: '',
    });

    assert.equal(result.ok, false, `Expected invalid for totalCamerasRaw=${value}`);
    assert.equal(result.reason, 'invalidTotalCameras');
    assert.ok(result.errorMessage.includes('whole number'));
  }
});

test('validateInputs rejects invalid smart camera costs', () => {
  const cases = ['0', '-1', '10001'];

  for (const value of cases) {
    const result = validateInputs({
      totalCamerasRaw: '10',
      smartCameraCostRaw: value,
      dumbCameraCostRaw: String(DEFAULT_DUMB_CAMERA_COST),
    });

    assert.equal(result.ok, false, `Expected invalid for smartCameraCostRaw=${value}`);
    assert.equal(result.reason, 'invalidSmartCameraCost');
    assert.ok(result.errorMessage.includes('$1.00'));
  }
});

test('validateInputs rejects invalid dumb camera costs', () => {
  const cases = ['0', '-1', '10001'];

  for (const value of cases) {
    const result = validateInputs({
      totalCamerasRaw: '10',
      smartCameraCostRaw: String(DEFAULT_SMART_CAMERA_COST),
      dumbCameraCostRaw: value,
    });

    assert.equal(result.ok, false, `Expected invalid for dumbCameraCostRaw=${value}`);
    assert.equal(result.reason, 'invalidDumbCameraCost');
    assert.ok(result.errorMessage.includes('$1.00'));
  }
});

// Integration-style sanity check of computeTotalsFromRaw

test('computeTotalsFromRaw runs full pipeline for valid inputs', () => {
  const totalCamerasRaw = '16';
  const smartCameraCostRaw = '3000';
  const dumbCameraCostRaw = '250';

  const result = computeTotalsFromRaw({
    totalCamerasRaw,
    smartCameraCostRaw,
    dumbCameraCostRaw,
  });

  assert.equal(result.ok, true);
  const { nodesNeeded, currentTotal, sighthoundTotal, savings } = result.values;

  const expectedNodes = Math.ceil(16 / CAMERAS_PER_NODE);
  const expectedCurrent = 16 * 3000;
  const expectedSighthound = expectedNodes * NODE_COST + 16 * 250;
  const expectedSavings = expectedCurrent - expectedSighthound;

  assert.equal(nodesNeeded, expectedNodes);
  assert.equal(currentTotal, expectedCurrent);
  assert.equal(sighthoundTotal, expectedSighthound);
  assert.equal(savings, expectedSavings);
});
