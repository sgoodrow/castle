import { ThreadAutoArchiveDuration } from "discord-api-types/v9";
import { range } from "lodash";
import moment from "moment";
import { Option } from "./command";
import { getClassAbreviation } from "../../shared/roles";
import { ThreadBuilder } from "../../shared/thread-builder";
import { ForbiddenSpells } from "../../shared/forbidden-spells";

export class SpellAuctionThreadBuilder extends ThreadBuilder {
  public get options() {
    return {
      name: this.threadName,
      reason: this.reason,
      autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
    };
  }

  public get message() {
    return `${this.classRole}s, ${this.player} can scribe **${this.spellName}** and has initiated a DKP auction which will end ${this.endDate}, ${this.endDifference}.

${this.spell?.url}

${this.scrollCount}

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

  private get scrollCount() {
    return `**Scrolls:**\n${range(this.count)
      .map((i: number) => `• ${this.spellName} #${i + 1}`)
      .join("\n")}`;
  }

  private get multiCountRules() {
    return this.count > 1
      ? `
• Include the scroll number (e.g. #1)
• Reply to the bidder you are raising.`
      : "";
  }

  private get threadName() {
    return `${this.spellName} (${this.classAbrev} ${this.level})`;
  }

  private get reason() {
    return `${this.player} can scribe ${this.spellName}`;
  }

  private get spellName() {
    return this.getOption(Option.Name)?.value;
  }

  private get spell() {
    const s = ForbiddenSpells.find((s) => s.name === this.spellName);
    if (!s) {
      throw new Error(`Could not find spell named ${this.spellName}`);
    }
    return s;
  }

  private get level() {
    return this.spell?.level;
  }

  private get classRole() {
    const role = this.interaction.guild?.roles.cache.find(
      (r) => r.name === this.spell?.className
    );
    if (!role) {
      throw new Error(
        `Could not find Discord role named ${this.spell?.className}`
      );
    }
    return role;
  }

  private get player() {
    return this.getOption(Option.Player)?.user;
  }

  private get count() {
    return Number(this.getOption(Option.Count)?.value) || 1;
  }

  private get classAbrev() {
    return getClassAbreviation(this.classRole?.name);
  }
}
