// Everything the bank page shows, read from the bot's database: who holds what, plus stats
// (the item DB in bank/data), banker prices, icons and auctions from the wiki cache, and spell
// prices from the bankers' spell sheet.
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { WikiCache } from "./wiki-cache";
import { SpellSheet, spellKey } from "./spell-sheet";

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
    private sheet: SpellSheet
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

  async bank() {
    let latest = 0;
    const rows: [string, string, number, number][] = [];
    const items: Record<number, Record<string, unknown>> = {};
    const spells: Record<string, unknown> = {};
    for (const s of await this.filledSlots()) {
      const id = s.itemId!;
      const db = this.itemdb[id];
      if (!s.item || s.item.name === "Empty" || db?.nodrop) continue; // NO DROP never leaves the bank
      latest = Math.max(latest, +s.updatedAt);
      rows.push([titleCase(s.charName), s.slot, id, s.count || 1]);
      if (items[id]) continue;
      const w = this.wiki.get(id);
      const sheet = this.sheet.get(s.item.name);
      items[id] = {
        ...(db || { unknown: true }),
        name: s.item.name, // the inventory file's spelling matches the P99 client
        ...(s.item.price ? { price: s.item.price } : {}),
        ...(sheet ? { sheet } : {}),
        ...(w
          ? {
              wiki: w.url,
              ...(w.icon ? { icon: w.icon } : {}),
              ...(w.green ? { green: w.green } : {}),
            }
          : {}),
      };
      for (const k of SPELL_KEYS) {
        const sid = db?.[k];
        if (sid != null && this.spells[String(sid)])
          spells[String(sid)] = this.spells[String(sid)];
      }
    }
    return {
      snapshot: new Date(latest || Date.now()).toISOString(),
      today: new Date().toISOString().slice(0, 10),
      bank: rows,
      items,
      spells,
    };
  }
}
