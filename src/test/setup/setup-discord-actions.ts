/**
 * Discord action mocking utilities for tests
 */

import { discordComponentRegistry } from "../discord-testing-library/discord-component-registry";

// Create global Discord mocks with better defaults
const mockCreateOrUpdateInstructions = jest.fn().mockImplementation((instructions) => {
  // Register components in the generic registry when instructions are created
  if (instructions?.components) {
    for (const component of instructions.components) {
      if (component?.components) {
        for (const item of component.components) {
          if (item?.data?.custom_id) {
            discordComponentRegistry.registerButton(item);
          }
        }
      }
    }
  }
  if (instructions?.embeds) {
    for (const embed of instructions.embeds) {
      discordComponentRegistry.registerEmbed(embed);
    }
  }
  return Promise.resolve(undefined);
});

const mockGetChannel = jest.fn().mockResolvedValue({
  id: "111222333",
  type: 11, // ChannelType.PublicThread
  send: jest.fn().mockResolvedValue(undefined),
});
const mockReadyActionExecutor = jest.fn((action) => action.execute());

export const globalDiscordMocks = {
  createOrUpdateInstructions: mockCreateOrUpdateInstructions,
  getChannel: mockGetChannel,
  readyActionExecutor: mockReadyActionExecutor,
};

// Set up global Discord mocks using jest.mock (hoisted!)
jest.mock("../../shared/action/instructions-ready-action", () => ({
  InstructionsReadyAction: class {
    createOrUpdateInstructions = mockCreateOrUpdateInstructions;
    getChannel = mockGetChannel;
  },
}));

jest.mock("../../shared/action/ready-action", () => ({
  readyActionExecutor: mockReadyActionExecutor,
}));

// Mock the main index file to prevent event listener setup during tests
jest.mock("../../index", () => ({
  // Mock the main bot client setup
}));

export function resetDiscordMocks() {
  // Clear call history but preserve our custom implementations
  globalDiscordMocks.createOrUpdateInstructions.mockClear();

  globalDiscordMocks.getChannel.mockReset().mockResolvedValue({
    id: "111222333",
    type: 11, // ChannelType.PublicThread
    send: jest.fn().mockResolvedValue(undefined),
  });
  globalDiscordMocks.readyActionExecutor
    .mockReset()
    .mockImplementation((action) => action.execute());
}
