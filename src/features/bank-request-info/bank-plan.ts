// The plan a banker is sent by DM for a bank request: which characters to log in to, in the order
// the route reaches them, the account and password for each, and what to take from where on each.
// It comes from the bank as it is now, not from the post. Only characters whose account the shared
// accounts sheet lets bankers use are planned from, so no spot is named that a banker can't reach.
import { prettyLoc } from "../../shared/bank-location";
import type { PlanLine } from "../../shared/bank-plan-id";
import type { Stock } from "../../shared/bank-stock";
import { loginRoute } from "../../shared/login-route";

// The account a banker logs in to a character with.
export interface Login {
  account: string;
  password: string;
}
// Logins by the character's lowercase name, for the characters a banker may log in to.
export type Logins = Map<string, Login>;

// A spot the bank holds on a character a banker can log in to.
type Holding = Stock & { login: Login };

export interface Take {
  name: string;
  count: number;
  loc: string;
}
export interface Count {
  name: string;
  count: number;
}
// A spot that holds an item the request needs, kept in case the spot the plan takes from is empty.
export interface Spot {
  name: string;
  char: string;
  loc: string;
  login: Login;
}
export interface Plan {
  logins: { char: string; login: Login; takes: Take[] }[];
  auctions: Count[];
  multiquests: Count[];
  backups: Spot[];
  short: { name: string; has: number; needs: number }[];
}

// Pack 2 before pack 10.
const byLoc = (a: Stock, b: Stock) =>
  a.loc.localeCompare(b.loc, undefined, { numeric: true });

export function bankPlan(
  request: PlanLine[],
  stock: Stock[],
  name: (id: number) => string,
  logins: Logins
): Plan {
  // A banker starts a DKP auction, and a member sets up a multiquest with the item's holder, so
  // neither is taken from the bank.
  const named = (via: PlanLine["via"]) =>
    request
      .filter((l) => l.via === via)
      .map((l) => ({ name: name(l.id), count: l.qty }));
  const holdings: Holding[] = stock.flatMap((s) => {
    const login = logins.get(s.char.toLowerCase());
    return login ? [{ ...s, login }] : [];
  });
  const lines = request
    .filter((l) => l.via === "bank")
    .map((l) => {
      const slots = holdings.filter((s) => s.id === l.id).sort(byLoc);
      const held = new Map<string, number>();
      for (const s of slots)
        held.set(s.char, (held.get(s.char) ?? 0) + s.count);
      return { ...l, slots, held };
    });
  const route = loginRoute(lines);
  // What's taken from each character, in the order the route reaches the lines.
  const taken: (Take & { char: string; login: Login })[] = [];
  // The spots the plan takes from, even in part. A spot it takes from is not a backup: a banker who
  // finds that spot empty finds the rest of it empty too.
  const taking = new Set<Holding>();
  const short: Plan["short"] = [];
  for (const l of route.lines) {
    let left = l.qty;
    for (const char of l.from)
      for (const s of l.slots) {
        if (s.char !== char || !left) continue;
        const count = Math.min(s.count, left);
        taken.push({
          char,
          login: s.login,
          name: name(l.id),
          count,
          loc: s.loc,
        });
        taking.add(s);
        left -= count;
      }
    if (left) short.push({ name: name(l.id), has: l.qty - left, needs: l.qty });
  }
  // Each character something is taken from, with what's taken there, in route order.
  const byChar = new Map<string, { login: Login; takes: Take[] }>();
  for (const t of taken) {
    const entry = byChar.get(t.char) ?? { login: t.login, takes: [] };
    entry.takes.push({ name: t.name, count: t.count, loc: t.loc });
    byChar.set(t.char, entry);
  }
  const planned = [...byChar]
    .sort(([a], [b]) => route.logins.indexOf(a) - route.logins.indexOf(b))
    .map(([char, entry]) => ({ char, ...entry }));
  // The spots the plan doesn't take from, on the characters a banker can log in to, in the order the
  // lines are filled.
  const backups = route.lines.flatMap((l) =>
    l.slots
      .filter((s) => !taking.has(s))
      .map((s) => ({
        name: name(l.id),
        char: s.char,
        loc: s.loc,
        login: s.login,
      }))
  );
  return {
    logins: planned,
    auctions: named("auction"),
    multiquests: named("multiquest"),
    backups,
    short,
  };
}

// A DM holds 2,000 characters.
const MAX_DM = 2000;

// An item's name as Discord shows it: its own markdown characters, such as a backtick, are escaped.
const shown = (name: string) => name.replace(/[\\`*_~|]/g, "\\$&");
const quantity = (n: number) => (n > 1 ? `${n} × ` : "");
const counted = (c: Count) => `• ${quantity(c.count)}${shown(c.name)}`;
// A login as a code span, so Discord shows it exactly as the sheet has it, to copy. The fence is one
// backtick longer than the longest run of backticks in it, so no run in the login can close the span.
const code = (s: string) => {
  const longest = Math.max(
    0,
    ...(s.match(/`+/g) ?? []).map((run) => run.length)
  );
  const fence = "`".repeat(longest + 1);
  return longest ? `${fence} ${s} ${fence}` : `${fence}${s}${fence}`;
};

// The plan's sections: a heading, then a line for each thing in it.
const sections = (plan: Plan) => [
  ...plan.logins.map(({ char, login, takes }) => ({
    heading: `**Log in to ${char}**`,
    lines: [
      `• Account: ${code(login.account)}`,
      `• Password: ${code(login.password)}`,
      ...takes.map(
        (t) => `• ${quantity(t.count)}${shown(t.name)} in ${prettyLoc(t.loc)}`
      ),
    ],
  })),
  ...(plan.auctions.length
    ? [
        {
          heading: "**DKP auction, no login**",
          lines: plan.auctions.map(counted),
        },
      ]
    : []),
  ...(plan.multiquests.length
    ? [
        {
          heading: "**Multiquest, no login**",
          lines: plan.multiquests.map(counted),
        },
      ]
    : []),
  ...(plan.backups.length
    ? [
        {
          heading: "**Backups, if a spot is empty**",
          lines: plan.backups.map(
            (s) =>
              `• ${shown(s.name)}: ${prettyLoc(s.loc)} on ${s.char}, account ${code(s.login.account)}, password ${code(s.login.password)}`
          ),
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
