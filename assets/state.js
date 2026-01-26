(function () {
  const PARAM_CAMERAS = 'cameras';
  const PARAM_SMART = 'smart';
  const PARAM_DUMB = 'dumb';

  function supportsBrowserHistory() {
    return (
      typeof window !== 'undefined' &&
      window.location &&
      window.history &&
      typeof window.history.replaceState === 'function'
    );
  }

  function getCurrentUrl() {
    if (typeof window === 'undefined' || !window.location) {
      return null;
    }
    try {
      return new URL(window.location.href);
    } catch (e) {
      return null;
    }
  }

  /**
   * readState()
   *
   * Reads calculator-related state from the current URL's query string.
   * Returns a plain object with any present keys:
   *   { cameras, smart, dumb }
   *
   * Values are returned as strings so callers can decide how to parse
   * (e.g., integers vs decimals) and apply defaults.
   */
  function readState() {
    const url = getCurrentUrl();
    if (!url) return {};

    const state = {};
    const cameras = url.searchParams.get(PARAM_CAMERAS);
    const smart = url.searchParams.get(PARAM_SMART);
    const dumb = url.searchParams.get(PARAM_DUMB);

    if (cameras !== null) state.cameras = cameras;
    if (smart !== null) state.smart = smart;
    if (dumb !== null) state.dumb = dumb;

    return state;
  }

  /**
   * writeState(state)
   *
   * Writes the provided state into the current URL's query string using
   * history.replaceState (no full page reload).
   *
   * - Passing `null` or `undefined` clears all calculator-related params.
   * - When an object is provided, keys with null/undefined/"" values are
   *   omitted (i.e., removed from the URL).
   */
  function writeState(state) {
    if (!supportsBrowserHistory()) {
      return;
    }

    const url = getCurrentUrl();
    if (!url) return;

    // Always start by clearing calculator-related params.
    url.searchParams.delete(PARAM_CAMERAS);
    url.searchParams.delete(PARAM_SMART);
    url.searchParams.delete(PARAM_DUMB);

    if (state && typeof state === 'object') {
      const { cameras, smart, dumb } = state;

      if (cameras !== undefined && cameras !== null && cameras !== '') {
        url.searchParams.set(PARAM_CAMERAS, String(cameras));
      }
      if (smart !== undefined && smart !== null && smart !== '') {
        url.searchParams.set(PARAM_SMART, String(smart));
      }
      if (dumb !== undefined && dumb !== null && dumb !== '') {
        url.searchParams.set(PARAM_DUMB, String(dumb));
      }
    }

    try {
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // Fail silently – URL state is a UX enhancement, not critical path.
    }
  }

  /**
   * buildUrl(targetPage)
   *
   * Returns a URL string for `targetPage` that includes the current
   * calculator state from the address bar.
   *
   * - `targetPage` can be an absolute URL or a relative path.
   * - If URL/state parsing fails for any reason, this falls back to
   *   returning `targetPage` unchanged.
   */
  function buildUrl(targetPage) {
    if (typeof window === 'undefined') {
      return targetPage;
    }

    const baseHref =
      typeof targetPage === 'string' && targetPage.length > 0
        ? targetPage
        : window.location.href;

    let url;
    try {
      url = new URL(baseHref, window.location.href);
    } catch (e) {
      return targetPage;
    }

    const state = readState();
    if (state && typeof state === 'object') {
      const { cameras, smart, dumb } = state;
      if (cameras !== undefined && cameras !== null && cameras !== '') {
        url.searchParams.set(PARAM_CAMERAS, String(cameras));
      }
      if (smart !== undefined && smart !== null && smart !== '') {
        url.searchParams.set(PARAM_SMART, String(smart));
      }
      if (dumb !== undefined && dumb !== null && dumb !== '') {
        url.searchParams.set(PARAM_DUMB, String(dumb));
      }
    }

    return url.toString();
  }

  const api = {
    readState,
    writeState,
    buildUrl,
  };

  if (typeof window !== 'undefined') {
    window.SighthoundState = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
