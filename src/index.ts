import { Client, GatewayIntentBits, Partials } from "discord.js";
import { interactionCreateListener } from "./listeners/interaction-create-listener";
import { guildId, token } from "./config";
import { readyListener } from "./listeners/ready-listener";
import { messageReactionAddListener } from "./listeners/message-reaction-add-listener";
import { registerSlashCommands } from "./listeners/register-commands";
import { guildMemberAddListener } from "./features/gatehouse/guild-member-add-listener";
import { guildMemberLeaveListener } from "./features/removed/guild-member-leave-listener";
import { messageCreateListener } from "./listeners/message-create-listener";
import https from "https";
import {
  guildScheduledEventListener,
  guildScheduledEventStartedListener,
} from "./listeners/guild-scheduled-event-listener";
import { redisChannels, redisListener } from "./redis/client";
import { updateRaidReport } from "./features/dkp-records/update/update-raid-report";
import { guildMemberUpdateListener } from "./listeners/guild-member-update-listener";

// Global
https.globalAgent.maxSockets = 5;

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildScheduledEvents,
  ],
  partials: [Partials.Message, Partials.Reaction],
});

export const getGuild = async () => {
  const guilds = await client.guilds.fetch();
  const guild = await guilds.get(guildId)?.fetch();
  if (!guild) {
    throw new Error("Could not collect guild members");
  }
  return guild;
};

export const getMembers = async () => {
  const guild = await getGuild();
  return await guild.members.fetch();
};

export const getRoles = async () => {
  const guild = await getGuild();
  return await guild.roles.fetch();
};

client.login(token);
client.on("interactionCreate", interactionCreateListener);
client.on("messageReactionAdd", messageReactionAddListener);
client.on("messageCreate", messageCreateListener);
client.on("ready", readyListener);
client.on("guildMemberAdd", guildMemberAddListener);
client.on("guildMemberRemove", guildMemberLeaveListener);
client.on("guildMemberUpdate", guildMemberUpdateListener);
client.on("guildScheduledEventCreate", guildScheduledEventListener);
client.on("guildScheduledEventDelete", guildScheduledEventListener);
client.on("guildScheduledEventUpdate", guildScheduledEventListener);
client.on("guildScheduledEventUpdate", guildScheduledEventStartedListener);

registerSlashCommands();

redisListener.pSubscribe(redisChannels.raidReportChange(), updateRaidReport);

console.log("Listening...");
