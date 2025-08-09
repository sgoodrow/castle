/**
 * Matcher for checking embed fixtures
 */

import { expect } from "@jest/globals";
import { EmbedBuilder } from "discord.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchEmbedFixture(expectedEmbed: object): R;
    }
  }
}

expect.extend({
  toMatchEmbedFixture(received: EmbedBuilder, expectedEmbed: object) {
    const actualEmbed = received.toJSON();
    const embedsMatch = JSON.stringify(expectedEmbed) === JSON.stringify(actualEmbed);

    return {
      message: () =>
        embedsMatch
          ? `Expected embed to not match fixture, but it did`
          : `Expected embed to match fixture\n\nExpected:\n${JSON.stringify(
              expectedEmbed,
              null,
              2
            )}\n\nReceived:\n${JSON.stringify(actualEmbed, null, 2)}`,
      pass: embedsMatch,
    };
  },
});
