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
          enabled: true
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
