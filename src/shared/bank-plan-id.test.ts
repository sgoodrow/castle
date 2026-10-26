import { MAX_PLAN_NUMBER, planId, readPlanId } from "./bank-plan-id";

describe("a plan button's id", () => {
  it("carries a request's lines and reads back the same", () => {
    const lines = [
      { id: 11621, qty: 1, via: "bank" as const },
      { id: 19400, qty: 1, via: "auction" as const },
      { id: 20863, qty: 2, via: "multiquest" as const },
      { id: 10024, qty: 46, via: "bank" as const },
    ];
    const id = planId(lines);
    expect(id).toBe("bank-plan:8yt.1,eyw.1!,g3j.2~,7qg.1a");
    expect(readPlanId(id!)).toEqual(lines);
  });

  it("fits nine lines of the largest ids and quantities in Discord's 100 characters", () => {
    const id = planId(
      Array.from({ length: 9 }, (_, i) => ({
        id: MAX_PLAN_NUMBER - i,
        qty: MAX_PLAN_NUMBER,
        via: "auction" as const,
      }))
    );
    expect(id?.length).toBeLessThanOrEqual(100);
    expect(readPlanId(id!)).toHaveLength(9);
  });

  it("can't be written for lines it has no room for", () => {
    const line = { id: 1, qty: 1, via: "bank" as const };
    expect(planId([])).toBeNull();
    expect(planId([{ ...line, id: MAX_PLAN_NUMBER + 1 }])).toBeNull();
    expect(planId([{ ...line, qty: 0 }])).toBeNull();
    expect(planId([{ ...line, qty: 1.5 }])).toBeNull();
    expect(
      planId(Array.from({ length: 10 }, (_, i) => ({ ...line, id: i + 1 })))
    ).toBeNull();
  });

  it("can't carry the same item on two lines", () => {
    const line = { id: 10, qty: 1, via: "bank" as const };
    expect(planId([line, line])).toBeNull();
  });

  it.each([
    "banking",
    "bank-plan",
    "bank-plan:",
    "bank-plan:1.1:2",
    "bank-plan:1.0",
    "bank-plan:0.1",
    "bank-plan:1.1!!",
    "bank-plan:1.1?",
    "bank-plan:1.1!~",
    "bank-plan:1.1,,2.1",
    "bank-plan:1234.1",
    "bank-plan:A.1",
    "bank-plan:a.1,a.1",
    "bank-plan:1.1,2.1,3.1,4.1,5.1,6.1,7.1,8.1,9.1,a.1",
  ])("isn't read from %s", (id) => {
    expect(readPlanId(id)).toBeNull();
  });
});
