import { DiscordAPIError, BaseMessageOptions } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Instructions, Name } from "../../db/instructions";
import { getTextChannel } from "../..";

export class InstructionsReadyAction {
  public constructor(
    private readonly name: Name,
    private readonly channelId: string,
    private readonly threadName?: string
  ) {}

  public async createOrUpdateInstructions(
    options: BaseMessageOptions,
    pin = false
  ) {
    let message = await this.getInstructionsMessage();

    if (!message) {
      const channel = await getTextChannel(this.channelId);
      message = await channel.send(options);

      const instructions = new Instructions();
      instructions.id = message.id;
      instructions.name = this.name;
      await dataSource.manager.save(instructions);
    } else {
      message.edit(options);
    }

    if (pin && !message.pinned) {
      await message.pin();
    }

    if (this.threadName && !message.hasThread) {
      await message.startThread({
        name: this.threadName,
      });
    }
  }

  public async getThread() {
    const embed = await this.getInstructionsMessage();
    return embed?.thread;
  }

  private async getInstructionsMessage() {
    const instructions = await dataSource
      .getRepository(Instructions)
      .findOneBy({ name: this.name, canceled: false });
    if (!instructions) {
      return;
    }

    try {
      const channel = await getTextChannel(this.channelId);

      return await channel.messages.fetch(instructions.id);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.status === 404) {
        console.error(
          `Could not find message ${instructions.id} in channel ${this.channelId} for ${this.constructor.name} instructions. Was it deleted?`
        );
        instructions.canceled = true;
        await dataSource.manager.save(instructions);
        return;
      }
      throw error;
    }
  }
}
