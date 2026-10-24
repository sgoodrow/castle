import { requestedFrom, type Item } from "./data";
import { loginRoute as route } from "../../../src/shared/login-route";

// A DKP auction line isn't fetched from the bank, so its holders aren't logins either.
export interface Need { it: Item; qty: number; auction: boolean }
// A line on the route: the characters a banker takes it from, in route order, and the stop it's
// picked up at (the first of them). Multiquest lines have none and come after the last stop.
export type Planned<N extends Need> = N & { from: string[]; stop: number };
export interface Route<N extends Need> { logins: string[]; lines: Planned<N>[] }

// The fewest bank characters a banker logs in to so every line of a request is filled, in name
// order, and the lines in the order a banker fills them. Lines held only for multiquesting aren't
// counted: bankers don't log in to those holders.
export function loginRoute<N extends Need>(needs: N[]): Route<N> {
  const { logins, lines } = route(needs.map(n => {
    // Jewelry the bank holds is found in its tabs, never on a multiquest holder.
    const from = n.it.jewelry ? { mq: false, holders: n.it.holders.filter(h => !h.mq) } : requestedFrom(n.it);
    const held = new Map<string, number>();
    if (!from.mq && !n.auction) for (const h of from.holders) held.set(h.char, (held.get(h.char) ?? 0) + h.count);
    return { n, qty: n.qty, held };
  }));
  return { logins, lines: lines.map(({ n, from, stop }) => ({ ...n, from, stop })) };
}
