import {
  MessageEmbed,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  auctionChannelId,
  castleDkpAuctionRaidId,
  dkpDeputyRoleId,
  officerRoleId,
} from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../shared/action/reaction-action";
import { castledkp } from "../../services/castledkp";

const startCodeBlock = "```";
const endCodeBlock = startCodeBlock;

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
    if (this.reaction.emoji.name !== "✅") {
      return;
    }

    // authorize user
    const reactor = await this.members?.fetch(this.user.id);
    if (
      !(
        reactor?.roles.cache.has(dkpDeputyRoleId) ||
        reactor?.roles.cache.has(officerRoleId)
      )
    ) {
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
    const price = await this.getPrice(this.message.content);
    const character = await this.getCharacter(this.message.content);

    // add item to raid
    const item = this.message.channel.name;
    await castledkp.addItem({
      item,
      characterId: character.id,
      raidId: Number(castleDkpAuctionRaidId),
      price,
    });

    // provide receipt
    await this.message.channel.send({
      embeds: [
        new MessageEmbed({
          title: `Purchase Receipt`,
          description: `Grats ${this.message.author}!${startCodeBlock}diff
+ ${character.name} ${item}
- ${character.name} ${price} DKP${endCodeBlock}`,
          url: castleDkpAuctionRaidId
            ? `https://castledkp.com/index.php/Raids/[green]-discord-dkp-auctions-r${castleDkpAuctionRaidId}.html?s=`
            : undefined,
        }),
      ],
    });
  }

  private async getPrice(messageContent: string) {
    const [unparsedPrice] = messageContent.split(" ", 2);
    const price = Number(unparsedPrice);
    if (!Number.isInteger(price) || price < 1) {
      throw new Error(
        `The bid (${unparsedPrice}) is not an integer greater than 1.
${this.example}`
      );
    }
    return price;
  }

  private async getCharacter(messageContent: string) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, name] = messageContent.split(" ", 2);
    if (!name) {
      throw new Error(
        `The bid does not have a character name specified.
${this.example}`
      );
    }

    // get character ID from name
    try {
      const { id } = await castledkp.getCharacter(name);
      return { name, id };
    } catch (error) {
      throw new Error(`The character (${name}) could not be found.`);
    }
  }

  private get example() {
    return `${startCodeBlock}Example: "3 Potatus"${startCodeBlock}`;
  }
}
