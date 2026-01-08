const CAMERAS_PER_NODE = 4;
const NODE_COST = 3500;
const DEFAULT_SMART_CAMERA_COST = 3000;
const DEFAULT_DUMB_CAMERA_COST = 250;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatPercent(value) {
  return value.toFixed(1) + '%';
}

// Value-based parsing helper for reuse in tests and DOM code.
function parseNumberValue(raw, defaultValue) {
  const trimmed = String(raw ?? '').trim();
  if (trimmed === '') {
    return defaultValue;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

// DOM-specific wrapper around parseNumberValue.
function parseNumberInput(inputEl, defaultValue) {
  return parseNumberValue(inputEl.value, defaultValue);
}

function calculateNodesNeeded(totalCameras) {
  return Math.ceil(totalCameras / CAMERAS_PER_NODE);
}

function calculateCurrentTotal(totalCameras, smartCameraCost) {
  return totalCameras * smartCameraCost;
}

function calculateSighthoundTotal(totalCameras, dumbCameraCost) {
  const nodesNeeded = calculateNodesNeeded(totalCameras);
  return nodesNeeded * NODE_COST + totalCameras * dumbCameraCost;
}

function calculateSavings(currentTotal, sighthoundTotal) {
  return currentTotal - sighthoundTotal;
}

// Core validation logic extracted for unit testing.
// Accepts raw string values (as read from form controls).
function validateInputs({ totalCamerasRaw, smartCameraCostRaw, dumbCameraCostRaw }) {
  const trimmedTotal = String(totalCamerasRaw ?? '').trim();

  if (trimmedTotal === '') {
    return {
      ok: false,
      reason: 'emptyTotalCameras',
    };
  }

  const totalCameras = Number(trimmedTotal);

  if (!Number.isInteger(totalCameras) || totalCameras < 1 || totalCameras > 10000) {
    return {
      ok: false,
      reason: 'invalidTotalCameras',
      errorMessage: 'Enter a whole number between 1 and 10,000.',
    };
  }

  const smartCameraCost = parseNumberValue(smartCameraCostRaw, DEFAULT_SMART_CAMERA_COST);
  const dumbCameraCost = parseNumberValue(dumbCameraCostRaw, DEFAULT_DUMB_CAMERA_COST);

  if (smartCameraCost < 1 || smartCameraCost > 10000) {
    return {
      ok: false,
      reason: 'invalidSmartCameraCost',
      errorMessage: 'Enter a value between $1.00 and $10,000.00.',
    };
  }

  if (dumbCameraCost < 1 || dumbCameraCost > 10000) {
    return {
      ok: false,
      reason: 'invalidDumbCameraCost',
      errorMessage: 'Enter a value between $1.00 and $10,000.00.',
    };
  }

  return {
    ok: true,
    reason: 'valid',
    values: {
      totalCameras,
      smartCameraCost,
      dumbCameraCost,
    },
  };
}

// High-level helper that runs validation and all calculations.
// This is what unit tests can exercise directly.
function computeTotalsFromRaw({ totalCamerasRaw, smartCameraCostRaw, dumbCameraCostRaw }) {
  const validation = validateInputs({ totalCamerasRaw, smartCameraCostRaw, dumbCameraCostRaw });

  if (!validation.ok) {
    return validation;
  }

  const { totalCameras, smartCameraCost, dumbCameraCost } = validation.values;

  const nodesNeeded = calculateNodesNeeded(totalCameras);
  const currentTotal = calculateCurrentTotal(totalCameras, smartCameraCost);
  const sighthoundTotal = calculateSighthoundTotal(totalCameras, dumbCameraCost);
  const savings = calculateSavings(currentTotal, sighthoundTotal);
  const percentReduction = currentTotal === 0 ? 0 : (savings / currentTotal) * 100;
  const costPerCameraBefore = currentTotal / totalCameras;
  const costPerCameraAfter = sighthoundTotal / totalCameras;

  return {
    ok: true,
    reason: 'valid',
    values: {
      totalCameras,
      smartCameraCost,
      dumbCameraCost,
      nodesNeeded,
      currentTotal,
      sighthoundTotal,
      savings,
      percentReduction,
      costPerCameraBefore,
      costPerCameraAfter,
    },
  };
}

// Browser-only wiring for DOM interaction.
if (typeof document !== 'undefined') {
  const form = document.getElementById('calculator-form');
  const errorEl = document.getElementById('error');

  const currentTotalEl = document.getElementById('currentTotal');
  const sighthoundTotalEl = document.getElementById('sighthoundTotal');
  const savingsEl = document.getElementById('savings');
  const percentReductionEl = document.getElementById('percentReduction');
  const costPerCameraBeforeEl = document.getElementById('costPerCameraBefore');
  const costPerCameraAfterEl = document.getElementById('costPerCameraAfter');
  const nodesNeededEl = document.getElementById('nodesNeeded');

  const resultsPlaceholderEl = document.getElementById('resultsPlaceholder');
  const resultsCardsEl = document.getElementById('resultsCards');
  const savingsLabelEl = document.getElementById('savingsLabel');

  function showError(message) {
    errorEl.textContent = message || '';
  }

  function showPlaceholder() {
    if (resultsPlaceholderEl && resultsCardsEl) {
      resultsPlaceholderEl.classList.remove('hidden');
      resultsCardsEl.classList.add('hidden');
    }
  }

  function showResults() {
    if (resultsPlaceholderEl && resultsCardsEl) {
      resultsPlaceholderEl.classList.add('hidden');
      resultsCardsEl.classList.remove('hidden');
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    showError('');

    const totalCamerasRaw = form.totalCameras.value.trim();
    const smartCameraRaw = form.smartCameraCost.value;
    const dumbCameraRaw = form.dumbCameraCost.value;

    const result = computeTotalsFromRaw({
      totalCamerasRaw,
      smartCameraCostRaw: smartCameraRaw,
      dumbCameraCostRaw: dumbCameraRaw,
    });

    if (!result.ok) {
      if (result.reason === 'emptyTotalCameras') {
        showPlaceholder();
        return;
      }

      if (result.errorMessage) {
        showError(result.errorMessage);
      }
      showPlaceholder();
      return;
    }

    const {
      nodesNeeded,
      currentTotal,
      sighthoundTotal,
      savings,
      percentReduction,
      costPerCameraBefore,
      costPerCameraAfter,
    } = result.values;

    // Update UI
    nodesNeededEl.textContent = nodesNeeded.toString();
    currentTotalEl.textContent = formatCurrency(currentTotal);
    sighthoundTotalEl.textContent = formatCurrency(sighthoundTotal);
    savingsEl.textContent = formatCurrency(savings);
    percentReductionEl.textContent = formatPercent(percentReduction);
    costPerCameraBeforeEl.textContent = formatCurrency(costPerCameraBefore);
    costPerCameraAfterEl.textContent = formatCurrency(costPerCameraAfter);

    // Update savings label and color based on sign
    if (savings < 0) {
      savingsLabelEl.textContent = 'Extra cost';
      savingsEl.classList.remove('text-emerald-600');
      savingsEl.classList.add('text-red-600');
    } else {
      savingsLabelEl.textContent = 'Immediate savings';
      savingsEl.classList.remove('text-red-600');
      savingsEl.classList.add('text-emerald-600');
    }

    showResults();
  });
}

// Export pure helpers for unit testing in Node.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CAMERAS_PER_NODE,
    NODE_COST,
    DEFAULT_SMART_CAMERA_COST,
    DEFAULT_DUMB_CAMERA_COST,
    formatCurrency,
    formatPercent,
    parseNumberValue,
    calculateNodesNeeded,
    calculateCurrentTotal,
    calculateSighthoundTotal,
    calculateSavings,
    validateInputs,
    computeTotalsFromRaw,
  };
}
