import { auctionChannelId } from "../../config";
import { Icon, Service } from "./types";

// What the bank site sells, one section each on the Castle Bank card. Members request these from
// the site, so they have no typed request format.
export interface CastleBankSection {
  title: string;
  bullets: string[];
}

export const castleBankSections: CastleBankSection[] = [
  {
    title: "Miscellaneous",
    bullets: [
      "Tradeskilling INT Gear check in/out (free _Thurgadin_)",
      "Leatherfoot Raiders Skullcap (450p+Dragoon Dirk _Rivervale Bank_)",
      "Burnished Wooden Stave (100p _North Freeport Bank_)",
      "Jade Reaver (1000p _North Freeport Bank_, must have VSR stone)",
      "Mind Melt (500p _Thurgadin_)",
      "Iceball (free _Thurgadin_)",
      "Seahorse Scales (free _Thurgadin_)",
      "Arctic Mussles (free _Thurgadin_)",
    ],
  },
  {
    title: "Dropped Spells",
    bullets: [
      "_North Freeport Bank_",
      "For all bank spells, you **must be able to scribe the spell**",
      "**51-54** spells cost 50p, as well as: Tiger's Insects, Infusion, Conjure Corpse, Wake of Tranquility",
      "**55-60** spells cost lesser of 200p/EC price or 1DKP each (buyer's choice)",
      `**Forbidden** spells, when requested, will initiate a DKP auction in <#${auctionChannelId}>.`,
    ],
  },
  {
    title: "Plane of Sky",
    bullets: [
      "_East Freeport Docks_",
      "**Droppables and non-DKP no-drops for quests** cost 250p each, must have already won the other required DKP items.",
      `**Efreeti items**, when requested, will initiate a DKP auction in <#${auctionChannelId}>.`,
      `**No-drops for quests that do not require Efreeti items**, when requested, will initiate a DKP auction in <#${auctionChannelId}>.`,
      "**Rare drops** (2 or fewer in stock): use the [Sky Requests form](https://forms.gle/1574wewRuJcp7PwP6).",
    ],
  },
  {
    title: "Research Spells & Components",
    bullets: ["_North Freeport Bank_ (free)"],
  },
];

// What members sell to the bank; first in the channel.
export const bounties: Service = {
  title: "Bounties Spreadsheet",
  icon: Icon.Bought,
  requestFormats: ["Bounty: Item name, Item count"],
  inventoryUrl:
    "https://docs.google.com/spreadsheets/d/1IRXO4cRQXMAeMtFgZ-TGgADFi0A9z8-9uHvxJLPT3TQ/edit#gid=0",
  bullets: [
    "The guild bank will purchase these items",
    "Some are purhcased with platinum, and others with DKP",
    "Some have player limits",
  ],
};

// todo: store this in database, populate and remove with command
export const services: Service[] = [
  {
    title: "Raiding: Reagents",
    icon: Icon.Jewelry,
    requestFormats: ["Raid Reagents: Item name, Item count"],
    bullets: [
      "_West Commons, Wizard Spire_ or _ToV, Entrance_",
      "The following reagents are free **for raid purposes only**.",
      "Peridots (Clerics, Enchanters, Wizards with giant-bane nuke)",
      "Hate Stones (Wizards)",
      "Pearls (Mages)",
      "Small Portal Fragments (Wizards)",
    ],
  },
  {
    title: "Raiding: Recharge Instructions",
    icon: Icon.Sold,
    requestFormats: ["Recharge: Item name"],
    inventoryUrl: "https://tinyurl.com/castle-charge",
    bullets: [
      "_West Commons Lake, South Inn_",
      "Leatherfoot Raiders Skullcap (180p)",
      "Ring of Shadows (36p)",
      "Thin Bones Wand (5p)",
      "Wort Potions (750p, scheduled events only)",
      "Various Items, see spreadsheet",
    ],
  },
  {
    title: "Raiding: PP4DKP",
    icon: Icon.Sold,
    requestFormats: ["PP4DKP #K Platinum"],
    bullets: [
      "_NFP Bank or EC Tunnel_",
      "PP4DKP (Platinum Pieces for Dragon Kill Points) Fundraising",
      "PP4DKP runs on a monthly cycle with DKP recorded the following month",
      "1k = 1 DKP; 30 maximum",
      "No fractional DKP or rounding; Only PP, no items",
    ],
  },
  {
    title: "OT Hammer Event Scheduling",
    icon: Icon.Sold,
    requestFormats: [
      "OT Hammer Event",
      "OT Hammer Event: Date, Time (include timezone)",
    ],
    bullets: [
      "_The Overthere, Outpost_ Look for monthly threads for date/time",
      "Bring 1 Jade and either 1750pp (members and allies) or 2500p (non-allies)",
      "Payment may be delivered at _North Freeport Bank_ or _Hammer Hill_",
      "Charisma gear, Tash and Malo will be provided",
      "Requires more people to facilitate, so this is a request to schedule event",
      "Some exceptions may be made. DM Treasurer for info.",
    ],
  },
];
