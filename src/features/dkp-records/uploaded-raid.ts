import { openDkpSiteClientId } from "../../config";
import {
  ODKPRaidData,
  ODKPRaidTick,
  ODKPUpdateRaidData,
  openDkpService,
} from "../../services/openDkpService";
import { RaidReport, withRaidReportLock } from "./raid-report";
import { getRaidUrl } from "./raid-tick";
import { channelMessages, MessageSource } from "../../shared/channel-messages";

interface Attendance {
  name: string;
  // whether each tick, in order, has the player
  ticks: boolean[];
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * The raid's ticks with each player's attendance set to match the report. Only these players
 * change, so a character an admin added on the site stays, and applying it twice changes nothing.
 */
export const withAttendance = (
  ticks: ODKPRaidTick[],
  attendance: Attendance[]
): ODKPRaidTick[] =>
  ticks.map((tick, i) => {
    let characters = tick.Characters;
    attendance.forEach(({ name, ticks: attending }) => {
      if (attending.length !== ticks.length) {
        throw new Error(
          `The OpenDKP raid has ${ticks.length} ticks but the raid report has ${attending.length}`
        );
      }
      const has = characters.some((c) => sameName(c.Name, name));
      if (attending[i] && !has) {
        characters = [...characters, { Name: name }];
      }
      if (!attending[i] && has) {
        characters = characters.filter((c) => !sameName(c.Name, name));
      }
    });
    return { ...tick, Characters: characters };
  });

export interface AttendanceChange {
  name: string;
  // tick numbers, from 1
  added: number[];
  removed: number[];
}

/** What setting the players' attendance changes on the raid's ticks. */
export const attendanceChanges = (
  ticks: ODKPRaidTick[],
  attendance: Attendance[]
): AttendanceChange[] =>
  attendance.map(({ name, ticks: attending }) => {
    const has = ticks.map((t) => t.Characters.some((c) => sameName(c.Name, name)));
    const numbers = (pick: (i: number) => boolean) =>
      ticks.flatMap((_, i) => (pick(i) ? [i + 1] : []));
    return {
      name,
      added: numbers((i) => !!attending[i] && !has[i]),
      removed: numbers((i) => !attending[i] && has[i]),
    };
  });

/** A report of the uploaded raid's ticks as OpenDKP has them, for when the thread's has expired. */
export const reportOfRaid = (raid: ODKPRaidData): RaidReport =>
  new RaidReport({
    filename: raid.Name,
    raidId: raid.RaidId,
    ticks: raid.Ticks.map((t, i) => ({
      finished: true,
      tickNumber: i + 1,
      sheetName: t.Description,
      value: t.Value,
      loot: [],
      attendees: t.Characters.map((c) => c.Name),
      date: raid.Timestamp,
      credits: [],
    })),
  });

/**
 * Sets the players' attendance on the OpenDKP raid the report was uploaded as to match the
 * report `attending` gives for it: the thread's report, or one made from the raid. Returns what
 * changed, and the players who aren't OpenDKP characters, who are left off it, as at upload.
 */
export const updateUploadedRaid = async (
  raidId: number,
  names: string[],
  attending: (raid: ODKPRaidData) => RaidReport
): Promise<{ changes: AttendanceChange[]; unregistered: string[] }> => {
  const characters = await openDkpService.getCharacters();
  const registered = (name: string) =>
    characters.some((c) => sameName(c.Name, name));
  const unregistered = names.filter((n) => !registered(n));
  if (unregistered.length === names.length) {
    return { changes: [], unregistered };
  }

  // one update to a raid at a time, since each must send the version it read
  const changes = await withRaidReportLock(`opendkp:${raidId}`, async () => {
    const raid = await openDkpService.getRaid(raidId);
    if (raid.Version === undefined) {
      throw new Error(`OpenDKP raid ${raidId} has no version to update`);
    }
    const report = attending(raid);
    const attendance = names
      .filter(registered)
      .map((name) => ({ name, ticks: report.attendanceOf(name) }));
    const ticks = withAttendance(raid.Ticks, attendance);
    const changes = attendanceChanges(raid.Ticks, attendance);
    if (changes.every((c) => c.added.length + c.removed.length === 0)) {
      return changes;
    }
    const payload: ODKPUpdateRaidData = {
      ClientId: raid.ClientId ?? openDkpSiteClientId ?? "",
      RaidId: `${raidId}`,
      Attendance: raid.Attendance,
      Items: raid.Items,
      Name: raid.Name,
      Pool: raid.Pool,
      Ticks: ticks,
      Timestamp: raid.Timestamp,
      Version: raid.Version,
    };
    await openDkpService.updateRaid(payload.RaidId, payload);
    return changes;
  });
  return { changes, unregistered };
};

const ticksText = (ticks: number[]) =>
  `${ticks.length > 1 ? "ticks" : "tick"} ${ticks.join(", ")}`;

/** The reply after an approval reaches the uploaded raid, e.g. "Updated the OpenDKP raid: added Iceburgh to ticks 1, 2." */
export const describeChanges = (
  raidId: number,
  changes: AttendanceChange[]
): string => {
  const raid = `[OpenDKP raid](<${getRaidUrl("", raidId)}>)`;
  const parts = changes.flatMap(({ name, added, removed }) => [
    ...(added.length > 0 ? [`added ${name} to ${ticksText(added)}`] : []),
    ...(removed.length > 0 ? [`removed ${name} from ${ticksText(removed)}`] : []),
  ]);
  return parts.length > 0
    ? `Updated the ${raid}: ${parts.join("; ")}.`
    : `The ${raid} already had this.`;
};

/** How the bot's receipt in the thread starts, once it uploads the raid. Its embeds link the raid. */
export const UPLOAD_RECEIPT = "Raids uploaded by";

const RAID_LINK = /\/#\/raids\/(\d+)/;

interface ThreadMessage {
  id: string;
  author: { id: string };
  content: string;
  embeds: { url?: string | null }[];
}

/** The raid the bot's latest upload receipt in the thread links to. */
export const findReceiptRaidId = async (
  thread: MessageSource<ThreadMessage>,
  botId: string
): Promise<number | undefined> => {
  for await (const m of channelMessages(thread)) {
    if (m.author.id !== botId || !m.content.startsWith(UPLOAD_RECEIPT)) {
      continue;
    }
    const id = m.embeds
      .map((e) => e.url?.match(RAID_LINK)?.[1])
      .find((match) => match !== undefined);
    if (id !== undefined) {
      return Number(id);
    }
  }
  return undefined;
};

/** The thread's link, which the raid's name ends with when it's uploaded. */
export const threadUrl = (guildId: string, threadId: string) =>
  `https://discord.com/channels/${guildId}/${threadId}`;

/** For a thread uploaded before the report kept its raid id: find the raid by its name. */
export const findUploadedRaidId = async (
  url: string
): Promise<number | undefined> => {
  const raids = await openDkpService.getRaids();
  return raids.find((r) => r.Name.endsWith(` ${url}`))?.RaidId;
};
