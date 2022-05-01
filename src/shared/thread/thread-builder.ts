import { CacheType, CommandInteraction } from "discord.js";

export abstract class ThreadBuilder {
  public constructor(
    protected readonly interaction: CommandInteraction<CacheType>
  ) {}

  protected getOption(name: string) {
    return this.interaction.options.data.find((d) => d.name === name);
  }
}
