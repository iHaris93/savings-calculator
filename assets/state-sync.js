(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
  if (typeof root !== 'undefined') {
    root.SighthoundStateSync = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function supportsHistory() {
    return (
      typeof window !== 'undefined' &&
      window.history &&
      typeof window.history.replaceState === 'function' &&
      window.location
    );
  }

  // Shared helper: broadcast the current estimator URL to the parent window.
  // This is intentionally generic and does not know about HubSpot or any
  // specific parent implementation. The parent page can listen for
  // HARDWARE_ESTIMATE_URL messages and decide what to do with them.
  function broadcastHardwareEstimateUrl() {
    if (typeof window === 'undefined') return;
    try {
      var loc = window.location;
      if (!loc || !loc.href) return;
      // Only attempt cross-window messaging when embedded in another context.
      if (!window.parent || window.parent === window) return;
      window.parent.postMessage(
        {
          type: 'HARDWARE_ESTIMATE_URL',
          url: loc.href,
        },
        '*'
      );
    } catch (_err) {
      // Silent fail; URL broadcast is a UX enhancement only.
    }
  }

  // Expose the helper on window so other modules (if any) can call it
  // directly if needed.
  if (typeof window !== 'undefined') {
    try {
      window.broadcastHardwareEstimateUrl = broadcastHardwareEstimateUrl;
    } catch (_err) {
      // Never throw from best-effort globals.
    }
  }

  function getParamsModule() {
    if (typeof window !== 'undefined' && window.SighthoundParams) {
      return window.SighthoundParams;
    }
    try {
      // Best-effort for Node environments; will only work if relative path resolution is correct.
      // eslint-disable-next-line global-require, import/no-unresolved
      return require('./params-schema');
    } catch (e) {
      return null;
    }
  }

  function createNoopState() {
    const noop = function () {};
    return {
      getParams: function () { return {}; },
      update: noop,
      subscribe: function () { return noop; },
    };
  }

  function initState() {
    if (typeof window === 'undefined') {
      return createNoopState();
    }

    const Params = getParamsModule();
    if (!Params) {
      return createNoopState();
    }

    const search = window.location ? window.location.search || '' : '';
    const raw = Params.readParamsFromUrl(search);
    let params = Params.normalizeParams(raw);

    const subscribers = new Set();
    let replaceTimer = null;

    function getParams() {
      return { ...params };
    }

    function notify() {
      const snapshot = getParams();
      subscribers.forEach((fn) => {
        try {
          fn(snapshot);
        } catch (_err) {
          // Swallow subscriber errors so they do not break state updates.
        }
      });
    }

    function scheduleUrlUpdate() {
      if (!supportsHistory()) return;
      if (replaceTimer !== null) {
        clearTimeout(replaceTimer);
      }
      replaceTimer = setTimeout(() => {
        replaceTimer = null;
        try {
          const searchString = Params.buildSearchFromParams(params);
          const loc = window.location;
          const newUrl =
            loc.pathname + (searchString ? '?' + searchString : '') + loc.hash;
          window.history.replaceState({}, '', newUrl);

          // After the canonical URL has been updated, broadcast it to the
          // parent page (e.g., a HubSpot/Squarespace container) so it can
          // capture the latest estimator URL including query params.
          if (typeof window !== 'undefined' && typeof window.broadcastHardwareEstimateUrl === 'function') {
            try {
              window.broadcastHardwareEstimateUrl();
            } catch (_err2) {
              // Never throw from cross-window messaging.
            }
          }
        } catch (_err) {
          // URL state is a UX enhancement only; fail silently.
        }
      }, 150);
    }

    function shallowEqual(a, b) {
      if (a === b) return true;
      const aKeys = Object.keys(a || {});
      const bKeys = Object.keys(b || {});
      if (aKeys.length !== bKeys.length) return false;
      for (let i = 0; i < aKeys.length; i += 1) {
        const key = aKeys[i];
        if (a[key] !== b[key]) return false;
      }
      return true;
    }

    function update(partial) {
      const merged = Object.assign({}, params, partial || {});
      const next = Params.normalizeParams(merged);
      if (shallowEqual(params, next)) {
        return;
      }
      params = next;
      notify();
      scheduleUrlUpdate();
    }

    function subscribe(fn) {
      if (typeof fn !== 'function') {
        return function () {};
      }
      subscribers.add(fn);
      return function unsubscribe() {
        subscribers.delete(fn);
      };
    }

    // Canonicalize URL on first load based on normalized params.
    scheduleUrlUpdate();

    return {
      getParams,
      update,
      subscribe,
    };
  }

  return {
    initState,
  };
});
