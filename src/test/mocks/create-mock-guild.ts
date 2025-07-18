import { Guild, TextChannel, PublicThreadChannel } from "discord.js";
import { jest } from "@jest/globals";
import { createTypedMockWithImplementation } from "../utils/mock-helpers";
import {
  TestTextChannel,
  createMockTextChannel,
} from "./create-mock-text-channel";
import {
  TestThreadChannel,
  createMockThreadChannel,
} from "./create-mock-thread-channel";

export type TestGuild = Pick<Guild, "id"> & {
  channels: {
    fetch: jest.MockedFunction<
      (channelId: string) => Promise<TextChannel | PublicThreadChannel | null>
    >;
  };
};

export interface MockGuildOptions {
  id?: string;
  textChannels?: Array<{ id: string; channel?: TestTextChannel }>;
  threadChannels?: Array<{ id: string; channel?: TestThreadChannel }>;
}

export function createMockGuild({
  id = "444555666",
  textChannels = [],
  threadChannels = [],
}: MockGuildOptions = {}): TestGuild {
  const channelMap = new Map<string, TestTextChannel | TestThreadChannel>();

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

  const fetchMock = createTypedMockWithImplementation<
    (channelId: string) => Promise<TextChannel | PublicThreadChannel | null>
  >((channelId: any) => {
    const channel = channelMap.get(channelId);
    return Promise.resolve(channel || null);
  });

  return {
    id,
    channels: {
      fetch: fetchMock,
    },
  };
}
