import { ButtonInteraction, Client, CacheType } from "discord.js";

export async function executeButtonCommand(
  command: {
    execute: (interaction: ButtonInteraction<CacheType>) => Promise<void>;
  },
  interaction: ButtonInteraction<CacheType>
): Promise<void> {
  await command.execute(interaction);
}

export async function executeReadyAction<T>(fn: (client: Client) => T, client: Client): Promise<T> {
  return fn(client);
}
