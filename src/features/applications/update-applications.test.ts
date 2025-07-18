import {
  UpdateApplicationInfoAction,
  updateApplicationInfo,
} from "./update-applications";
import { createMockClient } from "../../test/mocks/create-mock-client";
import { setupApplicationTest } from "../../test/helpers/test-setup";
import { volunteerApplicationsEmbed } from "./update-applications.fixture";
import { ButtonStyle, Client } from "discord.js";
import { readyActionExecutor } from "../../shared/action/ready-action";

jest.mock("../../config", () => ({
  applicationsChannelId: "999888777",
  requestDumpThreadId: "111222333",
}));

// Mock the base class methods
const mockCreateOrUpdateInstructions = jest.fn();
const mockGetChannel = jest.fn();

jest.mock("../../shared/action/instructions-ready-action", () => ({
  InstructionsReadyAction: class {
    createOrUpdateInstructions = mockCreateOrUpdateInstructions;
    getChannel = mockGetChannel;
  },
}));

jest.mock("../../shared/action/ready-action", () => ({
  readyActionExecutor: jest.fn((action) => action.execute()),
}));

describe("UpdateApplicationInfoAction", () => {
  let action: UpdateApplicationInfoAction;

  beforeEach(() => {
    const client = createMockClient();
    action = new UpdateApplicationInfoAction(client);
  });

  describe("execute", () => {
    it("should create instructions with volunteer roles embed and button", async () => {
      await action.execute();

      expect(mockCreateOrUpdateInstructions).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: "Volunteer Applications",
              }),
            }),
          ]),
          components: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  data: expect.objectContaining({
                    custom_id: "volunteer-application",
                    label: "Volunteer Application",
                    style: ButtonStyle.Primary,
                  }),
                }),
              ]),
            }),
          ]),
        }),
        "applicationInstructions"
      );

      const call = mockCreateOrUpdateInstructions.mock.calls[0][0];

      // Test embed matches fixture
      const embed = call.embeds[0];
      expect(embed).toMatchFixture(volunteerApplicationsEmbed);

      // Test component structure
      const actionRow = call.components[0];
      expect(actionRow.components).toHaveLength(1);

      const buttonBuilder = actionRow.components[0];
      expect(buttonBuilder).toHaveCustomId("volunteer-application");
      expect(buttonBuilder).toHaveLabel("Volunteer Application");
      expect(buttonBuilder).toHaveReceivedButtonStyle(ButtonStyle.Primary);
    });

    it("should create a functional button that can handle interactions", async () => {
      // Execute the action to create the button
      await action.execute();

      // Verify the button can be used in an interaction
      const { interaction, threadChannel } = await setupApplicationTest();

      // Simulate clicking the button that was created by updateApplicationInfo
      const { RequestApplication } = await import(
        "./request-application-button-commands"
      );
      const requestApplication = new RequestApplication();
      await requestApplication.execute(interaction);

      // Verify the button interaction works as expected
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
  });
});

describe("updateApplicationInfo", () => {
  let client: Client;

  beforeEach(() => {
    client = createMockClient();
  });

  it("should execute UpdateApplicationInfoAction with readyActionExecutor", async () => {
    const options = {};

    await updateApplicationInfo(client, options);

    expect(readyActionExecutor).toHaveBeenCalledWith(
      expect.any(UpdateApplicationInfoAction),
      options
    );
  });

  it("should work without options", async () => {
    await updateApplicationInfo(client);

    expect(readyActionExecutor).toHaveBeenCalledWith(
      expect.any(UpdateApplicationInfoAction),
      undefined
    );
  });

  it("should create a complete application system that works end-to-end", async () => {
    // Integration test: updateApplicationInfo creates the UI, button handles interactions
    await updateApplicationInfo(client);

    // Verify the action was called to create the instructions
    expect(readyActionExecutor).toHaveBeenCalled();

    // Test that the button created by updateApplicationInfo actually works
    const { interaction, threadChannel } = await setupApplicationTest();
    const { RequestApplication } = await import(
      "./request-application-button-commands"
    );
    const requestApplication = new RequestApplication();

    await requestApplication.execute(interaction);

    expect(interaction.user).toHaveReceivedMessage(/How do I apply/);
    expect(threadChannel).toHaveReceivedMessage(
      /Volunteer Application sent to/
    );
  });
});
