import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- Stale chunk recovery -------------------------------------------------
// After a new deploy, cached HTML/JS may reference chunk files that no longer
// exist -> "Importing a module script failed." Reload once (bypassing SW cache)
// to pick up the fresh build instead of showing a blank screen.
const RELOAD_FLAG = "chunk-reload-attempt";

const recoverFromStaleChunk = async () => {
  if (sessionStorage.getItem(RELOAD_FLAG)) return;
  sessionStorage.setItem(RELOAD_FLAG, "1");
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
window.setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 20000);



// Hide splash screen when React is ready
const hideSplashScreen = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 500);
  }
};

createRoot(document.getElementById("root")!).render(<App />);

// Hide splash after a short delay to ensure app is rendered
setTimeout(hideSplashScreen, 800);
