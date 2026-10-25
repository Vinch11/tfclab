import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { checkedPlanRelease, readDeclaration } from "./scripts/preproduction/plan-release-source.mjs";

// https://vitejs.dev/config/
const BUILD_DATE = process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000) : new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const APP_VERSION = `${BUILD_DATE.getFullYear()}.${pad(BUILD_DATE.getMonth() + 1)}.${pad(BUILD_DATE.getDate())}-${pad(BUILD_DATE.getHours())}${pad(BUILD_DATE.getMinutes())}`;

export default defineConfig(async ({ mode, command }) => {
 const root = __dirname;
 const PLAN_RELEASE = command === "build"
   ? (await checkedPlanRelease(root, process.env.TFCL_PLAN_RELEASE_INFO ? JSON.parse(process.env.TFCL_PLAN_RELEASE_INFO) : undefined)).info
   : readDeclaration(root);
 return {
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __PLAN_RELEASE_INFO__: JSON.stringify(PLAN_RELEASE),
    __BUILD_TIME__: JSON.stringify(BUILD_DATE.toISOString()),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    { name: "plan-release-metadata", generateBundle() { this.emitFile({ type: "asset", fileName: "plan-release.json", source: JSON.stringify(PLAN_RELEASE) }); } } satisfies Plugin,
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "apple-touch-icon-180x180.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Two For Coaching Lab",
        short_name: "2FC Lab",
        description: "Laboratoire de performance - Analyse physiologique staff-grade",
        theme_color: "#0d1117",
        background_color: "#0d1117",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB pour accommoder les librairies PDF
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,json}"]
,
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        // Important: never fallback to index.html for DOCX downloads/fetches
        navigateFallbackDenylist: [/\.docx$/i],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Ensure templates (.docx) are fetched as binary and never replaced by app-shell
            urlPattern: /\/program-templates\/.*\.docx$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "docx-templates",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
 };
});
