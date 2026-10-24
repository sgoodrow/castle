// The bank, as the bot's web server sends it from /api/bank, plus the EverQuest rules needed to read it.

import { reportError } from "./errors";
import { isBag, isSkyMule } from "../../../src/shared/bank-holders";
export { prettyLoc } from "../../../src/shared/bank-holders";

export interface RawItem {
  name: string;
  unknown?: boolean;
  wiki?: string;
  icon?: number;
  green?: [string, string, number][];
  ac?: number; hp?: number; mana?: number;
  str?: number; sta?: number; agi?: number; dex?: number; wis?: number; int?: number; cha?: number;
  mr?: number; fr?: number; cr?: number; dr?: number; pr?: number;
  dmg?: number; dly?: number; rng?: number; type?: number; cls?: number;
  slots?: number; classes?: number; races?: number;
  magic?: number; lore?: boolean; nodrop?: boolean; norent?: boolean;
  wt?: number; size?: number;
  bagslots?: number; bagsize?: number; bagwr?: number;
  baneamt?: number; elemtype?: number; elemamt?: number;
  click?: number; proc?: number; worn?: number; focus?: number; scroll?: number;
  proclvl?: number; charges?: number;
  price?: string; // set by a banker with the bot, e.g. "250p" or "200p, 1dkp"
  sheet?: SheetPrice; // a scroll's price on the bankers' spell sheet
  sky?: SkyPart; // a Plane of Sky item: on the Sky sheet, or held only by the Sky mules
  research?: true; // a research spell or component: on the research sheet, and a research mule holds it
  jewelry?: Recipe; // made to order by the jewelers, as their sheet prices it
}

// What the jewelers' sheet says about a piece of jewelry they make: what the guild spends on each
// part of its materials ("Bar" and "Gem", or "Material"), the combine's trivial and success rate
// (0.95 for 95%), the guild price in platinum, and the jewelers' note, e.g. "Don't ask for this".
export interface Recipe { materials: { what: string; pp: number }[]; trivial: number; success: number; price: number; note: string }

// A spell's price on the bankers' spell sheet: platinum, maybe with a DKP alternative, or a DKP auction.
export type SheetPrice = { kind: "pp"; pp: number; dkp: number | null } | { kind: "auction" };

// A Plane of Sky item: the islands whose quests it's for (none when the Sky sheet doesn't list it),
// and the sheet's note on it, e.g. "fd ring" or "dkp bid".
export interface SkyPart { islands: Island[]; note: string }
// The islands with quests, as the wiki numbers them.
export type Island = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// What /api/bank sends: every filled slot (character, slot, item id, count), and the items in them.
export interface Payload {
  snapshot: string; // the newest inventory upload
  today: string; // the server's date, which auction windows count back from
  bank: [string, string, number, number][];
  mq: [string, number, number][]; // who holds how many of a NO DROP item for multiquesting
  items: Record<string, RawItem>;
  spells: Record<string, RawSpell>;
  me: { name: string }; // who's signed in, for the request preview
}

// spells.json lists a spell's level for each of EverQuest's 15 classes, in the client's order.
// The 15th is Beastlord, which P99 doesn't have, so it isn't one of CLASSES.
export type EqClassLevels = readonly [
  war: number, clr: number, pal: number, rng: number, shd: number, dru: number, mnk: number, brd: number,
  rog: number, shm: number, nec: number, wiz: number, mag: number, enc: number, bst: number,
];
export interface RawSpell { name: string; lv: EqClassLevels }
// A spell as the page uses it: the P99 classes that can scribe it, in CLASSES order.
// P99 stops at level 60, so a later level (e.g. SHD 64) is a class that can't scribe it here.
const MAX_LEVEL = 60;
export interface SpellLevel { cls: ClassId; level: number }
export interface Spell { name: string; levels: SpellLevel[] }

const isEqClassLevels = (lv: unknown): lv is EqClassLevels =>
  Array.isArray(lv) && lv.length === 15 && lv.every(l => typeof l === "number");

function toSpell(raw: RawSpell): Spell | null {
  if (!isEqClassLevels(raw.lv)) return null; // the payload is JSON, so the tuple type is only a promise
  const [WAR, CLR, PAL, RNG, SHD, DRU, MNK, BRD, ROG, SHM, NEC, WIZ, MAG, ENC] = raw.lv;
  const byClass: Record<ClassId, number> = { WAR, CLR, PAL, RNG, SHD, DRU, MNK, BRD, ROG, SHM, NEC, WIZ, MAG, ENC };
  const levels = CLASSES.flatMap(({ id }) => (byClass[id] && byClass[id] <= MAX_LEVEL ? [{ cls: id, level: byClass[id] }] : []));
  return { name: raw.name, levels };
}

// mq: held for multiquesting, by a character the bankers don't log in to, rather than in the bank.
export interface Holder { char: string; loc: string; count: number; mq: boolean }
// An item is only listed because someone holds it, so there's always a first holder.
export type Holders = [Holder, ...Holder[]];
export type Kind = "gear" | "spell" | "other";
export type MarketLevel = "solid" | "thin" | "none";
export interface Listing { d: Date; seller: string; price: number }
export interface Auctions {
  rows: Listing[]; // newest first
  latest: Listing | null;
  recent: Listing[];
  sellers: Map<string, number>;
  median: number | null;
  level: MarketLevel;
  older: number;
  hasTracker: boolean;
}
interface Listed extends RawItem {
  id: number;
  total: number;
  kind: Kind;
  auc: Auctions;
}
// An item is listed because someone holds it, or because the jewelers make it to order, when the
// bank may hold none.
export type HeldItem = Listed & { jewelry?: undefined; holders: Holders };
export type JewelryItem = Listed & { jewelry: Recipe; holders: Holder[] };
export type Item = HeldItem | JewelryItem;

// Set once by loadBank, before the first render.
export const SPELLS: Record<string, Spell> = {};
export let SNAPSHOT_AT = new Date();
export let NOW = new Date();
export let ME = "";
export const WINDOW_DAYS = 182;
const DAY = 864e5;

// ---------- EQ constants ----------
// An item's class and race masks have bit i set for the i-th entry here, so the order matters.
export const CLASSES = [
  { id: "WAR", name: "Warrior" }, { id: "CLR", name: "Cleric" }, { id: "PAL", name: "Paladin" }, { id: "RNG", name: "Ranger" },
  { id: "SHD", name: "Shadow Knight" }, { id: "DRU", name: "Druid" }, { id: "MNK", name: "Monk" }, { id: "BRD", name: "Bard" },
  { id: "ROG", name: "Rogue" }, { id: "SHM", name: "Shaman" }, { id: "NEC", name: "Necromancer" }, { id: "WIZ", name: "Wizard" },
  { id: "MAG", name: "Magician" }, { id: "ENC", name: "Enchanter" },
] as const;
export type ClassId = (typeof CLASSES)[number]["id"];
export const RACES = [
  { id: "HUM", name: "Human" }, { id: "BAR", name: "Barbarian" }, { id: "ERU", name: "Erudite" }, { id: "ELF", name: "Wood Elf" },
  { id: "HIE", name: "High Elf" }, { id: "DEF", name: "Dark Elf" }, { id: "HEF", name: "Half Elf" }, { id: "DWF", name: "Dwarf" },
  { id: "TRL", name: "Troll" }, { id: "OGR", name: "Ogre" }, { id: "HFL", name: "Halfling" }, { id: "GNM", name: "Gnome" },
  { id: "IKS", name: "Iksar" },
] as const;
export type RaceId = (typeof RACES)[number]["id"];

// A lookup with an entry for every id in the list. The cast holds because the list supplies every key.
function byId<T extends { readonly id: string }, V>(list: readonly T[], value: (t: T, i: number) => V) {
  return Object.fromEntries(list.map((t, i) => [t.id, value(t, i)])) as Record<T["id"], V>;
}
export const CLASS_NAME = byId(CLASSES, c => c.name);
export const RACE_NAME = byId(RACES, r => r.name);
export const CLASS_BIT = byId(CLASSES, (_, i) => 1 << i);
export const RACE_BIT = byId(RACES, (_, i) => 1 << i);
export const ALL_CLASSES = (1 << CLASSES.length) - 1;
export const ALL_RACES = (1 << RACES.length) - 1;
// Slot bits as stored in the item database.
const SLOT_NAMES = ["Charm","Ear","Head","Face","Ear","Neck","Shoulders","Arms","Back","Wrist","Wrist","Range","Hands","Primary","Secondary","Fingers","Fingers","Chest","Legs","Feet","Waist","Ammo"];

export interface Slot { key: string; label: string; bit: number }
// Paper doll, laid out like the classic inventory window. null = empty cell.
export const DOLL: (Slot | null)[][] = [
  [null, { key: "ear1", label: "Ear", bit: 1 }, { key: "neck", label: "Neck", bit: 5 }, { key: "face", label: "Face", bit: 3 }, { key: "head", label: "Head", bit: 2 }, { key: "ear2", label: "Ear", bit: 4 }],
  [{ key: "fing1", label: "Finger", bit: 15 }, { key: "wrist1", label: "Wrist", bit: 9 }, { key: "arms", label: "Arms", bit: 7 }, { key: "hands", label: "Hands", bit: 12 }, { key: "wrist2", label: "Wrist", bit: 10 }, { key: "fing2", label: "Finger", bit: 16 }],
  [{ key: "shoul", label: "Shoulder", bit: 6 }, { key: "chest", label: "Chest", bit: 17 }, { key: "back", label: "Back", bit: 8 }, { key: "waist", label: "Waist", bit: 20 }, { key: "legs", label: "Legs", bit: 18 }, { key: "feet", label: "Feet", bit: 19 }],
  [null, null, { key: "prim", label: "Primary", bit: 13 }, { key: "sec", label: "Second", bit: 14 }, { key: "range", label: "Range", bit: 11 }, { key: "ammo", label: "Ammo", bit: 21 }],
];
export const SLOTS: Record<string, Slot> = Object.fromEntries(DOLL.flat().filter((s): s is Slot => !!s).map(s => [s.key, s]));
// Slot filter chips merge the paired slots.
export const SLOT_CHIPS = [
  { id: "Ear", bits: [1, 4] }, { id: "Neck", bits: [5] }, { id: "Face", bits: [3] }, { id: "Head", bits: [2] },
  { id: "Finger", bits: [15, 16] }, { id: "Wrist", bits: [9, 10] }, { id: "Arms", bits: [7] }, { id: "Hands", bits: [12] },
  { id: "Shoulders", bits: [6] }, { id: "Chest", bits: [17] }, { id: "Back", bits: [8] }, { id: "Waist", bits: [20] },
  { id: "Legs", bits: [18] }, { id: "Feet", bits: [19] }, { id: "Primary", bits: [13] }, { id: "Secondary", bits: [14] },
  { id: "Range", bits: [11] }, { id: "Ammo", bits: [21] },
] as const;
export type SlotChip = (typeof SLOT_CHIPS)[number]["id"];
export const SLOT_CHIP_BITS = byId(SLOT_CHIPS, c => c.bits);
export const TYPES: Record<number, string> = {0:"1H Slashing",1:"2H Slashing",2:"Piercing",3:"1H Blunt",4:"2H Blunt",5:"Archery",7:"Throwing",8:"Shield",10:"Armor",11:"Misc",12:"Lockpicks",14:"Food",15:"Drink",16:"Light",17:"Combinable",18:"Bandages",19:"Throwing",20:"Scroll",21:"Potion",23:"Wind Instrument",24:"Stringed Instrument",25:"Brass Instrument",26:"Percussion Instrument",27:"Arrow",29:"Jewelry",35:"2H Piercing",45:"Hand to Hand"};
export const WEAPON = new Set([0,1,2,3,4,5,7,19,35,45]);
export const SIZES = ["TINY","SMALL","MEDIUM","LARGE","GIANT"];
export const ELEM: Record<number, string> = {1:"Magic",2:"Fire",3:"Cold",4:"Poison",5:"Disease"};
export const STATS = [["str","STR"],["sta","STA"],["agi","AGI"],["dex","DEX"],["wis","WIS"],["int","INT"],["cha","CHA"]] as const;
export const RESISTS = [["pr","POISON"],["mr","MAGIC"],["dr","DISEASE"],["fr","FIRE"],["cr","COLD"]] as const;

// ---------- data shaping ----------

function kindOf(it: RawItem): Kind {
  if (it.scroll || /^Spell: /.test(it.name)) return "spell";
  if ((it.slots || 0) & ~1) return "gear";
  return "other";
}

// The middle of a sorted list, or the rounded mean of the middle two.
function medianOf(sorted: number[]): number | null {
  const mid = sorted.length >> 1;
  const hi = sorted[mid];
  if (hi == null) return null;
  const lo = sorted.length % 2 ? hi : sorted[mid - 1] ?? hi;
  return Math.round((lo + hi) / 2);
}

// Green auctions within the last ~6 months, judged against the build date.
function auctions(it: RawItem): Auctions {
  const rows = (it.green || []).map(([d, seller, price]) => ({ d: new Date(d + "T00:00:00"), seller, price }));
  const cutoff = new Date(+NOW - WINDOW_DAYS * DAY);
  const recent = rows.filter(r => r.d >= cutoff);
  const sellers = new Map<string, number>();
  for (const r of recent) sellers.set(r.seller, (sellers.get(r.seller) || 0) + 1);
  const p = recent.map(r => r.price).sort((a, b) => a - b);
  const median = medianOf(p);
  // A steady market also needs a listing in the last two months, not just a burst long ago.
  const fresh = recent.some(r => r.d >= new Date(+NOW - 60 * DAY));
  const level: MarketLevel = recent.length >= 5 && sellers.size >= 3 && fresh ? "solid" : recent.length ? "thin" : "none";
  return { rows, latest: rows[0] ?? null, recent, sellers, median, level, older: rows.length - recent.length, hasTracker: it.green != null };
}

export const ITEMS: Record<number, Item> = {};
export const ITEM_LIST: Item[] = [];

// Fill ITEMS from the bank, replacing whatever was there. Runs before the first render, so nothing shifts when data lands.
export function loadBank(p: Payload) {
  for (const k of Object.keys(SPELLS)) delete SPELLS[k];
  for (const k of Object.keys(ITEMS)) delete ITEMS[+k];
  ITEM_LIST.length = 0;
  const bad: string[] = [];
  for (const [id, raw] of Object.entries(p.spells)) {
    const sp = toSpell(raw);
    if (sp) SPELLS[id] = sp;
    else bad.push(id);
  }
  // One report for the lot: the page still works without those scrolls' levels, but the data needs fixing.
  if (bad.length) reportError(new Error(`Spell data without 15 class levels: ${bad.join(", ")}`));
  SNAPSHOT_AT = new Date(p.snapshot);
  NOW = new Date(p.today + "T00:00:00");
  ME = p.me.name;
  const list = (it: Item) => ITEM_LIST.push(ITEMS[it.id] = it);
  const listed = (id: number, raw: RawItem) => ({ ...raw, id, total: 0, kind: kindOf(raw), auc: auctions(raw) });
  // Jewelry first: it's listed held or not, and whoever holds some is added below.
  for (const [id, raw] of Object.entries(p.items))
    if (raw.jewelry) list({ ...listed(+id, raw), jewelry: raw.jewelry, holders: [] });
  const hold = (id: number, holder: Holder) => {
    const it = ITEMS[id];
    if (it) {
      it.holders.push(holder);
      it.total += holder.count;
      return;
    }
    const raw = p.items[id];
    // NO DROP items can't leave the bank, so they're never shown, unless they're held for a multiquest.
    if (!raw || (raw.nodrop && !holder.mq) || (isBag(raw) && !raw.sky)) return;
    list({ ...listed(id, raw), jewelry: undefined, holders: [holder], total: holder.count });
  };
  for (const [char, loc, id, count] of p.bank) hold(id, { char, loc, count, mq: false });
  for (const [char, id, count] of p.mq) hold(id, { char, loc: "Multiquest", count, mq: true });
}

// The server keeps the wiki's icons.
export const iconUrl = (it: Item) => (it.icon != null ? `/icons/${it.icon}.png` : undefined);

// ---------- rules ----------
// null means any class or race.
export interface Character { cls: ClassId | null; race: RaceId | null }
// A scroll goes by its spell's levels, which drop the classes that only get it past 60.
const canClass = (it: Item, cls: ClassId) => {
  const sp = spellOf(it.scroll);
  return sp ? sp.levels.some(l => l.cls === cls) : !!((it.classes ?? ALL_CLASSES) & CLASS_BIT[cls]);
};
export const usable = (it: Item, c: Character) =>
  (!c.cls || canClass(it, c.cls)) && (!c.race || !!((it.races ?? ALL_RACES) & RACE_BIT[c.race]));
export const fitsBit = (it: Item, bit: number) => !!((it.slots || 0) & (1 << bit));

// ---------- formatting ----------
export const signed = (v: number) => (v > 0 ? "+" : "") + v;

// list is CLASSES or RACES, whose order gives the mask's bits.
export function maskText(mask: number | undefined, list: readonly { id: string }[], all: number) {
  if (mask == null || (mask & all) === all) return "ALL";
  const on = list.filter((_, i) => mask & (1 << i)).map(x => x.id);
  const off = list.filter((_, i) => !(mask & (1 << i))).map(x => x.id);
  if (!on.length) return "NONE";
  return off.length < on.length ? "ALL except " + off.join(" ") : on.join(" ");
}

export const slotText = (it: Item) =>
  [...new Set(SLOT_NAMES.filter((_, i) => (it.slots || 0) & (1 << i)))].join(" ");

export interface StatPart { label: string; value: string }
// The short stat summary shown on list rows.
export function statParts(it: Item): StatPart[] {
  const parts: StatPart[] = [];
  if (it.ac) parts.push({ label: "AC", value: String(it.ac) });
  if (it.dmg) parts.push({ label: "DMG", value: `${it.dmg}/${it.dly}` });
  if (it.hp) parts.push({ label: "HP", value: signed(it.hp) });
  if (it.mana) parts.push({ label: "MANA", value: signed(it.mana) });
  for (const [k, l] of STATS) {
    const v = it[k];
    if (v) parts.push({ label: l, value: signed(v) });
  }
  const res = RESISTS.flatMap(([k, l]) => {
    const v = it[k];
    return v ? [`${l[0]}R ${signed(v)}`] : [];
  });
  if (res.length) parts.push({ label: "", value: res.join(" ") });
  for (const [k, label] of [["worn", "Worn:"], ["proc", "Proc:"], ["focus", "Focus:"], ["click", "Click:"]] as const) {
    const sp = spellOf(it[k]);
    if (sp) parts.push({ label, value: sp.name });
  }
  const scroll = spellOf(it.scroll);
  if (scroll) {
    const lv = scroll.levels.map(c => `${c.cls} ${c.level}`);
    if (lv.length) parts.push({ label: "", value: lv.join(", ") });
  }
  if (it.bagslots) parts.push({ label: "", value: `${it.bagslots} slots, ${SIZES[it.bagsize ?? 0] || ""}` });
  return parts;
}
export const spellOf = (id: number | undefined) => (id ? SPELLS[id] : undefined);
export const statText = (it: Item) => statParts(it).map(p => `${p.label} ${p.value}`).join(" ");


// Who a request takes an item from: the bank, when it holds any, or else the characters holding it
// for multiquesting.
export function requestedFrom(it: HeldItem): { mq: boolean; holders: Holders } {
  const [first, ...rest] = it.holders.filter(h => !h.mq);
  return first ? { mq: false, holders: [first, ...rest] } : { mq: true, holders: it.holders };
}

// ---------- bank requests (formats from the bot's #bank-requests instructions) ----------
const RAID_REAGENTS = /^(Peridot|Hate Stone|Pearl|Small Portal Fragment)s?$/i;
// What an item costs. Each screen handles every kind, so a new kind can't be left out of one.
// dkp: it can be paid with 1 DKP instead. fromMarket: pp follows the Green median, so it is only
// as good as that data.
export type Price =
  | { kind: "pp"; pp: number; dkp: boolean; fromMarket: boolean }
  | { kind: "free" }
  | { kind: "auction" } // the member asks a banker to start a DKP auction
  | { kind: "ask" }; // a banker has to quote it
// text is the line in the bot's #bank-requests format. pickup is where the member collects it, for
// stock that's kept in one place.
export type BankRequest = { text: string; cost: string; price: Price; pickup?: string };
// A line's price as the tab and the post show it: "400pp", "free", "DKP auction" or "unknown".
export function priceText(price: Price, qty = 1) {
  switch (price.kind) {
    case "pp": return `${(price.pp * qty).toLocaleString()}pp`;
    case "free": return "free";
    case "auction": return "DKP auction";
    case "ask": return "unknown";
  }
}
const pp = (pp: number, dkp = false, fromMarket = false): Price => ({ kind: "pp", pp, dkp, fromMarket });
const AUCTION_COST = "A banker starts an auction at 1 DKP.";

// The jewelers' sheet prices what they make. Otherwise a price a banker set with the bot beats
// research, the spell sheet and the Plane of Sky rules, which beat the rules and the market.
export function bankRequest(it: Item, cls: ClassId | null, qty = 1): BankRequest {
  if (it.jewelry) return jewelryRequest(it, it.jewelry, qty);
  const req = it.research ? researchRequest(it, cls, qty) : it.sky ? skyRequest(it, it.sky, qty) : ruleRequest(it, cls, qty);
  if (it.price) {
    const n = it.price.match(/\d+/);
    const price: Price = /auction/i.test(it.price) ? { kind: "auction" } : n ? pp(+n[0], /dkp/i.test(it.price)) : { kind: "ask" };
    return { ...req, price, cost: `Set by a banker: ${it.price}.` };
  }
  if (it.research) return req;
  if (it.sheet?.kind === "auction") return { text: req.text, price: { kind: "auction" }, cost: AUCTION_COST };
  if (it.sheet?.kind === "pp")
    return { text: req.text, price: pp(it.sheet.pp, it.sheet.dkp != null), cost: `From the spell sheet.${it.sheet.dkp != null ? ` Or pay ${it.sheet.dkp} DKP.` : ""}` };
  return req;
}
// Whether a spell only goes to DKP auction. That doesn't depend on the member's class.
export const auctionOnly = (it: Item) => {
  return bankRequest(it, null).price.kind === "auction";
};
// The most a member can put on their tab: what the bank holds, or one auction at a time.
// Different items one request can hold, as the roadmap decides.
export const MAX_TAB_ITEMS = 9;
// Jewelry is made to order, so a member can ask for more than the bank holds.
export const JEWELRY_TAB_LIMIT = 10;
export const tabLimit = (it: Item) =>
  it.jewelry ? JEWELRY_TAB_LIMIT : auctionOnly(it) ? 1 : requestedFrom(it).holders.reduce((n, h) => n + h.count, 0);
// Jewelry goes to the jewelers at their sheet's price, in their own request format: name, count
// and the total.
function jewelryRequest(it: Item, recipe: Recipe, qty: number): BankRequest {
  const price = pp(recipe.price);
  return { text: `Jewelry: ${it.name}, ${qty} (${priceText(price, qty)})`, price, cost: "Made to order by the guild's jewelers." };
}
// The Sky mules: cgskya … cgskyhh and gmskyone … gmskyseven.
export { isSkyMule } from "../../../src/shared/bank-holders";
const SKY_PICKUP = "the East Freeport docks";
// Research spells and components are free, from North Freeport Bank. A scroll's line names the
// member's class if it can scribe it, like a dropped spell's.
const RESEARCH_PICKUP = "North Freeport Bank";
function researchRequest(it: HeldItem, cls: ClassId | null, qty: number): BankRequest {
  const sp = spellOf(it.scroll);
  const spell = sp || it.kind === "spell";
  const x = qty > 1 ? ` x${qty}` : "";
  const cost = `Research ${spell ? "spells" : "components"} are free. Pick up at ${RESEARCH_PICKUP}.`;
  if (!spell) return { text: `Research component: ${it.name}${x}`, price: pp(0), cost, pickup: RESEARCH_PICKUP };
  const can = sp?.levels ?? [];
  const pick = can.find(c => c.cls === cls) ?? can[0];
  const text = `Research spell: ${pick ? CLASS_NAME[pick.cls] : "Class"}, ${pick?.level ?? "Level"}, ${it.name.replace(/^Spell: /, "")}${x}`;
  return { text, price: pp(0), cost, pickup: RESEARCH_PICKUP };
}
const andList = (xs: readonly (string | number)[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
// "Island 4 quest item (fd ring)", "Islands 6 and 7 quest item", or "Plane of Sky item".
const skyWhat = (sky: SkyPart) => sky.islands.length
  ? `Island${sky.islands.length > 1 ? "s" : ""} ${andList(sky.islands)} quest item${sky.note ? ` (${sky.note})` : ""}`
  : "Plane of Sky item";
// Efreeti weapons and shields (from Noble Dojorn and the Overseer of Air) and items the Sky sheet
// marks "dkp bid" go to DKP auction. Every other Sky item is 250pp, once the member has won the DKP
// items its quest needs; a banker checks that. An item only held for multiquesting is requested
// too, and a banker tells the member how to set it up.
function skyRequest(it: HeldItem, sky: SkyPart, qty: number): BankRequest {
  const what = skyWhat(sky);
  const from = requestedFrom(it);
  if (from.mq) {
    const who = andList([...new Set(from.holders.map(h => h.char))]);
    return { text: `Sky MQ: ${it.name} (held by ${who})${qty > 1 ? ` x${qty}` : ""}`, price: { kind: "ask" }, cost: `${what}, held for a multiquest by ${who}. A banker will tell you how to set it up.` };
  }
  const holder = from.holders.find(h => isSkyMule(h.char)) ?? from.holders[0];
  const text = `Sky: ${it.name} (${holder.char}, ${holder.count})${qty > 1 ? ` x${qty}` : ""}`;
  if (/dkp/i.test(sky.note) || (!sky.islands.length && /^Efreeti /.test(it.name)))
    return { text, price: { kind: "auction" }, cost: AUCTION_COST, pickup: SKY_PICKUP };
  return { text, price: pp(250), cost: `${what}: 250pp, once you've won the DKP items its quest needs. Pick up at ${SKY_PICKUP}.`, pickup: SKY_PICKUP };
}
function ruleRequest(it: HeldItem, cls: ClassId | null, qty: number): BankRequest {
  const [holder] = requestedFrom(it).holders;
  const mule = holder.char || "Mule";
  const sp = spellOf(it.scroll);
  const mkt = it.auc.level !== "none" ? it.auc.median : null;
  if (sp || it.kind === "spell") {
    const spellName = it.name.replace(/^Spell: /, "");
    // The member's class if it can use the spell, otherwise the first class that can.
    // A scroll with no spell data, or one no P99 class can scribe, has no pick.
    const can = sp?.levels ?? [];
    const pick = can.find(c => c.cls === cls) ?? can[0];
    const level = pick?.level ?? null;
    const clsName = pick ? CLASS_NAME[pick.cls] : "Class";
    const text = `Dropped spell: ${clsName}, ${level ?? "Level"}, ${spellName} (${mule}, ${holder.count})${qty > 1 ? ` x${qty}` : ""}`;
    if (level && level >= 51 && level <= 54) return { text, price: pp(50), cost: "The set price for level 51–54 spells." };
    if (level && level >= 55)
      return { text, price: pp(Math.min(200, mkt ?? 200), true, mkt != null && mkt < 200), cost: "Level 55–60 spells: 200pp, or the Green median if lower. Or pay 1 DKP." };
    return { text, price: { kind: "ask" }, cost: level ? `Level ${level} spell. Ask a banker.` : "Check the dropped-spell rules in Discord." };
  }
  if (RAID_REAGENTS.test(it.name)) return { text: `Raid Reagents: ${it.name}, ${qty}`, price: { kind: "free" }, cost: "Free for raid use." };
  const text = `Misc item: ${it.name} (${mule})${qty > 1 ? ` x${qty}` : ""}`;
  return mkt
    ? { text, price: pp(Math.round(mkt * 0.8), false, true), cost: `80% of the ${mkt}pp Green median${it.auc.level === "thin" ? " (thin data)" : ""}.` }
    : { text, price: { kind: "ask" }, cost: "No recent Green sales to go by, so ask a banker." };
}

// Classic class/race combinations; anything else can't be rolled.
const CAN_BE: Record<ClassId, readonly RaceId[]> = {
  WAR: ["BAR", "DEF", "DWF", "GNM", "HEF", "HFL", "HUM", "IKS", "OGR", "TRL", "ELF"],
  CLR: ["DEF", "DWF", "ERU", "GNM", "HIE", "HFL", "HUM"],
  PAL: ["DWF", "ERU", "HEF", "HIE", "HFL", "HUM"],
  RNG: ["HEF", "HUM", "ELF"],
  SHD: ["DEF", "ERU", "GNM", "HUM", "IKS", "OGR", "TRL"],
  DRU: ["HEF", "HFL", "HUM", "ELF"],
  MNK: ["HUM", "IKS"],
  BRD: ["HEF", "HUM", "ELF"],
  ROG: ["BAR", "DEF", "DWF", "GNM", "HEF", "HFL", "HUM", "ELF"],
  SHM: ["BAR", "IKS", "OGR", "TRL"],
  NEC: ["DEF", "ERU", "GNM", "HUM", "IKS"],
  WIZ: ["DEF", "ERU", "GNM", "HIE", "HUM"],
  MAG: ["DEF", "ERU", "GNM", "HIE", "HUM"],
  ENC: ["DEF", "ERU", "GNM", "HIE", "HUM"],
};
// null means "any", so it always fits.
export const validCombo = (cls: ClassId | null, race: RaceId | null) => !cls || !race || CAN_BE[cls].includes(race);

// The slot filter a paper-doll cell belongs to.
export const chipForBit = (bit: number): SlotChip | null => SLOT_CHIPS.find(c => (c.bits as readonly number[]).includes(bit))?.id ?? null;
