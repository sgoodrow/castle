import { Client } from "discord.js";

export const readyListener = (ready: Ready) =>
  ready
    .fire()
    .then(() => console.log(`Successfully ran ${ready.constructor.name}.`))
    .catch(console.error);

export abstract class Ready {
  constructor(protected readonly client: Client) {}
  public abstract fire(): Promise<void>;
}
