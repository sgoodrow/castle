import { auctionChannelId, jewelryChannelId } from "../../config";
import { Icon, Service } from "./types";

// todo: store this in database, populate and remove with command
export const services: Service[] = [
  {
    title: "Bounties",
    icon: Icon.Bought,
    requestFormats: ["Bounty: Item name, Item count"],
    bullets: [
      "_North Freeport Bank_",
      "Alligator Skin (200p)",
      "Blue Diamond (950p)",
      "Thin Boned Wand (100p)",
      "Burnished Wooden Stave (100p)",
      "~~Diamonds~~",
      "~~Black Sapphires~~",
    ],
  },
  {
    title: "Misc Item Spreadsheeet",
    icon: Icon.Sold,
    requestFormats: ["Misc item: Item name"],
    inventoryUrl: "https://tinyurl.com/castle-misc-items",
    bullets: [
      "Leatherfoot Raiders Skullcap (500p _Rivervale Bank_)",
      "Puppet Strings Charge (1750p _The Overthere_)",
      "Various Items, see spreadsheet (80% market rate)",
    ],
  },
  {
    title: "Coldain Ring #9",
    icon: Icon.Sold,
    requestFormats: ["Coldain ring: Item name"],
    inventoryUrl: "https://wiki.project1999.com/Coldain_Ring_Quests",
    bullets: [
      "_Thurgadin Bank_",
      "Mind Melt (500p)",
      "Iceball (free)",
      "Seahorse Scales (free)",
      "Arctic Mussles (free)",
    ],
  },
  {
    title: "Plane of Sky Spreadsheeet",
    icon: Icon.Sold,
    requestFormats: ["Sky item: Name (Mule name, Quantity available)"],
    inventoryUrl: "https://tinyurl.com/castle-sky-items",
    bullets: [
      "_East Freeport Docks_ (250p)",
      "You must have won the related DKP items",
    ],
  },
  {
    title: "Dropped Spell Spreadsheeet",
    icon: Icon.Sold,
    requestFormats: [
      "Dropped spell: Class, Level, Spell name (Mule name, Quantity available)",
    ],
    inventoryUrl: "https://tinyurl.com/castle-spell-spreadsheet",
    bullets: [
      "_North Freeport Bank_",
      "For all purchased spells, you must be able to scribe the scroll",
      "You must check the spreadsheet and post the quantity availabile",
      "**51-54** spells cost 50p, as well as: Tiger's Insects, Infusion, Conjure Corpse, Wake of Tranquility",
      "**55-60** spells cost 200p or 1DKP each (buyer's choice)",
      `**Forbidden** spells (highlighted in gold), when requested, will initiate a DKP auction in <#${auctionChannelId}>. You do not need to be able to scribe the scroll.`,
    ],
  },
  {
    title: "Research Spells & Components Spreadsheet",
    icon: Icon.Sold,
    requestFormats: [
      "Research spell: Class, Level, Spell name",
      "Research component: Component name",
    ],
    inventoryUrl: "https://tinyurl.com/castle-research",
    bullets: ["_North Freeport Bank_ (free)"],
  },
  {
    title: "Resistance Jewelry",
    icon: Icon.Sold,
    requestFormats: ["Jewelry: Item name, Item quantity"],
    bullets: [
      "_North Freeport Bank_",
      `Request in <#${jewelryChannelId}> (read pins)`,
    ],
  },
];
