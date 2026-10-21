// A small bank, shaped like /api/bank's answer, for the page's tests.
import { CLASS_BIT, RACE_BIT, type ClassId, type EqClassLevels, type Payload, type RawItem } from "../data";

const { WAR, CLR, PAL } = CLASS_BIT;
const { IKS } = RACE_BIT;

// A spell's levels as spells.json holds them: EverQuest's 15 classes in order, Beastlord last,
// 0 where the class can't scribe it.
const levels = (lv: Partial<Record<ClassId, number>>): EqClassLevels => {
  const l = (cls: ClassId) => lv[cls] ?? 0;
  return [l("WAR"), l("CLR"), l("PAL"), l("RNG"), l("SHD"), l("DRU"), l("MNK"), l("BRD"), l("ROG"), l("SHM"), l("NEC"), l("WIZ"), l("MAG"), l("ENC"), 0];
};

const items: Record<string, RawItem> = {
  // Back slot, everyone, a steady Green market: 5 sales from 3 sellers, one in the last two months.
  1001: {
    name: "Cloak of Flames", slots: 1 << 8, ac: 10, fr: 10, hp: 5, str: 3, worn: 900,
    green: [["2026-05-20", "Ayla", 900], ["2026-04-01", "Bo", 1000], ["2026-03-01", "Cy", 1100], ["2026-02-01", "Ayla", 1200], ["2026-01-05", "Bo", 800], ["2024-01-01", "Old", 50]],
  },
  // Weapon for warriors and paladins only, both hands.
  1002: { name: "Fine Steel Long Sword", slots: (1 << 13) | (1 << 14), dmg: 8, dly: 30, type: 0, classes: WAR | PAL },
  // Necromancer spell, level 1, and a Shadow Knight one at 9; no auctions tracked.
  1003: { name: "Spell: Lifetap", scroll: 500 },
  // Cleric 60 spell, thin market below the 200pp cap.
  1004: { name: "Spell: Aegolism", scroll: 501, classes: CLR, green: [["2026-05-01", "Dee", 150]] },
  1005: { name: "Large Sewing Kit", cls: 1, bagslots: 10, bagsize: 3 },
  1006: { name: "Bone Chips" },
  1007: { name: "Pearl" },
  // NO DROP never leaves the bank, so the page never shows it.
  1008: { name: "Shiny Brass Idol", nodrop: true, slots: 1 },
  // Iksar-only chest piece, and a banker's price.
  1009: { name: "Scaled Tunic", slots: 1 << 17, ac: 12, races: IKS, price: "300p, 1dkp" },
  // Level 52 spell for a necromancer.
  1010: { name: "Spell: Splurt", scroll: 502 },
};

export const PAYLOAD: Payload = {
  snapshot: "2026-05-30T18:00:00.000Z",
  today: "2026-06-01",
  me: { name: "Alice" },
  bank: [
    ["Mulea", "General1-Slot2", 1001, 1],
    ["Muleb", "Bank3", 1002, 1],
    ["Mulea", "General2", 1003, 1],
    ["Mulea", "General3", 1004, 1],
    ["Muleb", "General4", 1005, 1],
    ["Mulea", "General5-Slot1", 1006, 20],
    ["Muleb", "Bank1-Slot4", 1006, 15],
    ["Muleb", "Bank2", 1007, 4],
    ["Mulea", "General6", 1008, 1],
    ["Muleb", "Bank4", 1009, 1],
    ["Muleb", "Bank5", 1010, 2],
    ["Muleb", "Bank6", 4040, 1], // not in the item list
  ],
  mq: [],
  items,
  spells: {
    500: { name: "Lifetap", lv: levels({ NEC: 1, SHD: 9, BRD: 61 }) }, // a level past P99's 60 is EverQuest's, not ours
    501: { name: "Aegolism", lv: levels({ CLR: 60 }) },
    502: { name: "Splurt", lv: levels({ NEC: 52 }) },
    900: { name: "Flame Shield", lv: levels({}) },
  },
};

// The usual stock plus scrolls the bankers' spell sheet prices: a forbidden spell, one cheaper than
// the level rule, and one at the sheet's price though the market is lower.
export const WITH_SHEET: Payload = {
  ...PAYLOAD,
  bank: [...PAYLOAD.bank, ["Mulec", "General1", 1011, 2], ["Mulec", "General2", 1012, 1], ["Mulec", "General3", 1013, 1]],
  items: {
    ...items,
    1011: { name: "Spell: Bedlam", scroll: 503, sheet: { kind: "auction" } },
    1012: { name: "Spell: Aegis", scroll: 504, sheet: { kind: "pp", pp: 50, dkp: null } },
    1013: { name: "Spell: Gift of Brilliance", scroll: 505, sheet: { kind: "pp", pp: 200, dkp: 1 }, green: [["2026-05-01", "Dee", 150]] },
  },
  spells: {
    ...PAYLOAD.spells,
    503: { name: "Bedlam", lv: levels({ ENC: 60 }) },
    504: { name: "Aegis", lv: levels({ CLR: 57 }) },
    505: { name: "Gift of Brilliance", lv: levels({ ENC: 60 }) },
  },
};

// The usual stock plus the Plane of Sky mules': island quest items, an Efreeti weapon (DKP auction),
// one the Sky sheet marks "dkp bid", a bag, one a banker priced, one a regular mule holds too, a
// stone for two islands, and NO DROP items held only for multiquesting, one by two holders.
export const WITH_SKY: Payload = {
  ...PAYLOAD,
  bank: [
    ...PAYLOAD.bank,
    ["Cgskya", "General1", 1021, 2],
    ["Cgskyb", "General2", 1022, 2],
    ["Gmskyone", "General3", 1023, 1],
    ["Cgskyc", "General4", 1024, 1],
    ["Cgskyc", "General5", 1025, 1],
    ["Mulea", "General9", 1026, 1],
    ["Cgskya", "General6", 1026, 3],
    ["Cgskyb", "General7", 1027, 1],
  ],
  mq: [["Rabbie", 1028, 1], ["Kelra", 1029, 1], ["Gmskytwo", 1029, 2], ["Rabbie", 1021, 1]],
  items: {
    ...items,
    1021: { name: "Emerald Spiroc Feather", sky: { islands: [4], note: "fd ring" } },
    1022: { name: "Efreeti War Axe", slots: 1 << 13, dmg: 20, dly: 40, type: 1, sky: { islands: [], note: "" } },
    1023: { name: "Bixie Stinger", sky: { islands: [3], note: "dkp bid" } },
    1024: { name: "Backpack", cls: 1, bagslots: 8, bagsize: 3, sky: { islands: [], note: "" } },
    1025: { name: "Kite Shield", slots: 1 << 14, ac: 6, price: "100p", sky: { islands: [], note: "" } },
    1026: { name: "Efreeti Statuette", sky: { islands: [4], note: "" } },
    1027: { name: "Ethereal Amethyst", sky: { islands: [6, 7], note: "" } },
    1028: { name: "Sky Sapphire", nodrop: true, sky: { islands: [2], note: "" } },
    1029: { name: "Griffon Eye", nodrop: true, sky: { islands: [], note: "" } },
  },
};

// The usual stock plus the research mules': a component on a research mule and a storage mule, a
// scroll two classes research, and a component a banker priced.
export const WITH_RESEARCH: Payload = {
  ...PAYLOAD,
  bank: [
    ...PAYLOAD.bank,
    ["Cgstorageb", "General1", 1031, 2],
    ["Cgnecro", "General1", 1031, 7],
    ["Cgnecro", "General2", 1032, 1],
    ["Cgwiz", "General1", 1033, 1],
  ],
  items: {
    ...items,
    1031: { name: "Words of Odus", research: true },
    1032: { name: "Spell: Lich", scroll: 506, research: true },
    1033: { name: "Rune of Ap`Sagor", price: "5p", research: true },
  },
  spells: { ...PAYLOAD.spells, 506: { name: "Lich", lv: levels({ NEC: 49, SHD: 60 }) } },
};
