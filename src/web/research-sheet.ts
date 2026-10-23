// Which items are research spells and components, from the research bankers' "Research Spells &
// Components" Google Sheet. Like the other sheets it's public, read as CSV, refreshed in the
// background and kept on disk, so the bank never waits on Google. The bank gives these away.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { log } from "../shared/logger";
import { parseCsv } from "./spell-sheet";
import { SheetAlert } from "./sheet-alert";

export const RESEARCH_SHEET =
  "https://docs.google.com/spreadsheets/d/19LwqVtvpSHeU-IR81uTD9YE5GKphenpcpqzb0TEYjOg/export?format=csv&gid=";
// A tab per researching class, by id, which survives a rename. Each lists the class's spells under
// Spell, and the components they take under a column of its own name.
export const RESEARCH_TABS = [
  { tab: "1540745837", components: "Page Name" }, // Enchanter
  { tab: "1073383779", components: "Component List" }, // Magician
  { tab: "1366449622", components: "Title" }, // Necromancer
  { tab: "1123031591", components: "Name of Rune" }, // Wizard
] as const;

// The research mules. The sheet's "All Items" tab is their inventory.
export const isResearchMule = (char: string) =>
  /^cg(enc|mage|necro|wiz)$/i.test(char);

// The sheet lists the Wrath scroll by its spell, "Wrath of Al'Kabor", but the game's scroll is named
// "Spell: Wrath of Ap'Sagor". Where the sheet's name is one of these, the game's name is listed too,
// so that scroll is research as well. "Spell: Wrath of Al'Kabor" (15731) stays listed as it was.
const GAME_ITEM_NAMES = new Map([
  [researchKey("Spell: Wrath of Al'Kabor"), "Spell: Wrath of Ap'Sagor"],
]);

// The sheet's names and the game's differ a little: "Salil's Writ Pg. 60 (Left)" is "Salil's Writ
// Pg. 60", "Velishoul's Tome Pg. 16 (Faded)" is "A Faded Velishouls Tome Page", "Velishoul's Tome
// Pg. 68" is "Velishoul's Tome Pg.68", and "Ap'Sagor" is "Ap`Sagor". So only letters and digits count.
export function researchKey(name: string) {
  const k = name
    .toLowerCase()
    .replace(/\s*\((left|right)\)/g, "")
    .trim();
  const faded = k.match(/^(.*?) pg\.\s*\d+ \(faded\)$/);
  return (faded ? `a faded ${faded[1]} page` : k).replace(/[^a-z0-9]/g, "");
}

// One spell a row under Spell, and one component a row under the tab's component column, as item
// names: the spell "Lich" is the scroll "Spell: Lich".
export function researchNames(rows: string[][], components: string): string[] {
  const [head = []] = rows;
  const spell = head.indexOf("Spell");
  const comp = head.indexOf(components);
  if (spell < 0 || comp < 0)
    throw new Error(`no Spell and ${components} columns`);
  return rows.slice(1).flatMap((r) => {
    const s = r[spell]?.trim() ?? "";
    const c = r[comp]?.trim() ?? "";
    return [...(s ? [`Spell: ${s}`] : []), ...(c ? [c] : [])];
  });
}

export class ResearchSheet {
  private keys = new Set<string>();
  private file: string;
  private problems = ""; // logged once, not every refresh

  constructor(
    dir: string,
    private alert: SheetAlert
  ) {
    mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "research-sheet.json");
    if (existsSync(this.file)) {
      try {
        const saved = JSON.parse(readFileSync(this.file, "utf-8"));
        if (!Array.isArray(saved)) throw new Error("not a list");
        this.keys = new Set(saved);
      } catch {
        /* a half-written file is fetched again */
      }
    }
  }

  // Whether the sheet lists the item, as a spell or a component.
  has(itemName: string) {
    return this.keys.has(researchKey(itemName));
  }

  // Read every tab. If any can't be read, keep the old copy whole rather than part of a new one.
  // `known` is every item name in the item database, as researchKey has it, so a misspelt name in
  // the sheet gets noticed.
  async refresh(known: Set<string>) {
    let names: string[];
    try {
      const tabs = await Promise.all(
        RESEARCH_TABS.map(async ({ tab, components }) => {
          const res = await fetch(RESEARCH_SHEET + tab, {
            signal: AbortSignal.timeout(30000),
          });
          if (!res.ok) throw new Error(`tab ${tab}: HTTP ${res.status}`);
          return researchNames(parseCsv(await res.text()), components);
        })
      );
      names = tabs.flat().flatMap((n) => {
        const game = GAME_ITEM_NAMES.get(researchKey(n));
        return game ? [n, game] : [n];
      });
    } catch (e) {
      log(`bank web: research sheet: ${e}`);
      await this.alert.unreadable();
      return;
    }
    const unknown = [
      ...new Set(names.filter((n) => !known.has(researchKey(n)))),
    ].sort();
    const problems = unknown.length ? `no such item ${unknown.join(", ")}` : "";
    if (problems && problems !== this.problems)
      log(`bank web: research sheet: ${problems}`);
    this.problems = problems;
    this.keys = new Set(names.map(researchKey));
    writeFileSync(this.file, JSON.stringify([...this.keys]));
    await this.alert.report(problems);
  }
}
