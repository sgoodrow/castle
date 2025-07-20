/**
 * Reusable Discord UI testing helpers
 * Beautiful, generic helpers for testing Discord component creation across all features
 */

import { ButtonStyle } from "discord.js";
import { globalDiscordMocks } from "../setup";

/**
 * Verifies that a button was created with the specified properties
 * Works across all Discord features that create buttons
 */
export function expectButtonCreated(
  customId: string,
  label: string,
  style: ButtonStyle = ButtonStyle.Primary
) {
  expect(globalDiscordMocks.createOrUpdateInstructions).toHaveBeenCalledWith(
    expect.objectContaining({
      components: expect.arrayContaining([
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                custom_id: customId,
                label: label,
                style: style,
              }),
            }),
          ]),
        }),
      ]),
    }),
    expect.any(String)
  );
}

/**
 * Verifies that specific instructions were created (for any Discord UI)
 */
export function expectInstructionsCreated(instructionKey: string) {
  expect(globalDiscordMocks.createOrUpdateInstructions).toHaveBeenCalledWith(
    expect.any(Object),
    instructionKey
  );
}

/**
 * Gets the button builder from the most recent createOrUpdateInstructions call
 * Useful for detailed button property testing
 */
export function getCreatedButtonBuilder(buttonIndex = 0) {
  const call = globalDiscordMocks.createOrUpdateInstructions.mock.calls[0][0] as any;
  return call.components[0].components[buttonIndex];
}

/**
 * Gets all button builders from the most recent createOrUpdateInstructions call
 */
export function getCreatedButtonBuilders() {
  const call = globalDiscordMocks.createOrUpdateInstructions.mock.calls[0][0] as any;
  return call.components[0].components;
}

/**
 * Verifies that an embed was created with the specified title
 * Extensible for other embed properties
 */
export function expectEmbedCreated(title: string, description?: string) {
  const embedMatcher = description
    ? expect.objectContaining({
        data: expect.objectContaining({
          title,
          description,
        }),
      })
    : expect.objectContaining({
        data: expect.objectContaining({
          title,
        }),
      });

  expect(globalDiscordMocks.createOrUpdateInstructions).toHaveBeenCalledWith(
    expect.objectContaining({
      embeds: expect.arrayContaining([embedMatcher]),
    }),
    expect.any(String)
  );
}

/**
 * Gets the embed from the most recent createOrUpdateInstructions call
 */
export function getCreatedEmbed(embedIndex = 0) {
  const call = globalDiscordMocks.createOrUpdateInstructions.mock.calls[0][0] as any;
  return call.embeds[embedIndex];
}
