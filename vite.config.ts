import { defineConfig } from "vite";

// Relative base so the itch.io HTML export works from any subfolder.
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
  },
});
