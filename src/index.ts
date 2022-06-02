import { Client, Intents } from "discord.js";
import { interactionCreateListener } from "src/listeners/interaction-create-listener";
import { guildId, token } from "./shared/config";
import { readyListener } from "src/listeners/ready-listener";
import { messageReactionAddListener } from "src/listeners/message-reaction-add-listener";
import { registerSlashCommands } from "src/listeners/register-commands";
import { guildMemberAddListener } from "src/listeners/guild-member-add-listener";

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  partials: ["MESSAGE", "REACTION"],
});

export const getMembers = async () => {
  const guilds = await client.guilds.fetch();
  const guild = await guilds.get(guildId)?.fetch();
  const members = await guild?.members.fetch();
  return members;
};

client.login(token);
client.on("rateLimit", (d) => console.log(d));
client.on("interactionCreate", interactionCreateListener);
client.on("messageReactionAdd", messageReactionAddListener);
client.on("ready", readyListener);
client.on("guildMemberAdd", guildMemberAddListener);

registerSlashCommands();
