import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        // Framework code changes far less often than app code, so keep it in stable
        // chunks that survive app deploys in the browser and service-worker caches.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "tanstack", test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: "dexie", test: /node_modules[\\/]dexie[\\/]/ },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      includeAssets: ["icon.svg", "maskable-icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Just Workout",
        short_name: "Workout",
        description: "Personal workout planning, logging, and progression.",
        theme_color: "#f7f5ef",
        background_color: "#f7f5ef",
        display: "standalone",
        start_url: "/",
        // PNGs first: some Android launchers and iOS ignore SVG manifest icons.
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/maskable-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});
