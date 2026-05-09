import { DiscordAPIError, BaseMessageOptions } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Instructions } from "../../db/instructions";
import { getTextChannel } from "../..";

export class InstructionsReadyAction {
  public constructor(
    private readonly name: string,
    private readonly channelId: string,
    private readonly threadName?: string
  ) {}

  public async createOrUpdateInstructions(
    options: BaseMessageOptions,
    pin = false
  ) {
    let message = await this.getInstructionsMessage();

    if (!message) {
      // Cancel any existing stale records for this name to prevent duplicates
      await this.cancelAllInstructions();

      const channel = await getTextChannel(this.channelId);
      message = await channel.send(options);

      const instructions = new Instructions();
      instructions.id = message.id;
      instructions.name = this.name;
      await dataSource.manager.save(instructions);
    } else {
      await message.edit(options);
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

  public async deleteInstructionsMessage() {
    const message = await this.getInstructionsMessage();
    if (message) {
      await message.delete();
    }
    await this.cancelAllInstructions();
  }

  public async getThread() {
    const embed = await this.getInstructionsMessage();
    return embed?.thread;
  }

  private async cancelAllInstructions() {
    const repo = dataSource.getRepository(Instructions);
    const instructions = await repo.find({
      where: { name: this.name, canceled: false },
    });
    for (const inst of instructions) {
      inst.canceled = true;
      await dataSource.manager.save(inst);
    }
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
      if (error instanceof DiscordAPIError) {
        if (error.status === 404 || error.code === 50001 || error.code === 50013) {
          console.error(
            `Could not access message ${instructions.id} in channel ${this.channelId} for ${this.constructor.name} instructions. Was it deleted or are permissions missing?`
          );
          instructions.canceled = true;
          await dataSource.manager.save(instructions);
          return;
        }
      }
      throw error;
    }
  }
}
