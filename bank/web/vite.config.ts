import { existsSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// build.py writes the bank payload here; it is baked into the page so the
// site is a single static file with no runtime fetches.
const PAYLOAD = new URL("./payload.json", import.meta.url);

function bankData(): Plugin {
  return {
    name: "bank-data",
    transformIndexHtml(html) {
      if (!existsSync(PAYLOAD)) throw new Error("payload.json missing: run scripts/build.py first");
      const json = readFileSync(PAYLOAD, "utf-8").replace(/<\//g, "<\\/");
      return html.replace("__BANK_DATA__", () => json);
    },
  };
}

export default defineConfig({
  plugins: [react(), bankData(), viteSingleFile()],
  build: { outDir: "../dist", emptyOutDir: true },
});
