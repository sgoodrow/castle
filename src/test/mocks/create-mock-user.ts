import { User, MessageCreateOptions, Message } from "discord.js";
import { jest } from "@jest/globals";
import { createTypedMock } from "../utils/mock-helpers";

export type TestUser = Pick<User, "id" | "username"> & {
  send: jest.MockedFunction<
    (options: MessageCreateOptions) => Promise<Message>
  >;
};

export interface MockUserOptions {
  id?: string;
  username?: string;
}

export function createMockUser({
  id = "123456789",
  username = "testuser",
}: MockUserOptions = {}): TestUser {
  return {
    id,
    username,
    send: createTypedMock<
      (options: MessageCreateOptions) => Promise<Message>
    >(),
  };
}
