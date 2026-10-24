// What the bank holds and where, as the bank page and the bot's banker DM both read it, so they agree on
// what a request can fetch and where to find it.

// The item database's entry, as far as who may hold an item goes.
export interface HoldingRules {
  nodrop?: boolean;
  cls?: number;
  bagslots?: number;
  sky?: unknown;
}

// The bankers' own bags, which hold the stock and aren't for sale. A Plane of Sky bag is stock.
export const isBag = (it: HoldingRules) => it.cls === 1 || !!it.bagslots;

// A Plane of Sky mule, which holds the Sky items and their bags.
export const isSkyMule = (char: string) => /sky/i.test(char);

// A character's name, as the bank shows it.
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// A slot's location, as a banker reads it.
export function prettyLoc(loc: string) {
  let m;
  if ((m = loc.match(/^General(\d+)-Slot(\d+)$/)))
    return `pack ${m[1]}, slot ${m[2]}`;
  if ((m = loc.match(/^General(\d+)$/))) return `inventory ${m[1]}`;
  if ((m = loc.match(/^Bank(\d+)-Slot(\d+)$/)))
    return `bank bag ${m[1]}, slot ${m[2]}`;
  if ((m = loc.match(/^Bank(\d+)$/))) return `bank ${m[1]}`;
  return loc.toLowerCase(); // a worn slot: "primary", "ear"
}
