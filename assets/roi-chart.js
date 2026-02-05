(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
  if (typeof root !== 'undefined') {
    root.SighthoundRoiChart = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Colors matching Tailwind palette
  var COLORS = {
    todayLine: '#64748b',      // slate-500
    sighthoundLine: '#0ea5e9', // sky-500
    breakEvenDot: '#10b981',   // emerald-500
    grid: '#e2e8f0',           // slate-200
    axis: '#94a3b8',           // slate-400
    text: '#475569',           // slate-600
    background: '#ffffff',
  };

  /**
   * Format currency for axis labels (compact)
   */
  function formatAxisCurrency(value) {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toFixed(0);
  }

  /**
   * Render ROI chart to a canvas element
   * @param {HTMLCanvasElement} canvas - Target canvas element
   * @param {Object} roiData - ROI data from computeScenarioResults().roi
   */
  function renderChart(canvas, roiData) {
    if (!canvas || !roiData || !roiData.applicable) {
      return;
    }

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;

    // Get display size from CSS
    var displayWidth = canvas.clientWidth;
    var displayHeight = canvas.clientHeight;

    // Set canvas buffer size for retina
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    // Chart dimensions with padding
    var padding = { top: 20, right: 20, bottom: 40, left: 70 };
    var chartWidth = displayWidth - padding.left - padding.right;
    var chartHeight = displayHeight - padding.top - padding.bottom;

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    var dataPoints = roiData.dataPoints;
    if (!dataPoints || dataPoints.length === 0) {
      return;
    }

    // Find data ranges
    var maxMonth = roiData.maxMonths;
    var maxCost = 0;
    for (var i = 0; i < dataPoints.length; i++) {
      var point = dataPoints[i];
      if (point.today > maxCost) maxCost = point.today;
      if (point.sighthound > maxCost) maxCost = point.sighthound;
    }
    // Add 10% padding to max cost
    maxCost = maxCost * 1.1;

    // Scale functions
    function xScale(month) {
      return padding.left + (month / maxMonth) * chartWidth;
    }
    function yScale(cost) {
      return padding.top + chartHeight - (cost / maxCost) * chartHeight;
    }

    // Draw grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    // Horizontal grid lines (cost)
    var costStep = Math.pow(10, Math.floor(Math.log10(maxCost)));
    if (maxCost / costStep < 3) costStep = costStep / 2;
    for (var c = 0; c <= maxCost; c += costStep) {
      var y = yScale(c);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = COLORS.axis;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatAxisCurrency(c), padding.left - 8, y);
    }

    // Vertical grid lines (time) - Year markers
    var yearMarkers = [12, 36, 60];
    for (var yi = 0; yi < yearMarkers.length; yi++) {
      var month = yearMarkers[yi];
      if (month <= maxMonth) {
        var x = xScale(month);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();

        // X-axis labels
        ctx.fillStyle = COLORS.axis;
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var yearLabel = 'Year ' + (month / 12);
        ctx.fillText(yearLabel, x, padding.top + chartHeight + 8);
      }
    }

    // Draw axes
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Y-axis label
    ctx.save();
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cumulative total cost (USD)', 0, 0);
    ctx.restore();

    // Draw "Today" line
    ctx.strokeStyle = COLORS.todayLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var ti = 0; ti < dataPoints.length; ti++) {
      var tp = dataPoints[ti];
      var tx = xScale(tp.month);
      var ty = yScale(tp.today);
      if (ti === 0) {
        ctx.moveTo(tx, ty);
      } else {
        ctx.lineTo(tx, ty);
      }
    }
    ctx.stroke();

    // Draw "Sighthound" line
    ctx.strokeStyle = COLORS.sighthoundLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var si = 0; si < dataPoints.length; si++) {
      var sp = dataPoints[si];
      var sx = xScale(sp.month);
      var sy = yScale(sp.sighthound);
      if (si === 0) {
        ctx.moveTo(sx, sy);
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();

    // Draw break-even marker
    if (roiData.breakEvenMonth !== null && roiData.breakEvenMonth <= maxMonth) {
      var beMonth = roiData.breakEvenMonth;
      // Find the cost at break-even (interpolate if needed)
      var beCost = null;
      for (var bi = 0; bi < dataPoints.length; bi++) {
        if (dataPoints[bi].month === beMonth) {
          beCost = dataPoints[bi].sighthound;
          break;
        }
      }
      if (beCost === null && dataPoints.length > 1) {
        // Interpolate
        var idx = Math.min(beMonth, dataPoints.length - 1);
        beCost = dataPoints[idx].sighthound;
      }

      if (beCost !== null) {
        var beX = xScale(beMonth);
        var beY = yScale(beCost);

        // Vertical dashed line
        ctx.strokeStyle = COLORS.breakEvenDot;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(beX, padding.top);
        ctx.lineTo(beX, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Break-even dot
        ctx.fillStyle = COLORS.breakEvenDot;
        ctx.beginPath();
        ctx.arc(beX, beY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Break-even label
        ctx.fillStyle = COLORS.breakEvenDot;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(beMonth + ' mo', beX, beY - 10);
      }
    }

    // Draw legend
    var legendY = displayHeight - 10;
    var legendX = padding.left;

    // Today legend
    ctx.strokeStyle = COLORS.todayLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY);
    ctx.lineTo(legendX + 20, legendY);
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Today', legendX + 25, legendY);

    // Sighthound legend
    legendX += 80;
    ctx.strokeStyle = COLORS.sighthoundLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY);
    ctx.lineTo(legendX + 20, legendY);
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.fillText('Sighthound', legendX + 25, legendY);

    // Store PNG for PDF export
    try {
      window.__ROI_PNG__ = canvas.toDataURL('image/png');
    } catch (e) {
      // Canvas tainted or other error - ignore
    }
  }

  return {
    render: renderChart,
    renderChart: renderChart,
  };
});
