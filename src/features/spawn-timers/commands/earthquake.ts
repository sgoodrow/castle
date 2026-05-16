import { ChatInputCommandInteraction, CacheType, TextChannel } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { prismaClient } from "../../../index";
import { EARTHQUAKE_ALERT_CHANNEL_ID, EARTHQUAKE_ALERT_MESSAGE, TIMER_ALERT_CHANNEL_ID } from "../../../config";

class EarthquakeCommand extends SimpleCommand {
  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    await prismaClient.timer.updateMany({
      data: {
        lastTod: null,
        alerted: false,
        alertingSoon: false,
        skipCount: 0,
      },
    });

    await interaction.editReply("Quake has been registered!");

    // Send alert to timer alert channel
    if (TIMER_ALERT_CHANNEL_ID) {
      try {
        const alertChannel = (await interaction.client.channels.fetch(
          TIMER_ALERT_CHANNEL_ID
        )) as TextChannel;
        if (alertChannel) {
          await alertChannel.send("**QUAKE**");
        }
      } catch {
        // Channel may not be accessible
      }
    }

    // Send alert to earthquake alert channel if configured
    if (EARTHQUAKE_ALERT_CHANNEL_ID) {
      try {
        const quakeChannel = (await interaction.client.channels.fetch(
          EARTHQUAKE_ALERT_CHANNEL_ID
        )) as TextChannel;
        if (quakeChannel) {
          await quakeChannel.send(
            EARTHQUAKE_ALERT_MESSAGE || "QUAKE"
          );
        }
      } catch {
        // Channel may not be accessible
      }
    }
  }
}

export const earthquakeCommand = new EarthquakeCommand("earthquake", "Reset the TOD for ALL timers. Warning: this clears everything!");
