import { jewelryChannelId } from "../../config";
import { Icon, Service } from "./types";

// todo: store this in database, populate and remove with command
export const services: Service[] = [
  {
    title: "Bounties (bank buys)",
    icon: Icon.Bought,
    requestFormats: ["Bounty: Item name, Item count"],
    bullets: [
      "__North Freeport Bank__",
      "Alligator Skin (200p)",
      "Blue Diamond (950p)",
      "Thin Boned Wand (100p)",
      "Burnished Wooden Stave (100p)",
      "NOT Diamonds",
      "NOT Black Sapphires",
    ],
  },
  {
    title: "Misc Items",
    icon: Icon.Sold,
    requestFormats: ["Misc item: Item name"],
    inventoryUrl: "https://tinyurl.com/castle-misc-items",
    bullets: [
      "Leatherfoot Raiders Skullcap (500p __Rivervale Bank__)",
      "Puppet Strings Charge (1750p __The Overthere__)",
    ],
  },
  {
    title: "Coldain Ring #9",
    icon: Icon.Sold,
    requestFormats: ["Coldain ring: Item name"],
    inventoryUrl: "https://wiki.project1999.com/Coldain_Ring_Quests",
    bullets: [
      "__Thurgadin Bank__",
      "Mind Melt (500p)",
      "Iceball (free)",
      "Seahorse Scales (free)",
      "Arctic Mussles (free)",
    ],
  },
  {
    title: "Plane of Sky",
    icon: Icon.Sold,
    requestFormats: ["Sky item: Name (Mule name, Quantity available)"],
    inventoryUrl: "https://tinyurl.com/castle-sky-items",
    bullets: [
      "__East Freeport Docks__ (250p)",
      "You must have won the related DKP items",
    ],
  },
  {
    title: "Dropped Spells",
    icon: Icon.Sold,
    requestFormats: [
      "Dropped spell: Class, Level, Spell name (Mule name, Quantity available)",
    ],
    inventoryUrl: "https://tinyurl.com/castle-spell-spreadsheet",
    bullets: [
      "__North Freeport Bank__",
      "You must be able to scribe the spell",
      "You must check the spreadsheet and post the quantity availabile",
      "**51-54** spells cost 50p, as well as: Tiger's Insects, Infusion, Conjure Corpse, Wake of Tranquility",
      "**55-60** spells cost 200p or 1DKP each (buyer's choice)",
      "**Forbidden** spells (highlighted in gold), when requested, will initiate a DKP auction in #dkp-auctions.",
    ],
  },
  {
    title: "Research Spells & Components",
    icon: Icon.Sold,
    requestFormats: [
      "Research spell: Class, Level, Spell name",
      "Research component: Component name",
    ],
    inventoryUrl: "https://tinyurl.com/castle-research",
    bullets: ["__North Freeport Bank__ (free)"],
  },
  {
    title: "Resistance Jewelry",
    icon: Icon.Sold,
    requestFormats: ["Jewelry: Item name, Item quantity"],
    bullets: [
      "__North Freeport Bank__",
      `Request in <#${jewelryChannelId}> (read pins)`,
    ],
  },
];
