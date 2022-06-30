import dotenv from "dotenv";

dotenv.config();

interface Config {
  /**
   * The Discord bot's token.
   */
  token: string;
  /**
   * The Discord server's ID.
   */
  guildId: string;
  /**
   * The Discord bot's OAuth2 client ID.
   */
  clientId: string;
  /**
   * The Discord server's jeweler role ID.
   */
  jewelerRoleId: string;
  /**
   * The Discord server's banker role ID.
   */
  bankerRoleId: string;
  /**
   * The Discord server's raider role ID.
   */
  raiderRoleId: string;
  /**
   * The Discord server's member permissions role ID.
   */
  garrisonRoleId: string;
  /**
   * The Discord server's visitor permissions role ID.
   */
  visitorRoleId: string;
  /**
   * The Discord server's green channel access role ID.
   */
  greenRoleId: string;
  /**
   * The Discord server's blue channel access role ID.
   */
  blueRoleId: string;
  /**
   * The Discord server's Ancient Blood ally role ID.
   */
  ancientBloodRoleId: string;
  /**
   * The Discord server's Freya's Chariot ally role ID.
   */
  freyasChariotRoleId: string;
  /**
   * The Discord server's Black Lotus ally role ID.
   */
  blackLotusRoleId: string;
  /**
   * The Discord server's Calvary ally role ID.
   */
  calvaryRoleId: string;
  /**
   * The Discord server's DKP auction channel ID.
   */
  auctionChannelId: string;
  /**
   * The Discord server's bank requests channel ID.
   */
  bankRequestsChannelId: string;
  /**
   * The Discord server's jewelry channel ID.
   */
  jewelryChannelId: string;
  /**
   * The Discord server's roles channel ID.
   */
  rolesChannelId: string;
  /**
   * The Discord server's raider enlistment channel ID.
   */
  raiderEnlistmentChannelId: string;
  /**
   * The Discord server's gatehouse channel ID.
   */
  gatehouseChannelId: string;
  /**
   * The Discord server's invite channel ID.
   */
  inviteListChannelId: string;
  /**
   * The Discord server's DKP records channel ID.
   */
  dkpRecordsChannelId: string;
  /**
   * This is appended to all commands. It is used when multiple developers are running bots
   * in the same Discord server so their development bots do not override each other.
   *
   * For local development, this is typically set to "-USER_NAME"
   */
  commandSuffix?: string;
  /**
   * The PostgreSQL DB connection URL.
   *
   * https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
   *
   * For local development, this is typically set to "postgresql://admin:password@localhost:5432/castle"
   */
  DATABASE_URL: string;
  /**
   * The deployment environment.
   *
   * For local development, this is typically set to "local".
   */
  ENVIRONMENT: "local" | "uat" | "production";
}

export const {
  token,
  guildId,
  clientId,
  jewelerRoleId,
  bankerRoleId,
  raiderRoleId,
  garrisonRoleId,
  visitorRoleId,
  greenRoleId,
  blueRoleId,
  ancientBloodRoleId,
  freyasChariotRoleId,
  blackLotusRoleId,
  calvaryRoleId,
  auctionChannelId,
  bankRequestsChannelId,
  jewelryChannelId,
  rolesChannelId,
  raiderEnlistmentChannelId,
  gatehouseChannelId,
  inviteListChannelId,
  dkpRecordsChannelId,
  commandSuffix,
  DATABASE_URL: databaseUrl,
  ENVIRONMENT: environment,
} = process.env as unknown as Config;
