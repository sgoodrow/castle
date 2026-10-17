import { beforeAll, describe, expect, it } from "vitest";
import { PAYLOAD } from "./__fixtures__/bank";
import { loadBank } from "./data";
import { filterItems } from "./search";
import { DEFAULT_FILTERS, type Filters } from "./state";

const NEC = 10, WAR = 0;
const HUM = 0;

beforeAll(() => loadBank(PAYLOAD));

const names = (f: Partial<Filters>) => filterItems({ ...DEFAULT_FILTERS, ...f }).map(it => it.name);

describe("filterItems", () => {
  it("shows everything, by name, with no filters", () => {
    expect(names({})).toEqual([
      "Bone Chips", "Cloak of Flames", "Fine Steel Long Sword", "Large Sewing Kit", "Pearl", "Scaled Tunic",
      "Spell: Aegolism", "Spell: Lifetap", "Spell: Splurt",
    ]);
  });

  it("filters by kind and slot", () => {
    expect(names({ kind: "bag" })).toEqual(["Large Sewing Kit"]);
    expect(names({ slot: "Primary" })).toEqual(["Fine Steel Long Sword"]);
    expect(names({ slot: "Back", kind: "spell" })).toEqual([]);
  });

  it("hides gear and spells the chosen class or race can't use, but keeps everything else", () => {
    expect(names({ cls: NEC })).not.toContain("Fine Steel Long Sword");
    expect(names({ cls: WAR })).toContain("Fine Steel Long Sword");
    expect(names({ race: HUM })).not.toContain("Scaled Tunic");
    expect(names({ cls: NEC })).toEqual(expect.arrayContaining(["Bone Chips", "Large Sewing Kit", "Pearl"]));
  });

  it("matches every word of the search, in any case, against names and stats", () => {
    expect(names({ q: "CLOAK" })).toEqual(["Cloak of Flames"]);
    expect(names({ q: "spell lifetap" })).toEqual(["Spell: Lifetap"]);
    expect(names({ q: "flame shield" })).toEqual(["Cloak of Flames"]); // its worn effect
    expect(names({ q: "8/30" })).toEqual(["Fine Steel Long Sword"]);
    expect(names({ q: "  sword   steel " })).toEqual(["Fine Steel Long Sword"]);
    expect(names({ q: "nothing like this" })).toEqual([]);
  });

  it("combines search with the other filters", () => {
    expect(names({ q: "spell", cls: NEC })).toEqual(["Spell: Lifetap", "Spell: Splurt"]);
  });
});
