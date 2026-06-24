import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// ponytail: base must match the GitHub Pages repo path. Change "stopwatch" if the repo is renamed.
const base = "/stopwatch/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Apnea Trainer",
        short_name: "Apnea",
        description: "Static breath-hold trainer — CO₂ / O₂ / free / custom.",
        theme_color: "#03070d",
        background_color: "#03070d",
        display: "standalone",
        scope: base,
        start_url: base,
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
