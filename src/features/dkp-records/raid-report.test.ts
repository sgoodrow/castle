vi.mock("../../redis/client", () => ({ redisChannels: {}, redisClient: {} }));
vi.mock("../../services/openDkpService", () => ({
  odkpCharacterCache: new Map(),
  openDkpService: {},
}));
vi.mock("../../config", () => ({ raiderRoleId: "raider" }));

import { embedLength } from "discord.js";
import { sum } from "lodash";
import { RaidReport, withRaidReportLock } from "./raid-report";
import { RaidTickData } from "./raid-tick";

const report = (attendees: string[]) =>
  new RaidReport({
    filename: "raid",
    ticks: [
      {
        finished: false,
        tickNumber: 1,
        sheetName: "Test",
        loot: [],
        attendees,
        date: "2026-10-14T00:00:00.000Z",
        credits: [],
      },
    ],
  });

describe("replacePlayer", () => {
  it("treats a re-approved !rep that already went through as a no-op", () => {
    const r = report(["Aprilokneel", "Someone"]);
    r.replacePlayer("Rousdowerr", "Aprilokneel", [1]);
    expect(() => r.replacePlayer("Rousdowerr", "Aprilokneel", [1])).not.toThrow();
    expect(() => r.replacePlayer("Rousdowerr", "Aprilokneel", [])).not.toThrow();
  });

  it("still rejects a !rep of someone who was never there", () => {
    const r = report(["Someone"]);
    expect(() => r.replacePlayer("Rousdowerr", "Aprilokneel", [1])).toThrow(
      "Aprilokneel is not in attendance on tick 1"
    );
  });
});

describe("withRaidReportLock", () => {
  it("runs edits to one thread one at a time, even after a failure", async () => {
    const order: string[] = [];
    const edit = (name: string, fail = false) => async () => {
      order.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, 10));
      order.push(`end ${name}`);
      if (fail) {
        throw new Error(name);
      }
    };
    await Promise.allSettled([
      withRaidReportLock("t", edit("a", true)),
      withRaidReportLock("t", edit("b")),
    ]);
    expect(order).toEqual(["start a", "end a", "start b", "end b"]);
  });
});

describe("updateMessages", () => {
  // bigger than the 2026-10-20 Quake raid, which outgrew the 3 messages it was posted with
  const bigReport = (players: number) => {
    const names = Array.from({ length: players }, (_, i) => `Raider${i}`);
    const ticks: RaidTickData[] = [1, 2, 3, 4, 5, 6].map((tickNumber) => ({
      finished: false,
      tickNumber,
      sheetName: "Quake",
      loot: [],
      attendees: names,
      date: "2026-10-20T12:00:00.000Z",
      credits: [],
      // botpilots' labels, e.g. "Raider0 [Botpiloted0]", widen every attendance line
      replaced: Object.fromEntries(
        names.slice(0, 40).map((n, i) => [n, `Botpiloted${i}`])
      ),
    }));
    return new RaidReport({ filename: "raid", ticks });
  };

  const message = (title: string) => {
    const m = {
      embeds: [{ title, length: 1 }],
      edited: [] as any[],
      edit: vi.fn(async ({ embeds }: { embeds: any[] }) => {
        m.edited = embeds.map((e) => e.toJSON());
      }),
    };
    return m;
  };

  // the thread as posted: two report pages, the instructions (which take a page) and the class summary
  const thread = () => [
    message("Raid Report"),
    message("Raid Report"),
    message("Instructions"),
    message("Class Summary"),
  ];

  const lines = (embeds: any[]) =>
    embeds
      .filter((e) => e.title === "Raid Report")
      .flatMap((e) => e.description.replace(/^```diff\n|```$/g, "").split("\n"))
      .filter((l) => l !== "");

  it("fits a report that has outgrown its pages into the messages it has", async () => {
    const report = bigReport(300);
    expect(report.getRaidReportEmbeds().length).toBe(4);
    const messages = thread();

    await report.updateMessages(messages as any);

    messages.forEach((m) => {
      expect(sum(m.edited.map((e) => embedLength(e)))).toBeLessThanOrEqual(6000);
      m.edited.forEach((e) => expect(e.description?.length ?? 0).toBeLessThanOrEqual(4096));
    });
    // every report message keeps a share, and the instructions stay last in theirs
    messages.slice(0, 3).forEach((m) => expect(m.edited[0].title).toBe("Raid Report"));
    expect(messages[2].edited.at(-1).title).toBe("Instructions");
    expect(messages[3].edited.map((e) => e.title)).toEqual(["Class Summary"]);
    // the report reads in order across them
    expect(messages.flatMap((m) => lines(m.edited))).toEqual(
      lines(report.getRaidReportEmbeds().map((e) => e.toJSON()))
    );
  });

  it("says so when the report is too long for every message", async () => {
    await expect(bigReport(400).updateMessages(thread() as any)).rejects.toThrow(
      "The raid report is too long for its 3 messages"
    );
  });
});

describe("attendance", () => {
  const attendance = (report: RaidReport) => {
    const text = report
      .getRaidReportMessageEmbeds([0])
      .flat()
      .map((e) => e.toJSON().description ?? "")
      .join("");
    return text.slice(text.indexOf("--- Attendance")).replace(/```$/, "").split("\n");
  };

  it("wraps a botpilot's bots after the first, with their ticks only on the first line", () => {
    const bots = ["Pumped", "Zapped", "Buffed", "Healed"];
    const report = new RaidReport({
      filename: "raid",
      ticks: bots.map((bot, i) => ({
        finished: false,
        tickNumber: i + 1,
        sheetName: "Test",
        loot: [],
        attendees: ["Iceburgh", "Someone"],
        date: "2026-10-14T00:00:00.000Z",
        credits: [],
        replaced: { Iceburgh: bot },
      })),
    });
    expect(attendance(report)).toEqual([
      "--- Attendance (2) ---",
      "+ Iceburgh [Pumped, (1, 2, 3, 4)",
      "+   Zapped, Buffed,",
      "+   Healed]",
      "+ Someone           (1, 2, 3, 4)",
    ]);
  });

  it("keeps a player with one bot on one line", () => {
    const report = new RaidReport({
      filename: "raid",
      ticks: [
        {
          finished: false,
          tickNumber: 1,
          sheetName: "Test",
          loot: [],
          attendees: ["Iceburgh", "Someone"],
          date: "2026-10-14T00:00:00.000Z",
          credits: [],
          replaced: { Iceburgh: "Pumped" },
        },
      ],
    });
    expect(attendance(report)).toEqual([
      "--- Attendance (2) ---",
      "+ Iceburgh [Pumped] (1)",
      "+ Someone           (1)",
    ]);
  });
});
