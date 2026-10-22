// Refresh only while the catalogue is visible. Coalesce focus/visibility events
// and never start a second refresh while the previous one is still pending.
export const CATALOG_REFRESH_INTERVAL = 30_000;

export function subscribeToCatalogRefresh(
  refresh: () => Promise<unknown>,
  interval = CATALOG_REFRESH_INTERVAL,
): () => void {
  let disposed = false;
  let pending = false;
  let lastStarted = -Infinity;

  const run = async () => {
    if (disposed || pending || document.visibilityState === 'hidden' || navigator.onLine === false) return;
    if (Date.now() - lastStarted < 2_000) return;
    pending = true;
    lastStarted = Date.now();
    try {
      await refresh();
    } catch (error) {
      // Keep the current catalogue on transient failures and retry next time.
      console.error('Catalogue refresh failed:', error);
    } finally {
      pending = false;
    }
  };

  const timer = window.setInterval(run, interval);
  document.addEventListener('visibilitychange', run);
  window.addEventListener('focus', run);
  window.addEventListener('online', run);
  window.addEventListener('pageshow', run);

  return () => {
    disposed = true;
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', run);
    window.removeEventListener('focus', run);
    window.removeEventListener('online', run);
    window.removeEventListener('pageshow', run);
  };
}
