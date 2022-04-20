import { Client, DiscordAPIError } from "discord.js";
import { bankRequestsChannelId } from "../../config";
import { Ready, readyListener } from "../../listeners/ready";
import { Item, store } from "../../db/store";
import { getBankRequestInstructionsEmbeds } from "./instructions-embed";

export const bankRequestReadyListener = (client: Client) =>
  readyListener(new BankRequestReadyListener(client));

class BankRequestReadyListener extends Ready {
  public async fire() {
    const embed = await this.getEmbed();

    const payload = await this.getMessagePayload();

    if (embed) {
      embed.edit(payload);
      return;
    }

    const message = await this.channel.send(payload);
    await store.set(Item.BankRequestEmbedId, message.id);
  }

  private async getMessagePayload() {
    return {
      embeds: await getBankRequestInstructionsEmbeds(),
    };
  }

  private async getEmbed() {
    const id = await store.get(Item.BankRequestEmbedId);
    if (!id) {
      return;
    }

    try {
      return await this.channel.messages.fetch(id);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.httpStatus === 404) {
        return;
      }
      throw error;
    }
  }

  private get channel() {
    const c = this.client.channels.cache.get(bankRequestsChannelId);
    if (!c) {
      throw new Error("Could not find bank requests channel");
    }
    if (!c.isText()) {
      throw new Error("Bank requests channel is not a text channel");
    }
    return c;
  }
}
