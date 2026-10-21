// Everything the bank page shows, read from the bot's database: who holds what, plus stats
// (the item DB in bank/data), banker prices, icons and auctions from the wiki cache, and spell
// prices from the bankers' spell sheet, which items are Plane of Sky quest parts from the Sky sheet,
// and which are research spells and components from the research sheet.
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { WikiCache, wikiUrl } from "./wiki-cache";
import { SpellSheet, spellKey } from "./spell-sheet";
import { SkySheet, isSkyMule, type Lookup } from "./sky-sheet";
import { ResearchSheet, isResearchMule, researchKey } from "./research-sheet";

type DbItem = {
  name: string;
  nodrop?: boolean;
  icon?: number;
  [k: string]: unknown;
};

const SPELL_KEYS = ["click", "proc", "worn", "focus", "scroll"];
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export class BankApi {
  private prisma = new PrismaClient();
  private itemdb: Record<string, DbItem>;
  private spells: Record<string, unknown>;

  constructor(
    dataDir: string,
    private wiki: WikiCache,
    private sheet: SpellSheet,
    private sky: SkySheet,
    private research: ResearchSheet
  ) {
    this.itemdb = JSON.parse(
      readFileSync(path.join(dataDir, "itemdb.json"), "utf-8")
    );
    this.spells = JSON.parse(
      readFileSync(path.join(dataDir, "spells.json"), "utf-8")
    );
  }

  private filledSlots() {
    return this.prisma.slot.findMany({
      where: { itemId: { gt: 0 } },
      select: {
        charName: true,
        slot: true,
        itemId: true,
        count: true,
        updatedAt: true,
        item: { select: { name: true, price: true } },
      },
    });
  }

  // Keep the wiki cache in step with what's actually in the bank.
  async refreshWiki() {
    const seen = new Map<number, { id: number; name: string; icon?: number }>();
    for (const s of await this.filledSlots()) {
      const db = this.itemdb[s.itemId!];
      if (s.item && s.item.name !== "Empty" && !db?.nodrop)
        seen.set(s.itemId!, {
          id: s.itemId!,
          name: s.item.name,
          icon: db?.icon,
        });
    }
    for (const [, id] of this.sky.mq()) {
      const db = this.itemdb[id];
      if (db) seen.set(id, { id, name: db.name, icon: db.icon });
    }
    await this.wiki.refresh([...seen.values()]);
  }

  // Every scroll the item database knows, so the sheet's misspellings can be told apart.
  refreshSheet() {
    const known = new Set(
      Object.values(this.itemdb)
        .filter((it) => /^(Spell|Song): /i.test(it.name))
        .map((it) => spellKey(it.name))
    );
    return this.sheet.refresh(known);
  }

  // An item name's id in the item database, so the Sky sheet's misspellings get noticed. A name
  // shared by several items is only one of them when exactly one is NO DROP, since NO DROP items
  // are the ones held for multiquesting.
  refreshSkySheet() {
    const ids = new Map<string, number[]>();
    for (const [id, it] of Object.entries(this.itemdb)) {
      const k = it.name.toLowerCase();
      ids.set(k, [...(ids.get(k) ?? []), +id]);
    }
    return this.sky.refresh((name): Lookup => {
      const all = ids.get(name.trim().toLowerCase()) ?? [];
      const nodrop = all.filter((id) => this.itemdb[id].nodrop);
      if (!all.length) return "no such item";
      if (all.length === 1) return all[0];
      return nodrop.length === 1 ? nodrop[0] : "more than one item";
    });
  }

  // Every item name the item database knows, so the research sheet's misspellings get noticed.
  refreshResearchSheet() {
    return this.research.refresh(
      new Set(Object.values(this.itemdb).map((it) => researchKey(it.name)))
    );
  }

  async bank() {
    let latest = 0;
    const rows: [string, string, number, number][] = [];
    const items: Record<number, Record<string, unknown>> = {};
    const spells: Record<string, unknown> = {};
    const offSky = new Set<number>(); // items some non-Sky mule holds
    const onResearch = new Set<number>(); // items some research mule holds
    for (const s of await this.filledSlots()) {
      const id = s.itemId!;
      const db = this.itemdb[id];
      if (!s.item || s.item.name === "Empty" || db?.nodrop) continue; // NO DROP never leaves the bank
      latest = Math.max(latest, +s.updatedAt);
      rows.push([titleCase(s.charName), s.slot, id, s.count || 1]);
      if (!isSkyMule(s.charName)) offSky.add(id);
      if (isResearchMule(s.charName)) onResearch.add(id);
      if (!items[id])
        items[id] = this.describe(id, s.item.name, s.item.price, spells);
    }
    // Items held for multiquesting are NO DROP, so they're never in the uploads above. Whoever
    // holds them, they're Sky items.
    const mq = this.sky.mq().filter(([, id]) => this.itemdb[id]);
    for (const [, id] of mq) {
      if (!items[id])
        items[id] = this.describe(id, this.itemdb[id].name, null, spells);
      offSky.delete(id);
    }
    // A Sky item is one the Sky sheet lists, or one only the Sky mules (or multiquest holders) hold.
    for (const [id, it] of Object.entries(items)) {
      const part = this.sky.get(it.name as string);
      if (part) it.sky = part;
      else if (!offSky.has(+id)) it.sky = { islands: [], note: "" };
    }
    // A research item is one the research sheet lists and a research mule holds, so the everyday
    // items some recipes take, such as a Dagger, keep their usual price.
    for (const [id, it] of Object.entries(items))
      if (onResearch.has(+id) && this.research.has(it.name as string))
        it.research = true;
    return {
      snapshot: new Date(latest || Date.now()).toISOString(),
      today: new Date().toISOString().slice(0, 10),
      bank: rows,
      mq,
      items,
      spells,
    };
  }

  // An item as the page gets it: the item database's stats, the banker's price, the spell sheet's
  // price and the wiki's link, icon and Green auctions. Its spells go into `spells`.
  private describe(
    id: number,
    name: string,
    price: string | null,
    spells: Record<string, unknown>
  ): Record<string, unknown> {
    const db = this.itemdb[id];
    const w = this.wiki.get(id);
    const sheet = this.sheet.get(name);
    for (const k of SPELL_KEYS) {
      const sid = db?.[k];
      if (sid != null && this.spells[String(sid)])
        spells[String(sid)] = this.spells[String(sid)];
    }
    return {
      ...(db || { unknown: true }),
      name, // the inventory file's spelling matches the P99 client
      ...(price ? { price } : {}),
      ...(sheet ? { sheet } : {}),
      wiki: wikiUrl(name),
      ...(w?.icon ? { icon: w.icon } : {}),
      ...(w?.green ? { green: w.green } : {}),
    };
  }
}
