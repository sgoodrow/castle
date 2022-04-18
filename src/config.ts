import dotenv from "dotenv";

dotenv.config();

export const {
  token,
  guildId,
  clientId,
  auctionChannelId,
  bankerRoleId,
  bankRequestsChannelId,
  DATABASE_URL: databaseUrl,
} = process.env as unknown as {
  token: string;
  guildId: string;
  clientId: string;
  auctionChannelId: string;
  bankerRoleId: string;
  bankRequestsChannelId: string;
  DATABASE_URL: string;
};
