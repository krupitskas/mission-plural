import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  assetsInclude: ["**/*.wgsl"],
  build: {
    outDir: "dist",
    target: "esnext",
    assetsInlineLimit: 0,
  },
  server: {
    open: true,
  },
});
