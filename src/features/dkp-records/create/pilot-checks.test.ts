import { getPilotWarnings, PilotLookups } from "./pilot-checks";

const lookups = (characters: string[]): PilotLookups => ({
  characterExists: async (name) => characters.includes(name),
});

describe("getPilotWarnings", () => {
  it("passes a known pilot", async () => {
    const warnings = await getPilotWarnings(
      [{ bot: "Pumped", pilot: "Iceburgh" }],
      lookups(["Iceburgh"])
    );
    expect(warnings).toEqual([]);
  });

  it("flags an unknown pilot once across ticks", async () => {
    const credit = { bot: "Pumped", pilot: "Iceburg" };
    const warnings = await getPilotWarnings(
      [credit, credit],
      lookups(["Iceburgh"])
    );
    expect(warnings).toEqual([
      "⚠️ Pumped said botpilot Iceburg, but there is no character named Iceburg in OpenDKP",
    ]);
  });

  it("ignores lookup failures", async () => {
    const warnings = await getPilotWarnings(
      [{ bot: "Pumped", pilot: "Iceburgh" }],
      {
        characterExists: () => Promise.reject(new Error("down")),
      }
    );
    expect(warnings).toEqual([]);
  });
});
