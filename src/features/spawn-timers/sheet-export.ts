import { GoogleSpreadsheet } from "google-spreadsheet";
import type { Timer } from "@prisma/client";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  TIMER_EXPORT_SHEET_ID,
} from "../../config";
import { timerPrismaClient } from "../../db/timer-client";
import { checkGoogleCredentials } from "../../services/gdrive";
import { log } from "../../shared/logger";
import { MINUTES } from "../../shared/time";
import {
  nextSpawnTimeEnd,
  nextSpawnTimeStart,
  timerPhase,
} from "./commands/helpers/timer";

const SHEET_TITLE = "Timers";
// Rewrite at least this often even when nothing changed, so readers can use
// the Updated column to tell the export is still alive.
const HEARTBEAT_MS = 15 * MINUTES;

const HEADERS = [
  "Boss",
  "Status",
  "Window Opens (UTC)",
  "Window Closes (UTC)",
  "Last TOD (UTC)",
  "Skip Count",
  "Updated (UTC)",
];

let lastSnapshot: string | null = null;
let lastWrite = 0;
let doc: GoogleSpreadsheet | null = null;

const iso = (d: Date | null) => (d ? d.toISOString() : "");

function getStatus(timer: Timer, now: Date): string {
  return timerPhase(timer, now) ?? "no tod";
}

async function getDoc(): Promise<GoogleSpreadsheet> {
  if (!doc) {
    checkGoogleCredentials();
    doc = new GoogleSpreadsheet(TIMER_EXPORT_SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: (GOOGLE_PRIVATE_KEY || "").split(String.raw`\n`).join("\n"),
    });
  }
  return doc;
}

/**
 * Mirror current spawn timers into a read-only Google Sheet so they can be
 * consumed outside Discord. Disabled unless TIMER_EXPORT_SHEET_ID is set.
 */
export async function exportTimersToSheet(): Promise<void> {
  if (!TIMER_EXPORT_SHEET_ID) return;

  const now = new Date();
  const timers = await timerPrismaClient.timer.findMany({
    orderBy: { name: "asc" },
  });

  const rows = timers.map((timer) => [
    timer.name,
    getStatus(timer, now),
    iso(nextSpawnTimeStart(timer)),
    iso(nextSpawnTimeEnd(timer)),
    iso(timer.lastTod ? new Date(timer.lastTod * 1000) : null),
    timer.skipCount ?? 0,
  ]);

  const snapshot = JSON.stringify(rows);
  if (snapshot === lastSnapshot && now.getTime() - lastWrite < HEARTBEAT_MS) {
    return;
  }

  const spreadsheet = await getDoc();
  await spreadsheet.loadInfo();
  const sheet =
    spreadsheet.sheetsByTitle[SHEET_TITLE] ??
    (await spreadsheet.addSheet({ title: SHEET_TITLE }));

  const updated = now.toISOString();
  await sheet.clear();
  await sheet.setHeaderRow(HEADERS);
  if (rows.length > 0) {
    await sheet.addRows(rows.map((row) => [...row, updated]));
  }

  lastSnapshot = snapshot;
  lastWrite = now.getTime();
}

let isExporting = false;

export async function timerSheetExportLoop(): Promise<void> {
  if (isExporting) return;
  isExporting = true;
  try {
    await exportTimersToSheet();
  } catch (err) {
    log(`Error exporting timers to sheet: ${err}`);
  } finally {
    isExporting = false;
  }
}
