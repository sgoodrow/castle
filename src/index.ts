import { ChannelType, Client, Events, FetchMemberOptions, GatewayIntentBits, Guild, Partials } from "discord.js";
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
import { PrismaClient } from "@prisma/client";
import { log } from "./shared/logger";
import { openDkpService } from "./services/openDkpService";
import { accounts } from "./services/accounts";
import { MINUTES } from "./shared/time";

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

let cachedGuild: Guild | null = null;

export const getGuild = async (): Promise<Guild> => {
  if (cachedGuild) return cachedGuild;
  const guilds = await client.guilds.fetch();
  const guild = await guilds.get(guildId)?.fetch();
  if (!guild) throw new Error("Could not fetch guild");
  cachedGuild = guild;
  return guild;
};

export const getMembers = async () => {
  const guild = await getGuild();
  if (guild.members.cache.size < guild.memberCount) {
    await guild.members.fetch();
  }
  return [...guild.members.cache.values()];
};

export const getMember = async (userId: string, withPresences = false) => {
  const guild = await getGuild();
  
  const cached = guild.members.cache.get(userId);
  if (cached && (!withPresences || cached.presence !== null)) {
    return cached;
  }

  return guild.members.fetch({ user: userId, withPresences });
};

export const getRoles = async () => {
  const guild = await getGuild();
  return await guild.roles.fetch();
};

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

client.login(token);
client.on("interactionCreate", interactionCreateListener);
client.on("messageReactionAdd", messageReactionAddListener);
client.on("messageCreate", messageCreateListener);
client.on("guildMemberAdd", guildMemberAddListener);
client.on("guildMemberRemove", guildMemberLeaveListener);
client.on("guildMemberUpdate", guildMemberUpdateListener);
client.on("guildScheduledEventCreate", guildScheduledEventListener);
client.on("guildScheduledEventDelete", guildScheduledEventListener);
client.on("guildScheduledEventUpdate", guildScheduledEventListener);
client.on("guildScheduledEventUpdate", guildScheduledEventStartedListener);
client.on(Events.ClientReady, readyListener);

registerSlashCommands();

redisListener.pSubscribe(redisChannels.raidReportChange(), updateRaidReport);

export const prismaClient = new PrismaClient();
prismaClient.$connect();

openDkpService.authenticate();
setInterval(() => {
  log("Reauthenticating with OpenDKP (token refresh)");
  openDkpService.authenticate();
}, 1500000);

log("Listening...");
