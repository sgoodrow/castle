import { requestedFrom, type Item } from "./data";

export interface Need { it: Item; qty: number }

// Past this many tries the search keeps the best route it has found, so a huge request can't hang the page.
const BUDGET = 20_000;

// The fewest bank characters a banker logs in to so every line of a request is filled, in name
// order. Lines held only for multiquesting aren't counted: bankers don't log in to those holders.
// A line can need more than one character when no single one holds enough of it.
export function loginRoute(needs: Need[]): string[] {
  const lines = needs.flatMap(({ it, qty }) => {
    const from = requestedFrom(it);
    if (from.mq) return [];
    const held = new Map<string, number>();
    for (const h of from.holders) held.set(h.char, (held.get(h.char) ?? 0) + h.count);
    const total = [...held.values()].reduce((a, b) => a + b, 0);
    return [{ held, need: Math.min(qty, total) }];
  });
  const filled = (route: Set<string>, l: (typeof lines)[number]) =>
    [...route].reduce((n, c) => n + (l.held.get(c) ?? 0), 0) >= l.need;
  // Characters that help fill the most unfilled lines come first, then by name, so the first
  // route found is a good one and the same request always gets the same route.
  const candidates = (route: Set<string>) => {
    const open = lines.filter(l => !filled(route, l));
    if (!open.length) return null;
    const scarcest = open.reduce((a, b) => (b.held.size < a.held.size ? b : a));
    const helps = (c: string) => open.filter(l => l.held.has(c)).length;
    return [...scarcest.held.keys()].filter(c => !route.has(c)).sort((a, b) => helps(b) - helps(a) || a.localeCompare(b));
  };

  // Greedy first, so the search has a route to beat.
  const greedy = new Set<string>();
  // The scarcest open line always has a character not on the route yet, or it would be filled.
  for (let next = candidates(greedy); next?.[0]; next = candidates(greedy)) greedy.add(next[0]);
  let best = greedy;
  let tries = 0;
  const search = (route: Set<string>) => {
    if (++tries > BUDGET || route.size >= best.size) return;
    const next = candidates(route);
    if (!next) { best = route; return; }
    for (const c of next) search(new Set([...route, c]));
  };
  search(new Set());
  return [...best].sort((a, b) => a.localeCompare(b));
}
