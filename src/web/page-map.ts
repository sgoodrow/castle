// Turns a stack from the bank page back into source lines. The page's script is minified and
// inlined into index.html, so a browser reports positions in the HTML; the build's hidden source
// map (bank/dist/*.js.map, never served) maps them back to bank/web/src.
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { SourceMapConsumer } from "source-map";

const PAGE_POS = /https?:\/\/[^\s)]+?:(\d+):(\d+)/g;
const SCRIPT_TAG = '<script type="module" crossorigin>';

export class PageMap {
  private consumer: SourceMapConsumer | null = null;
  private line0 = 0; // the HTML line (1-based) where the script starts
  private col0 = 0; // and the column on that line

  constructor(private distDir: string) {
    try {
      const html = readFileSync(path.join(distDir, "index.html"), "utf-8");
      const map = readdirSync(distDir).find(f => f.endsWith(".js.map"));
      const at = html.indexOf(SCRIPT_TAG);
      if (!map || at < 0) return;
      const before = html.slice(0, at + SCRIPT_TAG.length).split("\n");
      this.line0 = before.length;
      this.col0 = before[before.length - 1].length;
      this.consumer = new SourceMapConsumer(JSON.parse(readFileSync(path.join(distDir, map), "utf-8")));
    } catch {
      this.consumer = null; // no map: positions stay as page:line:col
    }
  }

  strip(stack: string) {
    return stack.replace(PAGE_POS, (_, l: string, c: string) => `page:${l}:${c}`);
  }

  // Each `<page url>:line:col` becomes `bank/web/src/file.tsx:line:col (name)`. Page URLs never
  // survive, mapped or not: their query string holds what the member was searching for.
  map(stack: string) {
    return stack.replace(PAGE_POS, (_, l: string, c: string) => {
      const line = +l - this.line0 + 1;
      const column = +c - 1 - (line === 1 ? this.col0 : 0);
      const pos = this.consumer && line >= 1 ? this.consumer.originalPositionFor({ line, column }) : null;
      if (!pos?.source || pos.line == null) return `page:${l}:${c}`;
      const file = path.relative(path.resolve(this.distDir, "../.."), path.resolve(this.distDir, pos.source));
      return `${file}:${pos.line}:${(pos.column ?? 0) + 1}${pos.name ? ` (${pos.name})` : ""}`;
    });
  }
}
