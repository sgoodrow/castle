import { ButtonInteraction, CacheType } from "discord.js";

export abstract class ButtonCommand {
  public constructor(
    public readonly customId: string,
    public readonly defer = true
  ) {}

  public abstract execute(
    interaction: ButtonInteraction<CacheType>
  ): Promise<void>;
}
