import { MessageEmbed } from "discord.js";
import moment from "moment";

enum Icon {
  Bought = "📜",
  Request = "✍️",
  Sold = "🏦",
}

interface Service {
  title: string;
  icon: string;
  requestFormats: string[];
  inventoryUrl?: string;
  bulletContent: string[];
}

const maybeUrl = (text: string, url?: string) =>
  url ? `[${text}](${url})` : text;

const formatService = ({
  title,
  icon,
  requestFormats,
  inventoryUrl,
  bulletContent,
}: Service) => `
${icon} **${maybeUrl(title, inventoryUrl)}**
${requestFormats.map((r) => `${Icon.Request} \`${r}\``).join("\n")}
${bulletContent.map((bulletContent) => `• ${bulletContent}`).join("\n")}`;

const services: Service[] = [
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

const formatBankerHour = ({ banker, date }: BankerHour) => {
  return `• <t:${date}:R> <@${banker}> (<t:${date}:F>)`;
};

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

declare type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

const nextDay = (day: Day) => {
  const dayINeed = days.indexOf(day) + 1;

  // const dayINeed = 4; // for Thursday
  const today = moment().isoWeekday();

  // if we haven't yet passed the day of the week that I need:
  if (today <= dayINeed) {
    // then just give me this week's instance of that day
    return moment().isoWeekday(dayINeed);
  } else {
    // otherwise, give me *next week's* instance of that same day
    return moment().add(1, "weeks").isoWeekday(dayINeed);
  }
};

const getNextBankerHour = (day: Day, hour: number, pm = false) =>
  nextDay(day)
    .hour(hour + (pm ? 0 : 12))
    .minute(0)
    .second(0)
    .unix();

interface BankerHour {
  banker: BankerId;
  date: number;
}

enum BankerId {
  Kindarien = "403050155965939713", // todo
  BecauseICan = "403050155965939713", // todo
  Scruggs = "403050155965939713",
  Woodsmark = "403050155965939713", // todo
}

const bankerHours: BankerHour[] = [
  {
    banker: BankerId.Kindarien,
    date: getNextBankerHour("Monday", 11),
  },
  {
    banker: BankerId.BecauseICan,
    date: getNextBankerHour("Wednesday", 7, true),
  },
  {
    banker: BankerId.Scruggs,
    date: getNextBankerHour("Thursday", 4, true),
  },
  {
    banker: BankerId.Woodsmark,
    date: getNextBankerHour("Friday", 10),
  },
];

export const BankRequestInstructionsEmbed = new MessageEmbed()
  .setTitle("Guild Bank Instructions")
  .setDescription(
    `
• Be available when making requests and state for how long, or use daily banking hours
• Use the proper ${Icon.Request} request format

${services.map(formatService).join("\n")}

🕐 **Daily Banking Hour** (in your timezone)
${bankerHours
  .sort((a, b) => (a.date > b.date ? 1 : -1))
  .map(formatBankerHour)
  .join("\n")}
  
⚠️ **TL;DR** Make requests when you're available. Follow the instructions. Bankers will only process requests made in #🏦bank-requests (not PMs). Requests are deleted after processing or if old or invalid."`
  );
