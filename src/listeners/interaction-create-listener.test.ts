import { interactionCreateListener } from "./interaction-create-listener";
import { getCommand } from "./register-commands";

jest.mock("./register-commands", () => ({ getCommand: jest.fn(), getButton: jest.fn() }));
jest.mock("../shared/error-reports", () => ({ remember: jest.fn(), describeError: jest.fn(() => ({ message: "x" })) }));

const unknownInteraction = () => Object.assign(new Error("Unknown interaction"), { code: 10062 });

const chatInput = (overrides: Record<string, unknown> = {}) =>
  ({
    isAutocomplete: () => false,
    isButton: () => false,
    isChatInputCommand: () => true,
    commandName: "bot",
    createdTimestamp: Date.now(),
    deferred: false,
    replied: false,
    options: { getSubcommand: () => null, getSubcommandGroup: () => null },
    deferReply: jest.fn().mockRejectedValue(unknownInteraction()),
    editReply: jest.fn().mockRejectedValue(new Error("The reply to this interaction has not been sent or deferred.")),
    reply: jest.fn().mockRejectedValue(unknownInteraction()),
    ...overrides,
  }) as any;

describe("interactionCreateListener", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    (getCommand as jest.Mock).mockReturnValue({ ephemeral: true, subcommands: {}, execute: jest.fn() });
  });

  it("does not throw when the defer fails and the interaction can no longer be answered", async () => {
    await expect(interactionCreateListener(chatInput())).resolves.toBeUndefined();
  });

  it("does not call editReply on an interaction that was never deferred", async () => {
    const interaction = chatInput();
    await interactionCreateListener(interaction);
    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  it("tells the member what failed when the interaction was deferred", async () => {
    const interaction = chatInput({
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      deferred: true,
    });
    (getCommand as jest.Mock).mockReturnValue({ ephemeral: true, subcommands: {}, execute: jest.fn().mockRejectedValue(new Error("boom")) });
    await interactionCreateListener(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith("Error: boom");
  });
});
