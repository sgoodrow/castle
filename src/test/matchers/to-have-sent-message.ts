/**
 * Matcher for checking if a channel sent a message
 */

import { expect } from "@jest/globals";
import { Message } from "discord.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveSentMessage(expectedContent?: string | RegExp): R;
    }
  }
}

expect.extend({
  toHaveSentMessage(
    received: {
      send: jest.MockedFunction<(content: string) => Promise<Message>>;
    },
    expectedContent?: string | RegExp
  ) {
    const mockSend = received.send;

    if (!mockSend.mock.calls.length) {
      return {
        message: () => `Expected channel to have sent a message, but no message was sent`,
        pass: false,
      };
    }

    if (!expectedContent) {
      return {
        message: () => `Expected channel to have sent a message`,
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
        message: () => `Expected channel to have sent a message with content, but no content found`,
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
          ? `Expected channel to not have sent a message with content matching ${expectedContent}, but it did`
          : `Expected channel to have sent a message with content matching ${expectedContent}, but received: ${actualContent}`,
      pass: contentMatches,
    };
  },
});
