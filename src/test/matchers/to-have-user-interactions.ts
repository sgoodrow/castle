/**
 * Matchers for checking user interactions
 */

import { expect } from "@jest/globals";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveEditedReplyWith(expectedContent: string | RegExp): R;
    }
  }
}

expect.extend({
  toHaveEditedReplyWith(
    received: {
      lastInteraction?: {
        editReply: jest.MockedFunction<any>;
      };
    },
    expectedContent: string | RegExp
  ) {
    const mockEditReply = received.lastInteraction?.editReply;

    if (!mockEditReply) {
      return {
        message: () => `Expected user to have had an interaction, but no interaction found`,
        pass: false,
      };
    }

    if (!mockEditReply.mock.calls.length) {
      return {
        message: () => `Expected user to have edited a reply, but no edit-reply was called`,
        pass: false,
      };
    }

    const lastCall = mockEditReply.mock.calls[mockEditReply.mock.calls.length - 1];
    const actualContent = lastCall[0]?.content || lastCall[0];

    const contentMatches =
      typeof expectedContent === "string"
        ? actualContent === expectedContent
        : expectedContent.test(String(actualContent));

    return {
      message: () =>
        contentMatches
          ? `Expected user to not have edited a reply with content matching ${expectedContent}, but it did`
          : `Expected user to have edited a reply with content matching ${expectedContent}, but received: ${actualContent}`,
      pass: contentMatches,
    };
  },
});
