import { defineConfig } from "@playwright/test";
import base from "../../../playwright.config";

export default defineConfig({
  ...base,
  testDir: "../../../e2e",
  testMatch: /physiology-review.spec.ts/,
  retries: 0,
  projects: [{ name: "local-synthetic-chromium", use: {
    browserName: "chromium",
    launchOptions: { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] },
  } }],
});
