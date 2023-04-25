import { Client, EmbedBuilder } from "discord.js";
import { raidBotsChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { characters } from "../../services/characters";

export const updateBotsInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateBotsInfoAction(client), options);

class UpdateBotsInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    const bots = await characters.getRaiderCharacters();
    await this.createOrUpdateInstructions(
      {
        embeds: [
          new EmbedBuilder({
            title: "Raid Bots",
            description: `Castle has a bunch of bots for raiding. Listed below...

${bots.map((b) => `${b.character} - ${b.class} ${b.level}`).join("\n")}`,
          }),
        ],
      },
      Name.BotInstructions
    );
  }

  protected get channel() {
    return this.getChannel(raidBotsChannelId, "bots");
  }
}
