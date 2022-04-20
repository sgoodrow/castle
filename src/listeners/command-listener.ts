import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { AutocompleteInteraction, CacheType, Interaction } from "discord.js";
import { auctionCommand } from "../features/spell-auctions/command";
import { clientId, guildId, token } from "../config";
import { bankHourCommand } from "../features/bank-hours/command";

const commands = [auctionCommand, bankHourCommand];

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

  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  commands
    .find((c) => c.name === commandName)
    ?.listen(interaction)
    .then((success) =>
      console.log(`Received /${commandName}: ${success ? "success" : "failed"}`)
    )
    .catch(console.error);
};

const getCommand = (interaction: AutocompleteInteraction<CacheType>) =>
  commands.find((c) => c.name === interaction.commandName);
