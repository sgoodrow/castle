// The fewest bank characters a banker logs in to so every line of a request is filled. The bank page
// and the banker's plan DM both route a request this way, so they always agree.

// A line as the route sees it: how many the request asks for, and how many each character holds.
// A line no character holds (a DKP auction, or an item the bank is out of) has an empty `held`.
export interface RouteLine {
  qty: number;
  held: ReadonlyMap<string, number>;
}
// A line on the route: the characters a banker takes it from, in route order, and the stop it's
// picked up at (the first of them). A line no character on the route holds has none, and comes
// after the last stop.
export type Routed<L extends RouteLine> = L & { from: string[]; stop: number };
export interface Route<L extends RouteLine> {
  logins: string[];
  lines: Routed<L>[];
}

// Past this many tries the search keeps the best route it has found, so a huge request can't hang.
const BUDGET = 20_000;

// The fewest characters, in name order, and the lines in the order a banker fills them. A line can
// need more than one character when no single one holds enough of it. A line the bank can't fill
// is routed for what the bank has.
export function loginRoute<L extends RouteLine>(input: L[]): Route<L> {
  const lines = input.map((l) => {
    const total = [...l.held.values()].reduce((a, b) => a + b, 0);
    return { l, need: Math.min(l.qty, total) };
  });
  const filled = (route: Set<string>, { l, need }: (typeof lines)[number]) =>
    [...route].reduce((sum, c) => sum + (l.held.get(c) ?? 0), 0) >= need;
  // Characters that help fill the most unfilled lines come first, then by name, so the first
  // route found is a good one and the same request always gets the same route.
  const candidates = (route: Set<string>, banned: Set<string>) => {
    const open = lines.filter((x) => !filled(route, x));
    if (!open.length) return null;
    const scarcest = open.reduce((a, b) =>
      b.l.held.size < a.l.held.size ? b : a
    );
    const helps = (c: string) => open.filter((x) => x.l.held.has(c)).length;
    return [...scarcest.l.held.keys()]
      .filter((c) => !route.has(c) && !banned.has(c))
      .sort((a, b) => helps(b) - helps(a) || a.localeCompare(b));
  };

  // Greedy first, so the search has a route to beat.
  const greedy = new Set<string>();
  // The scarcest open line always has a character not on the route yet, or it would be filled.
  for (
    let next = candidates(greedy, new Set());
    next?.[0];
    next = candidates(greedy, new Set())
  )
    greedy.add(next[0]);
  let best = greedy;
  let tries = 0;
  // Each set is tried once: a branch leaves out the characters its earlier siblings already tried.
  const search = (route: Set<string>, banned: Set<string>) => {
    if (++tries > BUDGET || route.size >= best.size) return;
    const next = candidates(route, banned);
    if (!next) {
      best = route;
      return;
    }
    next.forEach((c, i) =>
      search(new Set([...route, c]), new Set([...banned, ...next.slice(0, i)]))
    );
  };
  search(new Set(), new Set());

  const logins = [...best].sort((a, b) => a.localeCompare(b));
  // Each line takes from the route's characters in order until it has enough.
  const planned = lines.map(({ l, need }) => {
    const from: string[] = [];
    let stop = logins.length;
    let got = 0;
    logins.forEach((c, i) => {
      const count = l.held.get(c);
      if (got >= need || count === undefined) return;
      if (!from.length) stop = i;
      from.push(c);
      got += count;
    });
    return { ...l, from, stop };
  });
  // By stop, and a line that spans more characters after those that don't, so it's the last thing
  // taken from a character before moving on to the next.
  planned.sort((a, b) => a.stop - b.stop || a.from.length - b.from.length);
  return { logins, lines: planned };
}
