/**
 * Database mocking utilities for tests
 */

// Mock the database to prevent initialization errors during tests
jest.mock("../../db/data-source", () => ({
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
