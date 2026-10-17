import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { BankApi } from "./bank-api";
import { WikiCache, WikiItem } from "./wiki-cache";

const findMany = jest.fn();
jest.mock("@prisma/client", () => ({ PrismaClient: jest.fn(() => ({ slot: { findMany } })) }));

const ITEMDB = {
  10: { name: "Cloak of Flames", slots: 256, ac: 10, worn: 900, icon: 5 },
  11: { name: "Shiny Brass Idol", nodrop: true },
  12: { name: "Spell: Lifetap", scroll: 500 },
};
const SPELLS = { 500: { name: "Lifetap", lv: [] }, 900: { name: "Flame Shield", lv: [] }, 999: { name: "Unused", lv: [] } };

const slot = (charName: string, slot: string, itemId: number, name: string, extra: Record<string, unknown> = {}) => ({
  charName, slot, itemId, count: 1, updatedAt: new Date("2026-05-01T00:00:00Z"), item: { name, price: null }, ...extra,
});

let dir: string;
let wikiItems: Map<number, WikiItem>;
const wiki = { get: (id: number) => wikiItems.get(id), refresh: jest.fn() } as unknown as WikiCache;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "bank-api-"));
  writeFileSync(path.join(dir, "itemdb.json"), JSON.stringify(ITEMDB));
  writeFileSync(path.join(dir, "spells.json"), JSON.stringify(SPELLS));
  wikiItems = new Map();
  findMany.mockReset();
  (wiki.refresh as jest.Mock).mockReset();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("bank", () => {
  test("lists filled slots with the item's stats, under the inventory file's name", async () => {
    findMany.mockResolvedValue([slot("mulea", "General1", 10, "Cloak of flames")]);
    const bank = await new BankApi(dir, wiki).bank();
    expect(bank.bank).toEqual([["Mulea", "General1", 10, 1]]);
    expect(bank.items[10]).toEqual({ ...ITEMDB[10], name: "Cloak of flames" });
  });

  test("never sends NO DROP items or empty slots", async () => {
    findMany.mockResolvedValue([
      slot("mulea", "General1", 11, "Shiny Brass Idol"),
      slot("mulea", "General2", 13, "Empty"),
      slot("mulea", "General3", 14, "Gone", { item: null }),
    ]);
    const bank = await new BankApi(dir, wiki).bank();
    expect(bank.bank).toEqual([]);
    expect(bank.items).toEqual({});
  });

  test("sends only the spells its items use", async () => {
    findMany.mockResolvedValue([slot("mulea", "General1", 10, "Cloak of Flames"), slot("muleb", "Bank1", 12, "Spell: Lifetap")]);
    const bank = await new BankApi(dir, wiki).bank();
    expect(Object.keys(bank.spells).sort()).toEqual(["500", "900"]);
  });

  test("adds a banker's price and the wiki's link, icon and auctions", async () => {
    wikiItems.set(10, { url: "https://wiki/Cloak", icon: 77, green: [["2026-01-01", "Bo", 900]], fetchedAt: 0 });
    findMany.mockResolvedValue([slot("mulea", "General1", 10, "Cloak of Flames", { item: { name: "Cloak of Flames", price: "250p" } })]);
    const bank = await new BankApi(dir, wiki).bank();
    expect(bank.items[10]).toMatchObject({ price: "250p", wiki: "https://wiki/Cloak", icon: 77, green: [["2026-01-01", "Bo", 900]] });
  });

  test("marks items missing from the item database as unknown", async () => {
    findMany.mockResolvedValue([slot("mulea", "General1", 4040, "Mystery Box")]);
    const bank = await new BankApi(dir, wiki).bank();
    expect(bank.items[4040]).toEqual({ unknown: true, name: "Mystery Box" });
  });

  test("lists each item once however many slots hold it, and counts a missing count as one", async () => {
    findMany.mockResolvedValue([slot("mulea", "General1", 10, "Cloak of Flames"), slot("muleb", "Bank1", 10, "Cloak of Flames", { count: null })]);
    const bank = await new BankApi(dir, wiki).bank();
    expect(bank.bank).toEqual([["Mulea", "General1", 10, 1], ["Muleb", "Bank1", 10, 1]]);
    expect(Object.keys(bank.items)).toEqual(["10"]);
  });

  test("dates the snapshot by the newest upload", async () => {
    findMany.mockResolvedValue([
      slot("mulea", "General1", 10, "Cloak of Flames"),
      slot("muleb", "Bank1", 12, "Spell: Lifetap", { updatedAt: new Date("2026-05-03T00:00:00Z") }),
    ]);
    const bank = await new BankApi(dir, wiki).bank();
    expect(bank.snapshot).toBe("2026-05-03T00:00:00.000Z");
    expect(bank.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("refreshWiki", () => {
  test("asks the wiki for each item in the bank once, without NO DROP or empty slots", async () => {
    findMany.mockResolvedValue([
      slot("mulea", "General1", 10, "Cloak of Flames"),
      slot("muleb", "Bank1", 10, "Cloak of Flames"),
      slot("mulea", "General2", 11, "Shiny Brass Idol"),
      slot("mulea", "General3", 13, "Empty"),
      slot("mulea", "General4", 12, "Spell: Lifetap"),
    ]);
    await new BankApi(dir, wiki).refreshWiki();
    expect(wiki.refresh).toHaveBeenCalledWith([
      { id: 10, name: "Cloak of Flames", icon: 5 },
      { id: 12, name: "Spell: Lifetap", icon: undefined },
    ]);
  });
});
