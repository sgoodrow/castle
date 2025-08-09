/**
 * Matchers for checking button properties
 */

import { expect } from "@jest/globals";
import { ButtonBuilder } from "discord.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveLabel(expectedLabel: string): R;
      toHaveCustomId(expectedCustomId: string): R;
      toHaveButtonStyle(expectedStyle: number): R;
    }
  }
}

expect.extend({
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

  toHaveButtonStyle(received: ButtonBuilder, expectedStyle: number) {
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
