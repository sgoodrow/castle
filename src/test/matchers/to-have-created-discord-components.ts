/**
 * Matchers for Discord component creation
 */

import { expect } from "@jest/globals";
import { ButtonStyle } from "discord.js";
import { globalDiscordMocks } from "../setup/setup-discord-actions";
import type { DiscordTestEnvironment } from "../discord-testing-library";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveCreatedButton(label: string, options?: { customId?: string; style?: ButtonStyle }): R;
      toHaveCreatedEmbed(title: string, description?: string): R;
      toHaveCreatedInstructions(instructionKey: string): R;
    }
  }
}

expect.extend({
  toHaveCreatedButton(
    received: DiscordTestEnvironment,
    label: string,
    options?: { customId?: string; style?: ButtonStyle }
  ) {
    const buttonMatcher = expect.objectContaining({
      components: expect.arrayContaining([
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                label,
                ...(options?.customId && { custom_id: options.customId }),
                ...(options?.style !== undefined && { style: options.style }),
              }),
            }),
          ]),
        }),
      ]),
    });

    const wasCalled = globalDiscordMocks.createOrUpdateInstructions.mock.calls.some((call) => {
      try {
        expect(call[0]).toEqual(buttonMatcher);
        return true;
      } catch {
        return false;
      }
    });

    return {
      message: () =>
        wasCalled
          ? `Expected not to have created button "${label}"`
          : `Expected to have created button "${label}"${
              options?.customId ? ` with customId "${options.customId}"` : ""
            }${options?.style !== undefined ? ` with style ${options.style}` : ""}`,
      pass: wasCalled,
    };
  },

  toHaveCreatedEmbed(received: DiscordTestEnvironment, title: string, description?: string) {
    const embedMatcher = expect.objectContaining({
      embeds: expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            title,
            ...(description && { description }),
          }),
        }),
      ]),
    });

    const wasCalled = globalDiscordMocks.createOrUpdateInstructions.mock.calls.some((call) => {
      try {
        expect(call[0]).toEqual(embedMatcher);
        return true;
      } catch {
        return false;
      }
    });

    return {
      message: () =>
        wasCalled
          ? `Expected not to have created embed "${title}"`
          : `Expected to have created embed "${title}"${
              description ? ` with description "${description}"` : ""
            }`,
      pass: wasCalled,
    };
  },

  toHaveCreatedInstructions(received: DiscordTestEnvironment, instructionKey: string) {
    const wasCalled = globalDiscordMocks.createOrUpdateInstructions.mock.calls.some(
      (call) => call[1] === instructionKey
    );

    return {
      message: () =>
        wasCalled
          ? `Expected not to have created instructions "${instructionKey}"`
          : `Expected to have created instructions "${instructionKey}"`,
      pass: wasCalled,
    };
  },
});
