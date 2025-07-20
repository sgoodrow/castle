import { mockConfig } from "./helpers/config-test-helper";
import "./matchers/discord-matchers";

// Mock config immediately when this module loads
mockConfig();

// Mock the main index file to prevent event listener setup during tests
jest.mock("../index", () => ({
  // Mock the main bot client setup
}));

// Mock the database to prevent initialization errors during tests
jest.mock("../db/data-source", () => ({
  dataSource: {
    initialize: jest.fn().mockResolvedValue({
      driver: {
        postgres: {
          defaults: { parseInputDatesAsUTC: true },
          types: { setTypeParser: jest.fn() },
        },
      },
    }),
  },
}));

// Mock Redis to prevent connection errors during tests
jest.mock("../redis/client", () => ({
  redisClient: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    hGet: jest.fn().mockResolvedValue(null),
    hSet: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock bot services to prevent environment variable errors
jest.mock("../services/bot/public-accounts-sheet", () => ({
  SheetPublicAccountService: class {
    static getInstance() {
      return {
        getBots: jest.fn().mockResolvedValue([]),
        getBotsByClass: jest.fn().mockResolvedValue([]),
      };
    }
  },
}));

jest.mock("../services/bot/bot-factory", () => ({
  PublicAccountsFactory: {
    getService: jest.fn().mockReturnValue({
      getBots: jest.fn().mockResolvedValue([]),
      getBotsByClass: jest.fn().mockResolvedValue([]),
      doBotCheckout: jest.fn().mockResolvedValue(undefined),
      updateBotRowDetails: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock problematic services that use axios
jest.mock("../services/castledkp", () => ({
  CastleDkpService: class {
    async getDkp() {
      return [];
    }
    async getDkpForPlayer() {
      return [];
    }
  },
}));

jest.mock("../services/betaDkpService", () => ({
  BetaDkpService: class {
    async getDkp() {
      return [];
    }
    async getDkpForPlayer() {
      return [];
    }
  },
}));

// Create global Discord mocks with better defaults
const mockCreateOrUpdateInstructions = jest.fn().mockResolvedValue(undefined);
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
jest.mock("../shared/action/instructions-ready-action", () => ({
  InstructionsReadyAction: class {
    createOrUpdateInstructions = mockCreateOrUpdateInstructions;
    getChannel = mockGetChannel;
  },
}));

jest.mock("../shared/action/ready-action", () => ({
  readyActionExecutor: mockReadyActionExecutor,
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Reset mocks with better defaults
  globalDiscordMocks.createOrUpdateInstructions.mockReset().mockResolvedValue(undefined);
  globalDiscordMocks.getChannel.mockReset().mockResolvedValue({
    id: "111222333",
    type: 11, // ChannelType.PublicThread
    send: jest.fn().mockResolvedValue(undefined),
  });
  globalDiscordMocks.readyActionExecutor
    .mockReset()
    .mockImplementation((action) => action.execute());
  mockConfig();
});
