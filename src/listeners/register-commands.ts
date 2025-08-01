import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import {
  AutocompleteInteraction,
  ButtonInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { clientId, guildId, token } from "../config";
import { applicationCommandButton } from "../features/applications/update-applications";
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
import { craftingButtonCommand } from "../features/jewelry-request-info/crafting-button-command";
import { jewelryCleanupButtonCommand } from "../features/jewelry-request-info/jewelry-cleanup-button-command";
import { joinReinforcementsButtonCommand } from "../features/raider-enlistment/join-reinforcements-button-command";
import { leaveReinforcementsButtonCommand } from "../features/raider-enlistment/leave-reinforcements-button-command";
import { threadUtilCommand } from "../features/threads/command";
import { raidCommand } from "../features/dkp-records/commands/raid-command";
import { bankCommand } from "../features/bank-inventory/commands/command";
import { botCommand } from "../features/raid-bots/command";
import { batphoneCommand } from "../features/bp/bp-command";
import { wakeupCommand } from "../features/wakeup/wakeup-command";
import { requestBotButtonCommand } from "../features/bp/request-bot-button-command";
import { parkBotButtonCommand } from "../features/raid-bots/park-bot-button-command"

const slashCommands = [
  bankHourCommand,
  auctionCommand,
  botCommand,
  invitedCommand,
  threadUtilCommand,
  raidCommand,
  bankCommand,
  batphoneCommand,
  wakeupCommand,
];

const buttonCommands = [
  bankingButtonCommand,
  bankCleanupButtonCommand,
  jewelryCleanupButtonCommand,
  craftingButtonCommand,
  cleanupInvitesCommand,
  pingInviteListButtonCommand,
  addPlayerInviteButtonCommand,
  joinReinforcementsButtonCommand,
  leaveReinforcementsButtonCommand,
  addAltInviteButtonCommand,
  removePlayerInviteButtonCommand,
  applicationCommandButton,
  requestBotButtonCommand,
  parkBotButtonCommand
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
  const command = buttonCommands.find((c) =>
    interaction.customId.includes(c.customId)
  );
  if (!command) {
    throw new Error(
      `Could not find button command **${interaction.customId}**`
    );
  }
  return command;
};

export const registerSlashCommands = () => {
  const rest = new REST({ version: "10" }).setToken(token);

  // assign new commmands
  rest
    .put(Routes.applicationGuildCommands(clientId, guildId), {
      body: slashCommands.map((c) => c.command.toJSON()),
    })
    .catch((err) => {
      console.error(err);
      console.trace();
    });
};
