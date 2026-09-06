import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "/",
    server: {
      port: 3000,
      host: "0.0.0.0",
      strictPort: true,
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['icon.png'],
        manifest: {
          short_name: "হাজিরা",
          name: "ছাত্র হাজিরা খাতা (Student Attendance)",
          icons: [
            {
              src: "/icon.png",
              type: "image/png",
              sizes: "192x192",
              purpose: "any"
            },
            {
              src: "/icon.png",
              type: "image/png",
              sizes: "512x512",
              purpose: "any"
            },
            {
              src: "/icon.png",
              type: "image/png",
              sizes: "512x512",
              purpose: "maskable"
            }
          ],
          start_url: "/",
          scope: "/",
          display: "standalone",
          theme_color: "#0F5C7A",
          background_color: "#f8fafc"
        },
        devOptions: {
          enabled: false
        },
        workbox: {
          globPatterns: ['**/*.{html,css}', 'assets/index*.js', 'manifest.json'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api\//, /firebase-messaging-sw\.js/, /__\/auth/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\/assets\/.*\.js$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-dynamic-chunks',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-images',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      "process.env.API_KEY": JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || ""),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY || ""),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
