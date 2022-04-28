import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import {
  AutocompleteInteraction,
  ButtonInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { clientId, guildId, token } from "../config";
import { setBankHourCommand } from "../features/bank-hours/add-command";
import { removeBankHour } from "../features/bank-hours/remove-command";
import { bankingButtonCommand } from "../features/bank-request-info/bankingButtonCommand";
import { friendConfigButtonCommand } from "../features/invite-list/friend-config-button";
import { interviewCommand } from "../features/invite-list/interview-command";
import { interviewedCommand } from "../features/invite-list/interviewed-command";
import {
  altCommand,
  inviteCommand,
} from "../features/invite-list/invite-command";
import { invitedCommand } from "../features/invite-list/invited-command";
import { removeCommand } from "../features/invite-list/remove-command";
import { whoButtonCommand } from "../features/invite-list/who-button-command";
import { itemAuctionCommand } from "../features/item-auctions/command";
import { spellAuctionCommand } from "../features/spell-auctions/command";

const slashCommands = [
  spellAuctionCommand,
  itemAuctionCommand,
  setBankHourCommand,
  removeBankHour,
  interviewCommand,
  inviteCommand,
  altCommand,
  removeCommand,
  interviewedCommand,
  invitedCommand,
];

const buttonCommands = [
  whoButtonCommand,
  friendConfigButtonCommand,
  bankingButtonCommand,
];

export const getCommand = (
  interaction:
    | CommandInteraction<CacheType>
    | AutocompleteInteraction<CacheType>
) => {
  const command = slashCommands.find((c) => c.name === interaction.commandName);
  if (!command) {
    throw new Error(
      `Could not find slash command **/${interaction.commandName}**`
    );
  }
  return command;
};

export const getButton = (interaction: ButtonInteraction<CacheType>) => {
  const command = buttonCommands.find(
    (c) => c.customId === interaction.customId
  );
  if (!command) {
    throw new Error(
      `Could not find button command **${interaction.customId}**`
    );
  }
  return command;
};

export const registerSlashCommands = () => {
  const rest = new REST({ version: "9" }).setToken(token);
  rest
    .put(Routes.applicationGuildCommands(clientId, guildId), {
      body: slashCommands.map((c) => c.builder.toJSON()),
    })
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);
};
