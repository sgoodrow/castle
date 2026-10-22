// What the jewelers make to order and what each costs, from their "Castle Jewelcrafting Table"
// Google Sheet. Like the other sheets it's public, read as CSV, refreshed in the background and kept
// on disk, so the bank never waits on Google. The sheet is read as the jewelers keep it: its price
// table holds about 100 recipes, under a header row per section, and the guild prices follow the
// gem prices the jewelers set above them.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { log } from "../shared/logger";
import { parseCsv } from "./spell-sheet";
import type { Lookup } from "./sky-sheet";

// The price table is the sheet's first tab, which an export without a tab id reads.
export const JEWELRY_SHEET =
  "https://docs.google.com/spreadsheets/d/1_Wqh3A_0Wg0JN4Fbt06j51yUqUZVKcVDLbSzzJ9FI4k/export?format=csv";

// One part of what the guild spends on the materials, as a section's header names it: "Bar" and
// "Gem" for the dropped gems, "Material" for the vendor ones.
export type MaterialCost = { what: string; pp: number };
// A recipe as the sheet prices it. price is the guild price, in platinum. note is the jewelers' own,
// e.g. "Don't ask for this".
export type Recipe = {
  materials: MaterialCost[];
  trivial: number;
  success: number; // a fraction: 0.8625 for 86.25%
  price: number;
  note: string;
};

const whole = (s: string) => (/^\d+$/.test(s.trim()) ? +s.trim() : null);
const percent = (s: string) => {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)%$/);
  return m ? +m[1] / 100 : null;
};

// Each section of the price table starts with a header row holding ITEM NAME. Under it is a row a
// recipe, or a row with only a name, which titles a part of the section. Anything above the first
// header is the gem price table, which the guild prices already follow. A recipe row whose costs
// aren't numbers is an error, not a row to skip, so a broken sheet gets noticed.
export function recipes(rows: string[][]): [name: string, recipe: Recipe][] {
  const out: [string, Recipe][] = [];
  let head: string[] | null = null;
  for (const r of rows) {
    const cells = r.map((c) => c.trim());
    if (cells.includes("ITEM NAME")) {
      head = cells;
      continue;
    }
    if (!head) continue;
    const col = (h: string) => head!.indexOf(h);
    const name = cells[col("ITEM NAME")] ?? "";
    const rest = cells.filter((_, i) => i !== col("ITEM NAME"));
    if (!name || rest.every((c) => !c || c === "None")) continue; // a blank row or a title
    const materials = head.flatMap((h, i) => {
      const m = h.match(/^(\w+) COST \(pp\)$/);
      if (!m) return [];
      const pp = whole(cells[i] ?? "");
      if (pp == null) throw new Error(`${name}: ${h} isn't a number`);
      return [{ what: m[1].charAt(0) + m[1].slice(1).toLowerCase(), pp }];
    });
    const trivial = whole(cells[col("TRIVIAL")] ?? "");
    const success = percent(cells[col("SUCCESS RATE")] ?? "");
    const price = whole(cells[col("GUILD PRICE (pp)")] ?? "");
    if (
      !materials.length ||
      trivial == null ||
      success == null ||
      price == null
    )
      throw new Error(
        `${name}: no material costs, trivial, success rate and guild price`
      );
    const note = cells[col("Notes")] ?? "";
    out.push([name, { materials, trivial, success, price, note }]);
  }
  if (!head) throw new Error("no ITEM NAME header");
  return out;
}

export class JewelrySheet {
  private byId = new Map<number, Recipe>();
  private file: string;
  private problems = ""; // logged once, not every refresh

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "jewelry-sheet.json");
    if (existsSync(this.file)) {
      try {
        const saved = JSON.parse(readFileSync(this.file, "utf-8"));
        if (!Array.isArray(saved)) throw new Error("not a list");
        this.byId = new Map(saved);
      } catch {
        /* a half-written file is fetched again */
      }
    }
  }

  // Every recipe, by the id of the item it makes.
  all(): ReadonlyMap<number, Recipe> {
    return this.byId;
  }

  // `lookup` finds the id of the item a recipe makes, so a misspelt name gets noticed.
  async refresh(lookup: (name: string) => Lookup) {
    let rows: [string, Recipe][];
    try {
      const res = await fetch(JEWELRY_SHEET, {
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      rows = recipes(parseCsv(await res.text()));
    } catch (e) {
      log(`bank web: jewelry sheet: ${e}`);
      return;
    }
    const byId = new Map<number, Recipe>();
    const noItem: string[] = [];
    const twoItems: string[] = [];
    for (const [name, recipe] of rows) {
      const id = lookup(name);
      if (id === "no such item") noItem.push(name);
      else if (id === "more than one item") twoItems.push(name);
      else byId.set(id, recipe);
    }
    const text = [
      noItem.length && `no such item ${noItem.join(", ")}`,
      twoItems.length && `more than one item called ${twoItems.join(", ")}`,
    ]
      .filter(Boolean)
      .join("; ");
    if (text && text !== this.problems) log(`bank web: jewelry sheet: ${text}`);
    this.problems = text;
    this.byId = byId;
    writeFileSync(this.file, JSON.stringify([...byId]));
  }
}
