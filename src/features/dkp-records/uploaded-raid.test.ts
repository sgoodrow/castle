vi.mock("../../config", () => ({ openDkpClientName: "castle" }));
vi.mock("../../redis/client", () => ({ redisChannels: {}, redisClient: {} }));
vi.mock("../../services/openDkpService", () => ({
  odkpCharacterCache: new Map(),
  openDkpService: {},
}));

import { attendanceChanges, describeChanges, withAttendance } from "./uploaded-raid";

const ticks = (...names: string[][]) =>
  names.map((n, i) => ({
    Description: `Tick ${i + 1}`,
    Value: 3,
    Characters: n.map((Name) => ({ Name })),
  }));
const names = (t: ReturnType<typeof ticks>) =>
  t.map((tick) => tick.Characters.map((c) => c.Name));

describe("withAttendance", () => {
  it("adds and removes only the named players, tick by tick", () => {
    const result = withAttendance(ticks(["Pumped", "Admin"], ["Pumped"]), [
      { name: "Iceburgh", ticks: [true, false] },
      { name: "Pumped", ticks: [false, true] },
    ]);
    expect(names(result)).toEqual([["Admin", "Iceburgh"], ["Pumped"]]);
  });

  it("matches names regardless of case", () => {
    const result = withAttendance(ticks(["pumped"]), [
      { name: "Pumped", ticks: [false] },
    ]);
    expect(names(result)).toEqual([[]]);
  });

  it("changes nothing when applied again", () => {
    const attendance = [{ name: "Iceburgh", ticks: [true, true] }];
    const once = withAttendance(ticks(["Someone"], []), attendance);
    expect(withAttendance(once, attendance)).toEqual(once);
  });

  it("refuses a raid whose ticks don't match the report's", () => {
    expect(() =>
      withAttendance(ticks(["Someone"]), [{ name: "Iceburgh", ticks: [true, false] }])
    ).toThrow("The OpenDKP raid has 1 ticks but the raid report has 2");
  });
});

describe("attendanceChanges", () => {
  it("lists the ticks each player is added to and removed from", () => {
    expect(
      attendanceChanges(ticks(["Pumped"], ["Pumped"], []), [
        { name: "Iceburgh", ticks: [true, false, true] },
        { name: "Pumped", ticks: [false, true, false] },
      ])
    ).toEqual([
      { name: "Iceburgh", added: [1, 3], removed: [] },
      { name: "Pumped", added: [], removed: [1] },
    ]);
  });
});

describe("describeChanges", () => {
  it("says who was added and removed, with a link to the raid", () => {
    expect(
      describeChanges(42, [
        { name: "Iceburgh", added: [1, 3], removed: [] },
        { name: "Pumped", added: [], removed: [1] },
      ])
    ).toBe(
      "Updated the [OpenDKP raid](<https://castle.opendkp.com/#/raids/42>): added Iceburgh to ticks 1, 3; removed Pumped from tick 1."
    );
  });

  it("says when the raid already had the change", () => {
    expect(describeChanges(42, [{ name: "Iceburgh", added: [], removed: [] }])).toBe(
      "The [OpenDKP raid](<https://castle.opendkp.com/#/raids/42>) already had this."
    );
  });
});
