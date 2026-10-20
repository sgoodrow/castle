import { Collection } from "discord.js";

export interface MessageSource<M extends { id: string }> {
  messages: {
    fetch: (options: {
      limit: number;
      before?: string;
    }) => Promise<Collection<string, M>>;
  };
}

// Every message in a channel, newest first, read a page of 100 at a time. Deleting the messages
// along the way is fine.
export async function* channelMessages<M extends { id: string }>(
  channel: MessageSource<M>,
  maxPages = Infinity
) {
  let before: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    yield* batch.values();
    if (batch.size < 100) return;
    before = batch.last()?.id;
  }
}
