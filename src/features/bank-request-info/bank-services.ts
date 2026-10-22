// A category on one of the bank's cards, shown as a field. Bullets that are sentences end with a
// period; fragments don't. Prices are in "p".
export interface BankSection {
  title: string;
  bullets: string[];
}

// A category the bank site sells. Its spreadsheet stays linked for the rare cases the site doesn't
// cover.
export interface InventorySection extends BankSection {
  spreadsheet: string;
}

// Something members ask for in a post of their own; `request` tells them what to write.
export interface BankService extends BankSection {
  request: string;
}

// What the bank site sells, one field each on the Castle Bank Inventory card. Members request
// these from the site.
export const inventory: InventorySection[] = [
  {
    title: "Miscellaneous",
    spreadsheet: "https://tinyurl.com/castle-misc-list",
    bullets: [
      "Tradeskilling INT Gear check in/out (free in Thurgadin)",
      "Leatherfoot Raiders Skullcap (450p+Dragoon Dirk in Rivervale Bank)",
      "Burnished Wooden Stave (100p in North Freeport Bank)",
      "Jade Reaver (1,000p+VSR stone in North Freeport Bank)",
      "Mind Melt (500p in Thurgadin)",
      "Iceball (free in Thurgadin)",
      "Seahorse Scales (free in Thurgadin)",
      "Arctic Mussels (free in Thurgadin)",
    ],
  },
  {
    title: "Dropped Spells",
    spreadsheet: "https://tinyurl.com/castle-spell-spreadsheet",
    bullets: [
      "North Freeport Bank",
      "You must be able to scribe the spell.",
      "51-54 spells (50p)",
      "55-60 spells (200p/EC price or 1 DKP)",
      "Forbidden spells (DKP auction)",
    ],
  },
  {
    title: "Plane of Sky",
    spreadsheet: "https://tinyurl.com/castle-sky-bank",
    bullets: [
      "East Freeport Docks",
      "You must have already won the other required DKP items.",
      "Droppables and non-DKP no-drops for quests (250p)",
      "Efreeti items (DKP auction)",
      "No-drops for quests that do not require Efreeti items (DKP auction)",
      "For rare drops (2 or fewer in stock), use the [Sky Requests form](https://forms.gle/1574wewRuJcp7PwP6).",
    ],
  },
  {
    title: "Research Spell Components",
    spreadsheet: "https://tinyurl.com/castle-research",
    bullets: ["North Freeport Bank", "Free"],
  },
];

// What members sell to the bank; first in the channel.
export const bounties: BankService & { spreadsheet: string } = {
  title: "Castle Bounties",
  spreadsheet:
    "https://docs.google.com/spreadsheets/d/1IRXO4cRQXMAeMtFgZ-TGgADFi0A9z8-9uHvxJLPT3TQ/edit#gid=0",
  request:
    'To sell an item to the bank, say "I\'d like to sell <count> <item>".',
  bullets: [
    "The guild bank will purchase these items.",
    "Some are purchased with platinum, and others with DKP.",
    "Some have player limits.",
  ],
};

// One field each on the Castle Raiding Services card.
// todo: store this in database, populate and remove with command
export const raidingServices: BankService[] = [
  {
    title: "Reagents",
    request:
      'To request reagents, say "I\'d like <count> <reagent> for raiding".',
    bullets: [
      "West Commons, Wizard Spire or ToV entrance",
      "The reagents are free for raid purposes only.",
      "Peridots (Clerics, Enchanters, Wizards with giant-bane nuke)",
      "Hate Stones (Wizards)",
      "Pearls (Mages)",
      "Small Portal Fragments (Wizards)",
    ],
  },
  {
    title: "Recharge",
    request: 'To request an item recharge, say "I\'d like to recharge <item>".',
    bullets: [
      "West Commons Lake, South Inn",
      "Leatherfoot Raiders Skullcap (180p)",
      "Ring of Shadows (36p)",
      "Thin Bones Wand (5p)",
      "Wort Potions (750p, scheduled events only)",
      "Various others on [recharge spreadsheet](https://tinyurl.com/castle-charge)",
    ],
  },
  {
    title: "PP4DKP",
    request: 'To donate, say "I\'d like to give <#>k platinum for PP4DKP".',
    bullets: [
      "North Freeport Bank or EC Tunnel",
      "Runs on a monthly cycle with DKP recorded the following month.",
      "1,000p per DKP up to 30 DKP",
      "No fractional DKP",
      "Platinum only, no trades",
    ],
  },
  {
    title: "OT Hammer Event Scheduling",
    request:
      'To schedule an event, say "I\'d like an OT Hammer event", with a date and time (include timezone) if you have one in mind.',
    bullets: [
      "The Overthere Outpost",
      "Look for monthly threads for date and time.",
      "Bring 1 Jade and either 1,750p (members and allies) or 2,500p (non-allies).",
      "Payment may be delivered at North Freeport Bank or Hammer Hill.",
      "Charisma gear, Tash and Malo will be provided.",
      "Requires more people to facilitate, so this is a request to schedule an event.",
      "Some exceptions may be made. DM Treasurer for info.",
    ],
  },
];
