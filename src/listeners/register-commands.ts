import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import {
  AutocompleteInteraction,
  ButtonInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { clientId, guildId, token } from "src/shared/config";
import { auctionCommand } from "src/features/auctions/command";
import { bankHourCommand } from "src/features/bank-hours/command";
import { bankCleanupButtonCommand } from "src/features/bank-request-info/bank-cleanup-button-command";
import { bankingButtonCommand } from "src/features/bank-request-info/banking-button-command";
import {
  addAltInviteButtonCommand,
  addPlayerInviteButtonCommand,
} from "src/features/invite-list/add-player-button-command";
import { cleanupInvitesCommand } from "src/features/invite-list/cleanup-invites-command";
import { invitedCommand } from "src/features/invite-list/command";
import { pingInviteListButtonCommand } from "src/features/invite-list/ping-invite-list-button-command";
import { removePlayerInviteButtonCommand } from "src/features/invite-list/remove-player-button-command";
import { requestGuardApplicationButtonCommand } from "src/features/invite-list/request-guard-application-button-command";

const slashCommands = [bankHourCommand, auctionCommand, invitedCommand];

const buttonCommands = [
  bankingButtonCommand,
  bankCleanupButtonCommand,
  cleanupInvitesCommand,
  requestGuardApplicationButtonCommand,
  pingInviteListButtonCommand,
  addPlayerInviteButtonCommand,
  addAltInviteButtonCommand,
  removePlayerInviteButtonCommand,
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
      body: slashCommands.map((c) => c.command.toJSON()),
    })
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);
};
