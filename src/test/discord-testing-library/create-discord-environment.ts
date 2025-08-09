/**
 * Main factory for creating Discord test environments
 */

import { Client } from "discord.js";
import { createMockClient } from "./create-mock-client";
import { createMockGuild, type MockGuild } from "./create-mock-guild";
import { type MockUser } from "./create-mock-user";
import { type MockChannel } from "./create-mock-channel";
import { resetMockConfig } from "../setup/setup-test-config";
import { discordComponentRegistry } from "./discord-component-registry";

export interface DiscordButton {
  label: string;
  customId?: string; // Only for interaction buttons, not URL buttons
  style: number;
  click(user: MockUser): Promise<void>;
}

export interface DiscordTestEnvironment {
  client: Client;
  guild: MockGuild;
  channels: Record<string, MockChannel>;
  users: Record<string, MockUser>;
  createGuild(name: string, options?: { id?: string }): MockGuild;
  withClient<T>(fn: (client: Client) => T | Promise<T>): Promise<T>;
  channel(name: string): MockChannel;
  getButton(label: string, options?: { style?: number }): DiscordButton;
}

export interface DiscordEnvironmentOptions {
  guildName?: string;
  guildId?: string;
  defaultUsers?: string[];
  channels?: Record<string, "text" | "thread">;
  defaultChannels?: Array<{ name: string; id?: string; type?: "text" | "thread" }>;
  config?: Record<string, any>;
}

class DiscordTestEnvironmentImpl implements DiscordTestEnvironment {
  public readonly client: Client;
  public readonly guild: MockGuild;
  public readonly channels: Record<string, MockChannel> = {};
  public readonly users: Record<string, MockUser> = {};
  private guilds: Map<string, MockGuild> = new Map();

  constructor(options: DiscordEnvironmentOptions = {}) {
    // Always set up global test config first
    resetMockConfig(options.config);

    this.client = createMockClient();

    // Create default guild
    const guildName = options.guildName || "Test Guild";
    const guildOptions = options.guildId
      ? { id: options.guildId, client: this.client }
      : { client: this.client };
    this.guild = this.createGuild(guildName, guildOptions);

    // Set up default users
    const defaultUsers = options.defaultUsers || ["testuser"];
    defaultUsers.forEach((username) => {
      const user = this.guild.createUser(username);
      this.users[username] = user;
    });

    // Set up channels - prefer simple channels config over defaultChannels
    if (options.channels) {
      Object.entries(options.channels).forEach(([name, type]) => {
        // Use default channel ID if this is a known channel name (for config consistency)
        const defaultChannel = options.defaultChannels?.find((dc) => dc.name === name);
        const channelOptions = defaultChannel?.id ? { id: defaultChannel.id, type } : { type };

        const channel = this.guild.createChannel(name, channelOptions);
        this.channels[name] = channel;
      });
    } else if (options.defaultChannels) {
      // Use explicit defaultChannels if provided
      options.defaultChannels.forEach(({ name, id, type }) => {
        const channel = this.guild.createChannel(name, { id, type });
        this.channels[name] = channel;
      });
    }
    // No default channels in generic test infrastructure
  }

  createGuild(name: string, options: { id?: string; client?: any } = {}): MockGuild {
    const guildOptions = { client: this.client, ...options };
    const guild = createMockGuild(guildOptions);

    this.guilds.set(name, guild);
    this.guilds.set(guild.id, guild);

    return guild;
  }

  async withClient<T>(fn: (client: Client) => T | Promise<T>): Promise<T> {
    return await fn(this.client);
  }

  channel(name: string): MockChannel {
    const channel = this.channels[name];
    if (!channel) {
      throw new Error(
        `Channel "${name}" not found. Available channels: ${Object.keys(this.channels).join(", ")}`
      );
    }
    return channel;
  }

  getButton(label: string, options?: { style?: number }): DiscordButton {
    const button = discordComponentRegistry.findButton(label, options);
    if (!button) {
      const availableButtons = discordComponentRegistry
        .getButtons()
        .map((b) => `"${b.data.label}" (style ${b.data.style})`)
        .join(", ");
      throw new Error(
        `Button with label "${label}" not found. Available buttons: ${availableButtons || "none"}`
      );
    }

    // For interaction buttons, extract custom_id for click functionality
    const customId = "custom_id" in button.data ? button.data.custom_id : undefined;

    return {
      label: button.data.label || "Unknown",
      customId,
      style: button.data.style || 0,
      click: async (user: MockUser) => {
        if (!customId) {
          throw new Error(
            `Cannot click URL button "${label}" - it has no custom_id for interaction`
          );
        }
        await user.clickButton(customId);
      },
    };
  }
}

export function createDiscordEnvironment(
  options: DiscordEnvironmentOptions = {}
): DiscordTestEnvironment {
  return new DiscordTestEnvironmentImpl(options);
}
