import {
  PublicThreadChannel,
  ChannelType,
  Message,
  MessageCreateOptions,
} from "discord.js";
import { createTypedMock } from "../utils/create-typed-mock";

export type MockThreadChannel = Pick<PublicThreadChannel, "id" | "type"> & {
  send: jest.MockedFunction<
    (options: MessageCreateOptions | string) => Promise<Message>
  >;
};

export interface MockChannelOptions {
  id?: string;
  type?: ChannelType;
}

export function createMockThreadChannel({
  id = "111222333",
}: MockChannelOptions = {}): MockThreadChannel {
  return {
    id,
    type: ChannelType.PublicThread,
    send: createTypedMock<
      (options: MessageCreateOptions | string) => Promise<Message>
    >(),
  };
}
