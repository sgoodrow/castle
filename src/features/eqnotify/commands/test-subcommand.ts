import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { eqnotifyService } from "../eqnotify.service";
import { notify } from "../notifiers";

class TestSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const subscriber = await eqnotifyService.requireSubscriber(
      interaction.user.id
    );
    await notify(
      subscriber,
      "This is a test EQNotify alert. If you can read this, your notifications are working!"
    );
    const channel = subscriber.type === "telegram" ? "Telegram" : "WirePusher";
    await interaction.editReply(
      `Sent a test alert to your **${channel}**. If you didn't receive it, double-check your ID with \`/eqnotify register\`.`
    );
  }

  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ) {
    return undefined;
  }
}

export const testSubcommand = new TestSubcommand(
  "test",
  "Send yourself a test notification to verify delivery."
);
