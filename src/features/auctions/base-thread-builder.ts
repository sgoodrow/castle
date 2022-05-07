import { ThreadAutoArchiveDuration } from "discord-api-types/v9";
import { range } from "lodash";
import moment from "moment";
import { Embed } from "@discordjs/builders";
import { ThreadBuilder } from "../../shared/thread/thread-builder";
import { Item } from "../../shared/items";
import { BaseSubcommandOption } from "./base-subcommand";

export abstract class BaseThreadBuilder extends ThreadBuilder {
  public get options() {
    return {
      name: this.threadName,
      reason: this.reason,
      autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
    };
  }

  public get message() {
    return {
      content: `Ends ${this.endDifference} on ${this.endDate}.`,
      embeds: [this.getEmbed()],
    };
  }

  protected getReason() {
    return `Guild bank has ${this.count} ${this.item.name}`;
  }

  protected abstract getItem(): Item;

  protected getThreadName() {
    return `${this.item.name} (${this.count})`;
  }

  protected getExtraDescription() {
    return "";
  }

  protected getExtraRules() {
    return "";
  }

  private get reason() {
    return this.getReason();
  }

  protected getLocation(): string {
    return this.count > 1
      ? "These items are in the guild bank"
      : "This item is in the guild bank";
  }

  private get location() {
    return this.getLocation();
  }

  private get item() {
    return this.getItem();
  }

  private getEmbed() {
    return new Embed({
      title: this.item.name,
      url: this.item.url,
      description: `${this.extraDescription}${this.location}.

${this.itemList}

**Rules:**${this.multiCountRules}${this.extraRules}
• Bids in the last 12 hours extend the auction by 12 hours.
• Reply to the bidder you are raising.`,
    });
  }

  private get threadName() {
    return this.getThreadName();
  }

  private get extraDescription() {
    return this.getExtraDescription();
  }

  private get extraRules() {
    return this.getExtraRules();
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
    return moment().add("2", "days").unix();
  }

  protected get count() {
    return Number(this.getOption(BaseSubcommandOption.Count)?.value) || 1;
  }

  protected get name() {
    return this.getOption(BaseSubcommandOption.Name)?.value;
  }
}
