// Whether a bank item goes to DKP auction rather than being sold. The bank page prices items by this,
// and the site marks a request's auction lines by it when it posts, so a banker's plan never takes
// the page's word for it.

// What decides it: a banker's price, the research sheet, the spell sheet and the Plane of Sky sheet.
export interface AuctionFacts {
  name: string;
  price?: string; // set by a banker with the bot, e.g. "250p" or "auction"
  research?: true;
  sheet?: { kind: "auction" } | { kind: "pp" };
  sky?: { islands: readonly number[]; note: string };
  jewelry?: unknown;
}

// A banker's price that says so, e.g. "DKP auction".
export const bankerAuction = (price: string) => /auction/i.test(price);

// Sky items the sheet marks "dkp bid", and the Efreeti weapons and shields it doesn't list.
export const skyAuction = (
  sky: NonNullable<AuctionFacts["sky"]>,
  name: string
) => /dkp/i.test(sky.note) || (!sky.islands.length && /^Efreeti /.test(name));

// Jewelry is made to order at the jewelers' price. Otherwise a banker's price wins, then research
// (always free), then the spell sheet, then the Sky rules. A Sky item the bank doesn't hold, only
// its multiquest holders, is asked about, never auctioned.
export function goesToAuction(it: AuctionFacts, inBank: boolean): boolean {
  if (it.jewelry) return false;
  if (it.price) return bankerAuction(it.price);
  if (it.research) return false;
  if (it.sheet) return it.sheet.kind === "auction";
  if (it.sky) return inBank && skyAuction(it.sky, it.name);
  return false;
}
