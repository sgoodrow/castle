import { describe, expect, it } from "vitest";
import { planText, type PlanItem } from "./bank-plan";

const item = (
  over: Partial<PlanItem> & Pick<PlanItem, "id" | "name">
): PlanItem => ({
  qty: 1,
  auction: false,
  holders: [],
  ...over,
});
const held = (char: string, loc: string, count = 1) => ({
  char,
  loc,
  count,
  mq: false,
});

describe("the banker's plan", () => {
  it("lists the logins in order, with what to take from each", () => {
    const text = planText([
      item({
        id: 1,
        name: "Cloak of Flames",
        holders: [held("Mulea", "Bank2")],
      }),
      item({
        id: 2,
        name: "Bone Chips",
        qty: 2,
        holders: [held("Mulea", "General1-Slot3", 5)],
      }),
    ]);
    expect(text).toBe(
      [
        "**Bank request plan**",
        "**Log in to Mulea**",
        "• Cloak of Flames (bank 2)",
        "• 2 × Bone Chips (pack 1, slot 3)",
      ].join("\n")
    );
  });

  it("takes a line from a second login when the first has too few", () => {
    const text = planText([
      item({
        id: 1,
        name: "Pearl",
        qty: 3,
        holders: [held("Muleb", "Bank1", 2), held("Mulea", "Bank1", 2)],
      }),
    ]);
    expect(text).toContain("**Log in to Mulea**\n• 2 × Pearl (bank 1)");
    expect(text).toContain("**Log in to Muleb**\n• Pearl (bank 1)");
  });

  it("names a DKP auction line without logins, and says when the bank is short", () => {
    const text = planText([
      item({
        id: 1,
        name: "Scaled Tunic",
        auction: true,
        holders: [held("Mulea", "Bank1")],
      }),
      item({
        id: 2,
        name: "Bone Chips",
        qty: 4,
        holders: [held("Mulea", "Bank2", 1)],
      }),
    ]);
    expect(text).toContain(
      "**DKP auction:** Scaled Tunic. Start the auction for each."
    );
    expect(text).toContain("**Not enough in the bank:** Bone Chips (1 of 4).");
  });

  it("leaves out multiquest holders, which the post names", () => {
    const text = planText([
      item({
        id: 1,
        name: "Spell: Lifetap",
        holders: [{ char: "Mulea", loc: "Multiquest", count: 1, mq: true }],
      }),
    ]);
    expect(text).toBe(
      "**Bank request plan**\n**Not enough in the bank:** Spell: Lifetap (0 of 1)."
    );
  });
});
