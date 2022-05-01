import { getClassAbreviation } from "../../shared/classes";
import { ForbiddenSpells } from "../../shared/forbidden-spells";
import { AuctionThreadBuilder } from "./auction-thread-builder";
import { CacheType, CommandInteraction } from "discord.js";
import { Option } from "./spell-auction-subcommand";

export class SpellAuctionThreadBuilder extends AuctionThreadBuilder {
  public constructor(interaction: CommandInteraction<CacheType>) {
    super("Scrolls", interaction);
  }

  protected getReason() {
    return `${this.player} can scribe ${this.name}`;
  }

  protected getThreadName(): string {
    return `${this.spell.name} (${this.classAbrev} ${this.level})`;
  }

  protected getExtraDescription(): string {
    return `${this.player} can scribe this spell. `;
  }

  protected getExtraRules() {
    return `
• You must be able to scribe spell.`;
  }

  protected getItem() {
    const s = ForbiddenSpells.find((s) => s.name === this.name);
    if (!s) {
      throw new Error(`Could not find spell named ${this.name}`);
    }
    return s;
  }

  public get classRole() {
    const role = this.interaction.guild?.roles.cache.filter(
      (r) => r.name === this.spell?.className
    );
    if (!role?.size) {
      throw new Error(
        `Could not find Discord role named ${this.spell?.className}`
      );
    }
    return role;
  }

  private get spell() {
    return this.getItem();
  }

  private get level() {
    return this.spell?.level;
  }

  private get player() {
    return this.getOption(Option.Player)?.user;
  }

  private get classAbrev() {
    return getClassAbreviation(this.classRole?.first()?.name);
  }
}
