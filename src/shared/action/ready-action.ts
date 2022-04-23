import { Client } from "discord.js";

export const readyActionExecutor = (action: ReadyAction) =>
  action
    .execute()
    .then(() => console.log(`Successfully ran ${action.constructor.name}.`))
    .catch(console.error);

export abstract class ReadyAction {
  constructor(protected readonly client: Client) {}
  public abstract execute(): Promise<void>;
}
