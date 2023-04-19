import dotenv from "dotenv";

dotenv.config();

export const {
  DATABASE_URL,
  SSL,
  UPSTASH_REDIS_URL,
  token,
  clientId,
  castleDkpTokenRO,
  castleDkpAuctionRaidId,
  castleDkpBonusesCharId,
  commandSuffix,
  guildId,
  guardRoleId,
  dkpDeputyRoleId,
  officerRoleId,
  jewelerRoleId,
  bankerRoleId,
  raiderRoleId,
  inactiveRaiderRoleId,
  knightRoleId,
  reinforcementsRoleId,
  castleRoleId,
  membersAndAlliesRoleId,
  competitorRoleId,
  ancientBloodRoleId,
  freyasChariotRoleId,
  blackLotusRoleId,
  akatsukiRoleId,
  raidScheduleChannelId,
  auctionChannelId,
  bankRequestsChannelId,
  jewelryChannelId,
  rolesChannelId,
  raiderEnlistmentChannelId,
  gatehouseChannelId,
  removedChannelId,
  inviteListChannelId,
  dkpRecordsChannelId,
  dkpBonusesChannelId,
  applicationsChannelId,
  officerVotesChannelId,
  requestDumpThreadId,
  startedRaidsDumpThreadId,
  raiderEnlistedThreadId,
  bankInventoryChannelId,
  bankTransactionsChannelId,
  bankOfficeChannelId,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
} = process.env as {
  /**
   * [Optional] PostgreSQL DB connection URL. Defaults to gitpod development DB.
   */
  DATABASE_URL?: string;
  /**
   * [Optional] Whether or not the server supports SSL connections. If unset, SSL is used. The development server sets it automatically.
   */
  SSL?: "false";

  /**
   * [Optional] Redis connection URL. Defaults to gitpod development instance.
   */
  UPSTASH_REDIS_URL?: string;

  /**
   * Discord bot OAuth2 token.
   */
  token: string;
  /**
   * Discord bot OAuth2 client ID.
   */
  clientId: string;

  /**
   * CastleDKP.com admin read-only access token.
   */
  castleDkpTokenRO?: string;

  /**
   * CastleDKP.com Raid ID for DKP auctions.
   */
  castleDkpAuctionRaidId?: string;

  /**
   * CastleDKP.com DKP Bonuses character ID.
   */
  castleDkpBonusesCharId?: string;

  /**
   * [Optional] Custom suffix for all Discord commands. Useful for running multiple instances of the bot in the same server simultaneously.
   */
  commandSuffix?: string;

  /**
   * Discord server ID.
   */
  guildId: string;

  // Volunteer role IDs
  guardRoleId: string;
  dkpDeputyRoleId: string;
  officerRoleId: string;
  jewelerRoleId: string;
  bankerRoleId: string;
  knightRoleId: string;

  // Raider role IDs
  raiderRoleId: string;
  inactiveRaiderRoleId: string;
  reinforcementsRoleId: string;

  // Guild role IDs
  membersAndAlliesRoleId: string;
  castleRoleId: string;
  competitorRoleId: string;
  ancientBloodRoleId: string;
  freyasChariotRoleId: string;
  blackLotusRoleId: string;
  akatsukiRoleId: string;

  // Channel IDs
  raidScheduleChannelId: string;
  auctionChannelId: string;
  bankRequestsChannelId: string;
  jewelryChannelId: string;
  rolesChannelId: string;
  raiderEnlistmentChannelId: string;
  gatehouseChannelId: string;
  removedChannelId: string;
  inviteListChannelId: string;
  dkpRecordsChannelId: string;
  dkpBonusesChannelId: string;
  applicationsChannelId: string;
  officerVotesChannelId: string;
  requestDumpThreadId: string;
  startedRaidsDumpThreadId: string;
  raiderEnlistedThreadId: string;
  bankInventoryChannelId: string;
  bankTransactionsChannelId: string;
  bankOfficeChannelId: string;

  // Google Auth
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
};
