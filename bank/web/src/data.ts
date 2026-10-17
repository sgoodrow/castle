// The bank, as the bot's web server sends it from /api/bank, plus the EverQuest rules needed to read it.

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
}

// What /api/bank sends: every filled slot (character, slot, item id, count), and the items in them.
export interface Payload {
  snapshot: string; // the newest inventory upload
  today: string; // the server's date, which auction windows count back from
  bank: [string, string, number, number][];
  items: Record<string, RawItem>;
  spells: Record<string, { name: string; lv: number[] }>;
}

export interface Holder { char: string; loc: string; count: number }
export type Kind = "gear" | "spell" | "bag" | "other";
export type MarketLevel = "solid" | "thin" | "none";
export interface Listing { d: Date; seller: string; price: number }
export interface Auctions {
  rows: Listing[];
  recent: Listing[];
  sellers: Map<string, number>;
  median: number | null;
  level: MarketLevel;
  older: number;
  hasTracker: boolean;
}
export interface Item extends RawItem {
  id: number;
  holders: Holder[];
  total: number;
  kind: Kind;
  auc: Auctions;
}

// Set once by loadBank, before the first render.
export const SPELLS: Payload["spells"] = {};
export let SNAPSHOT_AT = new Date();
export let NOW = new Date();
export const WINDOW_DAYS = 182;
const DAY = 864e5;

// ---------- EQ constants ----------
export const CLASSES = [["WAR","Warrior"],["CLR","Cleric"],["PAL","Paladin"],["RNG","Ranger"],["SHD","Shadow Knight"],["DRU","Druid"],["MNK","Monk"],["BRD","Bard"],["ROG","Rogue"],["SHM","Shaman"],["NEC","Necromancer"],["WIZ","Wizard"],["MAG","Magician"],["ENC","Enchanter"]] as const;
export const RACES = [["HUM","Human"],["BAR","Barbarian"],["ERU","Erudite"],["ELF","Wood Elf"],["HIE","High Elf"],["DEF","Dark Elf"],["HEF","Half Elf"],["DWF","Dwarf"],["TRL","Troll"],["OGR","Ogre"],["HFL","Halfling"],["GNM","Gnome"],["IKS","Iksar"]] as const;
export const ALL_CLASSES = (1 << CLASSES.length) - 1;
export const ALL_RACES = (1 << RACES.length) - 1;
// Slot bits as stored in the item database.
const SLOT_NAMES = ["Charm","Ear","Head","Face","Ear","Neck","Shoulders","Arms","Back","Wrist","Wrist","Range","Hands","Primary","Secondary","Fingers","Fingers","Chest","Legs","Feet","Waist","Ammo"];

export interface Slot { key: string; label: string; bit: number }
// Paper doll, laid out like the classic inventory window. null = empty cell.
export const DOLL: (Slot | null)[][] = [
  [null, ["ear1","Ear",1], ["neck","Neck",5], ["face","Face",3], ["head","Head",2], ["ear2","Ear",4]],
  [["fing1","Finger",15], ["wrist1","Wrist",9], ["arms","Arms",7], ["hands","Hands",12], ["wrist2","Wrist",10], ["fing2","Finger",16]],
  [["shoul","Shoulder",6], ["chest","Chest",17], ["back","Back",8], ["waist","Waist",20], ["legs","Legs",18], ["feet","Feet",19]],
  [null, null, ["prim","Primary",13], ["sec","Second",14], ["range","Range",11], ["ammo","Ammo",21]],
].map(row => row.map(c => (c ? { key: c[0] as string, label: c[1] as string, bit: c[2] as number } : null)));
export const SLOTS: Record<string, Slot> = Object.fromEntries(DOLL.flat().filter((s): s is Slot => !!s).map(s => [s.key, s]));
// Slot filter chips merge the paired slots.
export const SLOT_CHIPS: [string, number[]][] = [["Ear",[1,4]],["Neck",[5]],["Face",[3]],["Head",[2]],["Finger",[15,16]],["Wrist",[9,10]],["Arms",[7]],["Hands",[12]],["Shoulders",[6]],["Chest",[17]],["Back",[8]],["Waist",[20]],["Legs",[18]],["Feet",[19]],["Primary",[13]],["Secondary",[14]],["Range",[11]],["Ammo",[21]]];
export const TYPES: Record<number, string> = {0:"1H Slashing",1:"2H Slashing",2:"Piercing",3:"1H Blunt",4:"2H Blunt",5:"Archery",7:"Throwing",8:"Shield",10:"Armor",11:"Misc",12:"Lockpicks",14:"Food",15:"Drink",16:"Light",17:"Combinable",18:"Bandages",19:"Throwing",20:"Scroll",21:"Potion",23:"Wind Instrument",24:"Stringed Instrument",25:"Brass Instrument",26:"Percussion Instrument",27:"Arrow",29:"Jewelry",35:"2H Piercing",45:"Hand to Hand"};
export const WEAPON = new Set([0,1,2,3,4,5,7,19,35,45]);
export const SIZES = ["TINY","SMALL","MEDIUM","LARGE","GIANT"];
export const ELEM: Record<number, string> = {1:"Magic",2:"Fire",3:"Cold",4:"Poison",5:"Disease"};
export const STATS = [["str","STR"],["sta","STA"],["agi","AGI"],["dex","DEX"],["wis","WIS"],["int","INT"],["cha","CHA"]] as const;
export const RESISTS = [["pr","POISON"],["mr","MAGIC"],["dr","DISEASE"],["fr","FIRE"],["cr","COLD"]] as const;

// ---------- data shaping ----------
function kindOf(it: RawItem): Kind {
  if (it.scroll || /^Spell: /.test(it.name)) return "spell";
  if (it.cls === 1 || it.bagslots) return "bag";
  if ((it.slots || 0) & ~1) return "gear";
  return "other";
}

// Green auctions within the last ~6 months, judged against the build date.
function auctions(it: RawItem): Auctions {
  const rows = (it.green || []).map(([d, seller, price]) => ({ d: new Date(d + "T00:00:00"), seller, price }));
  const cutoff = new Date(+NOW - WINDOW_DAYS * DAY);
  const recent = rows.filter(r => r.d >= cutoff);
  const sellers = new Map<string, number>();
  for (const r of recent) sellers.set(r.seller, (sellers.get(r.seller) || 0) + 1);
  const p = recent.map(r => r.price).sort((a, b) => a - b);
  const median = p.length ? (p.length % 2 ? p[(p.length - 1) / 2] : Math.round((p[p.length / 2 - 1] + p[p.length / 2]) / 2)) : null;
  // A steady market also needs a listing in the last two months, not just a burst long ago.
  const fresh = recent.some(r => r.d >= new Date(+NOW - 60 * DAY));
  const level: MarketLevel = recent.length >= 5 && sellers.size >= 3 && fresh ? "solid" : recent.length ? "thin" : "none";
  return { rows, recent, sellers, median, level, older: rows.length - recent.length, hasTracker: it.green != null };
}

export const ITEMS: Record<number, Item> = {};
export const ITEM_LIST: Item[] = [];

// Fill ITEMS from the bank, replacing whatever was there. Runs before the first render, so nothing shifts when data lands.
export function loadBank(p: Payload) {
  for (const k of Object.keys(SPELLS)) delete SPELLS[k];
  for (const k of Object.keys(ITEMS)) delete ITEMS[+k];
  ITEM_LIST.length = 0;
  Object.assign(SPELLS, p.spells);
  SNAPSHOT_AT = new Date(p.snapshot);
  NOW = new Date(p.today + "T00:00:00");
  for (const [char, loc, id, count] of p.bank) {
    let it = ITEMS[id];
    if (!it) {
      const raw = p.items[id];
      if (!raw || raw.nodrop) continue; // NO DROP items can't leave the bank, so they're never shown.
      it = ITEMS[id] = { ...raw, id, holders: [], total: 0, kind: kindOf(raw), auc: auctions(raw) };
      ITEM_LIST.push(it);
    }
    it.holders.push({ char, loc, count });
    it.total += count;
  }
}

// The server keeps the wiki's icons.
export const iconUrl = (it: Item) => (it.icon != null ? `/icons/${it.icon}.png` : undefined);

// ---------- rules ----------
export interface Character { cls: number; race: number }
export const usable = (it: Item, c: Character) =>
  (c.cls < 0 || !!((it.classes ?? ALL_CLASSES) & (1 << c.cls))) && (c.race < 0 || !!((it.races ?? ALL_RACES) & (1 << c.race)));
export const fitsBit = (it: Item, bit: number) => !!((it.slots || 0) & (1 << bit));

// ---------- formatting ----------
export const signed = (v: number) => (v > 0 ? "+" : "") + v;

export function maskText(mask: number | undefined, list: readonly (readonly [string, string])[], all: number) {
  if (mask == null || (mask & all) === all) return "ALL";
  const on = list.filter((_, i) => mask & (1 << i)).map(x => x[0]);
  const off = list.filter((_, i) => !(mask & (1 << i))).map(x => x[0]);
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
  for (const [k, l] of STATS) if (it[k]) parts.push({ label: l, value: signed(it[k]!) });
  const res = RESISTS.filter(([k]) => it[k]).map(([k, l]) => `${l[0]}R ${signed(it[k]!)}`);
  if (res.length) parts.push({ label: "", value: res.join(" ") });
  const sp = SPELLS;
  if (it.worn && sp[it.worn]) parts.push({ label: "Worn:", value: sp[it.worn].name });
  if (it.proc && sp[it.proc]) parts.push({ label: "Proc:", value: sp[it.proc].name });
  if (it.focus && sp[it.focus]) parts.push({ label: "Focus:", value: sp[it.focus].name });
  if (it.click && sp[it.click]) parts.push({ label: "Click:", value: sp[it.click].name });
  if (it.scroll && sp[it.scroll]) {
    const lv = sp[it.scroll].lv.map((l, i) => (l ? `${CLASSES[i][0]} ${l}` : null)).filter(Boolean);
    if (lv.length) parts.push({ label: "", value: lv.join(", ") });
  }
  if (it.bagslots) parts.push({ label: "", value: `${it.bagslots} slots, ${SIZES[it.bagsize ?? 0] || ""}` });
  return parts;
}
export const statText = (it: Item) => statParts(it).map(p => `${p.label} ${p.value}`).join(" ");

export function prettyLoc(loc: string) {
  let m;
  if ((m = loc.match(/^General(\d+)-Slot(\d+)$/))) return `pack ${m[1]}, slot ${m[2]}`;
  if ((m = loc.match(/^General(\d+)$/))) return `inventory ${m[1]}`;
  if ((m = loc.match(/^Bank(\d+)-Slot(\d+)$/))) return `bank bag ${m[1]}, slot ${m[2]}`;
  if ((m = loc.match(/^Bank(\d+)$/))) return `bank ${m[1]}`;
  return "slot: " + loc.toLowerCase();
}

// ---------- bank requests (formats from the bot's #bank-requests instructions) ----------
const RAID_REAGENTS = /^(Peridot|Hate Stone|Pearl|Small Portal Fragment)s?$/i;
// pp is the expected platinum cost; null means a banker has to quote it.
// fromMarket: pp follows the Green median, so it is only as good as that data.
export interface BankRequest { text: string | null; cost: string; pp: number | null; dkp?: boolean; fromMarket?: boolean }
export function bankRequest(it: Item, cls: number, qty = 1): BankRequest {
  const req = ruleRequest(it, cls, qty);
  // A price a banker set with the bot beats anything worked out from the rules or the market.
  const pp = it.price?.match(/\d+/);
  if (!it.price || req.text == null) return req;
  return { text: req.text, pp: pp ? +pp[0] : null, dkp: /dkp/i.test(it.price), cost: `Banker's price: ${it.price}.` };
}
function ruleRequest(it: Item, cls: number, qty: number): BankRequest {
  const holder = it.holders[0];
  const mule = holder?.char || "Mule";
  const sp = it.scroll ? SPELLS[it.scroll] : undefined;
  const mkt = it.auc.level !== "none" ? it.auc.median : null;
  if (sp || it.kind === "spell") {
    const spellName = it.name.replace(/^Spell: /, "");
    const lv = sp ? sp.lv : [];
    const ci = cls >= 0 && lv[cls] ? cls : lv.findIndex(l => l > 0);
    const level = ci >= 0 ? lv[ci] : null;
    const clsName = ci >= 0 ? CLASSES[ci][1] : "Class";
    const text = `Dropped spell: ${clsName}, ${level ?? "Level"}, ${spellName} (${mule}, ${holder?.count ?? 1})${qty > 1 ? ` x${qty}` : ""}`;
    if (level && level >= 51 && level <= 54) return { text, pp: 50, cost: "50pp (levels 51–54)." };
    if (level && level >= 55) {
      const pp = Math.min(200, mkt ?? 200);
      return { text, pp, dkp: true, fromMarket: mkt != null && mkt < 200, cost: `The lesser of 200pp${mkt ? ` (market ${mkt}pp)` : ""} or 1 DKP (levels 55–60). Forbidden spells go to DKP auction.` };
    }
    return { text, pp: null, cost: level ? `Level ${level} spell. Ask a banker about price.` : "Check the dropped-spell rules in Discord." };
  }
  if (RAID_REAGENTS.test(it.name)) return { text: `Raid Reagents: ${it.name}, ${qty}`, pp: 0, cost: "Free for raid use." };
  if (it.kind === "bag") return { text: null, pp: null, cost: "Bags aren't for sale." };
  const text = `Misc item: ${it.name} (${mule})${qty > 1 ? ` x${qty}` : ""}`;
  return mkt
    ? { text, pp: Math.round(mkt * 0.8), fromMarket: true, cost: `About ${Math.round(mkt * 0.8)}pp: 80% of the ${mkt}pp Green median${it.auc.level === "thin" ? " (thin data)" : ""}.` }
    : { text, pp: null, cost: "80% of market rate. No recent Green sales to go by, so ask a banker." };
}

// Classic class/race combinations; anything else can't be rolled.
const CAN_BE: Record<string, string[]> = {
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
export const validCombo = (cls: number, race: number) =>
  cls < 0 || race < 0 || CAN_BE[CLASSES[cls][0]].includes(RACES[race][0]);

// The slot filter a paper-doll cell belongs to.
export const chipForBit = (bit: number) => SLOT_CHIPS.find(([, bits]) => bits.includes(bit))?.[0] ?? null;
