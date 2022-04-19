import { bankRequestsChannelId } from "../../config";
import { Ready } from "../../listeners/ready";
import { Item, store } from "../../shared/store";
import { BankRequestInstructionsEmbed } from "./instructions-embed";

export class BankRequestReadyListener extends Ready {
  public async fire() {
    const embed = await this.getEmbed();

    if (embed) {
      embed.edit(this.messagePayload);
      return;
    }

    const message = await this.channel.send(this.messagePayload);
    await store.set(Item.BankRequestEmbedId, message.id);
  }

  private get messagePayload() {
    return { embeds: [BankRequestInstructionsEmbed] };
  }

  private async getEmbed() {
    const id = await store.get(Item.BankRequestEmbedId);
    if (!id) {
      return;
    }

    return await this.channel.messages.fetch(id);
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
