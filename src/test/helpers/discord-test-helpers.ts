/**
 * Discord testing utilities and constants
 * NOTE: Mocking is now handled globally in src/test/setup.ts
 * This file contains only utility functions and constants
 */

/**
 * Standard test configuration constants
 * Use these in your tests to avoid magic strings
 */
export const DISCORD_TEST_CONFIG = {
  applicationsChannelId: "999888777",
  requestDumpThreadId: "111222333",
} as const;

/**
 * Common Discord channel types for testing
 */
export const DISCORD_CHANNEL_TYPES = {
  GUILD_TEXT: 0,
  PUBLIC_THREAD: 11,
  PRIVATE_THREAD: 12,
} as const;

/**
 * Helper to create a consistent thread channel mock structure
 */
export function createThreadChannelMock(id = "111222333") {
  return {
    id,
    type: DISCORD_CHANNEL_TYPES.PUBLIC_THREAD,
    send: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Helper to create a consistent text channel mock structure
 */
export function createTextChannelMock(id = "999888777") {
  return {
    id,
    type: DISCORD_CHANNEL_TYPES.GUILD_TEXT,
    send: jest.fn().mockResolvedValue(undefined),
  };
}
