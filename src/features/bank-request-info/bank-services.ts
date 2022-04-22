import { jewelryChannelId } from "../../config";
import { Icon, Service } from "./types";

// todo: store this in database, populate and remove with command
export const services: Service[] = [
  {
    title: "Bounties (bank buys)",
    icon: Icon.Bought,
    requestFormats: ["Bounty: Item name, Item count"],
    bullets: [
      "At North Freeport Bank",
      "Alligator Skin (200p)",
      "Blue Diamond (950p)",
      "Thin Boned Wand (100p)",
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
      "Leatherfoot Raiders Skullcap (500p Rivervale Bank)",
      "Mind Melt (500p Thurgadin Bank)",
      "Puppet Strings Charge (1750p The Overthere)",
    ],
  },
  {
    title: "Plane of Sky",
    icon: Icon.Sold,
    requestFormats: ["Sky item: Name (Mule name, Quantity available)"],
    inventoryUrl: "https://tinyurl.com/castle-sky-items",
    bullets: [
      "At East Freeport Docks (250p)",
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
      "At North Freeport Bank",
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
    bullets: ["At North Freeport Bank (free)"],
  },
  {
    title: "Resistance Jewelry",
    icon: Icon.Sold,
    requestFormats: ["Jewelry: Item name, Item quantity"],
    bullets: [
      "At North Freeport Bank",
      `Request in <#${jewelryChannelId}> (read pins)`,
    ],
  },
];
