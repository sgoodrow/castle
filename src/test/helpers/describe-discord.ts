/**
 * Discord test helper that provides pre-configured mocks and setup
 *
 * IMPORTANT: You still need to call mockConfig() at the top of your test file
 * before importing modules that depend on config. This helper provides the
 * Discord environment and standardized setup.
 *
 * The approach uses a special `it` function that receives test objects as parameters.
 * For button interactions, you can create them directly:
 *
 * ```typescript
 * import { when } from "../../test/helpers/describe-discord";
 * import { createMockButtonInteraction } from "../../test/mocks/create-mock-button-interaction";
 * import { interactionCreateListener } from "../../listeners/interaction-create-listener";
 *
 * when("handling volunteer applications", ({ discord, it }) => {
 *   it("creates button with proper styling", async ({ interaction, threadChannel, user, guild }) => {
 *     // Test button creation
 *     const buttonBuilder = requestApplication.getButtonBuilder(ButtonStyle.Primary);
 *     expect(buttonBuilder).toHaveCustomId("volunteer-application");
 *   });
 *
 *   it("sends application form when user clicks volunteer button", async ({ user, guild }) => {
 *     // Simulate user clicking the button - direct and simple!
 *     const buttonInteraction = createMockButtonInteraction({
 *       customId: "volunteer-application",
 *       user,
 *       guild,
 *     });
 *
 *     await interactionCreateListener(buttonInteraction);
 *
 *     // The interaction is processed through the real Discord flow
 *     // You can verify results through your test assertions
 *   });
 * });
 * ```
 */

import { createMockClient } from "../mocks/create-mock-client";
import { setupInteractionTest, InteractionTestSetupOptions } from "./test-setup";
import { mockConfig } from "./config-test-helper";
import { Client } from "discord.js";

export interface DiscordTestContext {
  discord: Client;
  setupInteraction: (
    options?: InteractionTestSetupOptions
  ) => ReturnType<typeof setupInteractionTest>;
  it: (
    testName: string,
    testFn: (objects: {
      interaction: Awaited<ReturnType<typeof setupInteractionTest>>["interaction"];
      threadChannel: Awaited<ReturnType<typeof setupInteractionTest>>["threadChannel"];
      user: Awaited<ReturnType<typeof setupInteractionTest>>["user"];
      guild: Awaited<ReturnType<typeof setupInteractionTest>>["guild"];
    }) => void | Promise<void>
  ) => void;
}

export interface WhenOptions {
  config?: Record<string, any>;
}

// Global interaction setup that gets populated by beforeEach
let currentInteraction: Awaited<ReturnType<typeof setupInteractionTest>> | null = null;

/**
 * Pre-configured Discord test environment with BDD-style syntax
 * Automatically sets up interaction, threadChannel, user, and guild objects
 * Access them via the special `it` function that receives them as parameters
 *
 * Usage:
 * ```typescript
 * import { when } from "../../test/helpers/describe-discord";
 * // ... other imports
 *
 * when("handling volunteer applications", ({ discord, it }) => {
 *   it("processes workflow correctly", async ({ interaction, threadChannel, user, guild }) => {
 *     await myFunction(discord);
 *
 *     // Objects are automatically set up and ready to use
 *     await requestApplication.execute(interaction);
 *     expect(threadChannel).toHaveReceivedMessage(...);
 *   });
 * });
 *
 * // With custom config
 * when("handling special case", { config: { customValue: "test" } }, ({ discord, it }) => {
 *   it("works with custom config", async ({ interaction, threadChannel, user, guild }) => {
 *     // This test runs with custom config values
 *   });
 * });
 * ```
 */
export function when(
  scenario: string,
  options: WhenOptions | ((context: DiscordTestContext) => void),
  fn?: (context: DiscordTestContext) => void
) {
  // Handle overloaded signatures: when(scenario, fn) or when(scenario, options, fn)
  const actualOptions = typeof options === "function" ? {} : options;
  const actualFn = typeof options === "function" ? options : fn;

  if (!actualFn) {
    throw new Error("when() requires a test function");
  }

  return describe(`when ${scenario}`, () => {
    const discord = createMockClient();

    beforeEach(async () => {
      // Apply custom config if provided
      if (actualOptions?.config) {
        mockConfig(actualOptions.config);
      }
      currentInteraction = await setupInteractionTest();
    });

    afterEach(() => {
      currentInteraction = null;
    });

    const context: DiscordTestContext = {
      discord,
      setupInteraction: (options?: InteractionTestSetupOptions) => setupInteractionTest(options),
      it: (
        testName: string,
        testFn: (objects: {
          interaction: Awaited<ReturnType<typeof setupInteractionTest>>["interaction"];
          threadChannel: Awaited<ReturnType<typeof setupInteractionTest>>["threadChannel"];
          user: Awaited<ReturnType<typeof setupInteractionTest>>["user"];
          guild: Awaited<ReturnType<typeof setupInteractionTest>>["guild"];
        }) => void | Promise<void>
      ) => {
        it(testName, async () => {
          if (!currentInteraction) {
            throw new Error("Interaction not set up - make sure to use when() properly");
          }
          await testFn({
            interaction: currentInteraction.interaction,
            threadChannel: currentInteraction.threadChannel,
            user: currentInteraction.user,
            guild: currentInteraction.guild,
          });
        });
      },
    };

    actualFn(context);
  });
}
