import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { spellAuctionCommand } from "../features/spell-auctions/command";
import { clientId, guildId, token } from "../config";
import { setBankHourCommand } from "../features/bank-hours/add-command";
import { removeBankHour } from "../features/bank-hours/remove-command";
import { itemAuctionCommand } from "../features/item-auctions/command";
import { interviewCommand } from "../features/invite-list/interview-command";
import { inviteCommand } from "../features/invite-list/invite-command";
import { removeCommand } from "../features/invite-list/remove-command";
import { interviewedCommand } from "../features/invite-list/interviewed-command";
import { invitedCommand } from "../features/invite-list/invited-command";

const commands = [
  spellAuctionCommand,
  itemAuctionCommand,
  setBankHourCommand,
  removeBankHour,
  interviewCommand,
  inviteCommand,
  removeCommand,
  interviewedCommand,
  invitedCommand,
];

export const getCommand = (
  interaction:
    | CommandInteraction<CacheType>
    | AutocompleteInteraction<CacheType>
) => commands.find((c) => c.name === interaction.commandName);

export const registerCommands = () => {
  const rest = new REST({ version: "9" }).setToken(token);
  rest
    .put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands.map((c) => c.builder.toJSON()),
    })
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);
};
