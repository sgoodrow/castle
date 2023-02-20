import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import {
  AutocompleteInteraction,
  ButtonInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { clientId, guildId, token } from "../config";
import { auctionCommand } from "../features/auctions/command";
import { bankHourCommand } from "../features/bank-hours/command";
import { bankCleanupButtonCommand } from "../features/bank-request-info/bank-cleanup-button-command";
import { bankingButtonCommand } from "../features/bank-request-info/banking-button-command";
import {
  addAltInviteButtonCommand,
  addPlayerInviteButtonCommand,
} from "../features/invite-list/add-player-button-command";
import { cleanupInvitesCommand } from "../features/invite-list/cleanup-invites-command";
import { invitedCommand } from "../features/invite-list/command";
import { pingInviteListButtonCommand } from "../features/invite-list/ping-invite-list-button-command";
import { removePlayerInviteButtonCommand } from "../features/invite-list/remove-player-button-command";
import {
  requestBankerApplicationButtonCommand,
  requestGuardApplicationButtonCommand,
  requestKnightApplicationButtonCommand,
  requestOfficerApplicationButtonCommand,
} from "../features/applications/request-application-button-commands";
import { craftingButtonCommand } from "../features/jewelry-request-info/crafting-button-command";
import { jewelryCleanupButtonCommand } from "../features/jewelry-request-info/jewelry-cleanup-button-command";
import { joinReinforcementsButtonCommand } from "../features/raider-enlistment/join-reinforcements-button-command";
import { leaveReinforcementsButtonCommand } from "../features/raider-enlistment/leave-reinforcements-button-command";
import { threadUtilCommand } from "../features/threads/command";

const slashCommands = [
  bankHourCommand,
  auctionCommand,
  invitedCommand,
  threadUtilCommand,
];

const buttonCommands = [
  bankingButtonCommand,
  bankCleanupButtonCommand,
  jewelryCleanupButtonCommand,
  craftingButtonCommand,
  cleanupInvitesCommand,
  requestOfficerApplicationButtonCommand,
  requestGuardApplicationButtonCommand,
  requestKnightApplicationButtonCommand,
  requestBankerApplicationButtonCommand,
  pingInviteListButtonCommand,
  addPlayerInviteButtonCommand,
  joinReinforcementsButtonCommand,
  leaveReinforcementsButtonCommand,
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
