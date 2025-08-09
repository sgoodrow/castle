/**
 * Config testing utilities
 * Provides easy config mocking with automatic cleanup
 */

import { jest } from "@jest/globals";

// Default test config values
export const defaultTestConfig = {
  // Top-level exports to match the real config structure
  applicationsChannelId: "999888777",
  requestDumpThreadId: "111222333",
  bankChannelId: "bank-123",
  vaultChannelId: "vault-456",
  auctionChannelId: "auction-789",
} as const;

// Create a mutable config object that we can modify
const mockConfigState = { ...defaultTestConfig };

// Mock the config module at the top level (this gets hoisted)
jest.mock("../../config", () => mockConfigState);

/**
 * Reset config to defaults and apply any overrides
 * Called once per test in beforeEach
 */
export function resetMockConfig(configOverrides: Record<string, string> = {}) {
  // Reset to defaults first
  Object.assign(mockConfigState, defaultTestConfig);

  // Apply any overrides
  Object.assign(mockConfigState, configOverrides);

  return mockConfigState;
}
