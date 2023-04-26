import {
  ChannelType,
  DiscordAPIError,
  DMChannel,
  BaseMessageOptions,
  NewsChannel,
  PartialDMChannel,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { dataSource } from "../../db/data-source";
import { Instructions, Name } from "../../db/instructions";
import { ReadyAction } from "./ready-action";

/**
 * @deprecated
 */
export abstract class InstructionsReadyAction extends ReadyAction {
  protected abstract get channel():
    | DMChannel
    | PartialDMChannel
    | NewsChannel
    | TextChannel
    | ThreadChannel;

  protected async createOrUpdateInstructions(
    options: BaseMessageOptions,
    name: Name
  ) {
    const embed = await this.getEmbed(name);

    if (embed) {
      embed.edit(options);
      return;
    }

    const message = await this.channel.send(options);
    const instructions = new Instructions();
    instructions.id = message.id;
    instructions.name = name;
    await dataSource.manager.save(instructions);
  }

  private async getEmbed(name: Name) {
    const instructions = await dataSource
      .getRepository(Instructions)
      .findOneBy({ name, canceled: false });
    if (!instructions) {
      return;
    }

    try {
      return await this.channel.messages.fetch(instructions.id);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.status === 404) {
        console.error(
          `Could not find message ${instructions.id} in channel ${this.channel.id} for ${this.constructor.name} instructions. Was it deleted?`
        );
        instructions.canceled = true;
        await dataSource.manager.save(instructions);
        return;
      }
      throw error;
    }
  }

  protected getChannel(id: string, label: string) {
    const c = this.client.channels.cache.get(id);
    if (!c) {
      throw new Error(`Could not find ${label} channel`);
    }
    if (c.type !== ChannelType.GuildText) {
      throw new Error(`Channel ${label} is not a text channel`);
    }
    return c;
  }
}
