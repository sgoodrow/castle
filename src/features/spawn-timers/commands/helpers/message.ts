import type { Timer } from "@prisma/client";
import {
  displayWindow,
  getWindowStart,
  getWindowEnd,
  getVariance,
  hasWindow,
  inWindow,
  nextSpawnTimeStart,
  nextSpawnTimeEnd,
} from "./timer";
import { formatTimeDistance, formatTimeAgo } from "./duration";
import { formatDateFull } from "./format";
import { prismaClient } from "../../../../index";

/**
 * Build a show message displaying a timer's configuration.
 */
export async function buildShowMessage(timer: Timer): Promise<string> {
  const lines: string[] = [];
  lines.push("```");
  lines.push(`Configuration for ${timer.name}.`);
  lines.push("");
  lines.push(`Start: ${getWindowStart(timer) ?? "N/A"}`);
  lines.push(`End: ${getWindowEnd(timer) ?? "N/A"}`);
  lines.push(`Variance: ${getVariance(timer) ?? "N/A"}`);
  lines.push(`Skip Count: ${timer.skipCount}`);

  if (timer.lastTod) {
    const tod = new Date(timer.lastTod * 1000);
    lines.push(`Last TOD: ${tod.toISOString()} (${formatTimeAgo(tod)})`);
    lines.push(`In Window: ${inWindow(timer)}`);

    const spawnStart = nextSpawnTimeStart(timer);
    const spawnEnd = nextSpawnTimeEnd(timer);

    if (spawnStart) {
      lines.push(
        `Next Spawn Start: ${spawnStart.toISOString()} (${formatTimeDistance(spawnStart)})`
      );
    }
    if (spawnEnd) {
      lines.push(
        `Next Spawn End: ${spawnEnd.toISOString()} (${formatTimeDistance(spawnEnd)})`
      );
    }
  } else {
    lines.push("Last TOD: NEED TOD");
  }

  lines.push(`Alerted: ${timer.alerted ?? "N/A"}`);
  lines.push(`Alerting Soon: ${timer.alertingSoon}`);
  lines.push(`Warn Time: ${timer.warnTime ?? "60 minutes"}`);
  lines.push(`Autotod: ${timer.autoTod ? "Enabled" : "Disabled"}`);

  const aliases = await prismaClient.alias.findMany({
    where: { timerId: timer.id },
  });
  if (aliases.length > 0) {
    lines.push(`Aliases: ${aliases.map((a) => a.name).join(", ")}`);
  }

  if (timer.linkedTimerId) {
    const linkedTimer = await prismaClient.timer.findUnique({
      where: { id: timer.linkedTimerId },
    });
    if (linkedTimer) {
      lines.push(`Linked to Timer: ${linkedTimer.name}`);
    }
  }

  const linkedTimers = await prismaClient.timer.findMany({
    where: { linkedTimerId: timer.id },
  });
  if (linkedTimers.length > 0) {
    lines.push(`Linked Timers: ${linkedTimers.map((t) => t.name).join(", ")}`);
  }

  const clearTimers = await prismaClient.timer.findMany({
    where: { clearParentTimerId: timer.id },
  });
  if (clearTimers.length > 0) {
    lines.push(`Clears Timers: ${clearTimers.map((t) => t.name).join(", ")}`);
  }

  lines.push("```");
  return lines.join("\n");
}
