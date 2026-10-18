import type { Mock } from "vitest";
import { interactionCreateListener } from "./interaction-create-listener";
import { getCommand } from "./register-commands";

vi.mock("./register-commands", () => ({ getCommand: vi.fn(), getButton: vi.fn() }));
vi.mock("../shared/error-reports", () => ({ remember: vi.fn(), describeError: vi.fn(() => ({ message: "x" })) }));

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
    deferReply: vi.fn().mockRejectedValue(unknownInteraction()),
    editReply: vi.fn().mockRejectedValue(new Error("The reply to this interaction has not been sent or deferred.")),
    reply: vi.fn().mockRejectedValue(unknownInteraction()),
    ...overrides,
  }) as any;

describe("interactionCreateListener", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    (getCommand as Mock).mockReturnValue({ ephemeral: true, subcommands: {}, execute: vi.fn() });
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
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      deferred: true,
    });
    (getCommand as Mock).mockReturnValue({ ephemeral: true, subcommands: {}, execute: vi.fn().mockRejectedValue(new Error("boom")) });
    await interactionCreateListener(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith("Error: boom");
  });
});
