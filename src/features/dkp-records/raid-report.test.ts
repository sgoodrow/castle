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
  it("posts one more message than it has pages, each with a share", () => {
    const report = bigReport(170);
    const posted = report.getPostedEmbeds().map((m) => m.map((e) => e.toJSON()));
    expect(posted).toHaveLength(4);
    posted.forEach((embeds) => {
      expect(embeds.length).toBeGreaterThan(0);
      withinDiscordLimits(embeds);
    });
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
    const report = bigReport(10);
    const posted = [
      ...report.getPostedEmbeds().map((_, i) => message(`${i + 1}`, [{ title: "Raid Report" }])),
      message("8", [], report.instructions),
      message("9", [{ title: "Class Summary" }]),
      message("10", [], "!add Someone 1"),
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
    expect(found.map((m) => m.id)).toEqual(["1", "2", "9"]);
  });
});

describe("updateMessages", () => {
  it("fills a new thread's report messages and leaves the instructions alone", async () => {
    const report = bigReport(170);
    const messages = [
      ...report.getPostedEmbeds().map((_, i) => message(`${i}`, [{ title: "Raid Report" }])),
      message("class", [{ title: "Class Summary" }]),
    ];

    await report.updateMessages(messages as any);

    messages.forEach((m) => withinDiscordLimits(m.edited));
    expect(messages.flatMap((m) => m.edited.map((e) => e.title))).not.toContain("Instructions");
    expect(messages.flatMap((m) => reportLines(m.edited))).toEqual(
      reportLines(report.getPostedEmbeds().flat().map((e) => e.toJSON()))
    );
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
    // posted today it would take 4 pages and a spare
    expect(report.getPostedEmbeds()).toHaveLength(5);
    const messages = olderThread();

    await report.updateMessages(messages as any);

    messages.forEach((m) => withinDiscordLimits(m.edited));
    // every report message keeps a share, and the instructions stay last in theirs
    messages.slice(0, 3).forEach((m) => expect(m.edited[0].title).toBe("Raid Report"));
    expect(messages[2].edited.at(-1).title).toBe("Instructions");
    expect(messages[3].edited.map((e) => e.title)).toEqual(["Class Summary"]);
    // the report reads in order across them
    expect(messages.flatMap((m) => reportLines(m.edited))).toEqual(
      reportLines(report.getPostedEmbeds().flat().map((e) => e.toJSON()))
    );
  });

  it("says so when the report is too long for every message", async () => {
    await expect(bigReport(400).updateMessages(olderThread() as any)).rejects.toThrow(
      "The raid report is too long for its 3 messages"
    );
  });
});
