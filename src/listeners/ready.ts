import { Client } from "discord.js";

export abstract class Ready {
  constructor(protected readonly client: Client) {}
  public abstract fire(): Promise<void>;
}
