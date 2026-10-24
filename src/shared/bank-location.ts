// Where in a character's inventory a slot is, as a banker reads it: "pack 2, slot 5", "bank 3".
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
