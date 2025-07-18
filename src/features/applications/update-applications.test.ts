import {
  UpdateApplicationInfoAction,
  updateApplicationInfo,
} from "./update-applications";
import { createMockClient } from "../../test/mocks/create-mock-client";
import { asClient } from "../../test/utils/discord-conversions";
import { volunteerApplicationsEmbed } from "./update-applications.fixture";
import { Client, ButtonStyle } from "discord.js";

jest.mock("../../config", () => ({
  applicationsChannelId: "999888777",
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
  readyActionExecutor: jest.fn((action, options) => action.execute()),
}));

describe("UpdateApplicationInfoAction", () => {
  let client: Client;
  let action: UpdateApplicationInfoAction;

  beforeEach(() => {
    client = asClient(createMockClient());
    // Create instance using constructor
    action = new UpdateApplicationInfoAction(client);
    jest.clearAllMocks();
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
      expect(buttonBuilder.data.custom_id).toBe("volunteer-application");
      expect(buttonBuilder.data.label).toBe("Volunteer Application");
      expect(buttonBuilder.data.style).toBe(ButtonStyle.Primary);
    });
  });

  describe("channel getter", () => {
    it("should get applications channel with correct ID", () => {
      // Access the protected property through reflection
      const channel = (action as any).channel;

      expect(mockGetChannel).toHaveBeenCalledWith("999888777", "applications");
    });
  });
});

describe("updateApplicationInfo", () => {
  it("should execute UpdateApplicationInfoAction with readyActionExecutor", async () => {
    const client = asClient(createMockClient());
    const options = {};

    await updateApplicationInfo(client, options);

    const { readyActionExecutor } = require("../../shared/action/ready-action");
    expect(readyActionExecutor).toHaveBeenCalledWith(
      expect.any(UpdateApplicationInfoAction),
      options
    );
  });

  it("should work without options", async () => {
    const client = asClient(createMockClient());

    await updateApplicationInfo(client);

    const { readyActionExecutor } = require("../../shared/action/ready-action");
    expect(readyActionExecutor).toHaveBeenCalledWith(
      expect.any(UpdateApplicationInfoAction),
      undefined
    );
  });
});
