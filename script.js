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

  // Theme toggle
  const themeToggleButton = document.getElementById('themeToggle');
  const themeToggleLabel = document.getElementById('themeToggleLabel');
  const headerLogo = document.getElementById('headerLogo');

  function setTheme(theme) {
    const root = document.documentElement;
    if (!root) return;

    if (theme === 'dark') {
      root.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch (e) {}
      if (themeToggleButton) themeToggleButton.setAttribute('aria-pressed', 'true');
      if (themeToggleLabel) themeToggleLabel.textContent = 'Light mode';
    } else {
      root.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch (e) {}
      if (themeToggleButton) themeToggleButton.setAttribute('aria-pressed', 'false');
      if (themeToggleLabel) themeToggleLabel.textContent = 'Dark mode';
    }

    // Swap header logo based on theme, if both variants are available
    if (headerLogo) {
      const lightSrc = headerLogo.getAttribute('data-logo-light');
      const darkSrc = headerLogo.getAttribute('data-logo-dark');
      if (theme === 'dark' && darkSrc) {
        headerLogo.src = darkSrc;
      } else if (theme === 'light' && lightSrc) {
        headerLogo.src = lightSrc;
      }
    }
  }

  // Initialise theme from saved preference or OS setting
  (function initTheme() {
    try {
      const stored = localStorage.getItem('theme');
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = stored || (prefersDark ? 'dark' : 'light');
      setTheme(initial);
    } catch (e) {
      setTheme('light');
    }
  })();

  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'light' : 'dark');
    });
  }

  // Results DOM elements
  const currentTotalEl = document.getElementById('currentTotal');
  const sighthoundTotalEl = document.getElementById('sighthoundTotal');
  const savingsEl = document.getElementById('savings');
  const percentReductionEl = document.getElementById('percentReduction');
  const costPerCameraBeforeEl = document.getElementById('costPerCameraBefore');
  const costPerCameraAfterEl = document.getElementById('costPerCameraAfter');
  const nodesNeededEl = document.getElementById('nodesNeeded');

  const todayBreakdownEl = document.getElementById('todayBreakdown');
  const sighthoundNodesBreakdownEl = document.getElementById('sighthoundNodesBreakdown');
  const sighthoundCamerasBreakdownEl = document.getElementById('sighthoundCamerasBreakdown');

  const primaryArrowEl = document.getElementById('primaryArrow');
  const percentArrowEl = document.getElementById('percentArrow');

  const resultsPlaceholderEl = document.getElementById('resultsPlaceholder');
  const resultsCardsEl = document.getElementById('resultsCards');
  const savingsLabelEl = document.getElementById('savingsLabel');

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message || '';
    }
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

  if (form) {
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
      } = result.values;

      // Update main totals
      if (nodesNeededEl) nodesNeededEl.textContent = nodesNeeded.toString();
      if (currentTotalEl) currentTotalEl.textContent = formatCurrency(currentTotal);
      if (sighthoundTotalEl) sighthoundTotalEl.textContent = formatCurrency(sighthoundTotal);

      // Primary callout uses absolute savings amount
      const savingsDisplay = Math.abs(savings);
      if (savingsEl) savingsEl.textContent = formatCurrency(savingsDisplay);

      if (percentReductionEl) percentReductionEl.textContent = formatPercent(percentReduction);
      if (costPerCameraBeforeEl) costPerCameraBeforeEl.textContent = formatCurrency(costPerCameraBefore);
      if (costPerCameraAfterEl) costPerCameraAfterEl.textContent = formatCurrency(costPerCameraAfter);

      // Comparison breakdown lines
      if (todayBreakdownEl) {
        todayBreakdownEl.textContent = `Cameras: ${totalCameras} × ${formatCurrency(smartCameraCost)}`;
      }
      if (sighthoundNodesBreakdownEl) {
        sighthoundNodesBreakdownEl.textContent = `Nodes: ${nodesNeeded} × ${formatCurrency(NODE_COST)}`;
      }
      if (sighthoundCamerasBreakdownEl) {
        sighthoundCamerasBreakdownEl.textContent = `Cameras: ${totalCameras} × ${formatCurrency(dumbCameraCost)}`;
      }

      // Update savings label, color, and arrow based on sign
      if (savingsLabelEl && savingsEl && primaryArrowEl) {
        if (savings < 0) {
          savingsLabelEl.textContent = 'Extra cost';
          savingsEl.classList.remove('text-emerald-400');
          savingsEl.classList.add('text-red-400');
          primaryArrowEl.textContent = '↑';
          primaryArrowEl.classList.remove('text-emerald-400');
          primaryArrowEl.classList.add('text-red-400');
        } else {
          savingsLabelEl.textContent = 'Immediate savings';
          savingsEl.classList.remove('text-red-400');
          savingsEl.classList.add('text-emerald-400');
          primaryArrowEl.textContent = '↓';
          primaryArrowEl.classList.remove('text-red-400');
          primaryArrowEl.classList.add('text-emerald-400');
        }
      }

      // Percent reduction arrow and color
      if (percentReductionEl && percentArrowEl) {
        if (percentReduction < 0) {
          percentReductionEl.classList.remove('text-emerald-600');
          percentReductionEl.classList.add('text-red-600');
          percentArrowEl.textContent = '↑';
          percentArrowEl.classList.remove('text-emerald-600');
          percentArrowEl.classList.add('text-red-600');
        } else {
          percentReductionEl.classList.remove('text-red-600');
          percentReductionEl.classList.add('text-emerald-600');
          percentArrowEl.textContent = '↓';
          percentArrowEl.classList.remove('text-red-600');
          percentArrowEl.classList.add('text-emerald-600');
        }
      }

      showResults();
    });
  }
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
