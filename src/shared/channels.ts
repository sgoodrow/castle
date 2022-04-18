import { CacheType, CommandInteraction } from "discord.js";
import { auctionChannelId } from "../config";

export const getAuctionChannel = async (
  interaction: CommandInteraction<CacheType>
) => await interaction.guild?.channels.fetch(auctionChannelId);
