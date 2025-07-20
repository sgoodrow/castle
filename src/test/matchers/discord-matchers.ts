import { expect } from "@jest/globals";
import {
  ButtonBuilder,
  EmbedBuilder,
  MessageCreateOptions,
  Message,
  InteractionResponse,
} from "discord.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveSentDm(expectedContent?: string | RegExp): R;
      toHaveSentMessage(expectedContent?: string | RegExp): R;
      toHaveReceivedMessage(expectedContent?: string | RegExp): R;
      toHaveLabel(expectedLabel: string): R;
      toHaveCustomId(expectedCustomId: string): R;
      toHaveReplied(expectedContent: string | RegExp): R;
      toHaveEditedReply(expectedContent: string | RegExp): R;
      toMatchFixture(expectedEmbed: object): R;
      toHaveReceivedButtonStyle(expectedStyle: number): R;
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

  toHaveReceivedMessage(
    received: {
      send: jest.MockedFunction<(content: string) => Promise<Message>>;
    },
    expectedContent?: string | RegExp
  ) {
    const mockSend = received.send;

    if (!mockSend.mock.calls.length) {
      return {
        message: () => `Expected to have received a message, but no message was received`,
        pass: false,
      };
    }

    if (!expectedContent) {
      return {
        message: () => `Expected to have received a message`,
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
        message: () => `Expected to have received a message with content, but no content found`,
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
          ? `Expected to not have received a message with content matching ${expectedContent}, but it did`
          : `Expected to have received a message with content matching ${expectedContent}, but received: ${actualContent}`,
      pass: contentMatches,
    };
  },

  toHaveLabel(received: ButtonBuilder, expectedLabel: string) {
    const actualLabel = received.data.label;
    const labelMatches = actualLabel === expectedLabel;

    return {
      message: () =>
        labelMatches
          ? `Expected button to not have label "${expectedLabel}", but it did`
          : `Expected button to have label "${expectedLabel}", but received: "${actualLabel}"`,
      pass: labelMatches,
    };
  },

  toHaveCustomId(
    received: ButtonBuilder | { customId: string } | { data: { custom_id: string } },
    expectedCustomId: string
  ) {
    const actualCustomId =
      "customId" in received
        ? received.customId
        : "data" in received
        ? (received.data as { custom_id?: string }).custom_id
        : undefined;
    const customIdMatches = actualCustomId === expectedCustomId;

    return {
      message: () =>
        customIdMatches
          ? `Expected to not have custom ID "${expectedCustomId}", but it did`
          : `Expected to have custom ID "${expectedCustomId}", but received: "${actualCustomId}"`,
      pass: customIdMatches,
    };
  },

  toHaveReplied(
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

  toHaveEditedReply(
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

  toMatchFixture(received: EmbedBuilder, expectedEmbed: object) {
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

  toHaveReceivedButtonStyle(received: ButtonBuilder, expectedStyle: number) {
    const actualStyle = received.data.style;
    const styleMatches = actualStyle === expectedStyle;

    return {
      message: () =>
        styleMatches
          ? `Expected button to not have style "${expectedStyle}", but it did`
          : `Expected button to have style "${expectedStyle}", but received: "${actualStyle}"`,
      pass: styleMatches,
    };
  },
});
