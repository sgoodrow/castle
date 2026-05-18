import {
  EmbedBuilder,
  type Client,
  type TextChannel,
} from "discord.js";

import {
  nextSpawnTimeStart,
  nextSpawnTimeEnd,
  inWindow,
  displayWindow,
} from "./timer";
import { formatTimeDistance } from "./duration";
import { getSettingByKey, saveSettingByKey } from "./settings";
import { TIMER_CHANNEL_ID, SHOW_FUTURE_WINDOW } from "../../../../config";
import { timerPrismaClient } from "../../../../db/timer-client";

const MAX_DESCRIPTION_LENGTH = 4096;
const MAX_EMBEDS_PER_MESSAGE = 10;

interface TableRow {
  name: string;
  time: string;
  window: string;
}

function pad(str: string, len: number): string {
  if (str.length > len) return str.slice(0, len);
  return str.padEnd(len, " ");
}

function getColumnWidths(rows: TableRow[]): { nameWidth: number; timeWidth: number; windowWidth: number } {
  return {
    nameWidth: Math.max(4, ...rows.map((r) => r.name.length)),
    timeWidth: Math.max(14, ...rows.map((r) => r.time.length)),
    windowWidth: Math.max(6, ...rows.map((r) => r.window.length)),
  };
}

function renderTable(
  rows: TableRow[],
  widths: { nameWidth: number; timeWidth: number; windowWidth: number }
): string {
  const { nameWidth, timeWidth, windowWidth } = widths;
  const sep = " | ";
  const header = `${pad("Name", nameWidth)}${sep}${pad("Time Remaining", timeWidth)}${sep}${pad("Window", windowWidth)}`;
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

function chunkTable(
  rows: TableRow[],
  maxLen: number,
  widths: { nameWidth: number; timeWidth: number; windowWidth: number }
): string[] {
  const chunks: string[] = [];
  let currentRows: TableRow[] = [];

  for (const row of rows) {
    const testRows = [...currentRows, row];
    const rendered = renderTable(testRows, widths);
    if (rendered.length > maxLen && currentRows.length > 0) {
      chunks.push(renderTable(currentRows, widths));
      currentRows = [row];
    } else {
      currentRows = testRows;
    }
  }

  if (currentRows.length > 0) {
    chunks.push(renderTable(currentRows, widths));
  }

  return chunks;
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
  const inWindowRows: Array<TableRow & { percent: number }> = [];

  for (const timer of sortedTimers) {
    if (!timer.lastTod) continue;

    const startsAt = nextSpawnTimeStart(timer);
    const endsAt = nextSpawnTimeEnd(timer);

    if (!startsAt || !endsAt) continue;

    const dw = displayWindow(timer, "short") ?? "";

    if (inWindow(timer, now)) {
      if (endsAt > now) {
        const perc = (now.getTime() - startsAt.getTime()) / (endsAt.getTime() - startsAt.getTime());
        const remaining = formatTimeDistance(endsAt, now);
        inWindowRows.push({ name: timer.name, time: remaining, window: dw, percent: perc });
      }
    } else if (startsAt.getTime() <= now.getTime() + 24 * 60 * 60 * 1000) {
      upcomingRows.push({
        name: timer.name,
        time: formatTimeDistance(startsAt, now),
        window: dw,
      });
    } else {
      futureRows.push({
        name: timer.name,
        time: formatTimeDistance(startsAt, now),
        window: dw,
      });
    }
  }

  // Order: descending time to spawn within each section
  futureRows.reverse();
  upcomingRows.reverse();

  // Sort mobs in window by percent ascending (closest to end of window at bottom)
  inWindowRows.sort((a, b) => a.percent - b.percent);

  const embeds: EmbedBuilder[] = [];

  const anyInWindow = inWindowRows.length > 0;

  const inWindowFooter = anyInWindow
    ? `These are currently in window! Be prepared! \u2022 Today at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
    : `There is currently nothing in window! \u2022 Today at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`;

  // Future window embed(s)
  if (SHOW_FUTURE_WINDOW?.toLowerCase() === "true" && futureRows.length > 0) {
    const widths = getColumnWidths(futureRows);
    const descChunks = chunkTable(futureRows, MAX_DESCRIPTION_LENGTH, widths);
    for (let i = 0; i < descChunks.length; i++) {
      const embed = new EmbedBuilder().setDescription(descChunks[i]);
      if (i === 0) embed.setTitle("Future Windows");
      embeds.push(embed);
    }
  }

  // Upcoming embed(s)
  if (upcomingRows.length > 0) {
    const widths = getColumnWidths(upcomingRows);
    const descChunks = chunkTable(upcomingRows, MAX_DESCRIPTION_LENGTH, widths);
    for (let i = 0; i < descChunks.length; i++) {
      const embed = new EmbedBuilder().setDescription(descChunks[i]);
      if (i === 0) embed.setTitle("Mobs Entering Window In The Next 24 Hours");
      embeds.push(embed);
    }
  }

  // In-window embed(s)
  if (anyInWindow) {
    const widths = getColumnWidths(inWindowRows);
    const descChunks = chunkTable(inWindowRows, MAX_DESCRIPTION_LENGTH, widths);
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
