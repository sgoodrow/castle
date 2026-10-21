import { Collection } from "discord.js";
import { DAYS } from "../../shared/time";
import { expireOldRequests } from "./expire-old-requests";

vi.mock("../..", () => ({}));
vi.mock("../../shared/logger", () => ({ log: vi.fn() }));
vi.mock("../../config", () => ({ bankRequestsChannelId: "requests" }));

const BOT = "bot";
const NOW = 100 * DAYS;
let next = 0;

interface Fields {
  content?: string;
  author?: { id: string };
  embeds?: { url?: string; description?: string }[];
}
type Post = Required<Fields> & {
  id: string;
  createdTimestamp: number;
  delete: ReturnType<typeof vi.fn>;
};

const message = (ageDays: number, fields: Fields = {}): Post => ({
  id: String(next++),
  createdTimestamp: NOW - ageDays * DAYS,
  content: "",
  author: { id: BOT },
  embeds: [],
  delete: vi.fn(async () => undefined),
  ...fields,
});

const siteRequest = (ageDays: number, author = BOT) =>
  message(ageDays, {
    author: { id: author },
    embeds: [
      {
        url: "https://discord.com/users/111",
        description: "• Cloak of Flames (800pp)",
      },
    ],
  });

const commandRequest = (ageDays: number) =>
  message(ageDays, { content: "✍️ <@222> requests: Cloak of Flames x 1" });

// Newest first, a page of at most `limit` at a time, as Discord gives them.
const channel = (messages: Post[]) =>
  ({
    messages: {
      fetch: async ({ limit, before }: { limit: number; before?: string }) => {
        const from = before
          ? messages.findIndex((m) => m.id === before) + 1
          : 0;
        return new Collection(
          messages.slice(from, from + limit).map((m) => [m.id, m])
        );
      },
    },
  }) as unknown as Parameters<typeof expireOldRequests>[0];

const dms: [string, string][] = [];
const notify = async (userId: string, text: string) => {
  dms.push([userId, text]);
};
const expire = (messages: Post[]) =>
  expireOldRequests(channel(messages), BOT, NOW, notify);

beforeEach(() => {
  dms.length = 0;
});

describe("expiring old bank requests", () => {
  it("removes the bot's requests from the bank page once they're 30 days old", async () => {
    const fresh = siteRequest(29);
    const old = siteRequest(30);
    expect(await expire([fresh, old])).toBe(1);
    expect(fresh.delete).not.toHaveBeenCalled();
    expect(old.delete).toHaveBeenCalled();
    expect(dms).toEqual([
      ["111", expect.stringContaining("> • Cloak of Flames (800pp)")],
    ]);
  });

  it("removes the bot's /bank request posts once they're 30 days old", async () => {
    const old = commandRequest(45);
    expect(await expire([old])).toBe(1);
    expect(old.delete).toHaveBeenCalled();
    expect(dms).toEqual([
      [
        "222",
        expect.stringContaining("> ✍️ <@222> requests: Cloak of Flames x 1"),
      ],
    ]);
  });

  it("leaves players' own posts, however old", async () => {
    const typed = message(60, {
      author: { id: "player" },
      content: "Raid Reagents: Peridots, 40",
    });
    const copied = siteRequest(60, "player");
    expect(await expire([typed, copied])).toBe(0);
    expect(typed.delete).not.toHaveBeenCalled();
    expect(copied.delete).not.toHaveBeenCalled();
    expect(dms).toEqual([]);
  });

  it("leaves the bot's instructions, however old", async () => {
    const instructions = message(90, {
      embeds: [
        { url: "https://example.com/inventory", description: "• Spells" },
      ],
    });
    expect(await expire([instructions])).toBe(0);
    expect(instructions.delete).not.toHaveBeenCalled();
  });

  it("reads past the first page of the channel", async () => {
    const recent = Array.from({ length: 150 }, () => message(1));
    const old = commandRequest(31);
    expect(await expire([...recent, old])).toBe(1);
    expect(old.delete).toHaveBeenCalled();
  });

  it("still removes a request when its member doesn't take DMs", async () => {
    const old = siteRequest(40);
    const closed = async () => {
      throw new Error("Cannot send messages to this user");
    };
    expect(await expireOldRequests(channel([old]), BOT, NOW, closed)).toBe(1);
    expect(old.delete).toHaveBeenCalled();
  });

  it("keeps each DM within Discord's 2,000 characters", async () => {
    const long = message(40, {
      embeds: [
        {
          url: "https://discord.com/users/111",
          description: "• x\n".repeat(1000),
        },
      ],
    });
    await expire([long]);
    expect(dms[0][1].length).toBeLessThanOrEqual(2000);
  });

  it("skips a request a banker removed while the cleanup ran", async () => {
    const gone = siteRequest(40);
    gone.delete.mockRejectedValue(new Error("Unknown Message"));
    const old = commandRequest(40);
    expect(await expire([gone, old])).toBe(1);
    expect(old.delete).toHaveBeenCalled();
    expect(dms.map(([id]) => id)).toEqual(["222"]);
  });
});
