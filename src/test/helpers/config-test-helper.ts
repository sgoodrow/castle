/**
 * Config testing utilities
 * Provides easy config mocking with automatic cleanup
 */

import { jest } from "@jest/globals";

/**
 * Mock the config module with custom values
 * Automatically resets after each test via global beforeEach
 */
export function mockConfig(configOverrides: Record<string, string> = {}) {
  const testConfig = {
    // Top-level exports to match the real config structure
    applicationsChannelId: "999888777",
    requestDumpThreadId: "111222333",
    bankChannelId: "bank-123",
    vaultChannelId: "vault-456",
    auctionChannelId: "auction-789",
    ...configOverrides,
  };

  jest.mock("../../config", () => testConfig);

  return testConfig;
}
