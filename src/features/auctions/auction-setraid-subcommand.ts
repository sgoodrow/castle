import {
  CacheType,
  ChannelType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { openDkpService } from "../../services/openDkpService";
import { redisClient } from "../../redis/client";
import { auctionChannelId, bankerRoleId, dkpDeputyRoleId, officerRoleId } from "../../config";
import { truncate } from "lodash";

export enum Option {
  Raid = "raid",
}

export class AuctionSetRaidSubcommand extends Subcommand {
  constructor() {
    super("setraid", "Set the OpenDKP raid for this auction thread.");
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.PublicThread && channel.type !== ChannelType.PrivateThread) {
      await interaction.editReply("This command can only be used in an auction thread.");
      return;
    }

    if (channel.parentId !== auctionChannelId) {
      await interaction.editReply("This command can only be used in an auction thread.");
      return;
    }

    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (
      !roles?.cache.has(dkpDeputyRoleId) &&
      !roles?.cache.has(officerRoleId) &&
      !roles?.cache.has(bankerRoleId)
    ) {
      await interaction.editReply("You must be a banker, officer, or DKP deputy to use this command.");
      return;
    }

    const raidIdStr = this.getRequiredOptionValue<string>(Option.Raid, interaction);
    const raidId = Number.parseInt(raidIdStr, 10);
    if (Number.isNaN(raidId)) {
      await interaction.editReply("Invalid raid ID.");
      return;
    }

    const raid = await openDkpService.getRaid(raidId);

    await redisClient.set(`auction:raid:${channel.id}`, raidIdStr);

    await interaction.editReply(`Raid ${truncate(raid.Name, {length: 100})} (${raidId}) has been set for this auction.`);
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Raid)
        .setDescription("The OpenDKP raid to associate with this auction")
        .setAutocomplete(true)
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete(option: string) {
    if (option !== Option.Raid) {
      return;
    }

    try {
      const raids = await openDkpService.getRaids();
      return raids
        .filter((r) => r.RaidId !== undefined)
        .map((r) => ({
          name: truncate(r.Name, { length: 100 }),
          value: String(r.RaidId),
        }));
    } catch {
      return [];
    }
  }
}

export const auctionSetRaidSubcommand = new AuctionSetRaidSubcommand();
