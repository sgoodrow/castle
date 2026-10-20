import { DAYS } from "../../shared/time";
import {
  expireOldRequests,
  PostedMessage,
  RequestsChannel,
} from "./expire-old-requests";

vi.mock("../..", () => ({}));
vi.mock("../../config", () => ({ bankRequestsChannelId: "requests" }));

const BOT = "bot";
const NOW = 100 * DAYS;
let next = 0;

const message = (
  ageDays: number,
  fields: Partial<Omit<PostedMessage, "delete">> = {}
): PostedMessage & { delete: ReturnType<typeof vi.fn> } => ({
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
const channel = (messages: PostedMessage[]): RequestsChannel => ({
  messages: {
    fetch: async ({ limit, before }) => {
      const from = before ? messages.findIndex((m) => m.id === before) + 1 : 0;
      return { values: () => messages.slice(from, from + limit).values() };
    },
  },
});

describe("expiring old bank requests", () => {
  it("removes the bot's requests from the bank page once they're 30 days old", async () => {
    const fresh = siteRequest(29);
    const old = siteRequest(30);
    expect(await expireOldRequests(channel([fresh, old]), BOT, NOW)).toBe(1);
    expect(fresh.delete).not.toHaveBeenCalled();
    expect(old.delete).toHaveBeenCalled();
  });

  it("removes the bot's /bank request posts once they're 30 days old", async () => {
    const old = commandRequest(45);
    expect(await expireOldRequests(channel([old]), BOT, NOW)).toBe(1);
    expect(old.delete).toHaveBeenCalled();
  });

  it("leaves players' own posts, however old", async () => {
    const typed = message(60, {
      author: { id: "player" },
      content: "Raid Reagents: Peridots, 40",
    });
    const copied = siteRequest(60, "player");
    expect(await expireOldRequests(channel([typed, copied]), BOT, NOW)).toBe(0);
    expect(typed.delete).not.toHaveBeenCalled();
    expect(copied.delete).not.toHaveBeenCalled();
  });

  it("leaves the bot's instructions, however old", async () => {
    const instructions = message(90, {
      embeds: [{ url: "https://example.com/inventory", description: "• Spells" }],
    });
    expect(await expireOldRequests(channel([instructions]), BOT, NOW)).toBe(0);
    expect(instructions.delete).not.toHaveBeenCalled();
  });

  it("reads past the first page of the channel", async () => {
    const recent = Array.from({ length: 150 }, () => message(1));
    const old = commandRequest(31);
    expect(await expireOldRequests(channel([...recent, old]), BOT, NOW)).toBe(1);
    expect(old.delete).toHaveBeenCalled();
  });
});
