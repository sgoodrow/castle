import { ThreadAutoArchiveDuration } from "discord-api-types/v9";
import { range } from "lodash";
import moment from "moment";
import { Option } from "./SpellAuctionCommand";
import { getClassAbreviation } from "../shared/roles";
import { ThreadBuilder } from "../shared/ThreadBuilder";

export class SpellAuctionThreadBuilder extends ThreadBuilder {
  public get options() {
    return {
      name: this.threadName,
      reason: this.reason,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    };
  }

  public get message() {
    return `${this.classRole}s, ${this.player} can scribe **${this.name}** and has initiated a DKP auction which will end ${this.endDate}, ${this.endDifference}.
    ${this.multiCountScrolls}
**Rules:**${this.multiCountRules}
• You must be able to scribe spell.
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

  private get multiCountScrolls() {
    return this.count > 1
      ? `\n**Scrolls:**\n${range(this.count)
          .map((i: number) => `• ${this.name} #${i + 1}`)
          .join("\n")}\n`
      : "";
  }

  private get multiCountRules() {
    return this.count > 1
      ? `
• Include the scroll number (e.g. #1)
• Reply to the bidder you are raising.`
      : "";
  }

  private get threadName() {
    return `${this.classAbrev} ${this.name} ${this.level}`;
  }

  private get reason() {
    return `${this.player} can scribe ${this.name}`;
  }

  private get name() {
    return this.getOption(Option.Name)?.value;
  }

  private get level() {
    const l = Number(this.getOption(Option.Level)?.value);
    if (l < 1 || l > 60) {
      throw new Error(`Invalid level (${l})`);
    }
    return l;
  }

  private get classRole() {
    const c = this.getOption(Option.ClassRole)?.role;
    return c;
  }

  private get player() {
    return this.getOption(Option.Player)?.user;
  }

  private get count() {
    const c = Number(this.getOption(Option.Count)?.value || 1);
    if (c < 1 || Number.isNaN(c)) {
      throw new Error(`Invalid count (${c})`);
    }
    return c;
  }

  private get classAbrev() {
    const c = getClassAbreviation(this.classRole?.name);
    if (!c) {
      throw new Error(`Invalid class (${this.classRole?.name} not recognized)`);
    }
    return c;
  }
}
