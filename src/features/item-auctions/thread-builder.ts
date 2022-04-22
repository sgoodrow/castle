import { ThreadAutoArchiveDuration } from "discord-api-types/v9";
import { range } from "lodash";
import moment from "moment";
import { Option } from "./command";
import { ThreadBuilder } from "../../shared/thread-builder";
import { itemsMap } from "../../shared/items";

export class ItemAuctionThreadBuilder extends ThreadBuilder {
  public get options() {
    return {
      name: this.threadName,
      reason: this.reason,
      autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
    };
  }

  public get message() {
    return `Auction ends ${this.endDifference} on ${this.endDate}. ${this.location}.

${this.item?.url}

${this.itemCount}

**Rules:**${this.multiCountRules}
• Bids in the last 12 hours extend the auction by another 12 hours.`;
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

  private get itemCount() {
    return `**Items:**\n${range(this.count)
      .map((i: number) => `• ${this.item.name} #${i + 1}`)
      .join("\n")}`;
  }

  private get multiCountRules() {
    return this.count > 1
      ? `
• Include the item number (e.g. #1)
• Reply to the bidder you are raising.`
      : "";
  }

  private get threadName() {
    return `${this.item.name} (${this.count})`;
  }

  private get reason() {
    return `Guild bank has ${this.count} ${this.item.name}`;
  }

  private get location() {
    const user = this.getOption(Option.HeldBy)?.user;
    if (this.count > 1) {
      return user
        ? `These items are on ${user}`
        : "These items are in the guild bank";
    }
    return user ? `This item is on ${user}` : "This item is in the guild bank";
  }

  private get itemId() {
    return String(this.getOption(Option.ItemId)?.value);
  }

  private get item() {
    const s = itemsMap[this.itemId];
    if (!s) {
      throw new Error(`Could not find item with ID ${this.itemId}`);
    }
    return s;
  }

  private get count() {
    return Number(this.getOption(Option.Count)?.value) || 1;
  }
}
