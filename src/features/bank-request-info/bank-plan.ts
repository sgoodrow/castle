// The plan a banker is sent by DM for a bank request: which characters to log in to, in the order
// the route reaches them, and what to take from where on each. It comes from the bank as it is now,
// not from the post. It names characters and spots only, never accounts.
import { prettyLoc } from "../../shared/bank-location";
import type { PlanLine } from "../../shared/bank-plan-id";
import type { Stock } from "../../shared/bank-stock";
import { loginRoute } from "../../shared/login-route";

export interface Take {
  name: string;
  count: number;
  loc: string;
}
export interface Plan {
  logins: { char: string; takes: Take[] }[];
  auctions: string[];
  short: { name: string; has: number; needs: number }[];
}

// Pack 2 before pack 10.
const byLoc = (a: Stock, b: Stock) =>
  a.loc.localeCompare(b.loc, undefined, { numeric: true });

export function bankPlan(
  request: PlanLine[],
  stock: Stock[],
  name: (id: number) => string
): Plan {
  // A DKP auction is started by a banker; its item isn't taken from the bank for the request.
  const auctions = request.filter((l) => l.auction).map((l) => name(l.id));
  const lines = request
    .filter((l) => !l.auction)
    .map((l) => {
      const slots = stock.filter((s) => s.id === l.id).sort(byLoc);
      const held = new Map<string, number>();
      for (const s of slots)
        held.set(s.char, (held.get(s.char) ?? 0) + s.count);
      return { ...l, slots, held };
    });
  const route = loginRoute(lines);
  // What's taken from each character, in the order the route reaches the lines.
  const taken: (Take & { char: string })[] = [];
  const short: Plan["short"] = [];
  for (const l of route.lines) {
    let left = l.qty;
    for (const char of l.from)
      for (const s of l.slots) {
        if (s.char !== char || !left) continue;
        const count = Math.min(s.count, left);
        taken.push({ char, name: name(l.id), count, loc: s.loc });
        left -= count;
      }
    if (left) short.push({ name: name(l.id), has: l.qty - left, needs: l.qty });
  }
  return {
    // A character the route reaches with nothing left to take is skipped.
    logins: route.logins.flatMap((char) => {
      const takes = taken
        .filter((t) => t.char === char)
        .map(({ name, count, loc }) => ({ name, count, loc }));
      return takes.length ? [{ char, takes }] : [];
    }),
    auctions,
    short,
  };
}

// A DM holds 2,000 characters.
const MAX_DM = 2000;

// An item's name as Discord shows it: its own markdown characters, such as a backtick, are escaped.
const shown = (name: string) => name.replace(/[\\`*_~|]/g, "\\$&");
const quantity = (n: number) => (n > 1 ? `${n} × ` : "");

// The plan's sections: a heading, then a line for each thing in it.
const sections = (plan: Plan) => [
  ...plan.logins.map(({ char, takes }) => ({
    heading: `**Log in to ${char}**`,
    lines: takes.map(
      (t) => `• ${quantity(t.count)}${shown(t.name)} in ${prettyLoc(t.loc)}`
    ),
  })),
  ...(plan.auctions.length
    ? [
        {
          heading: "**DKP auction, no login**",
          lines: plan.auctions.map((n) => `• ${shown(n)}`),
        },
      ]
    : []),
  ...(plan.short.length
    ? [
        {
          heading: "**Not enough in the bank**",
          lines: plan.short.map(
            (s) => `• ${shown(s.name)}: has ${s.has}, needs ${s.needs}`
          ),
        },
      ]
    : []),
];

// The plan as DMs, split between lines so none passes Discord's limit. A section that carries on
// into the next DM repeats its heading there.
export function planMessages(plan: Plan): string[] {
  const messages: string[] = [];
  let current = "**Bank request plan**";
  const add = (text: string, again: string) => {
    if (current.length + 1 + text.length <= MAX_DM) {
      current = `${current}\n${text}`;
      return;
    }
    messages.push(current);
    current = again
      ? `${again}\n${text.replace(/^\n/, "")}`
      : text.replace(/^\n/, "");
  };
  // A heading goes with its first line, so it never ends a DM on its own.
  for (const { heading, lines } of sections(plan))
    lines.forEach((line, i) =>
      i ? add(line, `${heading} (continued)`) : add(`\n${heading}\n${line}`, "")
    );
  return [...messages, current];
}
