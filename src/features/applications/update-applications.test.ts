import { createBotTestEnvironment } from "../../test/app-test-config";
import { UpdateApplicationInfoAction, updateApplicationInfo } from "./update-applications";
import { globalDiscordMocks } from "../../test/setup/setup-discord-actions";
import { VOLUNTEER_APPLICATION } from "./constants";
import { Client } from "discord.js";

describe("application info setup workflow", () => {
  it("executes setup action through ready executor", async () => {
    const discord = createBotTestEnvironment();

    await discord.withClient((client: Client) => updateApplicationInfo(client));

    expect(globalDiscordMocks.readyActionExecutor).toHaveBeenCalledWith(
      expect.any(UpdateApplicationInfoAction),
      undefined
    );
    expect(globalDiscordMocks.readyActionExecutor).toHaveBeenCalledTimes(1);
  });

  it("supports repeat duration configuration for periodic updates", async () => {
    const discord = createBotTestEnvironment();
    const options = { repeatDuration: 5000 };

    await discord.withClient((client: Client) => updateApplicationInfo(client, options));

    expect(globalDiscordMocks.readyActionExecutor).toHaveBeenCalledWith(
      expect.any(UpdateApplicationInfoAction),
      options
    );
  });

  it("creates complete application setup with button and embed", async () => {
    const discord = createBotTestEnvironment();

    await discord.withClient((client: Client) => updateApplicationInfo(client));

    discord.getButton(VOLUNTEER_APPLICATION.LABEL); // Verify button exists
    expect(discord).toHaveCreatedEmbed("Volunteer Applications");
  });
});
