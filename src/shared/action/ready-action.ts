import { Client } from "discord.js";

export interface ReadyActionExecutorOptions {
  repeatDuration?: number;
}

export const readyActionExecutor = async (
  action: ReadyAction,
  options: ReadyActionExecutorOptions = {}
) => {
  await action.execute().catch(console.error);

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
