import { Client, MessageActionRow, MessageEmbed } from "discord.js";

export interface ReadyActionExecutorOptions {
  repeatDuration?: number;
}

export const readyActionExecutor = async (
  action: ReadyAction,
  options: ReadyActionExecutorOptions = {}
) => {
  await action
    .execute()
    .then(() => console.log(`Successfully ran ${action.constructor.name}.`))
    .catch(console.error);

  const { repeatDuration } = options;

  if (repeatDuration) {
    setTimeout(async () => {
      await readyActionExecutor(action, options);
    }, repeatDuration);
  }
};

export abstract class ReadyAction {
  constructor(protected readonly client: Client) {}
  public abstract execute(): Promise<void>;
}

export interface MessageStartOrEditOptions {
  embeds?: MessageEmbed[];
  components?: MessageActionRow[];
}
