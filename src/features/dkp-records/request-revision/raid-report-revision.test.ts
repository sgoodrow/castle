const store = new Map<string, string>();
const redis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  publish: vi.fn(),
}));

const odkp = vi.hoisted(() => ({
  getCharacter: vi.fn(async () => undefined),
  getCharacters: vi.fn(),
  getRaid: vi.fn(),
  getRaids: vi.fn(),
  updateRaid: vi.fn(),
}));

vi.mock("../../../config", () => ({
  dkpDeputyRoleId: "deputy",
  officerRoleId: "officer",
  dkpRecordsChannelId: "dkp-records",
  openDkpSiteClientId: "castle",
  openDkpClientName: "castle",
}));
vi.mock("../../../redis/client", () => ({
  redisChannels: { raidReportChange: (id: string) => `raid.${id}` },
  redisClient: redis,
}));
vi.mock("../../../services/openDkpService", () => ({
  odkpCharacterCache: new Map(),
  openDkpService: odkp,
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

// a !command in the raid thread that a deputy has just ✅'d: approving must not touch Discord
// beyond the bot adding its own ✅ to the same reaction, and reopening an archived thread
const request = (id: string, thread: { name?: string; archived?: boolean } = {}) => {
  const reactions = [{ emoji: { name: "✅" }, me: false }];
  return {
    id,
    channelId: THREAD,
    channel: {
      id: THREAD,
      guildId: "guild",
      name: "❕ 10-20 Quake",
      archived: false,
      ...thread,
      isThread: () => true,
      setArchived: vi.fn(),
    },
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
  Object.values(odkp).forEach((f) => f.mockReset());
  odkp.getCharacter.mockImplementation(async () => undefined);
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

  it("keeps the saved report for 90 days", async () => {
    await save([tickData(1, ["Someone"])]);
    expect(redis.set).toHaveBeenCalledWith(THREAD, expect.any(String), {
      EX: 90 * 24 * 60 * 60,
    });
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

  it("rejects a request missing its player", async () => {
    await save([tickData(1, ["Someone"])]);
    await expect(approve("!add", request("1"))).rejects.toThrow(
      'Invalid "AddPlayerRevision" format, missing player name'
    );
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

describe("approving after the raid is uploaded", () => {
  const RAID = 42;
  const raid = (ticks: string[][]) => ({
    RaidId: RAID,
    ClientId: "castle",
    Version: 3,
    Attendance: 1,
    Items: [{ ItemName: "Cloak of Flames" }],
    Name: `Quake 1, Quake 2 https://discord.com/channels/guild/${THREAD}`,
    Pool: { Name: "SoV" },
    Timestamp: "2026-10-20T12:00:00.000Z",
    Ticks: ticks.map((names, i) => ({
      Description: `Quake ${i + 1}`,
      Value: 3,
      Characters: names.map((Name) => ({ Name })),
    })),
  });
  const characters = (...names: string[]) =>
    odkp.getCharacters.mockResolvedValue(names.map((Name) => ({ Name })));
  const sentTicks = () =>
    odkp.updateRaid.mock.calls[0][1].Ticks.map((t: any) =>
      t.Characters.map((c: any) => c.Name)
    );

  const uploaded = async (ticks: RaidTickData[]) => {
    const report = new RaidReport({ filename: "raid", ticks });
    report.markUploaded(RAID);
    await report.save(THREAD);
  };

  it("updates the OpenDKP raid's attendance to match", async () => {
    await uploaded([tickData(1, ["Pumped", "Someone"]), tickData(2, ["Pumped"])]);
    characters("Pumped", "Someone", "Iceburgh");
    // an admin already added Latecomer on the site
    odkp.getRaid.mockResolvedValue(raid([["Pumped", "Someone", "Latecomer"], ["Pumped"]]));
    const message = request("1");

    await approve("!rep Pumped with Iceburgh 1", message);

    expect(odkp.getRaid).toHaveBeenCalledWith(RAID);
    expect(odkp.updateRaid).toHaveBeenCalledWith(
      `${RAID}`,
      expect.objectContaining({ RaidId: `${RAID}`, Version: 3, Items: [{ ItemName: "Cloak of Flames" }] })
    );
    expect(sentTicks()).toEqual([["Someone", "Latecomer", "Iceburgh"], ["Pumped"]]);
    expect(message.react).toHaveBeenCalledWith("✅");
    expect(message.reply).toHaveBeenCalledWith(
      `Updated the [OpenDKP raid](<https://castle.opendkp.com/#/raids/${RAID}>): added Iceburgh to tick 1; removed Pumped from tick 1.`
    );
  });

  it("says so when the raid already has the change, and leaves it alone", async () => {
    await uploaded([tickData(1, ["Someone"]), tickData(2, ["Someone"])]);
    characters("Someone", "Iceburgh");
    odkp.getRaid.mockResolvedValue(raid([["Someone", "Iceburgh"], ["Someone", "Iceburgh"]]));
    const message = request("1");

    await approve("!add Iceburgh", message);

    expect(odkp.updateRaid).not.toHaveBeenCalled();
    expect(message.react).toHaveBeenCalledWith("✅");
    expect(message.reply).toHaveBeenCalledWith(
      `The [OpenDKP raid](<https://castle.opendkp.com/#/raids/${RAID}>) already had this.`
    );
  });

  it("reopens the archived thread to react", async () => {
    await uploaded([tickData(1, ["Someone"])]);
    characters("Someone", "Iceburgh");
    odkp.getRaid.mockResolvedValue(raid([["Someone"]]));
    const message = request("1", { name: "✅ 10-20 Quake", archived: true });

    await approve("!add Iceburgh 1", message);

    expect(message.channel.setArchived).toHaveBeenCalledWith(false);
    expect(sentTicks()).toEqual([["Someone", "Iceburgh"]]);
    expect(message.react).toHaveBeenCalledWith("✅");
    expect(message.reply.mock.calls[0][0]).toContain("added Iceburgh to tick 1.");
  });

  it("says who isn't an OpenDKP character, and leaves them off the raid", async () => {
    await uploaded([tickData(1, ["Someone"])]);
    characters("Someone");
    const message = request("1");

    await approve("!add Newguy 1", message);

    expect(savedTicks()[0].attendees).toEqual(["Newguy", "Someone"]);
    expect(odkp.updateRaid).not.toHaveBeenCalled();
    expect(message.react).toHaveBeenCalledWith("✅");
    expect(message.reply).toHaveBeenCalledWith(
      "⚠️ Newguy isn't an OpenDKP character, so the uploaded raid leaves them off."
    );
  });

  it("says so when OpenDKP can't be updated, keeping the report's edit", async () => {
    await uploaded([tickData(1, ["Someone"])]);
    characters("Someone", "Iceburgh");
    odkp.getRaid.mockRejectedValue(new Error("Request failed with status code 500"));
    const message = request("1");

    await approve("!add Iceburgh 1", message);

    expect(savedTicks()[0].attendees).toEqual(["Iceburgh", "Someone"]);
    expect(message.react).toHaveBeenCalledWith("⚠️");
    expect(message.react).not.toHaveBeenCalledWith("✅");
    expect(message.reply.mock.calls[0][0]).toContain("couldn't be, so please change it on OpenDKP");
  });

  it("finds a thread uploaded before reports kept their raid, by its link", async () => {
    await save([tickData(1, ["Someone"])]);
    characters("Someone", "Iceburgh");
    odkp.getRaids.mockResolvedValue([
      { RaidId: 7, Name: "Other https://discord.com/channels/guild/other" },
      raid([]),
    ]);
    odkp.getRaid.mockResolvedValue(raid([["Someone"]]));

    await approve("!add Iceburgh 1", request("1", { name: "✅ 10-20 Quake" }));

    expect(odkp.getRaid).toHaveBeenCalledWith(RAID);
    expect(sentTicks()).toEqual([["Someone", "Iceburgh"]]);
    expect(saved().uploadedRaidId).toBe(RAID);
  });

  it("names every player who isn't an OpenDKP character", async () => {
    await uploaded([tickData(1, ["Pumped"])]);
    characters();
    const message = request("1");

    await approve("!rep Pumped with Iceburgh 1", message);

    expect(message.reply).toHaveBeenCalledWith(
      "⚠️ Iceburgh, Pumped aren't OpenDKP characters, so the uploaded raid leaves them off."
    );
  });

  it("says so when a thread uploaded before reports kept their raid has no raid to find", async () => {
    await save([tickData(1, ["Someone"])]);
    odkp.getRaids.mockResolvedValue([]);
    const message = request("1", { name: "✅ 10-20 Quake" });

    await approve("!add Iceburgh 1", message);

    expect(message.react).toHaveBeenCalledWith("⚠️");
    expect(message.reply.mock.calls[0][0]).toContain(
      "Could not find the OpenDKP raid this thread was uploaded as"
    );
  });

  describe("once the thread's report has expired", () => {
    const expiredUpload = (ticks: string[][]) => {
      odkp.getRaids.mockResolvedValue([raid(ticks)]);
      odkp.getRaid.mockResolvedValue(raid(ticks));
    };
    const uploadedThread = () => request("1", { name: "✅ 10-20 Quake" });

    it("adds the player to the raid's tick, and says so", async () => {
      characters("Someone", "Iceburgh");
      expiredUpload([["Someone"], ["Someone"]]);
      const message = uploadedThread();

      await approve("!add Iceburgh 2", message);

      expect(sentTicks()).toEqual([["Someone"], ["Someone", "Iceburgh"]]);
      expect(message.react).toHaveBeenCalledWith("✅");
      expect(message.reply).toHaveBeenCalledWith(
        `Updated the [OpenDKP raid](<https://castle.opendkp.com/#/raids/${RAID}>): added Iceburgh to tick 2.\nThis thread's raid report has expired, so it isn't redrawn.`
      );
      expect(store.has(THREAD)).toBe(false);
    });

    it("replaces a bot only on the ticks it's on", async () => {
      characters("Pumped", "Someone", "Iceburgh");
      expiredUpload([["Pumped"], ["Someone"]]);

      await approve("!rep Pumped with Iceburgh", uploadedThread());

      expect(sentTicks()).toEqual([["Iceburgh"], ["Someone"]]);
    });

    it("says so when the player isn't on the raid, and changes nothing", async () => {
      characters("Someone", "Nobody");
      expiredUpload([["Someone"]]);
      const message = uploadedThread();

      await approve("!rem Nobody 1", message);

      expect(odkp.updateRaid).not.toHaveBeenCalled();
      expect(message.react).toHaveBeenCalledWith("⚠️");
      expect(message.reply).toHaveBeenCalledWith("⚠️ Nobody is not in attendance on tick 1");
    });

    it("asks for an adjustment to be made on OpenDKP", async () => {
      expiredUpload([["Someone"]]);
      const message = uploadedThread();

      await approve("!adj Someone 5 kill", message);

      expect(odkp.getRaid).not.toHaveBeenCalled();
      expect(message.reply).toHaveBeenCalledWith(
        "⚠️ This thread's raid report has expired, so please make this change on OpenDKP"
      );
    });

    it("still can't find a report for a thread that wasn't uploaded", async () => {
      await expect(approve("!add Iceburgh 1", request("1"))).rejects.toThrow(
        "Could not find raid report in database."
      );
    });
  });

  it("leaves OpenDKP alone before the raid is uploaded", async () => {
    await save([tickData(1, ["Someone"])]);
    await approve("!add Iceburgh 1", request("1"));
    expect(odkp.getCharacters).not.toHaveBeenCalled();
    expect(odkp.getRaids).not.toHaveBeenCalled();
  });

  it("leaves the uploaded raid alone for an adjustment, which isn't attendance", async () => {
    await uploaded([tickData(1, ["Someone"])]);
    await approve("!adj Someone 5 kill", request("1"));
    expect(odkp.getRaid).not.toHaveBeenCalled();
  });
});
