// Everything the bank page shows, read from the bot's database: who holds what, plus stats
// (the item DB in bank/data), banker prices, icons and auctions from the wiki cache, and spell
// prices from the bankers' spell sheet, which items are Plane of Sky quest parts from the Sky sheet,
// which are research spells and components from the research sheet, and what the jewelers make to
// order from the jewelry sheet.
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { WikiCache, wikiUrl } from "./wiki-cache";
import { SpellSheet, spellKey } from "./spell-sheet";
import { SKY_ITEM_IDS, SkySheet, isSkyMule, type Lookup } from "./sky-sheet";
import { ResearchSheet, isResearchMule, researchKey } from "./research-sheet";
import { JewelrySheet } from "./jewelry-sheet";

type DbItem = {
  name: string;
  nodrop?: boolean;
  icon?: number;
  [k: string]: unknown;
};

const SPELL_KEYS = ["click", "proc", "worn", "focus", "scroll"];
// What a piece of jewelry gives. Jewelry made with unenchanted metal gives nothing, and shares the
// name of the jewelry the recipe means.
// Names two stat-bearing items share, pinned to the one the recipe makes.
const JEWELRY_PINNED: Record<string, number> = {
  "Fire Emerald Velium Ring": 30343, // the one without the -1 skill modifier of 30355
};
// The sheet spells two recipes differently from the game, which the item database keeps. The sheet's
// spelling is matched to the game's here, from this reviewed list, so the sheet never has to change.
const JEWELRY_ALIASES = new Map<string, string>([
  ["Velium Wolf's Eye Necklace", "Wolf's Eye Velium Necklace"],
  ["Velium Rose Engagement Ring", "Rose Velium Engagement Ring"],
]);
// The wiki has these recipes under the sheet's spelling, so their pages are found by that name.
const WIKI_TITLES = new Map(
  [...JEWELRY_ALIASES].map(([sheet, game]) => [game, sheet])
);
const wikiTitle = (name: string) => WIKI_TITLES.get(name) ?? name;
const JEWELRY_STATS = [
  "ac",
  "hp",
  "mana",
  "str",
  "sta",
  "agi",
  "dex",
  "wis",
  "int",
  "cha",
  "mr",
  "fr",
  "cr",
  "dr",
  "pr",
];
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
    private research: ResearchSheet,
    private jewelry: JewelrySheet
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
          name: wikiTitle(s.item.name),
          icon: db?.icon,
        });
    }
    for (const id of [
      ...this.sky.mq().map(([, id]) => id),
      ...this.jewelry.all().keys(),
    ]) {
      const db = this.itemdb[id];
      if (db) seen.set(id, { id, name: wikiTitle(db.name), icon: db.icon });
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
      const key = name.trim().toLowerCase();
      const chosen = SKY_ITEM_IDS.get(key);
      if (chosen !== undefined)
        return this.itemdb[chosen] ? chosen : "no such item";
      const all = ids.get(key) ?? [];
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

  // The id of the jewelry a recipe makes: the one item of that name, spelt as the game spells it,
  // that gives something.
  refreshJewelrySheet() {
    const ids = new Map<string, number[]>();
    // NO DROP items can't leave the bank, so a recipe can't make one: the sheet's name gets logged.
    for (const [id, it] of Object.entries(this.itemdb))
      if (!it.nodrop && JEWELRY_STATS.some((k) => it[k]))
        ids.set(it.name, [...(ids.get(it.name) ?? []), +id]);
    return this.jewelry.refresh((sheetName): Lookup => {
      const name = JEWELRY_ALIASES.get(sheetName) ?? sheetName;
      // Two items share this name, and the jewelers make the one pinned here. Scott chose it.
      const pinned = JEWELRY_PINNED[name];
      if (pinned != null)
        return ids.get(name)?.includes(pinned) ? pinned : "no such item";
      const [id, ...more] = ids.get(name) ?? [];
      if (id == null) return "no such item";
      return more.length ? "more than one item" : id;
    });
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
    // Jewelry the jewelers make to order is sent whether or not the bank holds any.
    for (const [id, recipe] of this.jewelry.all()) {
      const db = this.itemdb[id];
      if (!db) continue; // the item database lost it since the refresh
      items[id] ??= this.describe(id, db.name, null, spells);
      items[id].jewelry = recipe;
    }
    // A Sky item is one the Sky sheet lists, or one only the Sky mules (or multiquest holders) hold.
    for (const [id, it] of Object.entries(items)) {
      if (it.jewelry) continue; // jewelry is made to order, never Sky, even when the Sky sheet names it
      // The sheet may spell it differently from the game: try the names the reviewed list gives it.
      const names = [it.name as string];
      for (const [n, i] of SKY_ITEM_IDS) if (i === +id) names.push(n);
      const part = names.map((n) => this.sky.get(n)).find(Boolean);
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
      wiki: wikiUrl(wikiTitle(name)),
      ...(w?.icon ? { icon: w.icon } : {}),
      ...(w?.green ? { green: w.green } : {}),
    };
  }
}
