import {
  TextChannel,
  ChannelType,
  Message,
  MessageCreateOptions,
} from "discord.js";
import { createTypedMock } from "../utils/create-typed-mock";

export type MockTextChannel = Pick<TextChannel, "id" | "type"> & {
  send: jest.MockedFunction<
    (options: MessageCreateOptions | string) => Promise<Message>
  >;
};

export interface MockChannelOptions {
  id?: string;
  type?: ChannelType;
}

export function createMockTextChannel({
  id = "987654321",
}: MockChannelOptions = {}): MockTextChannel {
  return {
    id,
    type: ChannelType.GuildText,
    send: createTypedMock<
      (options: MessageCreateOptions | string) => Promise<Message>
    >(),
  };
}
