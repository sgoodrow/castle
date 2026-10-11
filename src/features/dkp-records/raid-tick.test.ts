import { CreditData } from "./create/credit-parser";
import { RaidTick } from "./raid-tick";

const tick = (attendees: string[], credits: CreditData[]) =>
  new RaidTick({
    finished: false,
    tickNumber: 2,
    sheetName: "Test",
    loot: [],
    attendees,
    date: "2026-10-10T00:00:00.000Z",
    credits,
  });

describe("creditCommands", () => {
  it("only reps when the bot is in attendance", () => {
    const commands = tick(
      ["Pumped", "Someone"],
      [{ type: "PILOT", character: "Pumped", pilot: "Iceburgh", reason: "" }]
    ).creditCommands;
    expect(commands).toEqual(["!rep Pumped with Iceburgh 2"]);
  });

  it("matches attendance regardless of case", () => {
    const commands = tick(
      ["pumped"],
      [{ type: "PILOT", character: "Pumped", pilot: "Iceburgh", reason: "" }]
    ).creditCommands;
    expect(commands).toEqual(["!rep Pumped with Iceburgh 2"]);
  });

  it("adds the bot before the rep when it is not in attendance", () => {
    const commands = tick(
      ["Someone"],
      [
        {
          type: "PILOT",
          character: "Pumped",
          pilot: "Iceburgh",
          reason: "out of zone",
        },
      ]
    ).creditCommands;
    expect(commands).toEqual([
      "!add Pumped 2 (botpilot, not in attendance)",
      "!rep Pumped with Iceburgh 2 (out of zone)",
    ]);
  });

  it("only adds a missing bot once per tick", () => {
    const credit: CreditData = {
      type: "PILOT",
      character: "Pumped",
      pilot: "Iceburgh",
      reason: "",
    };
    const commands = tick([], [credit, credit]).creditCommands;
    expect(commands).toEqual([
      "!add Pumped 2 (botpilot, not in attendance)",
      "!rep Pumped with Iceburgh 2",
      "!rep Pumped with Iceburgh 2",
    ]);
  });

  it("leaves reason and unknown credits unchanged", () => {
    const commands = tick(
      [],
      [
        { type: "REASON", character: "Pumped", reason: "dead from DT" },
        { type: "UNKNOWN", character: "Pumped", raw: "creditt" },
      ]
    ).creditCommands;
    expect(commands).toEqual([
      "!add Pumped 2 (dead from DT)",
      "⚠️ Unparsable credit: Pumped said 'creditt' during Raid Tick 2",
    ]);
  });
});
