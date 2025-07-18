import { RequestApplication } from "./request-application-button-commands";
import { setupApplicationTest } from "../../test/helpers/test-setup";
import { createMockGuild } from "../../test/mocks/create-mock-guild";
import { createMockButtonInteraction } from "../../test/mocks/create-mock-button-interaction";
import { asButtonInteraction } from "../../test/utils/discord-conversions";
import { executeButtonCommand } from "../../test/helpers/execution-helpers";
import { MessageCreateOptions } from "discord.js";

jest.mock("../../config", () => ({
  requestDumpThreadId: "111222333",
}));

describe("RequestApplication", () => {
  let requestApplication: RequestApplication;

  beforeEach(() => {
    requestApplication = new RequestApplication();
  });

  describe("execute", () => {
    it("should send DM to user and log to request dump channel", async () => {
      const { interaction, threadChannel } = setupApplicationTest();
      const resolvedThreadChannel = await threadChannel;

      await requestApplication.execute(asButtonInteraction(interaction));

      expect(interaction.user).toHaveSentDm(/DO NOT REPLY TO THIS MESSAGE/);
      expect(interaction).toHaveEditedReply(
        "You have been DM'd the **Volunteer Application**."
      );
      expect(resolvedThreadChannel).toHaveSentMessage(
        `Volunteer Application sent to **${interaction.user.username}** (<@${interaction.user.id}>)`
      );
    });

    it("should throw error if request dump channel not found", async () => {
      const guild = createMockGuild({ threadChannels: [] });
      const interaction = createMockButtonInteraction({ guild });

      await expect(
        requestApplication.execute(asButtonInteraction(interaction))
      ).rejects.toThrow("Could not locate the request dump channel");
    });

    it("should throw error if channel is not a public thread", async () => {
      const guild = createMockGuild({
        textChannels: [{ id: "111222333" }], // Wrong channel type
      });
      const interaction = createMockButtonInteraction({ guild });

      await expect(
        requestApplication.execute(asButtonInteraction(interaction))
      ).rejects.toThrow("111222333 is not a text channel");
    });
  });

  describe("label", () => {
    it("should return correct label", () => {
      expect(requestApplication.label).toBe("Volunteer Application");
    });
  });

  describe("getButtonBuilder", () => {
    it("should create button with correct properties", () => {
      const buttonBuilder = requestApplication.getButtonBuilder(1); // ButtonStyle.Primary

      expect(buttonBuilder).toHaveCustomId("volunteer-application");
      expect(buttonBuilder).toHaveLabel("Volunteer Application");
      expect(buttonBuilder.data.style).toBe(1);
    });
  });

  describe("content", () => {
    it("should contain required application information", async () => {
      const { interaction } = setupApplicationTest();

      await requestApplication.execute(asButtonInteraction(interaction));

      const dmCall = interaction.user.send.mock.calls[0][0];
      const content =
        typeof dmCall === "string" ? dmCall : (dmCall as any).content;

      expect(content).toContain("DO NOT REPLY TO THIS MESSAGE");
      expect(content).toContain("How do I apply?");
      expect(content).toContain(
        "https://docs.google.com/forms/d/e/1FAIpQLSelYSgoouJCOIV9qoOQ1FdOXj8oGC2pfv7P47iUUd1hjOic-g/viewform"
      );
      expect(content).toContain("What happens to an application?");
      expect(content).toContain("less than a week");
    });
  });

  describe("customId", () => {
    it("should inherit customId from ButtonCommand constructor", () => {
      expect(requestApplication.customId).toBe("volunteer-application");
    });
  });
});
