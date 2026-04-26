/**
 * Detects whether the site is running inside the wrapped mobile app.
 * Two signals:
 *  1. URL flag `?app=1` — set by the wrapper as its start URL. Cached in
 *     localStorage so refreshes inside the app stay in app mode.
 *  2. WebView user-agent fallback (Median, GoNative, Capacitor, generic `wv`).
 *
 * A normal desktop/mobile browser visit returns `false` — the website
 * behaves identically to today.
 */
const APP_FLAG_KEY = 'cifraa_is_mobile_app';

export function isMobileApp(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. URL flag (most reliable — set once by wrapper)
    const params = new URLSearchParams(window.location.search);
    if (params.get('app') === '1') {
      try { localStorage.setItem(APP_FLAG_KEY, '1'); } catch {}
      return true;
    }

    // 2. Cached flag from a previous app-mode visit
    try {
      if (localStorage.getItem(APP_FLAG_KEY) === '1') return true;
    } catch {}

    // 3. WebView UA fallback
    const ua = navigator.userAgent || '';
    const isWebView =
      /\bwv\b/.test(ua) ||                  // Android WebView
      /Median/i.test(ua) ||                 // Median.co wrapper
      /GoNative/i.test(ua) ||               // GoNative / WebViewGold
      /Capacitor/i.test(ua) ||              // Capacitor
      /Cordova/i.test(ua) ||                // Cordova
      // iOS standalone PWA / TWA
      // @ts-expect-error - non-standard
      window.navigator.standalone === true;

    return isWebView;
  } catch {
    return false;
  }
}
