// Bootstrap précoce : AUCUN import statique lourd ici. App/React/CSS sont chargés
// dynamiquement et bornés par bootApp ; le watchdog d'index.html couvre le cas où
// ce module lui-même n'arrive jamais.
import { bootApp, safeSession, type BootHost } from "./bootstrap/boot";

declare global { interface Window { __tfclBoot?: BootHost } }
const host: BootHost = window.__tfclBoot ?? {
  done: () => document.getElementById("splash-screen")?.remove(),
  fail: (msg) => { const r = document.getElementById("root"); if (r) r.textContent = msg; },
  isFailed: () => false,
};

// --- Stale chunk recovery -------------------------------------------------
// After a new deploy, cached HTML/JS may reference chunk files that no longer
// exist -> "Importing a module script failed." Reload once (bypassing SW cache)
// to pick up the fresh build instead of showing a blank screen.
const RELOAD_FLAG = "chunk-reload-attempt";

const recoverFromStaleChunk = async () => {
  // Stockage indisponible ⇒ pas de garde anti-boucle ⇒ pas de rechargement automatique.
  if (safeSession.get(RELOAD_FLAG) || !safeSession.set(RELOAD_FLAG, "1")) return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
};

const isChunkError = (msg?: string) =>
  !!msg &&
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS/i.test(
    msg
  );

window.addEventListener("vite:preloadError", () => {
  void recoverFromStaleChunk();
});
window.addEventListener("error", (e) => {
  if (isChunkError(e.message)) void recoverFromStaleChunk();
});
window.addEventListener("unhandledrejection", (e) => {
  if (isChunkError((e.reason as Error)?.message)) void recoverFromStaleChunk();
});
// After a stable period, clear the guard so a future stale deploy can recover.
window.setTimeout(() => safeSession.remove(RELOAD_FLAG), 20000);

// --- PWA update checks ------------------------------------------------------
// iOS home-screen apps are rarely killed, so the service worker almost never
// re-checks for a new deploy on its own. Explicitly check on launch, every time
// the app comes back to the foreground, and every 15 min; when a new version is
// found, activate it and reload immediately (registerType: "autoUpdate").
// Skipped inside the Lovable editor iframe / dev to avoid stale-preview issues.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
if (import.meta.env.PROD && !isInIframe && "serviceWorker" in navigator) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          void updateSW(true);
        },
        onRegisteredSW(_url, registration) {
          if (!registration) return;
          const check = () => {
            if (navigator.onLine) void registration.update().catch(() => {});
          };
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") check();
          });
          window.addEventListener("focus", check);
          window.setInterval(check, 15 * 60 * 1000);
        },
      });
    })
    .catch(() => {});
}



// Démarrage borné : rejet ou délai ⇒ erreur lisible + bouton Recharger (manuel).
const BOOT_TIMEOUT_MS = 25_000;
void bootApp({
  timeoutMs: BOOT_TIMEOUT_MS,
  host,
  load: async () => {
    const [{ createRoot }, { default: App }] = await Promise.all([
      import("react-dom/client"), import("./App.tsx"), import("./index.css"),
    ]);
    return { createRoot, App };
  },
  render: ({ createRoot, App }) => { createRoot(document.getElementById("root")!).render(<App />); },
});
