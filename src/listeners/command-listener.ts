import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { CacheType, Interaction } from "discord.js";
import { auctionCommand } from "../features/spell-auctions/command";
import { clientId, guildId, token } from "../config";

const commands = [auctionCommand];

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
  const match = commands.find((c) => c.name);

  if (interaction.isAutocomplete()) {
    match?.autocomplete(interaction).catch(console.error);
    return;
  }

  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (!match) {
    console.error(`${commandName} has no command listener!`);
    return;
  }

  match
    .listen(interaction)
    .then((success) =>
      console.log(`Received /${commandName}: ${success ? "success" : "failed"}`)
    )
    .catch(console.error);
};
