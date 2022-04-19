import { MessageEmbed } from "discord.js";
import moment from "moment";
import { services } from "./bank-services";
import { bankerHours } from "./banker-hours";
import { Day, Icon, Service } from "./types";

const maybeUrl = (text: string, url?: string) =>
  url ? `[${text}](${url})` : text;

const nextDay = (day: Day) => {
  const dayIndex =
    [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].indexOf(day) + 1;
  return moment().isoWeekday() <= dayIndex
    ? moment().isoWeekday(dayIndex)
    : moment().add(1, "weeks").isoWeekday(dayIndex);
};

const getNextBankerHour = (day: Day, hour: number, pm = false) =>
  nextDay(day)
    .hour(hour + (pm ? 0 : 12))
    .minute(0)
    .second(0)
    .unix();

export const BankRequestInstructionsEmbed = new MessageEmbed()
  .setTitle("Guild Bank Instructions")
  .setDescription(
    `
• Be available when making requests and state for how long, or use daily banking hours
• Use the proper ${Icon.Request} request format

${services
  .map(
    ({ title, icon, requestFormats, inventoryUrl, bulletContent }: Service) => `
${icon} **${maybeUrl(title, inventoryUrl)}**
${requestFormats.map((r) => `${Icon.Request} \`${r}\``).join("\n")}
${bulletContent.map((bulletContent) => `• ${bulletContent}`).join("\n")}`
  )
  .join("\n")}

🕐 **Daily Banking Hour** (in your timezone)
${bankerHours
  .map(({ banker, day, hour, pm }) => ({
    banker,
    date: getNextBankerHour(day, hour, pm),
  }))
  .sort((a, b) => (a.date > b.date ? 1 : -1))
  .map(({ banker, date }) => `• <t:${date}:R> <@${banker}> (<t:${date}:F>)`)
  .join("\n")}
  
⚠️ **TL;DR** Make requests when you're available. Follow the instructions. Bankers will only process requests made in #🏦bank-requests (not PMs). Requests are deleted after processing or if old or invalid."`
  );
