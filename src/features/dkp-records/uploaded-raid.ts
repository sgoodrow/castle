import { openDkpSiteClientId } from "../../config";
import {
  ODKPRaidTick,
  ODKPUpdateRaidData,
  openDkpService,
} from "../../services/openDkpService";
import { RaidReport, withRaidReportLock } from "./raid-report";

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

/**
 * Sets the players' attendance on the OpenDKP raid the report was uploaded as to match the
 * report. Returns the players who aren't OpenDKP characters, who are left off it, as at upload.
 */
export const updateUploadedRaid = async (
  raidId: number,
  report: RaidReport,
  names: string[]
): Promise<string[]> => {
  const characters = await openDkpService.getCharacters();
  const registered = (name: string) =>
    characters.some((c) => sameName(c.Name, name));
  const unregistered = names.filter((n) => !registered(n));
  const attendance = names
    .filter(registered)
    .map((name) => ({ name, ticks: report.attendanceOf(name) }));
  if (attendance.length === 0) {
    return unregistered;
  }

  // one update to a raid at a time, since each must send the version it read
  await withRaidReportLock(`opendkp:${raidId}`, async () => {
    const raid = await openDkpService.getRaid(raidId);
    if (raid.Version === undefined) {
      throw new Error(`OpenDKP raid ${raidId} has no version to update`);
    }
    const payload: ODKPUpdateRaidData = {
      ClientId: raid.ClientId ?? openDkpSiteClientId ?? "",
      RaidId: `${raidId}`,
      Attendance: raid.Attendance,
      Items: raid.Items,
      Name: raid.Name,
      Pool: raid.Pool,
      Ticks: withAttendance(raid.Ticks, attendance),
      Timestamp: raid.Timestamp,
      Version: raid.Version,
    };
    await openDkpService.updateRaid(payload.RaidId, payload);
  });
  return unregistered;
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
