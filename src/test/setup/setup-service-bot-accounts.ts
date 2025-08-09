/**
 * Bot accounts service mocking utilities for tests
 */

jest.mock("../../services/bot/public-accounts-sheet", () => ({
  SheetPublicAccountService: class {
    static getInstance() {
      return {
        getBots: jest.fn().mockResolvedValue([]),
        getBotsByClass: jest.fn().mockResolvedValue([]),
      };
    }
  },
}));

jest.mock("../../services/bot/bot-factory", () => ({
  PublicAccountsFactory: {
    getService: jest.fn().mockReturnValue({
      getBots: jest.fn().mockResolvedValue([]),
      getBotsByClass: jest.fn().mockResolvedValue([]),
      doBotCheckout: jest.fn().mockResolvedValue(undefined),
      updateBotRowDetails: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
