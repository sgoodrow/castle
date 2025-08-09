/**
 * Redis mocking utilities for tests
 */

// Mock Redis to prevent connection errors during tests
jest.mock("../../redis/client", () => ({
  redisClient: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    hGet: jest.fn().mockResolvedValue(null),
    hSet: jest.fn().mockResolvedValue(undefined),
  },
}));
