/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
// eslint-disable-next-line no-undef
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@db/(.*)$": "<rootDir>/src/db/$1",
    "^@features/(.*)$": "<rootDir>/src/features/$1",
    "^@listeners/(.*)$": "<rootDir>/src/listeners/$1",
    "^@resources/(.*)$": "<rootDir>/src/resources/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
  },
};
