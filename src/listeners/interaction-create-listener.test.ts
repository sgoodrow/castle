import { DiscordAPIError } from "discord.js";
import { interactionCreateListener } from "./interaction-create-listener";

jest.mock("./register-commands", () => ({
  getCommand: () => ({ ephemeral: false, subcommands: {}, execute: jest.fn() }),
  getButton: () => ({ customId: "button", execute: jest.fn() }),
}));

const unknownInteraction = () =>
  new DiscordAPIError({ code: 10062, message: "Unknown interaction" }, 10062, 404, "POST", "", {});

// Discord forgot the interaction before the bot could defer: nothing can be sent to it any more.
const expired = (kind: "command" | "button") => {
  const interaction: any = {
    isAutocomplete: () => false,
    isButton: () => kind === "button",
    isChatInputCommand: () => kind === "command",
    commandName: "odkp",
    customId: "button",
    createdTimestamp: Date.now(),
    deferred: false,
    replied: false,
    options: { getSubcommand: () => "get", getSubcommandGroup: () => null },
    deferReply: jest.fn().mockRejectedValue(unknownInteraction()),
    editReply: jest.fn().mockRejectedValue(new Error("InteractionNotReplied")),
  };
  return interaction;
};

describe("interactionCreateListener when the interaction expired before it was deferred", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(["command", "button"] as const)("does not throw out of a %s", async (kind) => {
    const interaction = expired(kind);
    await expect(interactionCreateListener(interaction)).resolves.toBeUndefined();
    expect(interaction.editReply).not.toHaveBeenCalled();
  });
});
