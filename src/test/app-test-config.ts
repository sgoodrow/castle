/**
 * Application-specific test configuration
 * This contains bot-specific defaults that should not be in the generic test infrastructure
 */

import {
  DiscordEnvironmentOptions,
  createDiscordEnvironment,
} from "./discord-testing-library/create-discord-environment";

/**
 * Default configuration for this Discord bot's tests
 * Includes channels, users, and other bot-specific setup
 */
export const DEFAULT_BOT_TEST_CONFIG: DiscordEnvironmentOptions = {
  guildName: "Castle Guild",
  defaultUsers: ["testuser"],
  defaultChannels: [
    { name: "general", type: "text" },
    { name: "request-dump", id: "111222333", type: "thread" }, // Bot-specific channel
  ],
};

/**
 * Creates a Discord environment with bot-specific defaults
 * Use this instead of createDiscordEnvironment() directly in bot tests
 */
export function createBotTestEnvironment(overrides: DiscordEnvironmentOptions = {}) {
  return createDiscordEnvironment({
    ...DEFAULT_BOT_TEST_CONFIG,
    ...overrides,
  });
}
