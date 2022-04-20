import { MessageEmbed } from "discord.js";
import { services } from "./bank-services";
import { bankerHours } from "./banker-hours";
import { Icon, Service } from "./types";

const maybeUrl = (text: string, url?: string) =>
  url ? `[${text}](${url})` : text;

export const BankRequestInstructionsEmbeds = [
  new MessageEmbed({
    title: "Instructions",
    description: `Always be courteous and patient with your bankers. If you are willing to help staff the bank, please reach out to an officer.

  • Make bank requests when you are available and state how long you will be available.
  • If you are no longer available, please delete your request and repost it later.
  • Use the ${Icon.Request} request format`,
    color: "RED",
  }),
  new MessageEmbed({
    title: "Services",
    description: `${services
      .map(
        ({ title, icon, requestFormats, inventoryUrl, bullets }: Service) => `
  ${icon} **${maybeUrl(title, inventoryUrl)}**
  ${requestFormats.map((r) => `${Icon.Request} \`${r}\``).join("\n")}
  ${bullets.map((b) => `• ${b}`).join("\n")}`
      )
      .join("\n")}`,
  }),
  new MessageEmbed({
    title: "🕐 Availability",
    description: `Bankers may be available upon request, however they also hold regularly hours. The times are listed in your timezone.

  ${bankerHours
    .map(({ banker, date }) => `• <t:${date}:R> <@${banker}> <t:${date}:F>`)
    .join("\n")}`,
    color: "PURPLE",
  }),
  new MessageEmbed({
    title: "⚠️ TL;DR",
    description:
      "Make requests when you're available. Follow the instructions. Bankers will only process requests made in #🏦bank-requests (not PMs). Requests are deleted after processing or if old or invalid.",
    color: "ORANGE",
  }),
];
