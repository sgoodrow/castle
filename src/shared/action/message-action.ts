import { Message } from "discord.js";

export const messageActionExecutor = async (action: MessageAction) => {
  await action.initialize();
  return action.execute().catch((err) => {
    console.error(err);
    action.replyError(err);
  });
};

export abstract class MessageAction {
  constructor(protected readonly message: Message) {}

  public async initialize() {
    if (this.message.partial) {
      await this.message.fetch();
    }
    return this;
  }

  public abstract execute(): Promise<void>;

  public async replyError(err: string) {
    await this.message.reply(`⚠️${err}`);
  }

  protected get authorId() {
    const authorId = this.message.author?.id;
    if (!authorId) {
      throw new Error(
        "Something went wrong when retrieving the message author."
      );
    }
    return authorId;
  }

  protected get guild() {
    return this.message.guild;
  }

  protected get members() {
    return this.guild?.members;
  }
}
