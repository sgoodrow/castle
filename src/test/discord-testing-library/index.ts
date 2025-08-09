/**
 * Discord Testing Library - A comprehensive testing framework for Discord bots
 *
 * Provides a Testing Library-style API for Discord bot testing with:
 * - Realistic Discord environment simulation
 * - User interaction simulation
 * - Enhanced assertions
 * - Smart defaults with automatic global config setup
 * - Full integration with existing test patterns
 */

export { createDiscordEnvironment } from "./create-discord-environment";
export type {
  DiscordTestEnvironment,
  DiscordEnvironmentOptions,
} from "./create-discord-environment";
export type { MockGuild } from "./create-mock-guild";
export type { MockUser } from "./create-mock-user";
export type { MockChannel } from "./create-mock-channel";
