import {
  ButtonInteraction,
  CacheType,
  Message,
  InteractionResponse,
} from "discord.js";
import { jest } from "@jest/globals";
import { createTypedMock } from "../utils/mock-helpers";
import { TestUser, createMockUser } from "./create-mock-user";
import { TestClient, createMockClient } from "./create-mock-client";
import { TestGuild, createMockGuild } from "./create-mock-guild";

export type TestButtonInteraction = Pick<
  ButtonInteraction<CacheType>,
  "customId"
> & {
  editReply: jest.MockedFunction<
    (options: { content: string }) => Promise<Message>
  >;
  reply: jest.MockedFunction<
    (options: { content: string }) => Promise<InteractionResponse>
  >;
  deferReply: jest.MockedFunction<() => Promise<InteractionResponse>>;
  user: TestUser;
  guild: TestGuild;
  client: TestClient;
};

export interface MockButtonInteractionOptions {
  customId?: string;
  user?: TestUser;
  guild?: TestGuild;
  client?: TestClient;
}

export function createMockButtonInteraction({
  customId = "test-button",
  user = createMockUser(),
  client = createMockClient(),
  guild = createMockGuild(),
}: MockButtonInteractionOptions = {}): TestButtonInteraction {
  return {
    customId,
    user,
    guild,
    client,
    editReply:
      createTypedMock<(options: { content: string }) => Promise<Message>>(),
    reply:
      createTypedMock<
        (options: { content: string }) => Promise<InteractionResponse>
      >(),
    deferReply: createTypedMock<() => Promise<InteractionResponse>>(),
  };
}
