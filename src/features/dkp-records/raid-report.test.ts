vi.mock("../../redis/client", () => ({ redisChannels: {}, redisClient: {} }));
vi.mock("../../services/openDkpService", () => ({
  odkpCharacterCache: new Map(),
  openDkpService: {},
}));
vi.mock("../../config", () => ({}));

import { RaidReport, withRaidReportLock } from "./raid-report";

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
