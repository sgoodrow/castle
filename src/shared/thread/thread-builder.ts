import { CacheType, CommandInteraction } from "discord.js";
import { getOption } from "../command/command";

export abstract class ThreadBuilder {
  public constructor(
    protected readonly interaction: CommandInteraction<CacheType>
  ) {}

  protected getOption(name: string) {
    return getOption(name, this.interaction);
  }
}
