/**
 * MockClient for Discord Testing Library
 */

import { Client } from "discord.js";

export interface MockClientOptions {
  id?: string;
}

export function createMockClient({ id = "bot123456" }: MockClientOptions = {}): Client {
  // Create a minimal Client mock that satisfies the interface
  const mockClient = {
    user: {
      id,
    },
    // Add other Client properties that might be needed
    // Most Client properties are optional or have default values
  };

  // Return as proper Client type using TypeScript structural typing
  return mockClient as unknown as Client;
}
