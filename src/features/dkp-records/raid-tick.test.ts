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

  it("warns instead of swapping when the pilot is already in attendance", () => {
    const commands = tick(
      ["Pumped", "Iceburgh"],
      [{ type: "PILOT", character: "Pumped", pilot: "Iceburgh", reason: "" }]
    ).creditCommands;
    expect(commands).toEqual([
      "⚠️ Pumped said botpilot Iceburgh during Raid Tick 2, but Iceburgh is already in attendance",
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

describe("attendance changes", () => {
  it("reports whether a replace or remove found the player", () => {
    const t = tick(["Pumped"], []);
    expect(t.replacePlayer("Iceburgh", "Nobody")).toBe(false);
    expect(t.removePlayer("Nobody")).toBe(false);
    expect(t.replacePlayer("Iceburgh", "pumped")).toBe(true);
    expect(t.data.attendees).toEqual(["Iceburgh"]);
  });

  it("remembers the original character through a chain of replacements", () => {
    const t = tick(["Pumped"], []);
    t.replacePlayer("Iceburgh", "Pumped");
    expect(t.getReplaced("Iceburgh")).toEqual("Pumped");
    t.replacePlayer("Kryg", "Iceburgh");
    expect(t.getReplaced("Kryg")).toEqual("Pumped");
    expect(t.getReplaced("Iceburgh")).toBeUndefined();
    t.removePlayer("Kryg");
    expect(t.getReplaced("Kryg")).toBeUndefined();
  });

  it("does not duplicate a replacer who is already in attendance", () => {
    const t = tick(["Iceburgh", "Pumped"], []);
    t.replacePlayer("Iceburgh", "Pumped");
    expect(t.data.attendees).toEqual(["Iceburgh"]);
  });
});

describe("renderClasses", () => {
  const classes: { [name: string]: string } = {
    Aa: "Cleric",
    Bb: "Cleric",
    Cc: "Shadow Knight",
    Dd: "Warrior",
  };

  it("summarises attendee classes, most common first", () => {
    const t = tick(["Aa", "Bb", "Cc", "Dd", "Unknown"], []);
    expect(t.renderClasses((n) => classes[n])).toEqual(
      "  CLR 2 · ? 1 · SHD 1 · WAR 1"
    );
  });

  it("counts a botpilot as their bot's class", () => {
    const t = tick(["Aa", "Dd"], []);
    t.replacePlayer("Iceburgh", "Dd");
    expect(t.renderClasses((n) => classes[n])).toEqual("  CLR 1 · WAR 1");
  });
});
