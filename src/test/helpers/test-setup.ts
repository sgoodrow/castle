import { createMockUser } from "../mocks/create-mock-user";
import { createMockGuild } from "../mocks/create-mock-guild";
import { createMockButtonInteraction } from "../mocks/create-mock-button-interaction";
import { MessageCreateOptions } from "discord.js";

export interface InteractionTestSetupOptions {
  requestDumpThreadId?: string;
  customId?: string;
  userId?: string;
  username?: string;
}

export async function setupInteractionTest({
  requestDumpThreadId = "111222333",
  customId = "volunteer-application",
  userId = "123456789",
  username = "testuser",
}: InteractionTestSetupOptions = {}) {
  const user = createMockUser({ id: userId, username });
  const guild = createMockGuild({
    threadChannels: [{ id: requestDumpThreadId }],
  });
  const interaction = createMockButtonInteraction({
    customId,
    user,
    guild,
  });

  const threadChannel = await guild.channels.fetch(requestDumpThreadId);

  return {
    interaction,
    guild,
    user,
    threadChannel,
    requestDumpThreadId,
  };
}

export function extractDmContent(interaction: {
  user: { send: jest.MockedFunction<any> };
}): string {
  const dmCall = interaction.user.send.mock.calls[0]?.[0];
  return typeof dmCall === "string" ? dmCall : (dmCall as MessageCreateOptions)?.content || "";
}
