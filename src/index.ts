import { Client, Intents } from "discord.js";
import { commandListener, registerCommands } from "./commands";
import { token } from "./config";
import { readyListener } from "./ready";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.login(token);
client.on("interactionCreate", commandListener);
client.on("ready", readyListener);

registerCommands();
