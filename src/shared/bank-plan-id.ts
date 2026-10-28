// A bank post's plan is a code of the request's lines, so the bot can plan it from the live bank when
// a banker reacts 👀. The site writes the code from the lines it checked, never from what the page
// sent, and keeps it by the post's message. Posts from before that carry it in their button's id.

// How a line is filled: from the bank, by a DKP auction a banker starts, or by a multiquest the
// member sets up with the item's holder. Only the bank's lines need a login.
export type Via = "bank" | "auction" | "multiquest";
// One line of the request: the item, how many the member asked for, and how it's filled.
export interface PlanLine {
  id: number;
  qty: number;
  via: Via;
}
// How each way is written after a line's quantity.
const MARK: Record<Via, string> = { bank: "", auction: "!", multiquest: "~" };

export const PLAN_BUTTON = "bank-plan";

// A request holds up to nine different items (the bank page's tab limit).
export const MAX_PLAN_LINES = 9;
// Ids and quantities are written in base 36, in at most three digits, so nine lines always fit
// Discord's 100 characters for a button's id: 10 + 9 × 8 + 8 commas = 90. Every item id the bank
// has is below this.
export const MAX_PLAN_NUMBER = 36 ** 3 - 1;

const line = (l: PlanLine) =>
  `${l.id.toString(36)}.${l.qty.toString(36)}${MARK[l.via]}`;

// Each item once, as on the tab, so no stock is planned for two lines.
const distinct = (lines: PlanLine[]) =>
  new Set(lines.map((l) => l.id)).size === lines.length;

const fits = (n: number) =>
  Number.isInteger(n) && n > 0 && n <= MAX_PLAN_NUMBER;

// The button's id for these lines, or null when they aren't a request one can carry.
export function planId(lines: PlanLine[]): string | null {
  return lines.length &&
    lines.length <= MAX_PLAN_LINES &&
    distinct(lines) &&
    lines.every((l) => fits(l.id) && fits(l.qty))
    ? `${PLAN_BUTTON}:${lines.map(line).join(",")}`
    : null;
}

const LINE = /^([0-9a-z]{1,3})\.([0-9a-z]{1,3})([!~]?)$/;
const VIA: Record<string, Via> = { "": "bank", "!": "auction", "~": "multiquest" };

// The lines a button's id carries, or null if it isn't a plan button's id.
export function readPlanId(id: string): PlanLine[] | null {
  const [button, body, ...rest] = id.split(":");
  if (button !== PLAN_BUTTON || body === undefined || rest.length) return null;
  const lines: PlanLine[] = [];
  for (const part of body.split(",")) {
    const m = part.match(LINE);
    const via = VIA[m?.[3] ?? ""];
    if (!m?.[1] || !m[2] || !via) return null;
    const l = { id: parseInt(m[1], 36), qty: parseInt(m[2], 36), via };
    if (!l.id || !l.qty) return null;
    lines.push(l);
  }
  return lines.length <= MAX_PLAN_LINES && distinct(lines) ? lines : null;
}
