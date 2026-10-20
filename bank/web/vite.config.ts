/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained page; the bot's web server (src/web) serves it and the bank data.
export default defineConfig(({ mode }) => {
  const api = loadEnv(mode, ".", "BANK_").BANK_API || "http://localhost:5000";
  return {
    plugins: [react(), viteSingleFile()],
    build: { outDir: "../dist", emptyOutDir: true, sourcemap: "hidden" },
    // `npm run dev` talks to a local bank web server (BANK_API, default the bot's port 5000).
    server: { proxy: { "/api": api, "/icons": api } },
    test: {
      // The features in features/ drive the whole page in a pretend browser.
      environment: "jsdom",
      setupFiles: ["features/support/setup.ts"],
      // Each step is a test. A busy machine (coverage, other suites) can slow one well past vitest's 5s,
      // so steps get the same 20s as the server's features.
      testTimeout: 20000,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.*", "src/__fixtures__/**", "src/main.tsx"],
        reporter: ["text-summary", "text"],
        // Files with tests can't lose coverage. Raise these as tests grow; add a file here once it has tests.
        thresholds: {
          "src/data.ts": { lines: 100, branches: 83, functions: 100 },
          "src/search.ts": { lines: 100, branches: 100, functions: 100 },
          "src/state.ts": { lines: 100, branches: 94, functions: 100 },
        },
      },
    },
  };
});
