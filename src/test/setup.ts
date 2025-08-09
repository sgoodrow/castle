// Side-effect: Jest mocks for database
import "./setup/setup-database";
// Side-effect: Jest mocks for Redis
import "./setup/setup-redis";
// Side-effect: Jest mocks for bot accounts service
import "./setup/setup-service-bot-accounts";
// Side-effect: Jest mocks for DKP service
import "./setup/setup-service-dkp";
// Side-effect: Extends Jest expect with custom matchers
import "./matchers"; // Side-effect: Extends Jest expect with custom matchers
import { resetMockConfig } from "./setup/setup-test-config";
import { resetDiscordMocks } from "./setup/setup-discord-actions";
import { discordComponentRegistry } from "./discord-testing-library/discord-component-registry";

beforeEach(() => {
  jest.clearAllMocks();
  resetDiscordMocks();
  discordComponentRegistry.clear();
  resetMockConfig();
});
