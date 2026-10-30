/**
 * D1.9 TEST-SERVER CONFIG ONLY — not used by npm run build or regular dev.
 * Keeps the production App.tsx, vite.config.ts and declared release fingerprint
 * byte-for-byte unchanged. The synthetic QA screen has its own HTML entry,
 * served only under the Playwright test server.
 */
import baseConfig from "./vite.config";
import { defineConfig, mergeConfig, type Plugin } from "vite";

const d19Route:Plugin={
  name:"d19-offline-coach-review-entry",
  apply:"serve",
  configureServer(server){
    server.middlewares.use((request,response,next)=>{
      const route=(request.url??"").split("?")[0];
      if(route!=="/__e2e/d19-coach-review")return next();
      response.statusCode=200;
      response.setHeader("Content-Type","text/html; charset=utf-8");
      response.setHeader("Cache-Control","no-store");
      response.end([
        "<!doctype html><html lang='fr'><head><meta charset='UTF-8'/>",
        "<meta name='viewport' content='width=device-width,initial-scale=1'/>",
        "<title>TFCLab D1.9 — synthétique DEV seulement</title></head>",
        "<body><div id='root'></div>",
        "<script type='module' src='/src/pages/__e2e/D19CoachReviewEntry.tsx'></script>",
        "</body></html>",
      ].join(""));
    });
  },
};
export default defineConfig(async env=>mergeConfig(await baseConfig(env),{
  plugins:[d19Route],
}));
