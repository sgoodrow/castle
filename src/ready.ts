import { Client, MessageEmbed } from "discord.js";
import { bankRequestsChannelId } from "./config";
import { Item, store } from "./shared/store";

export const readyListener = async (client: Client) => {
  const channel = client.channels.cache.get(bankRequestsChannelId);
  if (!channel) {
    console.error("Could not find bank requests channel");
    return;
  }

  if (!channel?.isText()) {
    console.error("Bank requests channel is not a text channel");
    return;
  }

  const id = await store.get(Item.BankRequestEmbedId);
  const embed = await channel.messages.fetch(id);
  if (!embed) {
    const message = await channel.send({
      embeds: [new MessageEmbed().setTitle("Test")],
    });
    console.log(typeof message.id);
    await store.set(Item.BankRequestEmbedId, message.id);
    return;
  } else {
    embed.edit({
      embeds: [new MessageEmbed().setTitle("Edited")],
    });
  }
};
