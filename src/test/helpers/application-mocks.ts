/**
 * Common mock functions for application tests
 * Import these in your test files to get consistent mock instances
 */

export const mockCreateOrUpdateInstructions = jest.fn();
export const mockGetChannel = jest.fn();

/**
 * Reset all application mocks - call in beforeEach
 */
export function resetApplicationMocks() {
  mockCreateOrUpdateInstructions.mockReset();
  mockGetChannel.mockReset();
}

/**
 * Test configuration constants
 */
export const TEST_CHANNELS = {
  requestDumpThreadId: "111222333",
  applicationsChannelId: "999888777",
} as const; 