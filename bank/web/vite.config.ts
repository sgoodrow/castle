import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained page; the bot's web server (src/web) serves it and the bank data.
export default defineConfig(({ mode }) => {
  const api = loadEnv(mode, ".", "BANK_").BANK_API || "http://localhost:5000";
  return {
    plugins: [react(), viteSingleFile()],
    build: { outDir: "../dist", emptyOutDir: true },
    // `npm run dev` talks to a local bank web server (BANK_API, default the bot's port 5000).
    server: { proxy: { "/api": api, "/icons": api } },
  };
});
