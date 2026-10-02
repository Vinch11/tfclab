import { defineConfig, devices } from "@playwright/test";

/**
 * Première config Playwright de ce repo (`@playwright/test` était déjà une
 * dépendance mais jamais configuré ni utilisé — aucun fichier `.spec.ts`
 * n'existait). Objectif : un filet de tests navigateur RÉEL pour les bugs
 * d'interaction (touch/souris, responsive) invisibles aux tests unitaires
 * jsdom/happy-dom — cf. le bug "Exporter un rapport ne fait rien" sur iOS
 * Safari (menu mobile "Plus" qui se rouvrait/refermait seul).
 *
 * Le project "Mobile Safari" (`devices["iPhone 13"]`) tourne sous WebKit —
 * pas Chromium — car `defaultBrowserType` de ce device est "webkit" (un
 * vrai iPhone ne tourne jamais sous Chrome). C'est volontaire : WebKit est
 * le seul moteur qui reproduit le mécanisme réel du bug #296 (séquence
 * souris de compatibilité ~300ms après un touchend sans preventDefault(),
 * spécifique à Safari) — CI installe donc chromium ET webkit (voir
 * .github/workflows/ci.yml).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
      // MobileBottomNav est caché en CSS (`md:hidden`) au-dessus du
      // breakpoint mobile — ce spec n'a pas de sens en viewport desktop.
      testIgnore: /mobile-nav\.spec\.ts/,
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
