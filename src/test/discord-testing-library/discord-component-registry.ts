/**
 * Generic Discord component registry for test infrastructure
 * This should not know about any bot-specific concepts like "instructions"
 */

import { ButtonBuilder, EmbedBuilder } from "discord.js";

class DiscordComponentRegistry {
  private buttons: ButtonBuilder[] = [];
  private embeds: EmbedBuilder[] = [];

  registerButton(button: ButtonBuilder) {
    this.buttons.push(button);
  }

  registerEmbed(embed: EmbedBuilder) {
    this.embeds.push(embed);
  }

  findButton(label: string, options?: { style?: number }): ButtonBuilder | null {
    const matchingButtons = this.buttons.filter((button) => {
      if (button.data.label !== label) {
        return false;
      }
      if (options?.style !== undefined && button.data.style !== options.style) {
        return false;
      }
      return true;
    });

    if (matchingButtons.length === 0) {
      return null;
    }

    if (matchingButtons.length > 1) {
      const styles = matchingButtons.map((b) => `style ${b.data.style}`).join(", ");
      throw new Error(
        `Found ${matchingButtons.length} buttons with label "${label}" (${styles}). ` +
          `Please specify a style to narrow the selection: findButton("${label}", { style: ... })`
      );
    }

    return matchingButtons[0];
  }

  findEmbed(title: string): EmbedBuilder | null {
    return this.embeds.find((embed) => embed.data.title === title) || null;
  }

  getButtons(): ButtonBuilder[] {
    return [...this.buttons];
  }

  getEmbeds(): EmbedBuilder[] {
    return [...this.embeds];
  }

  clear() {
    this.buttons = [];
    this.embeds = [];
  }
}

export const discordComponentRegistry = new DiscordComponentRegistry();
