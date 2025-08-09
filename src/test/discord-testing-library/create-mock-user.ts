/**
 * Enhanced MockUser for Discord Testing Library
 */

import { Client, Message, MessageCreateOptions } from "discord.js";
import { createTypedMock } from "../utils/create-typed-mock";
import { createMockButtonInteraction } from "./create-mock-button-interaction";
import { interactionCreateListener } from "../../listeners/interaction-create-listener";
// Forward declaration to avoid circular dependency
export interface MockGuild {
  id: string;
  channels: {
    fetch: jest.MockedFunction<any>;
  };
}

export type MockUser = {
  id: string;
  username: string;
  send: jest.MockedFunction<(options: MessageCreateOptions) => Promise<Message>>;
  clickButton(customId: string): Promise<void>;
  lastInteraction?: {
    editReply: jest.MockedFunction<any>;
    deferReply: jest.MockedFunction<any>;
  };
  _guild?: MockGuild;
  _client?: Client;
};

export function createMockUser(
  options: { id?: string; username: string; guild?: MockGuild; client?: Client } = {
    username: "testuser",
  }
): MockUser {
  const {
    id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username,
    guild,
    client,
  } = options;

  return {
    id,
    username,
    send: createTypedMock<(options: MessageCreateOptions) => Promise<Message>>(),
    _guild: guild,
    _client: client,
    clickButton: async function (customId: string) {
      if (!this._guild || !this._client) {
        throw new Error("MockUser must be created through discord environment to use clickButton");
      }

      const interaction = createMockButtonInteraction({
        customId,
        user: this as any,
        guild: this._guild as any,
        client: this._client,
      });

      this.lastInteraction = {
        editReply: interaction.editReply as jest.MockedFunction<any>,
        deferReply: interaction.deferReply as jest.MockedFunction<any>,
      };

      await interactionCreateListener(interaction);
    },
  };
}
