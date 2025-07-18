import { TestUser, createMockUser } from "../mocks/create-mock-user";
import { TestGuild, createMockGuild } from "../mocks/create-mock-guild";
import {
  TestButtonInteraction,
  createMockButtonInteraction,
} from "../mocks/create-mock-button-interaction";
import { TestThreadChannel } from "../mocks/create-mock-thread-channel";

export interface ApplicationTestSetupOptions {
  requestDumpThreadId?: string;
  customId?: string;
  userId?: string;
  username?: string;
}

export function setupApplicationTest({
  requestDumpThreadId = "111222333",
  customId = "volunteer-application",
  userId = "123456789",
  username = "testuser",
}: ApplicationTestSetupOptions = {}) {
  const user = createMockUser({ id: userId, username });
  const guild = createMockGuild({
    threadChannels: [{ id: requestDumpThreadId }],
  });
  const interaction = createMockButtonInteraction({
    customId,
    user,
    guild,
  });

  const threadChannel = guild.channels.fetch(requestDumpThreadId);

  return {
    interaction,
    guild,
    user,
    threadChannel,
    requestDumpThreadId,
  };
}
