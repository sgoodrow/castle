import { TextChannel, ChannelType, Message } from "discord.js";
import { jest } from "@jest/globals";
import { createTypedMock } from "../utils/mock-helpers";

export type TestTextChannel = Pick<TextChannel, "id" | "type"> & {
  send: jest.MockedFunction<(content: string) => Promise<Message>>;
};

export interface MockChannelOptions {
  id?: string;
  type?: ChannelType;
}

export function createMockTextChannel({
  id = "987654321",
  type = ChannelType.GuildText,
}: MockChannelOptions = {}): TestTextChannel {
  return {
    id,
    type: ChannelType.GuildText,
    send: createTypedMock<(content: string) => Promise<Message>>(),
  };
}
