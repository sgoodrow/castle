import dotenv from "dotenv";

dotenv.config();

export const {
  token,
  guildId,
  clientId,
  auctionChannelId,
  bankerRoleId,
  bankRequestsChannelId,
  commandSuffix,
  DATABASE_URL: databaseUrl,
  ENVIRONMENT: environment,
} = process.env as unknown as {
  token: string;
  guildId: string;
  clientId: string;
  auctionChannelId: string;
  bankerRoleId: string;
  bankRequestsChannelId: string;
  commandSuffix: string;
  DATABASE_URL: string;
  ENVIRONMENT: string;
};
