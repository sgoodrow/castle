import { interactionCreateListener } from "./interaction-create-listener";
import { getButton, getCommand } from "./register-commands";

jest.mock("./register-commands", () => ({
  getButton: jest.fn(),
  getCommand: jest.fn(),
}));
jest.mock("../shared/logger", () => ({ log: jest.fn() }));

const mockGetCommand = getCommand as jest.Mock;
const mockGetButton = getButton as jest.Mock;

const chatInteraction = () => {
  const interaction: any = {
    commandName: "nope",
    deferred: false,
    replied: false,
    isAutocomplete: () => false,
    isButton: () => false,
    isChatInputCommand: () => true,
    options: { getSubcommand: jest.fn().mockReturnValue(null) },
    deferReply: jest.fn().mockImplementation(async () => {
      interaction.deferred = true;
    }),
    editReply: jest.fn(),
    reply: jest.fn(),
  };
  return interaction;
};

describe("interactionCreateListener", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("replies instead of editing when the command lookup fails before deferring", async () => {
    mockGetCommand.mockImplementation(() => {
      throw new Error("Could not find slash command **/nope**");
    });
    const interaction = chatInteraction();
    interaction.editReply.mockImplementation(() => {
      throw new Error(
        "The reply to this interaction has not been sent or deferred."
      );
    });

    await interactionCreateListener(interaction);

    expect(interaction.editReply).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Could not find slash command"),
      })
    );
  });

  it("edits the deferred reply when the command fails after deferring", async () => {
    mockGetCommand.mockReturnValue({
      ephemeral: false,
      subcommands: {},
      execute: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const interaction = chatInteraction();

    await interactionCreateListener(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith({ content: "Error: boom" });
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("edits the deferred reply when a button fails", async () => {
    mockGetButton.mockReturnValue({
      execute: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const interaction = chatInteraction();
    interaction.isChatInputCommand = () => false;
    interaction.isButton = () => true;
    interaction.customId = "btn";

    await interactionCreateListener(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: "Error: boom",
    });
  });
});
