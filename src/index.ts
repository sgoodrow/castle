import { Client, Intents } from "discord.js";
import {
  interactionListener,
  registerCommands,
} from "./listeners/interaction-listener";
import { token } from "./config";
import { readyListener } from "./listeners/ready-listener";
import { messageReactionAddListener } from "./listeners/message-reaction-add-listener";

export const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  partials: ["MESSAGE", "REACTION"],
});

client.login(token);
client.on("interactionCreate", interactionListener);
client.on("messageReactionAdd", messageReactionAddListener);
client.on("ready", readyListener);

registerCommands();
