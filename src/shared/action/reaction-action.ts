import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";

export const reactionActionExecutor = async (action: ReactionAction) => {
  await action.initialize();
  return action.execute().catch((err) => {
    console.error(err);
    action.replyError(err);
  });
};

export abstract class ReactionAction {
  constructor(
    protected readonly reaction: MessageReaction | PartialMessageReaction,
    protected readonly user: User | PartialUser
  ) {}

  public async initialize() {
    if (this.reaction.partial) {
      await this.reaction.fetch().catch((err) => {
        console.error(err);
        this.replyError(err);
      });
    }
    return this;
  }

  public abstract execute(): Promise<void>;

  public async replyError(err: string) {
    await this.message.reply(`⚠️${err}`).catch((err) => {
      console.error(err);
    });
  }

  protected get authorId() {
    const authorId = this.reaction.message.author?.id;
    if (!authorId) {
      throw new Error(
        "Something went wrong when retrieving the message author."
      );
    }
    return authorId;
  }

  protected get message() {
    return this.reaction.message;
  }

  protected get guild() {
    return this.message.guild;
  }

  protected get members() {
    return this.guild?.members;
  }
}
