vi.mock("../../config", () => ({}));
vi.mock("../../redis/client", () => ({ redisChannels: {}, redisClient: {} }));
vi.mock("../../services/openDkpService", () => ({
  odkpCharacterCache: new Map(),
  openDkpService: {},
}));

import { withAttendance } from "./uploaded-raid";

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
