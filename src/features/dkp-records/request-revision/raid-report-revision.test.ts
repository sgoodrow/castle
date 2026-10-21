const store = new Map<string, string>();
const redis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  publish: vi.fn(),
}));

vi.mock("../../../config", () => ({
  dkpDeputyRoleId: "deputy",
  officerRoleId: "officer",
  dkpRecordsChannelId: "dkp-records",
}));
vi.mock("../../../redis/client", () => ({
  redisChannels: { raidReportChange: (id: string) => `raid.${id}` },
  redisClient: redis,
}));
vi.mock("../../../services/openDkpService", () => ({
  odkpCharacterCache: new Map(),
  openDkpService: { getCharacter: vi.fn(async () => undefined) },
}));

import { CreditData } from "../create/credit-parser";
import { RaidReport } from "../raid-report";
import { RaidTick, RaidTickData } from "../raid-tick";
import { getAction, getRaidRevisionMessageContent } from "./util";

const THREAD = "thread";

const tickData = (
  tickNumber: number,
  attendees: string[],
  credits: CreditData[] = []
): RaidTickData => ({
  finished: false,
  tickNumber,
  sheetName: "Test",
  loot: [],
  attendees,
  date: "2026-10-20T12:00:00.000Z",
  credits,
});

const saved = () => new RaidReport(JSON.parse(store.get(THREAD) ?? ""));
const savedTicks = (): RaidTickData[] =>
  JSON.parse(store.get(THREAD) ?? "").ticks;

// a !command in the raid thread that a deputy has just ✅'d, with no `channel`: approving
// must not touch Discord beyond the bot adding its own ✅ to the same reaction
const request = (id: string) => {
  const reactions = [{ emoji: { name: "✅" }, me: false }];
  return {
    id,
    channelId: THREAD,
    reactions: { cache: reactions },
    react: vi.fn(async (name: string) => {
      const reaction = reactions.find((r) => r.emoji.name === name);
      if (reaction) {
        reaction.me = true;
      } else {
        reactions.push({ emoji: { name }, me: true });
      }
    }),
    reply: vi.fn(),
  } as any;
};

const member = (role: string) => ({ roles: { cache: new Set([role]) } }) as any;
const deputy = member("deputy");
const raider = member("raider");

const approve = (content: string, message = request(content), actor = deputy) =>
  getAction(content).tryExecute(message, actor);

beforeEach(() => {
  store.clear();
  redis.get.mockReset().mockImplementation(async (k: string) => store.get(k) ?? null);
  redis.set.mockReset().mockImplementation(async (k: string, v: string) => {
    store.set(k, v);
  });
  redis.publish.mockReset();
});

const save = (ticks: RaidTickData[]) =>
  new RaidReport({ filename: "raid", ticks }).save(THREAD);

describe("approving a raid report request", () => {
  it("edits the saved report and reacts ✅", async () => {
    await save([tickData(1, ["Pumped"])]);
    const message = request("1");
    await approve("!rep Pumped with Iceburgh 1", message);
    expect(savedTicks()[0].attendees).toEqual(["Iceburgh"]);
    expect(message.react).toHaveBeenCalledWith("✅");
  });

  it("skips a later ✅ once the bot has added its own", async () => {
    await save([tickData(1, ["Someone"])]);
    const message = request("1");
    await approve("!adj Someone 5 kill", message);
    await approve("!adj Someone 5 kill", message);
    expect(savedTicks()[0].adjustments).toHaveLength(1);
    expect(message.react).toHaveBeenCalledTimes(1);
  });

  it("does nothing once the bot's ✅ is on the message", async () => {
    await save([tickData(1, ["Someone"])]);
    const message = request("1");
    await message.react("✅");
    await approve("!adj Someone 5 kill", message);
    expect(redis.set).toHaveBeenCalledTimes(1);
  });

  it("applies an !adj once when two deputies ✅ it together", async () => {
    await save([tickData(1, ["Someone"])]);
    const message = request("1");
    await Promise.all([
      approve("!adj Someone 5 kill", message),
      approve("!adj Someone 5 kill", message),
    ]);
    expect(savedTicks()[0].adjustments).toHaveLength(1);
  });

  it("still applies a deputy's ✅ that lands while a raider's ✅ is checked", async () => {
    await save([tickData(1, ["Someone"])]);
    const message = request("1");
    await Promise.all([
      approve("!adj Someone 5 kill", message, raider),
      approve("!adj Someone 5 kill", message, deputy),
    ]);
    expect(savedTicks()[0].adjustments).toHaveLength(1);
  });

  it("reports an edit that can't apply with ⚠️ and saves nothing", async () => {
    await save([tickData(1, ["Someone"])]);
    const message = request("1");
    await approve("!rem Nobody 1", message);
    expect(message.react).toHaveBeenCalledWith("⚠️");
    expect(redis.set).toHaveBeenCalledTimes(1);
  });

  // bigger than the 2026-10-20 Quake upload, whose 6 ticks posted 106 credit !rep and !add messages
  it("applies a burst of every credit message at once, reading only the saved report", async () => {
    const ticks = [1, 2, 3, 4, 5, 6].map((n) => {
      const bots = Array.from({ length: 18 }, (_, i) => `Bot${n}x${i}`);
      const present = bots.slice(0, 12);
      const credits: CreditData[] = bots.map((bot, i) => ({
        type: "PILOT",
        character: bot,
        pilot: `Pilot${n}x${i}`,
        reason: i < 12 ? "" : "dead",
      }));
      return tickData(n, ["Someone", ...present], credits);
    });
    await save(ticks);
    const commands = ticks.flatMap((t) => new RaidTick(t).creditCommands);
    expect(commands).toHaveLength(144);

    const messages = commands.map((_, i) => request(`${i}`));
    await Promise.all(commands.map((c, i) => approve(c, messages[i])));

    expect(messages.every((m) => m.react.mock.calls[0][0] === "✅")).toBe(true);
    const report = saved();
    savedTicks().forEach((t, i) =>
      expect(t.attendees).toEqual(
        ["Someone", ...Array.from({ length: 18 }, (_, b) => `Pilot${i + 1}x${b}`)].sort()
      )
    );
    expect(report.netDkp).toBe(0);
    // one read and one write per approval: nothing else waits in the lock
    expect(redis.get).toHaveBeenCalledTimes(commands.length);
    expect(redis.set).toHaveBeenCalledTimes(commands.length + 1);
  });
});

describe("reading a request's content", () => {
  const inThread = (overrides: Record<string, unknown>) =>
    ({
      channel: { isThread: () => true, parentId: "dkp-records" },
      ...overrides,
    }) as any;

  it("uses a cached message's content without fetching it", async () => {
    const fetch = vi.fn();
    const content = await getRaidRevisionMessageContent(
      inThread({ partial: false, content: "!add Someone", fetch })
    );
    expect(content).toBe("!add Someone");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches a partial message", async () => {
    const fetch = vi.fn(async () => ({ content: "!add Someone" }));
    const content = await getRaidRevisionMessageContent(
      inThread({ partial: true, fetch })
    );
    expect(content).toBe("!add Someone");
  });
});
