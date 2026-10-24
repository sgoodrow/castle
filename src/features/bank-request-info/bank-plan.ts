// The plan a banker's DM carries for a bank request: which characters to log in to, in route order, and
// what to take from each. The web post's plan button names the lines, and the bot works the plan out from
// the bank as it is when the button is pressed.
import { prettyLoc } from "../../shared/bank-holders";
import type { Holder } from "../../shared/login-route";
import { loginRoute } from "../../shared/login-route";
import type { PlanLine } from "../../shared/bank-plan-id";

// A line of the plan: the item, and where the bank holds it, NO DROP and bags already left out.
export interface PlanItem extends PlanLine {
  name: string;
  holders: Holder[];
}

// What a banker is told to take from one character for one line.
interface Take {
  login: string;
  item: PlanItem;
  loc: string;
  count: number;
}

// The DM text. A line is fetched from the bank holders the route picked, in the same amounts the route's
// characters can give. A DKP auction line isn't fetched, and an item the bank doesn't hold is named, since
// it's only held for a multiquest (on the post) or isn't in the bank at all.
export function planText(items: PlanItem[]): string {
  const route = loginRoute(
    items.map((item) => ({
      it: { holders: item.holders },
      qty: item.qty,
      auction: item.auction,
      item,
    }))
  );
  // A line takes from its characters in the route's order, until it has what it needs.
  const takes: Take[] = route.lines.flatMap((l) => {
    let left = l.qty;
    return l.from.flatMap((login) =>
      l.it.holders
        .filter((h) => h.char === login && !h.mq)
        .flatMap((h) => {
          const count = Math.min(h.count, left);
          left -= count;
          return count ? [{ login, item: l.item, loc: h.loc, count }] : [];
        })
    );
  });
  const out = ["**Bank request plan**"];
  for (const login of route.logins) {
    out.push(`**Log in to ${login}**`);
    for (const t of takes.filter((t) => t.login === login))
      out.push(
        `• ${t.count > 1 ? `${t.count} × ` : ""}${t.item.name} (${prettyLoc(t.loc)})`
      );
  }
  const auction = items.filter((i) => i.auction).map((i) => i.name);
  if (auction.length)
    out.push(
      `**DKP auction:** ${auction.join(", ")}. Start the auction for each.`
    );
  const short = route.lines.flatMap((l) => {
    const got = takes
      .filter((t) => t.item === l.item)
      .reduce((n, t) => n + t.count, 0);
    return !l.item.auction && got < l.qty
      ? [`${l.item.name} (${got} of ${l.qty})`]
      : [];
  });
  if (short.length)
    out.push(`**Not enough in the bank:** ${short.join(", ")}.`);
  return out.join("\n");
}

// Discord takes 2000 characters a message, so a long plan is sent in parts, split between its lines.
export function splitPlan(text: string, max = 2000): string[] {
  const parts: string[] = [];
  let part = "";
  for (const line of text.split("\n")) {
    const next = part ? `${part}\n${line}` : line;
    if (next.length > max && part) {
      parts.push(part);
      part = line;
    } else {
      part = next;
    }
  }
  return [...parts, part];
}
