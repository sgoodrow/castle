import { auctionChannelId } from "../../config";
import { Icon, Service } from "./types";

// todo: store this in database, populate and remove with command
export const services: Service[] = [
  {
    title: "Bounties",
    icon: Icon.Bought,
    requestFormats: ["Bounty: Item name, Item count"],
    bullets: [
      "Alligator Skin (200p _Rivervale Bank_)",
      "Blue Diamond (Price on Jewelry Spreadsheet, _North Freeport Bank_)",
      "Diamond (Price on Jewelry Spreadsheet, _North Freeport Bank_)",
      "Iceball (10p _Thurgadin Bank_)",
      "Polar Bear Skin (10p _Rivervale Bank_)",
      "Scepter of the Forlorn (2 DKP, limit 2 per month)",
      "Singed Scrolls (50% of winning DKP bid)",
      "Staff of Elemental Mastery (50% of winning DKP bid)",
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
      "_The Overthere, Outpost_ (Thursday <t:1670518800:t>)",
      "Bring 1 Jade and either 1750pp (members and allies) or 2500p (non-allies)",
      "Payment may be delivered at _North Freeport Bank_ or _Hammer Hill_",
      "Charisma gear, Tash and Malo will be provided",
      "Requires more people to facilitate, so this is a request to schedule event",
    ],
  },
  {
    title: "Recharge Instructions",
    icon: Icon.Sold,
    requestFormats: ["Recharge: Item name"],
    inventoryUrl: "https://tinyurl.com/castle-charge",
    bullets: [
      "_West Commons Lake, South Inn_",
      "Leatherfoot Raiders Skullcap (180p)",
      "Ring of Shadows (36p)",
      "Wort Potions (750p, scheduled events only)",
      "Various Items, see spreadsheet",
    ],
  },
  {
    title: "Misc Item Spreadsheet",
    icon: Icon.Sold,
    requestFormats: ["Misc item: Item name (Mule name)"],
    inventoryUrl: "https://tinyurl.com/castle-misc-list",
    bullets: [
      "Leatherfoot Raiders Skullcap (450p+Dragoon Dirk OR 500p _Rivervale Bank_)",
      "Puppet Strings Charge (1750p _The Overthere_)",
      "Black Sapphire (500p _North Freeport Bank_)",
      "Burnished Wooden Stave (400p _North Freeport Bank_)",
      "Jade Reaver (1000p _North Freeport Bank_, must have VSR stone)",
      "Various Items, see spreadsheet (80% market rate, bags not for sale)",
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
    title: "Plane of Sky Spreadsheet",
    icon: Icon.Sold,
    requestFormats: ["Sky: Item name (Mule name, Quantity available)"],
    inventoryUrl: "https://tinyurl.com/castle-sky-bank",
    bullets: [
      "_East Freeport Docks_",
      "**Droppables and non-DKP no-drops for quests** cost 250p each, must have already won the other required DKP items.",
      `**Efreeti items**, when requested, will initiate a DKP auction in <#${auctionChannelId}>.`,
      `**No-drops for quests that do not require Efreeti items**, when requested, will initiate a DKP auction in <#${auctionChannelId}>.`,
    ],
  },
  {
    title: "Dropped Spell Spreadsheet",
    icon: Icon.Sold,
    requestFormats: [
      "Dropped spell: Class, Level, Spell name (Mule name, Quantity available)",
    ],
    inventoryUrl: "https://tinyurl.com/castle-spell-spreadsheet",
    bullets: [
      "_North Freeport Bank_",
      "For all bank spells, you **must be able to scribe the spell**",
      "You must check the spreadsheet and post the quantity availabile",
      "**51-54** spells cost 50p, as well as: Tiger's Insects, Infusion, Conjure Corpse, Wake of Tranquility",
      "**55-60** spells cost lesser of 200p/EC price or 1DKP each (buyer's choice)",
      `**Forbidden** spells (highlighted in gold), when requested, will initiate a DKP auction in <#${auctionChannelId}>.`,
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
    title: "Raid Reagents",
    icon: Icon.Jewelry,
    requestFormats: ["Raid Reagents: Item name, Item count"],
    bullets: [
      "_West Commons, Wizard Spire_",
      "The following reagents are free **for raid purposes only**.",
      "Peridots (Clerics, Enchanters, Wizards with giant-bane nuke)",
      "Hate Stones (Wizards)",
      "Pearls (Mages)",
      "Small Portal Fragments (Wizards)",
    ],
  },
];
