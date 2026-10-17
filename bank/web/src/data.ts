// Bank data baked into the page by build.py, plus the EverQuest rules needed to read it.

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
}

interface Payload {
  snapshot: string;
  built: string;
  bank: [string, string, number, number][];
  items: Record<string, RawItem>;
  spells: Record<string, { name: string; lv: number[] }>;
  icons: Record<string, string>;
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

const D: Payload = JSON.parse(document.getElementById("bank-data")!.textContent!);

export const SELLER_COLORS = ["#e4b85a", "#4f8fe0", "#4caf62", "#e0634f", "#a777e0", "#2fb3a6", "#e07fb3", "#a8a040", "#6f7fe8", "#e0904f"];
export const SNAPSHOT = D.snapshot;
export const BUILT = D.built;
export const STACKS = D.bank.length;
export const SPELLS = D.spells;
export const NOW = new Date(D.built + "T00:00:00");
export const WINDOW_DAYS = 182;
const DAY = 864e5;

// ---------- EQ constants ----------
export const CLASSES = [["WAR","Warrior"],["CLR","Cleric"],["PAL","Paladin"],["RNG","Ranger"],["SHD","Shadow Knight"],["DRU","Druid"],["MNK","Monk"],["BRD","Bard"],["ROG","Rogue"],["SHM","Shaman"],["NEC","Necromancer"],["WIZ","Wizard"],["MAG","Magician"],["ENC","Enchanter"]] as const;
export const RACES = [["HUM","Human"],["BAR","Barbarian"],["ERU","Erudite"],["ELF","Wood Elf"],["HIE","High Elf"],["DEF","Dark Elf"],["HEF","Half Elf"],["DWF","Dwarf"],["TRL","Troll"],["OGR","Ogre"],["HFL","Halfling"],["GNM","Gnome"],["IKS","Iksar"]] as const;
export const ALL_CLASSES = (1 << CLASSES.length) - 1;
export const ALL_RACES = (1 << RACES.length) - 1;
// Slot bits as stored in the item database.
const SLOT_NAMES = ["CHARM","EAR","HEAD","FACE","EAR","NECK","SHOULDERS","ARMS","BACK","WRIST","WRIST","RANGE","HANDS","PRIMARY","SECONDARY","FINGERS","FINGERS","CHEST","LEGS","FEET","WAIST","AMMO"];

export interface Slot { key: string; label: string; bit: number }
// Paper doll, laid out like the classic inventory window. null = empty cell.
export const DOLL: (Slot | null)[][] = [
  [null, ["ear1","EAR",1], ["neck","NECK",5], ["face","FACE",3], ["head","HEAD",2], ["ear2","EAR",4]],
  [["fing1","FINGER",15], ["wrist1","WRIST",9], ["arms","ARMS",7], ["hands","HANDS",12], ["wrist2","WRIST",10], ["fing2","FINGER",16]],
  [["shoul","SHOULD",6], ["chest","CHEST",17], ["back","BACK",8], ["waist","WAIST",20], ["legs","LEGS",18], ["feet","FEET",19]],
  [null, null, ["prim","PRIME",13], ["sec","SEC",14], ["range","RANGE",11], ["ammo","AMMO",21]],
].map(row => row.map(c => (c ? { key: c[0] as string, label: c[1] as string, bit: c[2] as number } : null)));
export const SLOTS: Record<string, Slot> = Object.fromEntries(DOLL.flat().filter((s): s is Slot => !!s).map(s => [s.key, s]));
// Slot filter chips merge the paired slots.
export const SLOT_CHIPS: [string, number[]][] = [["EAR",[1,4]],["NECK",[5]],["FACE",[3]],["HEAD",[2]],["FINGER",[15,16]],["WRIST",[9,10]],["ARMS",[7]],["HANDS",[12]],["SHOULD",[6]],["CHEST",[17]],["BACK",[8]],["WAIST",[20]],["LEGS",[18]],["FEET",[19]],["PRIME",[13]],["SEC",[14]],["RANGE",[11]],["AMMO",[21]]];
export const TYPES: Record<number, string> = {0:"1H Slashing",1:"2H Slashing",2:"Piercing",3:"1H Blunt",4:"2H Blunt",5:"Archery",7:"Throwing",8:"Shield",10:"Armor",11:"Misc",12:"Lockpicks",14:"Food",15:"Drink",16:"Light",17:"Combinable",18:"Bandages",19:"Throwing",20:"Scroll",21:"Potion",23:"Wind Instrument",24:"Stringed Instrument",25:"Brass Instrument",26:"Percussion Instrument",27:"Arrow",29:"Jewelry",35:"2H Piercing",45:"Hand to Hand"};
export const WEAPON = new Set([0,1,2,3,4,5,7,19,35,45]);
export const SIZES = ["TINY","SMALL","MEDIUM","LARGE","GIANT"];
export const ELEM: Record<number, string> = {1:"Magic",2:"Fire",3:"Cold",4:"Poison",5:"Disease"};
export const STATS = [["str","STR"],["sta","STA"],["agi","AGI"],["dex","DEX"],["wis","WIS"],["int","INT"],["cha","CHA"]] as const;
export const RESISTS = [["pr","POISON"],["mr","MAGIC"],["dr","DISEASE"],["fr","FIRE"],["cr","COLD"]] as const;
type NumKey = "ac" | "hp" | "mana" | (typeof STATS)[number][0] | (typeof RESISTS)[number][0];

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
for (const [id, raw] of Object.entries(D.items)) {
  ITEMS[+id] = { ...raw, id: +id, holders: [], total: 0, kind: kindOf(raw), auc: auctions(raw) };
}
for (const [char, loc, id, count] of D.bank) {
  ITEMS[id].holders.push({ char, loc, count });
  ITEMS[id].total += count;
}
export const ITEM_LIST = Object.values(ITEMS);
export const BANKERS = [...new Set(D.bank.map(r => r[0]))].sort();

// Icons are embedded as base64 and turned into blob URLs once.
const ICON_URL: Record<string, string> = {};
for (const [k, b64] of Object.entries(D.icons)) {
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  ICON_URL[k] = URL.createObjectURL(new Blob([u8], { type: "image/png" }));
}
export const iconUrl = (it: Item) => (it.icon != null ? ICON_URL[it.icon] : undefined);

// ---------- rules ----------
export interface Character { cls: number; race: number }
export const usable = (it: Item, c: Character) =>
  (c.cls < 0 || !!((it.classes ?? ALL_CLASSES) & (1 << c.cls))) && (c.race < 0 || !!((it.races ?? ALL_RACES) & (1 << c.race)));
export const fitsBit = (it: Item, bit: number) => !!((it.slots || 0) & (1 << bit));
export const fitsKeys = (it: Item) => Object.values(SLOTS).filter(s => fitsBit(it, s.bit)).map(s => s.key);

export const sumOf = (it: Item, keys: readonly (readonly [NumKey, string])[]) => keys.reduce((s, [k]) => s + (it[k] || 0), 0);

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
  return "worn: " + loc.toLowerCase();
}

export function whereText(holders: Holder[]) {
  if (!holders.length) return "";
  const chars = [...new Set(holders.map(h => h.char))];
  const n = holders.reduce((s, h) => s + h.count, 0);
  return chars.length === 1
    ? `${chars[0]} · ${prettyLoc(holders[0].loc)}${holders.length > 1 ? ` +${holders.length - 1} more` : ""}${n > 1 ? ` · ×${n}` : ""}`
    : `×${n} across ${chars.length} bankers`;
}

// ---------- bank requests (formats from the bot's #bank-requests instructions) ----------
const RAID_REAGENTS = /^(Peridot|Hate Stone|Pearl|Small Portal Fragment)s?$/i;
// pp is the expected platinum cost; null means a banker has to quote it.
export interface BankRequest { text: string | null; cost: string; pp: number | null; dkp?: boolean }
export function bankRequest(it: Item, cls: number, banker: string | null, qty = 1): BankRequest {
  const holder = (banker && it.holders.find(h => h.char === banker)) || it.holders[0];
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
      return { text, pp, dkp: true, cost: `The lesser of 200pp${mkt ? ` (market ${mkt}pp)` : ""} or 1 DKP (levels 55–60). Forbidden spells go to DKP auction.` };
    }
    return { text, pp: null, cost: level ? `Level ${level} spell. Ask a banker about price.` : "Check the dropped-spell rules in Discord." };
  }
  if (RAID_REAGENTS.test(it.name)) return { text: `Raid Reagents: ${it.name}, ${qty}`, pp: 0, cost: "Free for raid use." };
  if (it.kind === "bag") return { text: null, pp: null, cost: "Bags aren't for sale." };
  const text = `Misc item: ${it.name} (${mule})${qty > 1 ? ` x${qty}` : ""}`;
  return mkt
    ? { text, pp: Math.round(mkt * 0.8), cost: `About ${Math.round(mkt * 0.8)}pp: 80% of the ${mkt}pp Green median${it.auc.level === "thin" ? " (thin data)" : ""}.` }
    : { text, pp: null, cost: "80% of market rate. No recent Green sales to go by, so ask a banker." };
}
