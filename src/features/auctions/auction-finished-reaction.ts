import {
  EmbedBuilder,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  auctionChannelId,
  bankerRoleId,
  castleDkpAuctionRaidId,
  dkpDeputyRoleId,
  officerRoleId,
} from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../shared/action/reaction-action";
import { castledkp } from "../../services/castledkp";
import { some } from "lodash";
import { openDkpService } from "../../services/openDkpService";
import { isEqDkpPlusEnabled } from "../../shared/util";
import { getMember } from "../..";
import { redisClient } from "../../redis/client";

const code = "```";
const finishedEmojis = ["✅", "🏦"];

export const tryAuctionFinishedReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => reactionActionExecutor(new AuctionFinishedReactionAction(reaction, user));

class AuctionFinishedReactionAction extends ReactionAction {
  public async execute() {
    // filter non-threads
    if (!this.message.channel.isThread()) {
      return;
    }

    // filter channel
    if (this.message.channel.parentId !== auctionChannelId) {
      return;
    }

    // filter non-finish emoji reactions
    if (!finishedEmojis.includes(this.reaction.emoji.name || "") && this.reaction.emoji.name !== "🔒") {
      return;
    }

    // skip already completed
    const name = this.message.channel.name;
    if (some(finishedEmojis, (e) => name.startsWith(e))) {
      return;
    }

    // authorize user
    const reactor = await getMember(this.user.id);
    if (
      !(
        reactor?.roles.cache.has(dkpDeputyRoleId) ||
        reactor?.roles.cache.has(officerRoleId) ||
        reactor?.roles.cache.has(bankerRoleId)
      )
    ) {
      return;
    }

    // handle banked
    if (this.reaction.emoji.name === "🏦") {
      if (
        this.message.embeds.find((e) => e.title?.includes("view on P99 Wiki"))
      ) {
        // provide receipt
        await this.message.reply({
          content: "Auction closed. Item is property of the guild bank.",
        });

        // edit thread title
        this.message.channel.setName(`🏦 ${name}`);
      }
      return;
    }

    // handle lock
    if (this.reaction.emoji.name === "🔒") {
      if (!this.message.content) {
        await this.message.reply({
          content: "Cannot lock auction: the reacted message has no content.",
        });
        return;
      }
      try {
        const { price, character } = await this.parseBid(this.message.content);
        await this.message.reply({
          content: `Auction closed. The auction was won by **${character.Name}** for ${price} DKP. The auction will be uploaded once the raid is available on OpenDKP.`,
        });
        await this.message.channel.setName(`🔒 ${name}`);
      } catch (err: unknown) {
        await this.message.reply({
          content: `Cannot lock auction: ${err}`,
        });
      }
      return;
    }

    // parse message
    if (!this.message.content) {
      throw new Error(
        "Tried to finish an auction, but the message has no content."
      );
    }
    if (!this.message.author) {
      throw new Error(
        "Tried to finish an auction, but the message has no author."
      );
    }
    const { price, character } = await this.parseBid(this.message.content);
    const item = await this.getItem(name);

    if (!castleDkpAuctionRaidId) {
      throw new Error("The CastleDKP Auction Raid ID is not set");
    }

    const openDkpRaidIdStr = await redisClient.get(
      `auction:raid:${this.message.channel.id}`
    );
    if (!openDkpRaidIdStr) {
      await this.message.reply(
        "This auction cannot be closed because no raid has been set. Please use `/auction setraid` to select a raid."
      );
      return;
    }
    const openDkpRaidId = Number.parseInt(openDkpRaidIdStr, 10);

    // add item to raid
    await openDkpService.addItem(
      character.Name,
      item,
      `Auction - ${
        this.message.thread?.name || item
      } - ${this.message.createdAt.toDateString()}`,
      price,
      openDkpRaidId
    );

    if (isEqDkpPlusEnabled()) {
      await castledkp.addItem(Number(castleDkpAuctionRaidId), {
        item,
        buyer: character.Name,
        price,
      });
    }

    // provide receipt
    await this.message.reply({
      embeds: [
        new EmbedBuilder({
          title: `Purchase Receipt`,
          description: `Auction complete, grats!${code}diff
+ ${character.Name} ${item}
- ${character.Name} ${price} DKP${code}`,
          url: openDkpRaidId
            ? `https://castle.opendkp.com/#/raids/${openDkpRaidId}`
            : `https://castle.opendkp.com/#/items`,
        }),
      ],
    });

    // edit thread title
    await this.message.channel.setName(`✅ ${name.replace("🔒", "")}`);

    await this.message.channel.setAutoArchiveDuration(4320);
    await this.message.channel.setArchived(true);
  }

  private async parseBid(message: string) {
    const reg = /^(\d+)\s(dkp\s)?(\w+)$/.exec(message);
    reg?.shift();
    if (!reg?.length) {
      throw new Error(`Could not parse bid.
${this.example}`);
    }
    const price = this.getPrice(reg[0]);
    const name = reg[reg.length - 1];
    const character = await this.getCharacter(name);
    if (!character) {
      throw new Error(
        `Cannot finish auction because character ${name} does not exist`
      );
    }

    return { price, character };
  }

  private async getItem(threadName: string) {
    // parse out the extra stuff
    const lastHyphenIndex = threadName.lastIndexOf(" - ");
    return lastHyphenIndex !== -1
      ? threadName.substring(lastHyphenIndex + 3) // +3 to skip the " - " itself
      : threadName;
  }

  private getPrice(unparsedPrice: string) {
    const price = Number(unparsedPrice);
    if (!Number.isInteger(price) || price < 1) {
      throw new Error(
        `The bid (${unparsedPrice}) is not an integer greater than 1.
${this.example}`
      );
    }
    return price;
  }

  private async getCharacter(unfixedName: string) {
    if (!unfixedName) {
      throw new Error(
        `The bid does not have a character name specified.
${this.example}`
      );
    }

    const name = unfixedName.charAt(0).toUpperCase() + unfixedName.slice(1);
    return await openDkpService.getCharacter(name);
  }

  private get example() {
    return `${code}Example: "3 Potatus"${code}`;
  }
}
