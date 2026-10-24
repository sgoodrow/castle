import { describe, expect, it } from "vitest";
import { PLAN_ID, planId, readPlanId } from "./bank-plan-id";

describe("a bank plan's button id", () => {
  it("names each line's item, quantity and auction flag, and reads back", () => {
    const lines = [
      { id: 1001, qty: 2, auction: false },
      { id: 20, qty: 1, auction: true },
    ];
    expect(planId(lines)).toBe(`${PLAN_ID}1001x2,20x1a`);
    expect(readPlanId(planId(lines))).toEqual(lines);
  });

  it("reads nothing that isn't a plan", () => {
    expect(readPlanId("bank-request:1x1")).toBeNull();
    expect(readPlanId(`${PLAN_ID}`)).toBeNull();
    expect(readPlanId(`${PLAN_ID}1x2,oops`)).toBeNull();
    expect(readPlanId(`${PLAN_ID}1x2,`)).toBeNull();
  });
});
