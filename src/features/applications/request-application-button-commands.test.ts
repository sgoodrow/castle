import { RequestApplication } from "./request-application-button-commands";
import { updateApplicationInfo } from "./update-applications";
import {
  setupApplicationTest,
  extractDmContent,
} from "../../test/helpers/test-setup";
import {
  setupDiscordMocks,
  resetDiscordMocks,
} from "../../test/helpers/discord-test-helpers";
import { createMockGuild } from "../../test/mocks/create-mock-guild";
import { createMockButtonInteraction } from "../../test/mocks/create-mock-button-interaction";
import { createMockClient } from "../../test/mocks/create-mock-client";
import { ButtonStyle, Client } from "discord.js";

// =============================================================================
// SETUP - Reduced from 20+ lines to 1 line!
// =============================================================================

const discordMocks = setupDiscordMocks();

// =============================================================================
// TESTS
// =============================================================================

describe("Application System", () => {
  beforeEach(() => {
    resetDiscordMocks(discordMocks);
  });

  describe("Integration Tests (via updateApplicationInfo)", () => {
    let client: Client;

    beforeEach(() => {
      client = createMockClient();
    });

    it("should create and execute volunteer application workflow end-to-end", async () => {
      // 1. updateApplicationInfo creates the Discord UI with button
      await updateApplicationInfo(client);

      // Verify the UI was created with correct button
      expect(discordMocks.createOrUpdateInstructions).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  data: expect.objectContaining({
                    custom_id: "volunteer-application",
                    label: "Volunteer Application",
                  }),
                }),
              ]),
            }),
          ]),
        }),
        "applicationInstructions"
      );

      // 2. User clicks the button that was created
      const { interaction, threadChannel } = await setupApplicationTest();
      const requestApplication = new RequestApplication();
      await requestApplication.execute(interaction);

      // 3. Verify the complete user journey works
      expect(interaction.user).toHaveReceivedMessage(
        /DO NOT REPLY TO THIS MESSAGE/
      );
      expect(interaction).toHaveEditedReply(
        "You have been DM'd the **Volunteer Application**."
      );
      expect(threadChannel).toHaveReceivedMessage(
        `Volunteer Application sent to **${interaction.user.username}** (<@${interaction.user.id}>)`
      );
    });

    it("should create button with correct properties for Discord integration", async () => {
      await updateApplicationInfo(client);

      const call = discordMocks.createOrUpdateInstructions.mock
        .calls[0][0] as any;
      const buttonBuilder = call.components[0].components[0];

      expect(buttonBuilder).toHaveCustomId("volunteer-application");
      expect(buttonBuilder).toHaveLabel("Volunteer Application");
      expect(buttonBuilder).toHaveReceivedButtonStyle(ButtonStyle.Primary);
    });

    it("should include complete application content in DM", async () => {
      await updateApplicationInfo(client);

      const { interaction } = await setupApplicationTest();
      const requestApplication = new RequestApplication();
      await requestApplication.execute(interaction);

      const content = extractDmContent(interaction);
      expect(content).toContain("DO NOT REPLY TO THIS MESSAGE");
      expect(content).toContain("How do I apply?");
      expect(content).toContain(
        "https://docs.google.com/forms/d/e/1FAIpQLSelYSgoouJCOIV9qoOQ1FdOXj8oGC2pfv7P47iUUd1hjOic-g/viewform"
      );
      expect(content).toContain("What happens to an application?");
      expect(content).toContain("less than a week");
    });
  });

  describe("Unit Tests (Edge Cases & Error Handling)", () => {
    let requestApplication: RequestApplication;

    beforeEach(() => {
      requestApplication = new RequestApplication();
    });

    it("should throw error if request dump channel not found", async () => {
      const guild = createMockGuild({ threadChannels: [] });
      const interaction = createMockButtonInteraction({ guild });

      await expect(requestApplication.execute(interaction)).rejects.toThrow(
        "Could not locate the request dump channel"
      );
    });

    it("should throw error if channel is not a public thread", async () => {
      const guild = createMockGuild({
        textChannels: [{ id: "111222333" }], // Wrong channel type
      });
      const interaction = createMockButtonInteraction({ guild });

      await expect(requestApplication.execute(interaction)).rejects.toThrow(
        "111222333 is not a text channel"
      );
    });

    it("should have correct label for button creation", () => {
      expect(requestApplication.label).toBe("Volunteer Application");
    });

    it("should have correct customId inherited from ButtonCommand", () => {
      expect(requestApplication.customId).toBe("volunteer-application");
    });

    it("should create button builder with specified style", () => {
      const buttonBuilder = requestApplication.getButtonBuilder(
        ButtonStyle.Secondary
      );

      expect(buttonBuilder).toHaveCustomId("volunteer-application");
      expect(buttonBuilder).toHaveLabel("Volunteer Application");
      expect(buttonBuilder).toHaveReceivedButtonStyle(ButtonStyle.Secondary);
    });
  });
});
