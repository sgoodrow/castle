import { Client, Intents } from "discord.js";
import { commandListener, registerCommands } from "./commands";
import { token } from "./config";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.login(token);
client.on("interactionCreate", commandListener);

registerCommands();
