(function () {
  const CAMERAS_PER_NODE = 4;
  const NODE_COST = 3500;
  const DEFAULT_SMART_CAMERA_COST = 3000;
  const DEFAULT_DUMB_CAMERA_COST = 250;

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

  function parseNumberInput(inputEl, defaultValue) {
    const raw = inputEl.value.trim();
    if (raw === '') {
      return defaultValue;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

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

    if (totalCamerasRaw === '') {
      showPlaceholder();
      return;
    }

    const totalCameras = Number(totalCamerasRaw);

    if (!Number.isInteger(totalCameras) || totalCameras < 1 || totalCameras > 10000) {
      showError('Enter a whole number between 1 and 10,000.');
      showPlaceholder();
      return;
    }

    const smartCameraCost = parseNumberInput(form.smartCameraCost, DEFAULT_SMART_CAMERA_COST);
    const dumbCameraCost = parseNumberInput(form.dumbCameraCost, DEFAULT_DUMB_CAMERA_COST);

    if (smartCameraCost < 1 || smartCameraCost > 10000) {
      showError('Enter a value between $1.00 and $10,000.00.');
      showPlaceholder();
      return;
    }

    if (dumbCameraCost < 1 || dumbCameraCost > 10000) {
      showError('Enter a value between $1.00 and $10,000.00.');
      showPlaceholder();
      return;
    }

    // Formulas
    const nodesNeeded = Math.ceil(totalCameras / CAMERAS_PER_NODE);
    const currentTotal = totalCameras * smartCameraCost;
    const sighthoundTotal = nodesNeeded * NODE_COST + totalCameras * dumbCameraCost;
    const savings = currentTotal - sighthoundTotal;
    const percentReduction = currentTotal === 0 ? 0 : (savings / currentTotal) * 100;

    const costPerCameraBefore = currentTotal / totalCameras;
    const costPerCameraAfter = sighthoundTotal / totalCameras;

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
})();
