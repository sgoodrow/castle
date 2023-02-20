export const {
  DATABASE_URL,
  token,
  clientId,
  commandSuffix,
  guildId,
  jewelerRoleId,
  bankerRoleId,
  raiderRoleId,
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
} = process.env as {
  /**
   * [Optional] PostgreSQL DB connection URL. Defaults to local development DB.
   */
  DATABASE_URL?: string;

  /**
   * Discord bot OAuth2 token.
   */
  token: string;
  /**
   * Discord bot OAuth2 client ID.
   */
  clientId: string;

  /**
   * [Optional] Custom suffix for all Discord commands. Useful for running multiple instances of the bot in the same server simultaneously.
   */
  commandSuffix?: string;

  /**
   * Discord server ID.
   */
  guildId: string;

  // Volunteer role IDs
  jewelerRoleId: string;
  bankerRoleId: string;

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
};
