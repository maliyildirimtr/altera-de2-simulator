import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

const TEXT = {
  en: { update: 'A new version of Logic Lab is ready.', reload: 'Reload', offline: 'You are offline — tools that are already loaded keep working.', ready: 'Logic Lab now works offline.', close: 'Close' },
  tr: { update: 'Logic Lab\'in yeni sürümü hazır.', reload: 'Yenile', offline: 'Çevrimdışısın — yüklenmiş araçlar çalışmaya devam eder.', ready: 'Logic Lab artık çevrimdışı da çalışıyor.', close: 'Kapat' },
};

/**
 * Registers the service worker (production builds only) and shows a small
 * notice when a new version is waiting, when the app first becomes available
 * offline, and while the device is offline.
 */
export function PwaStatus() {
  const { lang } = useI18n();
  const t = TEXT[lang];
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let reloading = false;
    const onChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const track = (sw: ServiceWorker | null) => {
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state !== 'installed') return;
          // An old worker still controls the page: a new version is waiting.
          if (navigator.serviceWorker.controller) setWaiting(sw);
          else setReady(true);
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      track(reg.installing);
      reg.addEventListener('updatefound', () => track(reg.installing));
    }).catch(() => undefined);
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setReady(false), 5000);
    return () => window.clearTimeout(id);
  }, [ready]);

  const message = waiting ? t.update : offline ? t.offline : ready ? t.ready : '';
  if (!message) return null;
  return (
    <div data-testid="pwa-status" role="status" className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-4 max-w-[calc(100vw-2rem)] flex items-center gap-3 px-3.5 py-2 rounded-[0.5rem] border shadow-lg text-[0.8125rem]"
      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
      {offline && !waiting && <WifiOff size={15} style={{ color: '#d97706' }} />}
      <span>{message}</span>
      {waiting && (
        <button type="button" data-testid="pwa-reload" onClick={() => waiting.postMessage('skip-waiting')} className="flex items-center gap-1 px-2.5 min-h-8 rounded-[0.25rem] font-medium" style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
          <RefreshCw size={13} /> {t.reload}
        </button>
      )}
      {(waiting || ready) && (
        <button type="button" aria-label={t.close} onClick={() => { setWaiting(null); setReady(false); }} className="p-1"><X size={14} /></button>
      )}
    </div>
  );
}
