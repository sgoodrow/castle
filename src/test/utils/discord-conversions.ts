import { Client, ButtonInteraction, CacheType } from "discord.js";
import type { TestClient } from "../mocks/create-mock-client";
import type { TestButtonInteraction } from "../mocks/create-mock-button-interaction";

export function asClient(mock: TestClient): Client {
  return mock as unknown as Client;
}

export function asButtonInteraction(
  mock: TestButtonInteraction
): ButtonInteraction<CacheType> {
  return mock as unknown as ButtonInteraction<CacheType>;
}
