import { PublicThreadChannel, ChannelType, Message } from "discord.js";
import { jest } from "@jest/globals";
import { createTypedMock } from "../utils/mock-helpers";

export type TestThreadChannel = Pick<PublicThreadChannel, "id" | "type"> & {
  send: jest.MockedFunction<(content: string) => Promise<Message>>;
};

export interface MockChannelOptions {
  id?: string;
  type?: ChannelType;
}

export function createMockThreadChannel({
  id = "111222333",
  type = ChannelType.PublicThread,
}: MockChannelOptions = {}): TestThreadChannel {
  return {
    id,
    type: ChannelType.PublicThread,
    send: createTypedMock<(content: string) => Promise<Message>>(),
  };
}
