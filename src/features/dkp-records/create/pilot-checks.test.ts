import { getPilotWarnings, PilotLookups } from "./pilot-checks";

const lookups = (
  characters: string[],
  pilots: { [bot: string]: string }
): PilotLookups => ({
  characterExists: async (name) => characters.includes(name),
  getCurrentBotPilot: async (bot) => pilots[bot],
});

describe("getPilotWarnings", () => {
  it("passes a known pilot on a bot checked out to them", async () => {
    const warnings = await getPilotWarnings(
      [{ bot: "Pumped", pilot: "Iceburgh" }],
      lookups(["Iceburgh"], { Pumped: "iceburgh" })
    );
    expect(warnings).toEqual([]);
  });

  it("passes a bot that isn't in the bot sheet", async () => {
    const warnings = await getPilotWarnings(
      [{ bot: "Pumped", pilot: "Iceburgh" }],
      lookups(["Iceburgh"], {})
    );
    expect(warnings).toEqual([]);
  });

  it("flags an unknown pilot once across ticks", async () => {
    const credit = { bot: "Pumped", pilot: "Iceburg" };
    const warnings = await getPilotWarnings(
      [credit, credit],
      lookups(["Iceburgh"], {})
    );
    expect(warnings).toEqual([
      "⚠️ Pumped said botpilot Iceburg, but there is no character named Iceburg in OpenDKP",
    ]);
  });

  it("flags a bot checked out to someone else", async () => {
    const warnings = await getPilotWarnings(
      [{ bot: "Pumped", pilot: "Iceburgh" }],
      lookups(["Iceburgh"], { Pumped: "Kryg" })
    );
    expect(warnings).toEqual([
      "⚠️ Pumped said botpilot Iceburgh, but the bot sheet has Pumped checked out to Kryg",
    ]);
  });

  it("ignores lookup failures", async () => {
    const warnings = await getPilotWarnings(
      [{ bot: "Pumped", pilot: "Iceburgh" }],
      {
        characterExists: () => Promise.reject(new Error("down")),
        getCurrentBotPilot: () => Promise.reject(new Error("down")),
      }
    );
    expect(warnings).toEqual([]);
  });
});
