/**
 * Matcher for checking if a user sent a DM
 */

import { expect } from "@jest/globals";
import { MessageCreateOptions, Message } from "discord.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveSentDm(expectedContent?: string | RegExp): R;
    }
  }
}

expect.extend({
  toHaveSentDm(
    received: {
      send: jest.MockedFunction<(options: MessageCreateOptions) => Promise<Message>>;
    },
    expectedContent?: string | RegExp
  ) {
    const mockSend = received.send;

    if (!mockSend.mock.calls.length) {
      return {
        message: () => `Expected user to have sent a DM, but no DM was sent`,
        pass: false,
      };
    }

    if (!expectedContent) {
      return {
        message: () => `Expected user to have sent a DM`,
        pass: true,
      };
    }

    const lastCall = mockSend.mock.calls[mockSend.mock.calls.length - 1];
    const messageOptions = lastCall[0];
    const actualContent =
      typeof messageOptions === "string"
        ? messageOptions
        : (messageOptions as { content?: string })?.content;

    if (!actualContent) {
      return {
        message: () => `Expected user to have sent a DM with content, but no content found`,
        pass: false,
      };
    }

    const contentMatches =
      typeof expectedContent === "string"
        ? actualContent === expectedContent
        : expectedContent.test(actualContent);

    return {
      message: () =>
        contentMatches
          ? `Expected user to not have sent a DM with content matching ${expectedContent}, but it did`
          : `Expected user to have sent a DM with content matching ${expectedContent}, but received: ${actualContent}`,
      pass: contentMatches,
    };
  },
});
