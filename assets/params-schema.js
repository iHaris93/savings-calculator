(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
  if (typeof root !== 'undefined') {
    root.SighthoundParams = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const DEFAULTS = {
    cameras: 0,
    hasExistingCameras: 0,
    hasSmartCameras: 0,
    smartCost: 3000,
    ipCost: 250,
    todaySoftware: 0,
    software: 'none',
    billing: 'monthly',
    expandBreakdown: 0,
    showAssumptions: 0,
    roiExpanded: 0,
  };

  const ORDER = [
    'cameras',
    'hasExistingCameras',
    'hasSmartCameras',
    'smartCost',
    'ipCost',
    'todaySoftware',
    'software',
    'billing',
    'expandBreakdown',
    'showAssumptions',
    'roiExpanded',
  ];

  function toInt(value, defaultValue, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return defaultValue;
    let v = Math.trunc(n);
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  }

  function toNumber(value, defaultValue, min) {
    const n = Number(value);
    if (!Number.isFinite(n)) return defaultValue;
    if (min !== undefined && n < min) return defaultValue;
    return n;
  }

  function toFlag(value, defaultValue) {
    if (value === undefined || value === null || value === '') return defaultValue;
    const s = String(value).toLowerCase();
    if (s === '1' || s === 'true' || s === 'yes') return 1;
    if (s === '0' || s === 'false' || s === 'no') return 0;
    return defaultValue;
  }

  function readParamsFromUrl(search) {
    const out = {};
    if (typeof search !== 'string') return out;
    const query = search.startsWith('?') ? search.slice(1) : search;
    if (!query) return out;

    let sp;
    try {
      sp = new URLSearchParams(query);
    } catch (e) {
      return out;
    }

    ORDER.forEach((key) => {
      const v = sp.get(key);
      if (v !== null) {
        out[key] = v;
      }
    });

    return out;
  }

  function normalizeParams(raw) {
    const src = raw || {};
    const normalized = { ...DEFAULTS };

    normalized.cameras = toInt(src.cameras, DEFAULTS.cameras, 0, 10000);

    normalized.hasExistingCameras = toFlag(
      src.hasExistingCameras,
      DEFAULTS.hasExistingCameras
    );
    normalized.hasSmartCameras = toFlag(
      src.hasSmartCameras,
      DEFAULTS.hasSmartCameras
    );

    // Enforce mutual exclusivity: smart cameras take precedence over existing standard IP.
    if (normalized.hasSmartCameras && normalized.hasExistingCameras) {
      normalized.hasExistingCameras = 0;
    }

    normalized.smartCost = toNumber(src.smartCost, DEFAULTS.smartCost, 0);
    normalized.ipCost = toNumber(src.ipCost, DEFAULTS.ipCost, 0);
    normalized.todaySoftware = toNumber(src.todaySoftware, DEFAULTS.todaySoftware, 0);

    const softwareRaw = (src.software || DEFAULTS.software).toString().toLowerCase();
    if (softwareRaw === 'none' || softwareRaw === 'lpr' || softwareRaw === 'mmcg' || softwareRaw === 'both') {
      normalized.software = softwareRaw;
    } else {
      normalized.software = DEFAULTS.software;
    }

    const billingRaw = (src.billing || DEFAULTS.billing).toString().toLowerCase();
    normalized.billing = billingRaw === 'yearly' ? 'yearly' : 'monthly';

    normalized.expandBreakdown = toFlag(src.expandBreakdown, DEFAULTS.expandBreakdown);
    normalized.showAssumptions = toFlag(src.showAssumptions, DEFAULTS.showAssumptions);
    normalized.roiExpanded = toFlag(src.roiExpanded, DEFAULTS.roiExpanded);

    return normalized;
  }

  function buildSearchFromParams(params) {
    const p = normalizeParams(params);
    const sp = new URLSearchParams();

    ORDER.forEach((key) => {
      const value = p[key];
      const def = DEFAULTS[key];

      if (key === 'cameras') {
        if (value > 0) sp.set(key, String(value));
        return;
      }

      if (
        key === 'hasExistingCameras' ||
        key === 'hasSmartCameras' ||
        key === 'expandBreakdown' ||
        key === 'showAssumptions' ||
        key === 'roiExpanded'
      ) {
        if (value === 1) sp.set(key, '1');
        return;
      }

      // todaySoftware: only include if > 0
      if (key === 'todaySoftware') {
        if (value > 0) sp.set(key, String(value));
        return;
      }

      const isDefault = String(value) === String(def);
      if (isDefault) return;

      sp.set(key, String(value));
    });

    return sp.toString();
  }

  function assertCanonicalRoundTrip(params) {
    // Dev-only guard to detect drift between canonical params and URL round-trip.
    try {
      const inputNormalized = normalizeParams(params || {});
      const canonicalInput = {};
      ORDER.forEach((key) => {
        canonicalInput[key] = inputNormalized[key];
      });

      const search = buildSearchFromParams(canonicalInput);
      const roundTrippedRaw = readParamsFromUrl(search ? '?' + search : '');
      const roundTrippedNormalized = normalizeParams(roundTrippedRaw);
      const canonicalRoundTripped = {};
      ORDER.forEach((key) => {
        canonicalRoundTripped[key] = roundTrippedNormalized[key];
      });

      const a = JSON.stringify(canonicalInput);
      const b = JSON.stringify(canonicalRoundTripped);

      if (a !== b && typeof console !== 'undefined' && console && typeof console.warn === 'function') {
        console.warn('[SighthoundParams] Canonical URL round-trip mismatch.', {
          from: canonicalInput,
          to: canonicalRoundTripped,
          search,
        });
      }
    } catch (_err) {
      // URL parity is a diagnostic guard only; never throw.
    }
  }

  return {
    DEFAULTS,
    readParamsFromUrl,
    normalizeParams,
    buildSearchFromParams,
    assertCanonicalRoundTrip,
  };
});
