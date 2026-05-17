import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";
import { formatDateFull } from "./helpers/format";
import { findTimerByMob, lastSpawnTimeStart, nextSpawnTimeStart, nextSpawnTimeEnd, hasWindow } from "./helpers/timer";
import { parseTime } from "./parsers/time-parser";

class TodCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("mob")
          .setDescription("Name of the mob/NPC")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("time")
          .setDescription('Time of death (e.g. "10 hours ago", "-20", "May 26 12pm"). Defaults to now.')
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("skip_count")
          .setDescription("Set skip count for this TOD")
          .setRequired(false)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const timeStr = interaction.options.getString("time");
    const skipCountArg = interaction.options.getInteger("skip_count");

    const now = new Date();

    const tod = timeStr ? parseTime(timeStr, now) : now;

    if (!tod) {
      await interaction.editReply({
        content: "Unable to record that time of death. Please try again.",
      });
      return;
    }

    const [timers, foundTimer] = await findTimerByMob(mob);

    if (timers.length > 1 && !foundTimer) {
      await interaction.editReply({
        content: `Request returned multiple results, please be more specific:\n${timers.map((t) => `\`${t.name}\``).join("\n")}`,
      });
      return;
    }

    const timer = foundTimer ?? timers[0];
    if (!timer) {
      await interaction.editReply({
        content: `No timer registered for **${mob}**.`,
      });
      return;
    }

    // Handle skip count
    if (skipCountArg && skipCountArg > 0) {
      await timerPrismaClient.timer.update({
        where: { id: timer.id },
        data: { skipCount: skipCountArg },
      });
      timer.skipCount = skipCountArg;
    } else {
      timer.skipCount = 0;
    }

    const todEpoch = tod.getTime() / 1000;

    // Validation: future dates
    if (tod > now) {
      await interaction.editReply({
        content: "Time of death unable to be recorded due to time in the future.",
      });
      return;
    }

    // Validation: out of window (for timers with windows)
    const lastSpawn = lastSpawnTimeStart(timer, todEpoch);
    const nextSpawnStart = nextSpawnTimeStart(timer, todEpoch);
    const nextSpawnEnd = nextSpawnTimeEnd(timer, todEpoch);

    if (
      hasWindow(timer) &&
      nextSpawnStart &&
      nextSpawnEnd &&
      (now < lastSpawn! || nextSpawnEnd < now)
    ) {
      await interaction.editReply({
        content: "Current time is outside of potential window and would have expired by now. Please try again.",
      });
      return;
    }

    if (!hasWindow(timer) && lastSpawn && timeStr && tod < lastSpawn) {
      await interaction.editReply({
        content: "Time of death is older than potential spawn timer. Please try again.",
      });
      return;
    }

    // Record the TOD
    await timerPrismaClient.timer.update({
      where: { id: timer.id },
      data: {
        lastTod: todEpoch,
        alerted: null,
        alertingSoon: false,
        skipCount: skipCountArg && skipCountArg > 0 ? skipCountArg : 0,
      },
    });

    await timerPrismaClient.tod.create({
      data: {
        timerId: timer.id,
        userId: interaction.user.id,
        username: interaction.user.username,
        displayName: interaction.user.displayName,
        tod: todEpoch,
      },
    });

    const todTimerNames = [timer.name];

    // Handle linked timers
    const linkedTimers = await timerPrismaClient.timer.findMany({
      where: { linkedTimerId: timer.id },
    });

    for (const linkedTimer of linkedTimers) {
      todTimerNames.push(linkedTimer.name);

      await timerPrismaClient.timer.update({
        where: { id: linkedTimer.id },
        data: {
          lastTod: todEpoch,
          alerted: null,
          alertingSoon: false,
        },
      });

      await timerPrismaClient.tod.create({
        data: {
          timerId: linkedTimer.id,
          userId: interaction.user.id,
          username: interaction.user.username,
          displayName: interaction.user.displayName,
          tod: todEpoch,
        },
      });
    }

    // Handle clear timers
    const clearTimers = await timerPrismaClient.timer.findMany({
      where: { clearParentTimerId: timer.id },
    });

    for (const clearTimer of clearTimers) {
      await timerPrismaClient.timer.update({
        where: { id: clearTimer.id },
        data: {
          lastTod: null,
          alerted: null,
          alertingSoon: false,
        },
      });
    }

    await interaction.editReply({
      content: `Time of death for **${todTimerNames.join(", ")}** recorded as ${formatDateFull(tod)}!`,
    });
  }
}

export const todCommand = new TodCommand("tod", "Record a time of death for a registered timer", false);
