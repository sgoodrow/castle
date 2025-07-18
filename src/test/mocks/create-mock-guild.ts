import { Guild, TextChannel, PublicThreadChannel } from "discord.js";
import { createTypedMock } from "../utils/create-typed-mock";
import {
  MockTextChannel,
  createMockTextChannel,
} from "./create-mock-text-channel";
import {
  MockThreadChannel,
  createMockThreadChannel,
} from "./create-mock-thread-channel";

export type MockGuild = Pick<Guild, "id"> & {
  channels: {
    fetch: jest.MockedFunction<
      (id: string) => Promise<TextChannel | PublicThreadChannel | null>
    >;
  };
};

export interface MockGuildOptions {
  id?: string;
  textChannels?: Array<{ id: string; channel?: MockTextChannel }>;
  threadChannels?: Array<{ id: string; channel?: MockThreadChannel }>;
}

export function createMockGuild({
  id = "444555666",
  textChannels = [],
  threadChannels = [],
}: MockGuildOptions = {}): MockGuild {
  const channelMap = new Map<string, MockTextChannel | MockThreadChannel>();

  textChannels.forEach(({ id: channelId, channel }) => {
    channelMap.set(
      channelId,
      channel || createMockTextChannel({ id: channelId })
    );
  });

  threadChannels.forEach(({ id: channelId, channel }) => {
    channelMap.set(
      channelId,
      channel || createMockThreadChannel({ id: channelId })
    );
  });

  const fetchMock =
    createTypedMock<
      (id: string) => Promise<TextChannel | PublicThreadChannel | null>
    >();

  // Set up the mock implementation to return channels from the map
  fetchMock.mockImplementation((channelId: string) => {
    const channel = channelMap.get(channelId);
    return Promise.resolve(
      channel as unknown as TextChannel | PublicThreadChannel | null
    );
  });

  return {
    id,
    channels: {
      fetch: fetchMock,
    },
  };
}
