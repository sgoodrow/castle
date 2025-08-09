/**
 * Enhanced MockGuild for Discord Testing Library
 */

import { TextChannel, PublicThreadChannel } from "discord.js";
import { createTypedMock } from "../utils/create-typed-mock";
import { createMockUser, type MockUser } from "./create-mock-user";
import { createMockChannel, type MockChannel } from "./create-mock-channel";

export type MockGuild = {
  id: string;
  channels: {
    fetch: jest.MockedFunction<(id: string) => Promise<TextChannel | PublicThreadChannel | null>>;
  };
  createUser(username: string, options?: { id?: string }): MockUser;
  createChannel(name: string, options?: { id?: string; type?: "text" | "thread" }): MockChannel;
};

export function createMockGuild(options: { id?: string; client?: any } = {}): MockGuild {
  const { id = `guild-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, client } = options;

  const channels = new Map<string, MockChannel>();

  const guild: MockGuild = {
    id,
    channels: {
      fetch: createTypedMock<(id: string) => Promise<TextChannel | PublicThreadChannel | null>>(),
    },
    createUser: (username: string, userOptions: { id?: string } = {}) => {
      return createMockUser({ username, guild, client, ...userOptions });
    },
    createChannel: (
      name: string,
      channelOptions: { id?: string; type?: "text" | "thread" } = {}
    ) => {
      const channel = createMockChannel(name, channelOptions);

      channels.set(channel.id, channel);

      // Update guild's fetch implementation to handle this channel
      const currentImpl = guild.channels.fetch.getMockImplementation();
      guild.channels.fetch.mockImplementation((id: string) => {
        if (channels.has(id)) {
          return Promise.resolve(channels.get(id) as any);
        }
        if (currentImpl) {
          return currentImpl(id);
        }
        return Promise.resolve(null);
      });

      return channel;
    },
  };

  return guild;
}
