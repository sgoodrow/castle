import { beforeAll, describe, expect, it } from "vitest";
import { PAYLOAD, PAL, WAR } from "./__fixtures__/bank";
import {
  ALL_CLASSES, CLASSES, ITEMS, ITEM_LIST, SNAPSHOT_AT, bankRequest, chipForBit, fitsKeys, iconUrl, loadBank, maskText,
  prettyLoc, signed, slotText, statParts, statText, usable, validCombo,
} from "./data";

const NEC = 10, SHD = 4, CLR = 1, MNK = 6;
const HUM = 0, BAR = 1, IKS = 12;

beforeAll(() => loadBank(PAYLOAD));

describe("loadBank", () => {
  it("lists each item once, leaving out NO DROP and items missing from the item list", () => {
    expect(ITEM_LIST.map(it => it.id).sort()).toEqual([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1009, 1010]);
    expect(ITEMS[1008]).toBeUndefined();
    expect(ITEMS[4040]).toBeUndefined();
  });

  it("adds up a stack held in several places", () => {
    expect(ITEMS[1006].total).toBe(35);
    expect(ITEMS[1006].holders).toEqual([
      { char: "Mulea", loc: "General5-Slot1", count: 20 },
      { char: "Muleb", loc: "Bank1-Slot4", count: 15 },
    ]);
  });

  it("sorts items into gear, spells, bags and other", () => {
    const kinds = Object.fromEntries(ITEM_LIST.map(it => [it.name, it.kind]));
    expect(kinds).toMatchObject({
      "Cloak of Flames": "gear", "Fine Steel Long Sword": "gear", "Scaled Tunic": "gear",
      "Spell: Lifetap": "spell", "Large Sewing Kit": "bag", "Bone Chips": "other", Pearl: "other",
    });
  });

  it("takes the snapshot time from the payload", () => {
    expect(SNAPSHOT_AT.toISOString()).toBe(PAYLOAD.snapshot);
  });
});

describe("auctions", () => {
  it("calls a market solid with five recent sales from three sellers, one in the last two months", () => {
    const { auc } = ITEMS[1001];
    expect(auc.level).toBe("solid");
    expect(auc.recent).toHaveLength(5);
    expect(auc.older).toBe(1);
    expect(auc.median).toBe(1000);
    expect(auc.sellers.get("Ayla")).toBe(2);
  });

  it("calls a single sale thin, and no tracker none", () => {
    expect(ITEMS[1004].auc).toMatchObject({ level: "thin", median: 150, hasTracker: true });
    expect(ITEMS[1006].auc).toMatchObject({ level: "none", median: null, hasTracker: false });
  });
});

describe("usable", () => {
  it("checks the class and race masks, and treats -1 as anyone", () => {
    const sword = ITEMS[1002], tunic = ITEMS[1009];
    expect(usable(sword, { cls: 0, race: -1 })).toBe(true);
    expect(usable(sword, { cls: CLR, race: -1 })).toBe(false);
    expect(usable(tunic, { cls: -1, race: IKS })).toBe(true);
    expect(usable(tunic, { cls: -1, race: HUM })).toBe(false);
    expect(usable(tunic, { cls: -1, race: -1 })).toBe(true);
  });

  it("knows which class and race pairs can be rolled", () => {
    expect(validCombo(MNK, IKS)).toBe(true);
    expect(validCombo(MNK, BAR)).toBe(false);
    expect(validCombo(-1, BAR)).toBe(true);
  });
});

describe("bankRequest", () => {
  it("prices gear at 80% of the Green median", () => {
    expect(bankRequest(ITEMS[1001], -1)).toEqual({
      text: "Misc item: Cloak of Flames (Mulea)", pp: 800, fromMarket: true, cost: "About 800pp: 80% of the 1000pp Green median.",
    });
    expect(bankRequest(ITEMS[1001], -1, 2).text).toBe("Misc item: Cloak of Flames (Mulea) x2");
  });

  it("leaves an item with no market to a banker", () => {
    expect(bankRequest(ITEMS[1006], -1)).toMatchObject({ pp: null, cost: expect.stringMatching(/ask a banker/) });
  });

  it("names the chosen class's level for a spell, or the first class that can scribe it", () => {
    expect(bankRequest(ITEMS[1003], NEC).text).toBe("Dropped spell: Necromancer, 1, Lifetap (Mulea, 1)");
    expect(bankRequest(ITEMS[1003], -1).text).toBe("Dropped spell: Shadow Knight, 9, Lifetap (Mulea, 1)");
    expect(bankRequest(ITEMS[1003], SHD).pp).toBeNull();
  });

  it("charges 50pp for level 51-54 spells", () => {
    expect(bankRequest(ITEMS[1010], NEC)).toMatchObject({ pp: 50, text: "Dropped spell: Necromancer, 52, Splurt (Muleb, 2)" });
  });

  it("charges the lesser of 200pp and the market for level 55+ spells, or a DKP", () => {
    expect(bankRequest(ITEMS[1004], CLR)).toMatchObject({ pp: 150, dkp: true, fromMarket: true });
  });

  it("gives raid reagents away and doesn't sell bags", () => {
    expect(bankRequest(ITEMS[1007], -1, 3)).toMatchObject({ text: "Raid Reagents: Pearl, 3", pp: 0 });
    expect(bankRequest(ITEMS[1005], -1)).toMatchObject({ text: null, pp: null });
  });

  it("uses a banker's price over the rules", () => {
    expect(bankRequest(ITEMS[1009], -1)).toEqual({
      text: "Misc item: Scaled Tunic (Muleb)", pp: 300, dkp: true, cost: "Banker's price: 300p, 1dkp.",
    });
  });
});

describe("formatting", () => {
  it("summarises stats, resists and effects for list rows", () => {
    expect(statParts(ITEMS[1001])).toEqual([
      { label: "AC", value: "10" }, { label: "HP", value: "+5" }, { label: "STR", value: "+3" },
      { label: "", value: "FR +10" }, { label: "Worn:", value: "Flame Shield" },
    ]);
    expect(statText(ITEMS[1002])).toBe("DMG 8/30");
    expect(statText(ITEMS[1003])).toBe(" SHD 9, NEC 1");
    expect(statText(ITEMS[1005])).toBe(" 10 slots, LARGE");
  });

  it("writes class masks as a list, an exception list, ALL or NONE", () => {
    expect(maskText(WAR | PAL, CLASSES, ALL_CLASSES)).toBe("WAR PAL");
    expect(maskText(ALL_CLASSES & ~WAR, CLASSES, ALL_CLASSES)).toBe("ALL except WAR");
    expect(maskText(undefined, CLASSES, ALL_CLASSES)).toBe("ALL");
    expect(maskText(0, CLASSES, ALL_CLASSES)).toBe("NONE");
  });

  it("names slots once each", () => {
    expect(slotText(ITEMS[1002])).toBe("Primary Secondary");
    expect(fitsKeys(ITEMS[1002])).toEqual(["prim", "sec"]);
    expect(chipForBit(4)).toBe("Ear");
    expect(chipForBit(99)).toBeNull();
  });

  it("reads inventory locations", () => {
    expect(prettyLoc("General1-Slot2")).toBe("pack 1, slot 2");
    expect(prettyLoc("General2")).toBe("inventory 2");
    expect(prettyLoc("Bank3-Slot4")).toBe("bank bag 3, slot 4");
    expect(prettyLoc("Bank3")).toBe("bank 3");
    expect(prettyLoc("Cursor")).toBe("slot: cursor");
  });

  it("signs numbers and builds icon urls", () => {
    expect([signed(3), signed(0), signed(-2)]).toEqual(["+3", "0", "-2"]);
    expect(iconUrl({ ...ITEMS[1001], icon: 7 })).toBe("/icons/7.png");
    expect(iconUrl(ITEMS[1001])).toBeUndefined();
  });
});
