import { createBotTestEnvironment } from "../../test/app-test-config";
import { updateApplicationInfo } from "./update-applications";
import { globalDiscordMocks } from "../../test/setup/setup-discord-actions";
import { discordComponentRegistry } from "../../test/discord-testing-library/discord-component-registry";
import { Client } from "discord.js";

describe("debug mock registration", () => {
  it("should trace mock calls and button registration", async () => {
    console.log("=== Starting debug test ===");

    const discord = createBotTestEnvironment();
    console.log("1. Environment created");

    console.log(
      "2. Initial mock call count:",
      globalDiscordMocks.createOrUpdateInstructions.mock.calls.length
    );
    console.log("3. Initial buttons in registry:", discordComponentRegistry.getButtons().length);
    console.log(
      "4. Mock implementation:",
      globalDiscordMocks.createOrUpdateInstructions
        .getMockImplementation()
        ?.toString()
        .slice(0, 100)
    );

    console.log("4. About to call updateApplicationInfo...");
    await discord.withClient((client: Client) => updateApplicationInfo(client));
    console.log("5. updateApplicationInfo completed");

    console.log(
      "6. Final mock call count:",
      globalDiscordMocks.createOrUpdateInstructions.mock.calls.length
    );
    console.log("7. Final buttons in registry:", discordComponentRegistry.getButtons().length);

    if (globalDiscordMocks.createOrUpdateInstructions.mock.calls.length > 0) {
      const firstCall = globalDiscordMocks.createOrUpdateInstructions.mock.calls[0];
      const instructions = firstCall[0];
      console.log("8. Button item structure:");
      if (instructions?.components?.[0]?.components?.[0]) {
        const buttonItem = instructions.components[0].components[0];
        console.log("   - Type of item:", typeof buttonItem);
        console.log("   - Constructor:", buttonItem.constructor?.name);
        console.log("   - Has .data property:", "data" in buttonItem);
        console.log("   - Direct custom_id:", buttonItem.custom_id);
        console.log("   - Data custom_id:", buttonItem.data?.custom_id);
      }
    }

    const allButtons = discordComponentRegistry.getButtons();
    console.log(
      "9. All buttons:",
      allButtons.map((b) => ({
        label: b.data.label,
        customId: (b.data as any).custom_id,
        style: b.data.style,
      }))
    );
  });
});
