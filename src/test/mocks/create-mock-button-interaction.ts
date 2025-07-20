import { ButtonInteraction, CacheType, InteractionType, ComponentType, Client } from "discord.js";
import { createTypedMock } from "../utils/create-typed-mock";
import { MockUser, createMockUser } from "./create-mock-user";
import { createMockClient } from "./create-mock-client";
import { MockGuild, createMockGuild } from "./create-mock-guild";

// Create a partial ButtonInteraction that focuses on what we actually test
type TestableButtonInteraction = Pick<
  ButtonInteraction<CacheType>,
  "customId" | "type" | "componentType" | "id" | "token" | "version" | "applicationId"
> & {
  user: MockUser;
  guild: MockGuild | null;
  client: Client;
  editReply: jest.MockedFunction<ButtonInteraction["editReply"]>;
  reply: jest.MockedFunction<ButtonInteraction["reply"]>;
  deferReply: jest.MockedFunction<ButtonInteraction["deferReply"]>;
  isAutocomplete: jest.MockedFunction<() => boolean>;
  isButton: jest.MockedFunction<() => boolean>;
  isChatInputCommand: jest.MockedFunction<() => boolean>;
};

export interface MockButtonInteractionOptions {
  customId?: string;
  user?: MockUser;
  guild?: MockGuild;
  client?: Client;
}

export function createMockButtonInteraction({
  customId = "test-button",
  user = createMockUser(),
  client = createMockClient(),
  guild = createMockGuild(),
}: MockButtonInteractionOptions = {}): ButtonInteraction<CacheType> {
  const mock: TestableButtonInteraction = {
    customId,
    user,
    guild,
    client,
    type: InteractionType.MessageComponent,
    componentType: ComponentType.Button,
    id: "interaction-id",
    token: "interaction-token",
    version: 1,
    applicationId: "app-id",
    editReply: createTypedMock<ButtonInteraction["editReply"]>(),
    reply: createTypedMock<ButtonInteraction["reply"]>(),
    deferReply: createTypedMock<ButtonInteraction["deferReply"]>(),
    isAutocomplete: jest.fn().mockReturnValue(false),
    isButton: jest.fn().mockReturnValue(true),
    isChatInputCommand: jest.fn().mockReturnValue(false),
  };

  // TypeScript magic: return as full ButtonInteraction
  // This works because ButtonInteraction will have all the properties we need,
  // and TypeScript structural typing means our mock is compatible
  return mock as unknown as ButtonInteraction<CacheType>;
}
