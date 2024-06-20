import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Partials,
  VoiceState,
} from "discord.js";
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
import "reflect-metadata";

// Global
https.globalAgent.maxSockets = 5;

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildVoiceStates,
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

export const getChannel = async (channelId: string) => {
  const guild = await getGuild();
  const channel = await guild.channels.fetch(channelId);
  if (!channel) {
    throw new Error(`Channel ${channelId} does not exist`);
  }
  return channel;
};

export const getTextChannel = async (channelId: string) => {
  const channel = await getChannel(channelId);
  if (channel.type !== ChannelType.GuildText) {
    throw new Error(`Channel ${channelId} is not a text channel`);
  }
  return channel;
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
client.on("voiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
  console.log(
    `Voice state changed: ${oldState.toJSON()} to ${newState.toJSON()}`
  );
});

registerSlashCommands();

redisListener.pSubscribe(redisChannels.raidReportChange(), updateRaidReport);

console.log("Listening...");
