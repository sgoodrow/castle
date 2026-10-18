// Which island's quest each Plane of Sky item is for, from the Sky bankers' "Plane of Sky" Google
// Sheet. Like the spell sheet it's public, read as CSV, refreshed in the background and kept on
// disk, so the bank never waits on Google. Its waitlist stays in the sheet: the site doesn't read it.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { log } from "../shared/logger";
import { parseCsv } from "./spell-sheet";

export const SKY_SHEET =
  "https://docs.google.com/spreadsheets/d/1zznLAdu688lxfQ7TuBzBx11wuT9eLClakOuMa8rveKg/export?format=csv&gid=";
// The "Item Counts and announcements" tab, by id, which survives a rename. Its item names are
// spelt as the bank's uploads spell them.
export const SKY_TAB = "2041401641";

// The Sky mules: cgskya … cgskyhh and gmskyone … gmskyseven.
export const isSkyMule = (char: string) => /sky/i.test(char);

// island is the quest's island (1–7). note is the sheet's word on it, e.g. "fd ring" or "dkp bid".
export type SkyPart = { island: number; note: string };

// One item a row, under a header with Items, Island and Notes. Each island's own row ("Island 3",
// with its reward in the Island column) and anything without an island number is skipped.
export function skyParts(rows: string[][]): [name: string, part: SkyPart][] {
  const [head = []] = rows;
  const name = head.indexOf("Items");
  const island = head.indexOf("Island");
  const note = head.indexOf("Notes");
  if (name < 0 || island < 0 || note < 0)
    throw new Error("no Items, Island and Notes columns");
  return rows.slice(1).flatMap((r): [string, SkyPart][] => {
    const n = r[name]?.trim() ?? "";
    const m = r[island]?.trim().match(/^Island (\d)$/i);
    return n && m ? [[n, { island: +m[1], note: r[note]?.trim() ?? "" }]] : [];
  });
}

export class SkySheet {
  private parts = new Map<string, SkyPart>();
  private file: string;
  private problems = ""; // logged once, not every refresh

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "sky-sheet.json");
    if (existsSync(this.file)) {
      try {
        this.parts = new Map(JSON.parse(readFileSync(this.file, "utf-8")));
      } catch {
        /* a half-written file is fetched again */
      }
    }
  }

  get(itemName: string): SkyPart | undefined {
    return this.parts.get(itemName.trim().toLowerCase());
  }

  // `known` is every item name the bank's database has, lowercased, so a misspelt name gets noticed.
  async refresh(known: Set<string>) {
    let parts: [string, SkyPart][];
    try {
      const res = await fetch(SKY_SHEET + SKY_TAB, {
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`tab ${SKY_TAB}: HTTP ${res.status}`);
      parts = skyParts(parseCsv(await res.text()));
    } catch (e) {
      log(`bank web: sky sheet: ${e}`);
      return;
    }
    const unknown = parts
      .map(([n]) => n)
      .filter((n) => !known.has(n.toLowerCase()));
    const problems = unknown.length
      ? `no such item ${[...new Set(unknown)].sort().join(", ")}`
      : "";
    if (problems && problems !== this.problems)
      log(`bank web: sky sheet: ${problems}`);
    this.problems = problems;
    this.parts = new Map(parts.map(([n, p]) => [n.toLowerCase(), p]));
    writeFileSync(this.file, JSON.stringify([...this.parts]));
  }
}
