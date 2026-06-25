import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isWeb = process.env.VITE_WEB_MODE === "true";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
  },
  build: isWeb
    ? {
        outDir: "dist-web",
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, "index-web.html"),
          },
        },
      }
    : {
        outDir: "dist",
      },
});
