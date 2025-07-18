import { TestButtonInteraction } from "../mocks/create-mock-button-interaction";
import { TestClient } from "../mocks/create-mock-client";
export async function executeButtonCommand(
  command: { execute: (interaction: TestButtonInteraction) => Promise<void> },
  interaction: TestButtonInteraction
): Promise<void> {
  return command.execute(interaction);
}

export function executeWithMockClient<T>(
  fn: (client: TestClient) => T,
  client: TestClient
): T {
  return fn(client);
}
