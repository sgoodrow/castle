import { Client } from "discord.js";

export const actionExecutor = (action: Action) =>
  action
    .execute()
    .then(() => console.log(`Successfully ran ${action.constructor.name}.`))
    .catch(console.error);

export abstract class Action {
  constructor(protected readonly client: Client) {}
  public abstract execute(): Promise<void>;
}
