import { User, Message, MessageCreateOptions } from "discord.js";
import { createTypedMock } from "../utils/create-typed-mock";

export type MockUser = Pick<User, "id" | "username"> & {
  send: jest.MockedFunction<(options: MessageCreateOptions) => Promise<Message>>;
};

export interface MockUserOptions {
  id?: string;
  username?: string;
}

export function createMockUser({
  id = "123456789",
  username = "testuser",
}: MockUserOptions = {}): MockUser {
  return {
    id,
    username,
    send: createTypedMock<(options: MessageCreateOptions) => Promise<Message>>(),
  };
}
