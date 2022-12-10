import { Client, Intents } from "discord.js";
import { interactionCreateListener } from "./listeners/interaction-create-listener";
import { guildId, token } from "./config";
import { readyListener } from "./listeners/ready-listener";
import { messageReactionAddListener } from "./listeners/message-reaction-add-listener";
import { registerSlashCommands } from "./listeners/register-commands";
import { guildMemberAddListener } from "./features/gatehouse/guild-member-add-listener";
import { guildMemberLeaveListener } from "./features/removed/guild-member-leave-listener";

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
client.on("guildMemberRemove", guildMemberLeaveListener);

registerSlashCommands();
