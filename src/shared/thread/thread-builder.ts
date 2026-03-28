import { CacheType, CommandInteraction } from "discord.js";
import { getOption } from "../command/subcommand";

export abstract class ThreadBuilder {
  public constructor(
    protected readonly subcommandName: string,
    protected readonly interaction: CommandInteraction<CacheType>
  ) {}

  protected getOption(name: string) {
    if (!this.interaction.isAutocomplete()) return;
    return getOption(this.subcommandName, name, this.interaction);
  }
}
