/**
 * Lightweight helpers to reduce Discord test boilerplate
 * Drop these into existing tests without changing test structure
 */

/**
 * Common config values for Discord tests
 */
export const DISCORD_TEST_CONFIG = {
  requestDumpThreadId: "111222333",
  applicationsChannelId: "999888777",
} as const;

/**
 * Helper to create the standard Discord action mocks
 * Returns the mock functions so you can use them in assertions
 */
export function createDiscordActionMocks() {
  const mockCreateOrUpdateInstructions = jest.fn();
  const mockGetChannel = jest.fn();

  return {
    mocks: {
      createOrUpdateInstructions: mockCreateOrUpdateInstructions,
      getChannel: mockGetChannel,
    },
    mockClass: class {
      createOrUpdateInstructions = mockCreateOrUpdateInstructions;
      getChannel = mockGetChannel;
    },
  };
}

/**
 * Helper to quickly set up the standard Discord test mocks
 * Use this to replace the repetitive jest.mock() calls
 */
export function setupDiscordMocks(configOverrides: Record<string, any> = {}) {
  const actionMocks = createDiscordActionMocks();

  // Mock config
  jest.mock("../../config", () => ({
    ...DISCORD_TEST_CONFIG,
    ...configOverrides,
  }));

  // Mock instructions ready action
  jest.mock("../../shared/action/instructions-ready-action", () => ({
    InstructionsReadyAction: actionMocks.mockClass,
  }));

  // Mock ready action executor
  jest.mock("../../shared/action/ready-action", () => ({
    readyActionExecutor: jest.fn((action) => action.execute()),
  }));

  return actionMocks.mocks;
}

/**
 * Helper to reset all common Discord mocks
 * Call this in beforeEach instead of manually resetting each mock
 */
export function resetDiscordMocks(mocks: {
  createOrUpdateInstructions: jest.MockedFunction<any>;
  getChannel: jest.MockedFunction<any>;
}) {
  mocks.createOrUpdateInstructions.mockReset();
  mocks.getChannel.mockReset();
} 