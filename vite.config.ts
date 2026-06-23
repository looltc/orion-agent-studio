import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import path from "path";

const isWeb = process.env.VITE_WEB_MODE === "true";

export default defineConfig({
  plugins: [
    react(),
    ...(isWeb
      ? []
      : [
          electron([
            {
              entry: "electron/main.ts",
              vite: {
                build: {
                  outDir: "dist-electron",
                  rollupOptions: { external: ["electron"] },
                },
              },
            },
            {
              entry: "electron/preload.ts",
              onstart(options: any) {
                options.reload();
              },
              vite: {
                build: {
                  outDir: "dist-electron",
                  rollupOptions: { external: ["electron"] },
                },
              },
            },
          ]),
          renderer(),
        ]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: isWeb
    ? {
        port: 5173,
        open: "/index-web.html",
      }
    : {
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
