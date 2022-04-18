import dotenv from "dotenv";

dotenv.config();

export const { token, guildId, clientId, auctionChannelId, bankerRoleId } =
  process.env as unknown as {
    token: string;
    guildId: string;
    clientId: string;
    auctionChannelId: string;
    bankerRoleId: string;
  };
