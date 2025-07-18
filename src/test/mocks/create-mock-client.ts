import { Client } from "discord.js";

export type TestClient = {
  user: { id: string };
};

export interface MockClientOptions {
  id?: string;
}

export function createMockClient({
  id = "bot123456",
}: MockClientOptions = {}): TestClient {
  return {
    user: {
      id,
    },
  };
}
