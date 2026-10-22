// What the bank charges for each Kunark and Velious spell, and which spells it only auctions, from
// the bankers' "Kunark/Velious Spells" Google Sheet. The sheet is public, so its tabs are read as
// CSV with no sign-in. Like the wiki cache, it's refreshed in the background and kept on disk, so
// the bank is served from the copy and never waits on Google.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { log } from "../shared/logger";
import { SheetAlert } from "./sheet-alert";

const SHEET =
  "https://docs.google.com/spreadsheets/d/14XhfTVWPmy3GxjG4OQQH241yqvyuZh-ednaqmFRzq28/export?format=csv&gid=";
// Tabs by id, which survives a rename. An unknown id is an error, never another tab.
export const FORBIDDEN_TAB = "673309190";
export const CLASS_TABS: Record<string, string> = {
  "Bard Songs": "1564273249",
  "Cleric Spells": "1298047608",
  "Druid Spells": "1061059755",
  "Enchanter Spells": "1539690940",
  "Magician Spells": "912763132",
  "Necromancer Spells": "1215445088",
  "Shaman Spells": "512607215",
  "Wizard Spells": "2008550886",
};

// A spell's price: platinum, with a DKP alternative for some, or a DKP auction.
export type SheetPrice =
  { kind: "pp"; pp: number; dkp: number | null } | { kind: "auction" };

// "Spell: Porlos' Fury" and the sheet's "Porlos` Fury" are the same spell.
export const spellKey = (name: string) =>
  name
    .replace(/^(Spell|Song): /i, "")
    .replace(/`/g, "'")
    .trim()
    .toLowerCase();

// RFC 4180 CSV, as Google exports it: quoted fields may hold commas, newlines and doubled quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') field += text[++i];
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      rows.push([...row, field.replace(/\r$/, "")]);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

// The sheet's Cost column: "50p", "50pp", "200p OR 1DKP" or "DKP Auction only".
export function parseCost(cost: string): SheetPrice | null {
  if (/auction/i.test(cost)) return { kind: "auction" };
  const m = cost.match(/^\s*(\d+)\s*pp?\s*(?:or\s*(\d+)\s*dkp)?\s*$/i);
  return m ? { kind: "pp", pp: +m[1], dkp: m[2] ? +m[2] : null } : null;
}

// The Forbidden Spells tab: a column of names per class, ended by a blank row (notes follow it).
export function forbiddenNames(rows: string[][]): string[] {
  const names: string[] = [];
  for (const row of rows.slice(1)) {
    const cells = row.map((c) => c.trim()).filter(Boolean);
    if (!cells.length) break;
    names.push(...cells);
  }
  return names;
}

// A class tab: one spell a row, under a header row with Name and Cost.
export function classCosts(rows: string[][]): [name: string, cost: string][] {
  const [head = []] = rows;
  const name = head.indexOf("Name");
  const cost = head.indexOf("Cost");
  if (name < 0 || cost < 0) throw new Error("no Name and Cost columns");
  return rows
    .slice(1)
    .map((r): [string, string] => [
      r[name]?.trim() ?? "",
      r[cost]?.trim() ?? "",
    ])
    .filter(([n]) => n);
}

export class SpellSheet {
  private prices = new Map<string, SheetPrice>();
  private file: string;
  private problems = ""; // logged once, not every refresh

  constructor(
    dir: string,
    private alert: SheetAlert
  ) {
    mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "spell-sheet.json");
    if (existsSync(this.file)) {
      try {
        this.prices = new Map(JSON.parse(readFileSync(this.file, "utf-8")));
      } catch {
        /* a half-written file is fetched again */
      }
    }
  }

  // Only scrolls: a "Bedlam" that isn't "Spell: Bedlam" is some other item.
  get(itemName: string): SheetPrice | undefined {
    if (!/^(Spell|Song): /i.test(itemName)) return undefined;
    return this.prices.get(spellKey(itemName));
  }

  // Read every tab. If any can't be read, keep the old copy whole rather than half of a new one.
  // `known` is every spell the item database has, so a misspelt name in the sheet gets noticed.
  async refresh(known: Set<string>) {
    let tabs: string[][][];
    try {
      tabs = await Promise.all(
        [FORBIDDEN_TAB, ...Object.values(CLASS_TABS)].map(async (gid) => {
          const res = await fetch(SHEET + gid, {
            signal: AbortSignal.timeout(30000),
          });
          if (!res.ok) throw new Error(`tab ${gid}: HTTP ${res.status}`);
          return parseCsv(await res.text());
        })
      );
    } catch (e) {
      log(`bank web: spell sheet: ${e}`);
      await this.alert.report(
        "it couldn't be read, so the bank keeps its last copy if it has one"
      );
      return;
    }
    const [forbidden = [], ...classes] = tabs;
    const prices = new Map<string, SheetPrice>();
    const unknown = new Set<string>();
    const unreadable: string[] = [];
    try {
      for (const tab of classes)
        for (const [name, cost] of classCosts(tab)) {
          const price = parseCost(cost);
          if (price) prices.set(spellKey(name), price);
          else unreadable.push(`${name} "${cost}"`);
          if (!known.has(spellKey(name))) unknown.add(name);
        }
    } catch (e) {
      log(`bank web: spell sheet: ${e}`);
      await this.alert.report(
        "it couldn't be read, so the bank keeps its last copy if it has one"
      );
      return;
    }
    // The forbidden list wins over whatever a class tab says.
    for (const name of forbiddenNames(forbidden)) {
      prices.set(spellKey(name), { kind: "auction" });
      if (!known.has(spellKey(name))) unknown.add(name);
    }
    const problems = [
      ...(unknown.size
        ? [`no such spell ${[...unknown].sort().join(", ")}`]
        : []),
      ...(unreadable.length
        ? [`can't read the cost of ${unreadable.join(", ")}`]
        : []),
    ].join("; ");
    if (problems && problems !== this.problems)
      log(`bank web: spell sheet: ${problems}`);
    this.problems = problems;
    this.prices = prices;
    writeFileSync(this.file, JSON.stringify([...prices]));
    await this.alert.report(problems);
  }
}
