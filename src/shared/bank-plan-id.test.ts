import { MAX_PLAN_NUMBER, planId, readPlanId } from "./bank-plan-id";

describe("a plan button's id", () => {
  it("carries a request's lines and reads back the same", () => {
    const lines = [
      { id: 11621, qty: 1, auction: false },
      { id: 19400, qty: 1, auction: true },
      { id: 10024, qty: 46, auction: false },
    ];
    const id = planId(lines);
    expect(id).toBe("bank-plan:8yt.1,eyw.1!,7qg.1a");
    expect(readPlanId(id!)).toEqual(lines);
  });

  it("fits nine lines of the largest ids and quantities in Discord's 100 characters", () => {
    const line = { id: MAX_PLAN_NUMBER, qty: MAX_PLAN_NUMBER, auction: true };
    const id = planId(Array(9).fill(line));
    expect(id?.length).toBeLessThanOrEqual(100);
    expect(readPlanId(id!)).toHaveLength(9);
  });

  it("can't be written for lines it has no room for", () => {
    const line = { id: 1, qty: 1, auction: false };
    expect(planId([])).toBeNull();
    expect(planId([{ ...line, id: MAX_PLAN_NUMBER + 1 }])).toBeNull();
    expect(planId([{ ...line, qty: 0 }])).toBeNull();
    expect(planId([{ ...line, qty: 1.5 }])).toBeNull();
    expect(
      planId(
        Array(12).fill({ ...line, id: MAX_PLAN_NUMBER, qty: MAX_PLAN_NUMBER })
      )
    ).toBeNull();
  });

  it.each([
    "banking",
    "bank-plan",
    "bank-plan:",
    "bank-plan:1.1:2",
    "bank-plan:1.0",
    "bank-plan:0.1",
    "bank-plan:1.1!!",
    "bank-plan:1.1,,2.1",
    "bank-plan:1234.1",
    "bank-plan:A.1",
  ])("isn't read from %s", (id) => {
    expect(readPlanId(id)).toBeNull();
  });
});
