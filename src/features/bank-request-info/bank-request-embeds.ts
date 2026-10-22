import { Colors, EmbedBuilder } from "discord.js";
import { bankWebUrl } from "../../config";
import {
  BankSection,
  bounties,
  inventory,
  raidingServices,
} from "./bank-services";
import { MAX_AGE_DAYS } from "./expire-old-requests";
import { Icon } from "./types";

// The channel's cards: what members sell, what the site sells, raiding services, then how to ask.
export const bankRequestEmbeds = (channel: string) => [
  new EmbedBuilder({
    title: `${Icon.Bought} __${bounties.title}__`,
    url: bounties.spreadsheet,
    description: list(bounties),
    footer: { text: `${Icon.Request} ${bounties.request}` },
  }),
  new EmbedBuilder({
    title: `${Icon.Sold} ${
      bankWebUrl ? "__Castle Bank Inventory__" : "Castle Bank Inventory"
    }`,
    url: bankWebUrl || undefined,
    description:
      "Shop the Castle Bank's inventory. Prices and rules are described below.",
    fields: [
      ...inventory.map((section) => ({
        name: section.title,
        value: list(section),
      })),
      // Discord doesn't link field names, so the spreadsheets get a field of their own.
      {
        name: "Spreadsheets Reference",
        value: inventory
          .map(({ title, spreadsheet }) => `• [${title}](${spreadsheet})`)
          .join("\n"),
      },
    ],
  }),
  new EmbedBuilder({
    title: `${Icon.Raiding} Castle Raiding Services`,
    fields: raidingServices.map((service, i) => {
      // A blank line sets the request apart from the bullets.
      const value = `${list(service)}\n\n${Icon.Request} ${service.request}`;
      const last = i === raidingServices.length - 1;
      return { name: service.title, value: last ? value : spaced(value) };
    }),
  }),
  new EmbedBuilder({
    title: "Bank Requests Instructions",
    color: Colors.Green,
    description: [
      "Always be courteous and patient with your bankers.",
      "",
      ...(bankWebUrl
        ? [
            `• Request Castle Bank Inventory items from the [bank site](${bankWebUrl}).`,
          ]
        : []),
      "• For bounties and raiding services, post the request shown on its card.",
      "• Prefer a command? `/bank request` works too.",
      `• Requests remain open until fulfilled, for up to ${MAX_AGE_DAYS} days.`,
      "• Reach out to an officer if you want to help bank.",
      `• Bankers will only process requests made in ${channel} (not PMs).`,
    ].join("\n"),
  }),
];

const list = ({ bullets }: BankSection) =>
  bullets.map((b) => `• ${b}`).join("\n");

// Ends a raiding service with a blank line, to space its request from the next service. Discord
// trims a trailing newline, so a zero-width space holds it.
const spaced = (value: string) => `${value}\n\u200b`;
