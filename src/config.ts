export const {
  DATABASE_URL,
  USER,
  token,
  clientId,
  castleDkpTokenRO,
  castleDkpAuctionRaidId,
  commandSuffix,
  guildId,
  dkpDeputyRoleId,
  officerRoleId,
  jewelerRoleId,
  bankerRoleId,
  raiderRoleId,
  knightRoleId,
  reinforcementsRoleId,
  castleRoleId,
  membersAndAlliesRoleId,
  competitorRoleId,
  ancientBloodRoleId,
  freyasChariotRoleId,
  blackLotusRoleId,
  akatsukiRoleId,
  auctionChannelId,
  bankRequestsChannelId,
  jewelryChannelId,
  rolesChannelId,
  raiderEnlistmentChannelId,
  gatehouseChannelId,
  removedChannelId,
  inviteListChannelId,
  dkpRecordsChannelId,
  applicationsChannelId,
  requestDumpThreadId,
} = process.env as {
  /**
   * [Optional] PostgreSQL DB connection URL. Defaults to gitpod development DB.
   */
  DATABASE_URL?: string;
  /**
   * [Optional] The deployment environment user.
   */
  USER?: string;

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
   * [Optional] Custom suffix for all Discord commands. Useful for running multiple instances of the bot in the same server simultaneously.
   */
  commandSuffix?: string;

  /**
   * Discord server ID.
   */
  guildId: string;

  // Volunteer role IDs
  dkpDeputyRoleId: string;
  officerRoleId: string;
  jewelerRoleId: string;
  bankerRoleId: string;
  knightRoleId: string;

  // Raider role IDs
  raiderRoleId: string;
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
  auctionChannelId: string;
  bankRequestsChannelId: string;
  jewelryChannelId: string;
  rolesChannelId: string;
  raiderEnlistmentChannelId: string;
  gatehouseChannelId: string;
  removedChannelId: string;
  inviteListChannelId: string;
  dkpRecordsChannelId: string;
  applicationsChannelId: string;
  requestDumpThreadId: string;
};
