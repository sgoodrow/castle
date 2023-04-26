import { Client } from "discord.js";

/**
 * @deprecated
 */
export interface ReadyActionExecutorOptions {
  repeatDuration?: number;
}

/**
 * @deprecated
 */
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

/**
 * @deprecated
 */
export abstract class ReadyAction {
  constructor(protected readonly client: Client) {}
  public abstract execute(): Promise<void>;
}
