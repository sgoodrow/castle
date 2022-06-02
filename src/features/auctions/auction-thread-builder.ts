import { ThreadAutoArchiveDuration } from "discord-api-types/v9";
import { range } from "lodash";
import moment from "moment";
import { Embed } from "@discordjs/builders";
import { ThreadBuilder } from "@shared/thread/thread-builder";
import { Item } from "@shared/items";
import { Option } from "./auction-subcommand";
import { replaceAll } from "@shared/string-util";
import { dkpRecordsChannelId } from "@shared/config";
import { CacheType, CommandInteraction } from "discord.js";

export class AuctionThreadBuilder extends ThreadBuilder {
  public constructor(
    subcommandName: string,
    interaction: CommandInteraction<CacheType>,
    private readonly item: Item
  ) {
    super(subcommandName, interaction);
  }

  public get options() {
    return {
      name: this.threadName,
      autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
    };
  }

  public get message() {
    return {
      content: `Ends ${this.endDifference} on ${this.endDate}.`,
      embeds: [this.getEmbed()],
    };
  }

  protected getThreadName() {
    let base = `${this.item.name}`;
    if (this.count > 1) {
      base += ` (${this.count})`;
    }
    return this.raid ? `${this.raid} - ${base}` : base;
  }

  protected get restrictToRaid() {
    return !!this.raid;
  }

  private get raid() {
    const raid = this.getOption(Option.Raid)?.value as string;
    if (!raid) {
      return;
    }
    return replaceAll(raid, "/", "-");
  }

  private get location() {
    const user = this.getOption(Option.HeldBy)?.value as string;
    if (user) {
      return this.count > 1
        ? `These items are on ${user}`
        : `This item is on ${user}`;
    }
    return this.count > 1
      ? "These items are in the guild bank"
      : "This item is in the guild bank";
  }

  private getEmbed() {
    return new Embed({
      title: `__${this.item.name}__ (view on P99 Wiki)`,
      url: this.item.url,
      description: `${this.location}.

${this.itemList}

**Rules:**${this.multiCountRules}${this.raidRules}
• Bids in the last 12 hours extend the auction by 12 hours.
• If you win the auction, record your DKP purchase in <#${dkpRecordsChannelId}> and announce in this thread when you have done so.
• **Reply to the bidder you are raising so they receive a notification**.`,
    });
  }

  private get threadName() {
    return this.getThreadName();
  }

  private get raidRules() {
    return this.restrictToRaid
      ? `\n• Bid only if you were present for the ${this.raid} raid.`
      : `\n• This auction has no raid attendance requirements.`;
  }

  private get multiCountRules() {
    return this.count > 1
      ? `
• Include the item number (e.g. #1).`
      : "";
  }

  private get itemList() {
    return `**Available:**\n${range(this.count)
      .map((i: number) => `• ${this.item.name} #${i + 1}`)
      .join("\n")}`;
  }

  private get endDate() {
    return `<t:${this.endTime}:F>`;
  }

  private get endDifference() {
    return `<t:${this.endTime}:R>`;
  }

  private get endTime() {
    return moment().add("1", "days").unix();
  }

  protected get count() {
    return Number(this.getOption(Option.Count)?.value) || 1;
  }

  protected get name() {
    return String(this.getOption(Option.Name)?.value);
  }
}
