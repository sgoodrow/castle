import { Icon, Service } from "./types";

// todo: store this in database, populate and remove with command
export const services: Service[] = [
  {
    title: "Bounties (bank buys)",
    icon: Icon.Bought,
    requestFormats: ["Bounty: Item name, Item count"],
    bulletContent: ["Alligator Skin (200p)", "Blue Diamond (950p)"],
  },
  {
    title: "Misc Items",
    icon: Icon.Sold,
    requestFormats: ["Misc item: Item name"],
    inventoryUrl: "https://tinyurl.com/castle-misc-items",
    bulletContent: [
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
    bulletContent: [
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
    bulletContent: [
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
    bulletContent: ["At North Freeport Bank (free)"],
  },
  {
    title: "Resistance Jewelry",
    icon: Icon.Sold,
    requestFormats: ["Jewelry: Item name, Item quantity"],
    bulletContent: [
      "Request in #💎han's-jewelry-store (read pins)",
      "At North Freeport Bank",
    ],
  },
];
