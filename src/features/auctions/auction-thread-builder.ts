import { ThreadAutoArchiveDuration } from "discord-api-types/v9";
import moment from "moment";
import { Embed } from "@discordjs/builders";
import { ThreadBuilder } from "../../shared/thread/thread-builder";
import { Item } from "../../shared/items";
import { Option } from "./auction-subcommand";
import { replaceAll } from "../../shared/string-util";
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
      content: `Initial auction duration ends ${this.endDifference} on ${this.endDate}.`,
      embeds: [this.getEmbed()],
    };
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
      return `This item is on ${user}`;
    }
    return "This item is in the guild bank";
  }

  private getEmbed() {
    return new Embed({
      title: `__${this.item.name}__ (view on P99 Wiki)`,
      url: this.item.url,
      description: `${this.location}.

✍️ **Bid Format:**
• The number of DKP and one of your raiding character names.
• Reply to the bidder you are raising so they receive a notification.
• Example: \`3 Potatus\`

📜 **Rules:**
• The auction ends when nobody has bid for 12 consecutive hours and the auction has been open for at least 24.${this.raidRules}${this.requireScribeRule}`,
    });
  }

  private get threadName() {
    const base = `${this.item.name}`;
    return this.raid ? `${this.raid} - ${base}` : base;
  }

  private get raidRules() {
    return this.restrictToRaid
      ? `\n• Bid only if you were present for the ${this.raid} raid.`
      : `\n• This auction has no raid attendance requirements.`;
  }

  private get requireScribeRule() {
    return this.requireScribe
      ? `\n• Bid only if you can scribe the spell.`
      : "";
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

  protected get name() {
    return String(this.getOption(Option.Name)?.value);
  }

  protected get requireScribe() {
    return !!this.getOption(Option.RequireScribe)?.value;
  }
}
