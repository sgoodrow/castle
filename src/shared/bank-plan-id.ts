// A bank post's plan button names the lines it plans, so the banker's DM is worked out when the button
// is pressed, from the bank as it is then. A line is its item, its quantity, and whether it's a DKP auction.
// Discord caps a button's id at 100 characters, so the post has no button when the plan wouldn't fit.
export const PLAN_ID = "bank-plan:";
export const MAX_PLAN_ID = 100;

export interface PlanLine {
  id: number;
  qty: number;
  auction: boolean;
}

const LINE = /^(\d+)x(\d+)(a?)$/;

export const planId = (lines: PlanLine[]) =>
  PLAN_ID +
  lines.map((l) => `${l.id}x${l.qty}${l.auction ? "a" : ""}`).join(",");

// The lines a plan button names, or null when the id isn't one.
export function readPlanId(customId: string): PlanLine[] | null {
  if (!customId.startsWith(PLAN_ID)) return null;
  const lines = customId
    .slice(PLAN_ID.length)
    .split(",")
    .map((part) => {
      const m = part.match(LINE);
      return m ? { id: +m[1]!, qty: +m[2]!, auction: m[3] === "a" } : null;
    });
  return lines.length && lines.every((l): l is PlanLine => l !== null)
    ? lines
    : null;
}
