/**
 * Safe fetch descriptor initialization.
 * Prevents "TypeError: Cannot set property fetch of #<Window> which has only a getter"
 * when third-party libraries or environments attempt to assign to window.fetch or globalThis.fetch.
 */
(() => {
  if (typeof window === 'undefined') return;

  try {
    const rawFetch = window.fetch || (typeof globalThis !== 'undefined' ? globalThis.fetch : undefined);
    if (typeof rawFetch === 'function') {
      let activeFetch = rawFetch.bind(window);

      const fetchProp: PropertyDescriptor = {
        get() {
          return activeFetch;
        },
        set(fn: any) {
          activeFetch = typeof fn === 'function' ? fn : activeFetch;
        },
        configurable: true,
        enumerable: true,
      };

      try {
        Object.defineProperty(window, 'fetch', fetchProp);
      } catch {
        // ignore
      }

      if (typeof Window !== 'undefined' && Window.prototype) {
        try {
          Object.defineProperty(Window.prototype, 'fetch', fetchProp);
        } catch {
          // ignore
        }
      }

      if (typeof globalThis !== 'undefined' && (globalThis as any) !== window) {
        try {
          Object.defineProperty(globalThis, 'fetch', fetchProp);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
})();
