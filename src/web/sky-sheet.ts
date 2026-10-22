// Which islands' quests each Plane of Sky item is for, and which characters hold items for
// multiquesting, from the Sky bankers' "Plane of Sky" Google Sheet. Like the spell sheet it's public,
// read as CSV, refreshed in the background and kept on disk, so the bank never waits on Google. Its
// waitlist stays in the sheet: the site doesn't read it.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { log } from "../shared/logger";
import { parseCsv } from "./spell-sheet";
import { SheetAlert } from "./sheet-alert";

export const SKY_SHEET =
  "https://docs.google.com/spreadsheets/d/1zznLAdu688lxfQ7TuBzBx11wuT9eLClakOuMa8rveKg/export?format=csv&gid=";
// The tabs, by id, which survives a rename. "Item Counts and announcements" spells its item names as
// the bank's uploads spell them.
export const SKY_TAB = "2041401641";
export const MQ_TAB = "412443712"; // "Multiquest"

// The Sky mules: cgskya … cgskyhh and gmskyone … gmskyseven.
export const isSkyMule = (char: string) => /sky/i.test(char);

// The islands with quests, as the wiki numbers them.
export type Island = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
// islands are the quests' islands, empty when the sheet doesn't list the item. note is the
// sheet's word on it, e.g. "fd ring" or "dkp bid".
export type SkyPart = { islands: Island[]; note: string };

// One item a row, under a header with Items, Island and Notes. Each island's own row ("Island 3",
// with its reward in the Island column) and anything without an island number is skipped. An item
// on more than one island gets each, and each distinct note.
export function skyParts(rows: string[][]): [name: string, part: SkyPart][] {
  const [head = []] = rows;
  const name = head.indexOf("Items");
  const island = head.indexOf("Island");
  const note = head.indexOf("Notes");
  if (name < 0 || island < 0 || note < 0)
    throw new Error("no Items, Island and Notes columns");
  const parts = new Map<
    string,
    { name: string; islands: Island[]; notes: string[] }
  >();
  for (const r of rows.slice(1)) {
    const n = r[name]?.trim() ?? "";
    const m = r[island]?.trim().match(/^Island ([1-8])$/i);
    if (!n || !m) continue;
    const p = parts.get(n.toLowerCase()) ?? { name: n, islands: [], notes: [] };
    parts.set(n.toLowerCase(), p);
    const i = +m[1] as Island; // the pattern only matches 1–8
    if (!p.islands.includes(i)) p.islands.push(i);
    const t = r[note]?.trim() ?? "";
    if (t && !p.notes.includes(t)) p.notes.push(t);
  }
  return [...parts.values()].map((p) => [
    p.name,
    { islands: p.islands.sort((a, b) => a - b), note: p.notes.join(", ") },
  ]);
}

// One held item a row, under a header with ITEM, the holder's name in the column before it. A row is
// one of that item, so a holder listed twice holds two.
export function mqRows(rows: string[][]): [holder: string, item: string][] {
  const [head = []] = rows;
  const item = head.indexOf("ITEM");
  if (item < 1) throw new Error("no ITEM column after the holders");
  return rows.slice(1).flatMap((r): [string, string][] => {
    const h = r[item - 1]?.trim() ?? "";
    const n = r[item]?.trim() ?? "";
    return h || n ? [[h, n]] : [];
  });
}

// A character's name as the bank shows it: "phrixios" is Phrixios. Anything that isn't one word of
// letters, such as a row of backticks, is no name.
const charName = (s: string) =>
  /^[a-z]+$/i.test(s)
    ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    : null;

// What the bank knows of an item name: its one id, or why there isn't one.
export type Lookup = number | "no such item" | "more than one item";
// [holder, item id, count]: who holds how many of an item for multiquesting.
export type MqHolding = [holder: string, id: number, count: number];

export class SkySheet {
  private parts = new Map<string, SkyPart>();
  private held: MqHolding[] = [];
  private file: string;
  private problems = ""; // logged once, not every refresh

  constructor(
    dir: string,
    private alert: SheetAlert
  ) {
    mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "sky-sheet.json");
    if (existsSync(this.file)) {
      try {
        const saved = JSON.parse(readFileSync(this.file, "utf-8"));
        if (!Array.isArray(saved.parts) || !Array.isArray(saved.mq))
          throw new Error("an older copy");
        this.parts = new Map(saved.parts);
        this.held = saved.mq;
      } catch {
        /* a half-written or older file is fetched again */
      }
    }
  }

  get(itemName: string): SkyPart | undefined {
    return this.parts.get(itemName.trim().toLowerCase());
  }

  mq(): readonly MqHolding[] {
    return this.held;
  }

  private async tab(id: string) {
    const res = await fetch(SKY_SHEET + id, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`tab ${id}: HTTP ${res.status}`);
    return parseCsv(await res.text());
  }

  // `lookup` finds an item name's id in the bank's item database, so a misspelt name gets noticed.
  async refresh(lookup: (name: string) => Lookup) {
    let parts: [string, SkyPart][];
    let rows: [string, string][];
    try {
      parts = skyParts(await this.tab(SKY_TAB));
      rows = mqRows(await this.tab(MQ_TAB));
    } catch (e) {
      log(`bank web: sky sheet: ${e}`);
      await this.alert.report(
        "it couldn't be read, so the bank keeps its last copy if it has one"
      );
      return;
    }
    const problems: string[] = [];
    const bad = (what: string, names: string[]) => {
      if (names.length)
        problems.push(`${what} ${[...new Set(names)].sort().join(", ")}`);
    };
    bad(
      "no such item",
      parts.map(([n]) => n).filter((n) => lookup(n) === "no such item")
    );
    const counts = new Map<string, MqHolding>();
    const noName: string[] = [];
    const noItem: string[] = [];
    const twoItems: string[] = [];
    for (const [h, n] of rows) {
      const holder = charName(h);
      const id = lookup(n);
      if (!holder) noName.push(`"${h}" (${n})`);
      else if (id === "no such item") noItem.push(n);
      else if (id === "more than one item") twoItems.push(n);
      else {
        const key = `${holder}\n${id}`;
        const had = counts.get(key);
        counts.set(key, [holder, id, (had?.[2] ?? 0) + 1]);
      }
    }
    bad("multiquest: no such item", noItem);
    bad("multiquest: more than one item called", twoItems);
    bad("multiquest: no holder for", noName);
    const text = problems.join("; ");
    if (text && text !== this.problems) log(`bank web: sky sheet: ${text}`);
    this.problems = text;
    this.parts = new Map(parts.map(([n, p]) => [n.toLowerCase(), p]));
    this.held = [...counts.values()];
    writeFileSync(
      this.file,
      JSON.stringify({ parts: [...this.parts], mq: this.held })
    );
    await this.alert.report(text);
  }
}
