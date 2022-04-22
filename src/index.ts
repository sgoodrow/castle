import { Client, Intents } from "discord.js";
import {
  commandListener,
  registerCommands,
} from "./listeners/command-listener";
import { token } from "./config";
import { readyListener } from "./listeners/ready-listener";

export const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
});

client.login(token);
client.on("interactionCreate", commandListener);
client.on("ready", readyListener);

registerCommands();
