import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
  Interaction,
} from "discord.js";
import { auctionCommand } from "../features/spell-auctions/command";
import { clientId, guildId, token } from "../config";
import { setBankHourCommand } from "../features/bank-hours/add-command";
import { removeBankHour } from "../features/bank-hours/remove-command";

const commands = [auctionCommand, setBankHourCommand, removeBankHour];

export const registerCommands = () => {
  const rest = new REST({ version: "9" }).setToken(token);
  rest
    .put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands.map((c) => c.builder.toJSON()),
    })
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);
};

export const commandListener = async (interaction: Interaction<CacheType>) => {
  if (interaction.isAutocomplete()) {
    getCommand(interaction)?.autocomplete(interaction).catch(console.error);
    return;
  }

  if (interaction.isCommand()) {
    let success = false;
    try {
      await getCommand(interaction)?.execute(interaction);
      success = true;
    } catch (error) {
      await interaction.reply({
        content: String(error),
        ephemeral: true,
      });
    }
    console.log(
      `Received /${interaction.commandName}: ${success ? "success" : "failed"}`
    );
  }
};

const getCommand = (
  interaction:
    | CommandInteraction<CacheType>
    | AutocompleteInteraction<CacheType>
) => commands.find((c) => c.name === interaction.commandName);
