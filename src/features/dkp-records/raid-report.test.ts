vi.mock("../../redis/client", () => ({ redisChannels: {}, redisClient: {} }));
vi.mock("../../services/openDkpService", () => ({
  odkpCharacterCache: new Map(),
  openDkpService: {},
}));
vi.mock("../../config", () => ({ raiderRoleId: "raider" }));

import { Collection, embedLength } from "discord.js";
import { sum } from "lodash";
import {
  getRaidReportMessages,
  isRaidInstructionsMessage,
  RaidReport,
  withRaidReportLock,
} from "./raid-report";
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

// six ticks of the same players, the first 40 of them botpilots
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

const BOT = { id: "bot" };

const message = (id: string, embeds: { title: string }[], content = "") => {
  const m = {
    id,
    content,
    author: BOT,
    client: { user: BOT },
    embeds: embeds.map((e) => ({ ...e, length: 1 })),
    edited: [] as any[],
    edit: vi.fn(async ({ embeds }: { embeds: any[] }) => {
      m.edited = embeds.map((e) => e.toJSON());
    }),
    delete: vi.fn(async () => undefined),
  };
  return m;
};

const reportLines = (embeds: any[]) =>
  embeds
    .filter((e) => e.title === "Raid Report")
    .flatMap((e) => e.description.replace(/^```diff\n|```$/g, "").split("\n"))
    .filter((l) => l !== "");

const withinDiscordLimits = (embeds: any[]) => {
  expect(sum(embeds.map((e) => embedLength(e)))).toBeLessThanOrEqual(6000);
  embeds.forEach((e) => expect(e.description?.length ?? 0).toBeLessThanOrEqual(4096));
};

describe("posting a report", () => {
  it("posts a short report as one embed", () => {
    const posted = bigReport(10).getPostedEmbeds();
    expect(posted.map((embeds) => embeds.length)).toEqual([1]);
  });

  it("fills each message before starting the next", () => {
    const posted = bigReport(300)
      .getPostedEmbeds()
      .map((m) => m.map((e) => e.toJSON()));
    expect(posted).toHaveLength(3);
    posted.forEach(withinDiscordLimits);
    posted
      .slice(0, -1)
      .forEach((embeds) =>
        expect(sum(embeds.map((e) => embedLength(e)))).toBeGreaterThan(5500)
      );
  });

  it("posts the instructions as one short message", () => {
    const { instructions } = bigReport(1);
    expect(instructions.startsWith("**Instructions**")).toBe(true);
    expect(instructions.length).toBeLessThanOrEqual(2000);
  });
});

describe("isRaidInstructionsMessage", () => {
  const { instructions } = bigReport(1);

  it("finds the bot's instructions post", () => {
    expect(isRaidInstructionsMessage(message("1", [], instructions) as any)).toBe(true);
  });

  it("finds an older thread's instructions embed", () => {
    expect(isRaidInstructionsMessage(message("1", [{ title: "Instructions" }]) as any)).toBe(true);
  });

  it("ignores a member who pastes the instructions", () => {
    const pasted = { ...message("1", [], instructions), author: { id: "member" } };
    expect(isRaidInstructionsMessage(pasted as any)).toBe(false);
  });
});

describe("getRaidReportMessages", () => {
  it("leaves out the instructions post, which never changes", async () => {
    const { instructions } = bigReport(1);
    const posted = [
      message("1", [{ title: "Raid Report" }]),
      message("2", [{ title: "Raid Report" }]),
      message("3", [{ title: "Class Summary" }]),
      message("4", [], instructions),
      message("5", [], "!add Someone 1"),
    ];
    const channel = {
      isThread: () => true,
      fetchStarterMessage: async () => ({ id: "0" }),
      messages: {
        // Discord returns them newest first
        fetch: async () => new Collection(posted.map((m) => [m.id, m] as const).reverse()),
      },
    };
    const found = await getRaidReportMessages(channel as any);
    expect(found.map((m) => m.id)).toEqual(["1", "2", "3"]);
  });
});

describe("updateMessages", () => {
  const posted = (report: RaidReport) =>
    report.getPostedEmbeds().flat().map((e) => e.toJSON());

  it("grows a new thread's report into the class summary's message, above the summary", async () => {
    const report = bigReport(150);
    // posted when it was short: one report message, then the class summary
    const messages = [
      message("1", [{ title: "Raid Report" }]),
      message("2", [{ title: "Class Summary" }]),
    ];

    await report.updateMessages(messages as any);

    messages.forEach((m) => withinDiscordLimits(m.edited));
    expect(messages[1].edited.map((e) => e.title)).toEqual(["Raid Report", "Class Summary"]);
    expect(messages.flatMap((m) => reportLines(m.edited))).toEqual(reportLines(posted(report)));
  });

  it("keeps a short report in one embed and deletes a spare message it no longer reaches", async () => {
    const report = bigReport(10);
    // a thread posted with a spare report message
    const messages = [
      message("1", [{ title: "Raid Report" }]),
      message("2", [{ title: "Raid Report" }]),
      message("3", [{ title: "Class Summary" }]),
    ];

    await report.updateMessages(messages as any);

    expect(messages[0].edited.map((e) => e.title)).toEqual(["Raid Report"]);
    expect(messages[1].delete).toHaveBeenCalled();
    expect(messages[1].edit).not.toHaveBeenCalled();
    expect(messages[2].edited.map((e) => e.title)).toEqual(["Class Summary"]);
  });

  // an older thread: two report pages, the instructions embed (which takes a page) and the class summary
  const olderThread = () => [
    message("1", [{ title: "Raid Report" }]),
    message("2", [{ title: "Raid Report" }]),
    message("3", [{ title: "Instructions" }]),
    message("4", [{ title: "Class Summary" }]),
  ];

  it("fits a report that has outgrown an older thread's pages into the messages it has", async () => {
    const report = bigReport(300);
    // more than the 3 pages of 4000 its report messages used to hold
    expect(sum(posted(report).map((e) => embedLength(e)))).toBeGreaterThan(12000);
    const messages = olderThread();

    await report.updateMessages(messages as any);

    messages.forEach((m) => withinDiscordLimits(m.edited));
    expect(messages[2].edited.at(-1).title).toBe("Instructions");
    expect(messages[3].edited.at(-1).title).toBe("Class Summary");
    // the report reads in order across them
    expect(messages.flatMap((m) => reportLines(m.edited))).toEqual(reportLines(posted(report)));
  });

  it("says so when the report is too long for every message", async () => {
    await expect(bigReport(600).updateMessages(olderThread() as any)).rejects.toThrow(
      "The raid report is too long for its 4 messages"
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
