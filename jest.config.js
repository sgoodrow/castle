/* eslint-disable no-undef */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  transformIgnorePatterns: ["node_modules/(?!(axios|axios-retry|lru-cache)/)"],
  moduleNameMapper: {
    "^axios$": require.resolve("axios"),
  },
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};
