import {
  type TextChannel,
} from "discord.js";
import { client } from "../../index";
import {
  inWindow,
  alertingSoon,
  pastPossibleSpawnTime,
  hasWindow,
  nextSpawnTimeStart,
  nextSpawnTimeEnd,
} from "./commands/helpers/timer";
import { formatTimeDistance } from "./commands/helpers/duration";
import { updateTimersChannel } from "./commands/helpers/channel-update";
import { TIMER_ALERT_CHANNEL_ID, TIMER_ALERT_CHANNEL_REFRESH_RATE, TIMER_CHANNEL_REFRESH_RATE, USE_EVERYONE_ALERT } from "../../config";
import { timerPrismaClient } from "../../db/timer-client";

// Timer tracking state
let lastTimerUpdate: Date | null = null;
let lastAlertUpdate: Date | null = null;
let sendTimerChannelUpdate = true;

/**
 * Main timer monitoring loop.
 * Checks timer windows, sends alerts, and updates the timer channel.
 */
export async function spawnTimerLoop(): Promise<void> {
  const now = new Date();

  // Check if we should update alerts
  const shouldCheckAlerts =
    !lastAlertUpdate ||
    now.getTime() >= lastAlertUpdate.getTime() + (Number(TIMER_ALERT_CHANNEL_REFRESH_RATE) || 10) * 1000;

  // Check if we should update the timer channel
  const shouldUpdateChannel =
    !lastTimerUpdate ||
    now.getTime() >= lastTimerUpdate.getTime() + (Number(TIMER_CHANNEL_REFRESH_RATE) || 10) * 1000;

  if (shouldUpdateChannel) {
    lastTimerUpdate = now;
    sendTimerChannelUpdate = true;
  }

  if (shouldCheckAlerts) {
    lastAlertUpdate = now;

    try {
      const timers = await timerPrismaClient.timer.findMany();
      const everyoneAlert = USE_EVERYONE_ALERT ? "@everyone " : "";

      for (const timer of timers) {
        let canAutoTod = false;
        let saveTimer = false;
        const updates: Record<string, any> = {};

        if (!timer.alerted) {
          const nextSpawnEnd = nextSpawnTimeEnd(timer);

          if (inWindow(timer, now)) {
            if (hasWindow(timer)) {
              // Has window - show "in window" message
              if (TIMER_ALERT_CHANNEL_ID) {
                try {
                  const channel = (await client.channels.fetch(
                    TIMER_ALERT_CHANNEL_ID
                  )) as TextChannel;
                  if (channel && nextSpawnEnd) {
                    await channel.send(
                      `${everyoneAlert}**${timer.name}** is in window for ${formatTimeDistance(nextSpawnEnd, now)}!`
                    );
                  }
                } catch {
                  // Channel may not be accessible
                }
              }
            } else {
              // No window - timer is up
              if (TIMER_ALERT_CHANNEL_ID) {
                try {
                  const channel = (await client.channels.fetch(
                    TIMER_ALERT_CHANNEL_ID
                  )) as TextChannel;
                  if (channel) {
                    await channel.send(
                      `${everyoneAlert}**${timer.name}** timer is up!`
                    );
                  }
                } catch {
                  // Channel may not be accessible
                }
              }
              canAutoTod = true;
            }
            updates.alerted = true;
            saveTimer = true;
          } else if (
            alertingSoon(timer, now) &&
            !timer.alertingSoon
          ) {
            if (timer.warnTime !== "-1") {
              const nextSpawnStart = nextSpawnTimeStart(timer);
              if (TIMER_ALERT_CHANNEL_ID && nextSpawnStart) {
                try {
                  const channel = (await client.channels.fetch(
                    TIMER_ALERT_CHANNEL_ID
                  )) as TextChannel;
                  if (channel) {
                    if (hasWindow(timer)) {
                      await channel.send(
                        `${everyoneAlert}**${timer.name}** will be in window in ${formatTimeDistance(nextSpawnStart, now)}!`
                      );
                    } else {
                      await channel.send(
                        `${everyoneAlert}**${timer.name}** is up in ${formatTimeDistance(nextSpawnStart, now)}!`
                      );
                    }
                  }
                } catch {
                  // Channel may not be accessible
                }
              }
            }
            updates.alertingSoon = true;
            saveTimer = true;
          }
        }

        if (pastPossibleSpawnTime(timer, now)) {
          updates.alerted = null;
          updates.alertingSoon = false;
          updates.lastTod = null;
          saveTimer = true;
        }

        if (saveTimer) {
          if (canAutoTod && timer.autoTod) {
            const todEpoch = now.getTime() / 1000;
            updates.lastTod = todEpoch;
            updates.alerted = null;
            updates.alertingSoon = false;
            updates.skipCount = 0;

            await timerPrismaClient.tod.create({
              data: {
                timerId: timer.id,
                tod: todEpoch,
              },
            });
          }

          await timerPrismaClient.timer.update({
            where: { id: timer.id },
            data: updates,
          });

          sendTimerChannelUpdate = true;
        }
      }
    } catch (err) {
      console.error("Error in timer alert loop:", err);
    }
  }

  if (sendTimerChannelUpdate) {
    try {
      await updateTimersChannel(client);
    } catch (err) {
      console.error("Error updating timers channel:", err);
    }
    sendTimerChannelUpdate = false;
  }
}
