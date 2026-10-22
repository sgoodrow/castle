import { requestedFrom, type Item } from "./data";

export interface Need { it: Item; qty: number }
// A line on the route: the characters a banker takes it from, in route order, and the stop it's
// picked up at (the first of them). Multiquest lines have none and come after the last stop.
export type Planned<N extends Need> = N & { from: string[]; stop: number };
export interface Route<N extends Need> { logins: string[]; lines: Planned<N>[] }

// Past this many tries the search keeps the best route it has found, so a huge request can't hang the page.
const BUDGET = 20_000;

// The fewest bank characters a banker logs in to so every line of a request is filled, in name
// order, and the lines in the order a banker fills them. Lines held only for multiquesting aren't
// counted: bankers don't log in to those holders. A line can need more than one character when no
// single one holds enough of it.
export function loginRoute<N extends Need>(needs: N[]): Route<N> {
  const lines = needs.map(n => {
    const from = requestedFrom(n.it);
    const held = new Map<string, number>();
    if (!from.mq) for (const h of from.holders) held.set(h.char, (held.get(h.char) ?? 0) + h.count);
    const total = [...held.values()].reduce((a, b) => a + b, 0);
    return { n, held, need: Math.min(n.qty, total) };
  });
  const filled = (route: Set<string>, l: (typeof lines)[number]) =>
    [...route].reduce((sum, c) => sum + (l.held.get(c) ?? 0), 0) >= l.need;
  // Characters that help fill the most unfilled lines come first, then by name, so the first
  // route found is a good one and the same request always gets the same route.
  const candidates = (route: Set<string>, banned: Set<string>) => {
    const open = lines.filter(l => !filled(route, l));
    if (!open.length) return null;
    const scarcest = open.reduce((a, b) => (b.held.size < a.held.size ? b : a));
    const helps = (c: string) => open.filter(l => l.held.has(c)).length;
    return [...scarcest.held.keys()].filter(c => !route.has(c) && !banned.has(c)).sort((a, b) => helps(b) - helps(a) || a.localeCompare(b));
  };

  // Greedy first, so the search has a route to beat.
  const greedy = new Set<string>();
  // The scarcest open line always has a character not on the route yet, or it would be filled.
  for (let next = candidates(greedy, new Set()); next?.[0]; next = candidates(greedy, new Set())) greedy.add(next[0]);
  let best = greedy;
  let tries = 0;
  // Each set is tried once: a branch leaves out the characters its earlier siblings already tried.
  const search = (route: Set<string>, banned: Set<string>) => {
    if (++tries > BUDGET || route.size >= best.size) return;
    const next = candidates(route, banned);
    if (!next) { best = route; return; }
    next.forEach((c, i) => search(new Set([...route, c]), new Set([...banned, ...next.slice(0, i)])));
  };
  search(new Set(), new Set());

  const logins = [...best].sort((a, b) => a.localeCompare(b));
  // Each line takes from the route's characters in order until it has enough.
  const planned = lines.map(({ n, held, need }) => {
    const from: string[] = [];
    let stop = logins.length;
    let got = 0;
    logins.forEach((c, i) => {
      const count = held.get(c);
      if (got >= need || count === undefined) return;
      if (!from.length) stop = i;
      from.push(c);
      got += count;
    });
    return { ...n, from, stop };
  });
  // By stop, and a line that spans more characters after those that don't, so it's the last thing
  // taken from a character before moving on to the next.
  planned.sort((a, b) => a.stop - b.stop || a.from.length - b.from.length);
  return { logins, lines: planned };
}
