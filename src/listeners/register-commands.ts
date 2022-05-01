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
import { bankingButtonCommand } from "../features/bank-request-info/bankingButtonCommand";

const slashCommands = [bankHourCommand, auctionCommand];

const buttonCommands = [bankingButtonCommand];

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
