import {
  EmbedBuilder,
  type Client,
  type TextChannel,
} from "discord.js";

import {
  nextSpawnTimeStart,
  nextSpawnTimeEnd,
  displayWindow,
  timerPhase,
} from "./timer";
import { formatTimeDistance, formatMinutesSecondsAgo } from "./duration";
import { getSettingByKey, saveSettingByKey } from "./settings";
import { TIMER_CHANNEL_ID, SHOW_FUTURE_WINDOW } from "../../../../config";
import { timerPrismaClient } from "../../../../db/timer-client";
import { ENDED_RECENTLY_WINDOW_MS, getRecentlyEndedAt } from "./ended-timers";

const MAX_DESCRIPTION_LENGTH = 4096;
const MAX_EMBEDS_PER_MESSAGE = 10;

interface TableRow {
  name: string;
  time: string;
  window: string;
  remainingMs: number;
}

interface EndedRow {
  name: string;
  time: string;
  endedMsAgo: number;
}

function pad(str: string, len: number): string {
  if (str.length > len) return str.slice(0, len);
  return str.padEnd(len, " ");
}

function getDisplayName(name: string, skipCount: number | null): string {
  const stars = skipCount && skipCount > 0 ? "*".repeat(skipCount) : "";
  return `${name}${stars}`;
}

function getColumnWidths(rows: TableRow[]): { nameWidth: number; timeWidth: number; windowWidth: number } {
  return {
    nameWidth: Math.max(4, ...rows.map((r) => r.name.length)),
    timeWidth: Math.max(3, ...rows.map((r) => r.time.length)),
    windowWidth: Math.max(6, ...rows.map((r) => r.window.length)),
  };
}

function renderTable(
  rows: TableRow[],
  widths: { nameWidth: number; timeWidth: number; windowWidth: number },
  thirdColumnLabel = "Window"
): string {
  const { nameWidth, timeWidth, windowWidth } = widths;
  const sep = " | ";
  const header = `${pad("Name", nameWidth)}${sep}${pad("In", timeWidth)}${sep}${pad(thirdColumnLabel, windowWidth)}`;
  const divider = "-".repeat(header.length);

  const lines = [
    header,
    divider,
    ...rows.map(
      (r) =>
        `${pad(r.name, nameWidth)}${sep}${pad(r.time, timeWidth)}${sep}${pad(r.window, windowWidth)}`
    ),
  ];

  return "```\n" + lines.join("\n") + "\n```";
}

function chunkRows<T>(rows: T[], maxLen: number, render: (rows: T[]) => string): string[] {
  const chunks: string[] = [];
  let currentRows: T[] = [];

  for (const row of rows) {
    const testRows = [...currentRows, row];
    const rendered = render(testRows);
    if (rendered.length > maxLen && currentRows.length > 0) {
      chunks.push(render(currentRows));
      currentRows = [row];
    } else {
      currentRows = testRows;
    }
  }

  if (currentRows.length > 0) {
    chunks.push(render(currentRows));
  }

  return chunks;
}

function getEndedColumnWidths(rows: EndedRow[]): { nameWidth: number; timeWidth: number } {
  return {
    nameWidth: Math.max(5, ...rows.map((r) => r.name.length)),
    timeWidth: Math.max(5, ...rows.map((r) => r.time.length)),
  };
}

function renderEndedTable(
  rows: EndedRow[],
  widths: { nameWidth: number; timeWidth: number }
): string {
  const { nameWidth, timeWidth } = widths;
  const sep = " | ";
  const header = `${pad("Timer", nameWidth)}${sep}${pad("Ended", timeWidth)}`;
  const divider = "-".repeat(header.length);

  const lines = [
    header,
    divider,
    ...rows.map((r) => `${pad(r.name, nameWidth)}${sep}${pad(r.time, timeWidth)}`),
  ];

  return "```\n" + lines.join("\n") + "\n```";
}

/**
 * Update the timer channel with current timer status using standard message embeds.
 */
export async function updateTimersChannel(client: Client): Promise<void> {
  if (!TIMER_CHANNEL_ID) return;

  const timers = await timerPrismaClient.timer.findMany();

  const channel = await client.channels.fetch(TIMER_CHANNEL_ID) as TextChannel | null;
  if (!channel) return;

  const now = new Date();
  const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);

  // Sort timers by next spawn start time
  const sortedTimers = [...timers].sort((a, b) => {
    const aStart = nextSpawnTimeStart(a) ?? farFuture;
    const bStart = nextSpawnTimeStart(b) ?? farFuture;
    return aStart.getTime() - bStart.getTime();
  });

  const futureRows: TableRow[] = [];
  const upcomingRows: TableRow[] = [];
  const inWindowRows: TableRow[] = [];
  const endedRows: EndedRow[] = [];

  for (const timer of sortedTimers) {
    if (!timer.lastTod) {
      const endedAt = getRecentlyEndedAt(timer, now);
      if (endedAt) {
        endedRows.push({
          name: getDisplayName(timer.name, timer.skipCount),
          time: formatMinutesSecondsAgo(endedAt, now),
          endedMsAgo: now.getTime() - endedAt.getTime(),
        });
      }
      continue;
    }

    const startsAt = nextSpawnTimeStart(timer);
    const endsAt = nextSpawnTimeEnd(timer);

    if (!startsAt || !endsAt) continue;

    const dw = displayWindow(timer, "short") ?? "";

    const phase = timerPhase(timer, now);

    if (phase === "in window") {
      const remainingMs = endsAt.getTime() - now.getTime();
      const windowDurationMs = endsAt.getTime() - startsAt.getTime();
      const elapsedMs = now.getTime() - startsAt.getTime();
      const pct = windowDurationMs > 0
        ? Math.min(100, Math.max(0, Math.round((elapsedMs / windowDurationMs) * 100)))
        : 0;
      inWindowRows.push({
        name: getDisplayName(timer.name, timer.skipCount),
        time: formatTimeDistance(endsAt, now, true),
        window: `${pct}%`,
        remainingMs,
      });
    } else if (phase === "ended") {
      const endedMsAgo = now.getTime() - endsAt.getTime();
      if (endedMsAgo <= ENDED_RECENTLY_WINDOW_MS) {
        endedRows.push({
          name: getDisplayName(timer.name, timer.skipCount),
          time: formatMinutesSecondsAgo(endsAt, now),
          endedMsAgo,
        });
      }
    } else if (startsAt.getTime() <= now.getTime() + 24 * 60 * 60 * 1000) {
      const remainingMs = startsAt.getTime() - now.getTime();
      upcomingRows.push({
        name: getDisplayName(timer.name, timer.skipCount),
        time: formatTimeDistance(startsAt, now, true),
        window: dw,
        remainingMs,
      });
    } else {
      const remainingMs = startsAt.getTime() - now.getTime();
      futureRows.push({
        name: getDisplayName(timer.name, timer.skipCount),
        time: formatTimeDistance(startsAt, now, true),
        window: dw,
        remainingMs,
      });
    }
  }

  // Sort all sections by remaining time descending (least time at the bottom)
  futureRows.sort((a, b) => b.remainingMs - a.remainingMs);
  upcomingRows.sort((a, b) => b.remainingMs - a.remainingMs);
  inWindowRows.sort((a, b) => b.remainingMs - a.remainingMs);
  // Most recently ended at the bottom, oldest at the top
  endedRows.sort((a, b) => b.endedMsAgo - a.endedMsAgo);

  const embeds: EmbedBuilder[] = [];

  const anyInWindow = inWindowRows.length > 0;

  const inWindowFooter = anyInWindow
    ? `These are currently in window! Be prepared! \u2022 Today at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
    : `There is currently nothing in window! \u2022 Today at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`;

  // Future window embed(s)
  if (SHOW_FUTURE_WINDOW?.toLowerCase() === "true" && futureRows.length > 0) {
    const widths = getColumnWidths(futureRows);
    const descChunks = chunkRows(futureRows, MAX_DESCRIPTION_LENGTH, (rs) => renderTable(rs, widths));
    for (let i = 0; i < descChunks.length; i++) {
      const embed = new EmbedBuilder().setDescription(descChunks[i]);
      if (i === 0) embed.setTitle("Future Windows");
      embeds.push(embed);
    }
  }

  // Upcoming embed(s)
  if (upcomingRows.length > 0) {
    const widths = getColumnWidths(upcomingRows);
    const descChunks = chunkRows(upcomingRows, MAX_DESCRIPTION_LENGTH, (rs) => renderTable(rs, widths));
    for (let i = 0; i < descChunks.length; i++) {
      const embed = new EmbedBuilder().setDescription(descChunks[i]);
      if (i === 0) embed.setTitle("Mobs Entering Window In The Next 24 Hours");
      embeds.push(embed);
    }
  }

  // In-window embed(s)
  if (anyInWindow) {
    const widths = getColumnWidths(inWindowRows);
    const descChunks = chunkRows(inWindowRows, MAX_DESCRIPTION_LENGTH, (rs) => renderTable(rs, widths, "%"));
    for (let i = 0; i < descChunks.length; i++) {
      const embed = new EmbedBuilder().setColor(0xe67e22).setDescription(descChunks[i]);
      if (i === 0) embed.setTitle("Mobs In Window");
      if (i === descChunks.length - 1) embed.setFooter({ text: inWindowFooter });
      embeds.push(embed);
    }
  } else {
    embeds.push(
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("Nothing Currently in Window")
        .setFooter({ text: inWindowFooter })
    );
  }

  // Ended recently embed(s)
  if (endedRows.length > 0) {
    const widths = getEndedColumnWidths(endedRows);
    const descChunks = chunkRows(endedRows, MAX_DESCRIPTION_LENGTH, (rs) => renderEndedTable(rs, widths));
    for (let i = 0; i < descChunks.length; i++) {
      const embed = new EmbedBuilder().setColor(0x95a5a6).setDescription(descChunks[i]);
      if (i === 0) embed.setTitle("Ended Recently");
      embeds.push(embed);
    }
  }

  // Discord allows at most 10 embeds per message
  embeds.splice(MAX_EMBEDS_PER_MESSAGE);

  // Send or update the timer message
  const timerMessageId = await getSettingByKey("timer_message_id");

  try {
    if (!timerMessageId) {
      const result = await channel.send({ embeds });
      await saveSettingByKey("timer_message_id", result.id);
    } else {
      try {
        const message = await channel.messages.fetch(timerMessageId);
        await message.edit({ embeds });
      } catch (err: any) {
        if (err?.status === 404 || err?.message?.includes("404") || err?.code === 10008) {
          const result = await channel.send({ embeds });
          await saveSettingByKey("timer_message_id", result.id);
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error("Error updating timer channel:", err);
  }
}
