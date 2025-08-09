/**
 * Enhanced MockChannel for Discord Testing Library
 */

import { Message } from "discord.js";
import { createTypedMock } from "../utils/create-typed-mock";

export type MockChannel = {
  id: string;
  type: number;
  send: jest.MockedFunction<(content: string) => Promise<Message>>;
  name: string;
  channelType: "text" | "thread";
};

export function createMockChannel(
  name: string,
  options: { id?: string; type?: "text" | "thread" } = {}
): MockChannel {
  const channelId =
    options.id || `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const channelType = options.type || "thread";

  return {
    id: channelId,
    type: channelType === "text" ? 0 : 11, // ChannelType values
    send: createTypedMock<(content: string) => Promise<Message>>(),
    name,
    channelType,
  };
}
