/**
 * Matchers for checking interaction responses
 */

import { expect } from "@jest/globals";
import { InteractionResponse, Message } from "discord.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveRepliedWith(expectedContent: string | RegExp): R;
      toHaveEditedReplyWith(expectedContent: string | RegExp): R;
    }
  }
}

expect.extend({
  toHaveRepliedWith(
    received: {
      reply: jest.MockedFunction<(options: { content: string }) => Promise<InteractionResponse>>;
    },
    expectedContent: string | RegExp
  ) {
    const mockReply = received.reply;

    if (!mockReply.mock.calls.length) {
      return {
        message: () => `Expected interaction to have replied, but no reply was sent`,
        pass: false,
      };
    }

    const lastCall = mockReply.mock.calls[mockReply.mock.calls.length - 1];
    const actualContent = lastCall[0]?.content || lastCall[0];

    const contentMatches =
      typeof expectedContent === "string"
        ? actualContent === expectedContent
        : expectedContent.test(String(actualContent));

    return {
      message: () =>
        contentMatches
          ? `Expected interaction to not have replied with content matching ${expectedContent}, but it did`
          : `Expected interaction to have replied with content matching ${expectedContent}, but received: ${actualContent}`,
      pass: contentMatches,
    };
  },

  toHaveEditedReplyWith(
    received: {
      editReply: jest.MockedFunction<(options: { content: string }) => Promise<Message>>;
    },
    expectedContent: string | RegExp
  ) {
    const mockEditReply = received.editReply;

    if (!mockEditReply.mock.calls.length) {
      return {
        message: () => `Expected interaction to have edited a reply, but no edit-reply was sent`,
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
          ? `Expected interaction to not have edited a reply with content matching ${expectedContent}, but it did`
          : `Expected interaction to have edited a reply with content matching ${expectedContent}, but received: ${actualContent}`,
      pass: contentMatches,
    };
  },
});
