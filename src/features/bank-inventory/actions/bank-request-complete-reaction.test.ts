import { MessageCreateOptions, MessageReaction, User } from "discord.js";
import { tryBankRequestComplete } from "./bank-request-complete-reaction";

jest.mock("../../../config", () => ({
  bankRequestsChannelId: "requests",
  bankTransactionsChannelId: "transactions",
  bankerRoleId: "banker",
  officerRoleId: "officer",
  modRoleId: "mod",
}));

const roles: Record<string, string[]> = {};
const sent: MessageCreateOptions[] = [];
// The executor replies to the request with any error the handler throws.
const errors: string[] = [];

jest.mock("../../..", () => ({
  getMember: async (id: string) => ({
    roles: {
      cache: { has: (role: string) => (roles[id] ?? []).includes(role) },
    },
  }),
  getTextChannel: async () => ({
    send: async (m: MessageCreateOptions) => sent.push(m),
  }),
}));

const user = (id: string) => ({ id, toString: () => `<@${id}>` });

const siteRequest = (
  embed: object = {
    title: "@Alice has placed a bank request",
    url: "https://discord.com/users/111",
    description: "• Cloak of Flames (800pp)",
  }
) => ({
  channel: { id: "requests" },
  content: "",
  embeds: [embed],
  mentions: { users: new Map() },
  author: { bot: true },
  delete: jest.fn(),
  reply: (err: string) => errors.push(err),
});

const commandRequest = () => ({
  channel: { id: "requests" },
  content: "✍️ <@222> requests: Cloak of Flames",
  embeds: [],
  mentions: { users: new Map([["222", {}]]) },
  author: { bot: true },
  delete: jest.fn(),
  reply: (err: string) => errors.push(err),
});

const react = (message: object, emoji: string, by: string) =>
  tryBankRequestComplete(
    {
      partial: false,
      emoji: { name: emoji },
      message,
    } as unknown as MessageReaction,
    user(by) as unknown as User
  );

afterEach(() => expect(errors).toEqual([]));

beforeEach(() => {
  sent.length = 0;
  errors.length = 0;
  for (const id of Object.keys(roles)) delete roles[id];
  roles["999"] = ["banker"];
});

describe("✅", () => {
  it("copies a bank-site request's member and lines to transactions, then deletes it", async () => {
    const message = siteRequest();
    await react(message, "✅", "999");
    expect(sent).toEqual([
      {
        content: "✅ by <@999>",
        embeds: [
          {
            title: "@Alice has placed a bank request",
            url: "https://discord.com/users/111",
            description: "• Cloak of Flames (800pp)",
          },
        ],
        allowedMentions: { parse: [] },
      },
    ]);
    expect(message.delete).toHaveBeenCalled();
  });

  it("copies a request posted before titles named the member", async () => {
    const message = siteRequest({
      description: "<@111> has placed a bank request.\n\n• Pearl (free)",
    });
    await react(message, "✅", "999");
    expect(sent).toEqual([
      {
        content: "✅ by <@999>",
        embeds: [
          {
            description: "<@111> has placed a bank request.\n\n• Pearl (free)",
          },
        ],
        allowedMentions: { parse: [] },
      },
    ]);
  });

  it("copies a bank-site request with no lines", async () => {
    const message = siteRequest({
      title: "@Alice has placed a bank request",
      url: "https://discord.com/users/111",
    });
    await react(message, "✅", "999");
    expect(sent[0]?.embeds).toEqual([
      {
        title: "@Alice has placed a bank request",
        url: "https://discord.com/users/111",
      },
    ]);
  });

  it("copies a /bank request post's content", async () => {
    const message = commandRequest();
    await react(message, "✅", "999");
    expect(sent).toEqual([
      { content: "✍️ <@222> requests: Cloak of Flames -- ✅ by <@999>" },
    ]);
    expect(message.delete).toHaveBeenCalled();
  });

  it("does nothing for someone who isn't a banker, even the requester", async () => {
    const message = siteRequest();
    await react(message, "✅", "111");
    expect(sent).toEqual([]);
    expect(message.delete).not.toHaveBeenCalled();
  });

  it("ignores other channels", async () => {
    const message = { ...siteRequest(), channel: { id: "general" } };
    await react(message, "✅", "999");
    expect(sent).toEqual([]);
    expect(message.delete).not.toHaveBeenCalled();
  });
});

describe("❌", () => {
  it("lets the requester cancel a bank-site request", async () => {
    const message = siteRequest();
    await react(message, "❌", "111");
    expect(message.delete).toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  it("lets the requester cancel a request posted before titles named the member", async () => {
    const message = siteRequest({
      description: "<@111> has placed a bank request.\n\n• Pearl (free)",
    });
    await react(message, "❌", "111");
    expect(message.delete).toHaveBeenCalled();
  });

  it("lets the requester cancel a /bank request post", async () => {
    const message = commandRequest();
    await react(message, "❌", "222");
    expect(message.delete).toHaveBeenCalled();
  });

  it("lets a banker cancel", async () => {
    const message = siteRequest();
    await react(message, "❌", "999");
    expect(message.delete).toHaveBeenCalled();
  });

  it("treats a post whose embed names no one as a /bank request post", async () => {
    const message = { ...commandRequest(), embeds: [{ title: "Pearl" }] };
    await react(message, "❌", "222");
    expect(message.delete).toHaveBeenCalled();
  });

  it("does nothing for a stranger", async () => {
    const site = siteRequest();
    const command = commandRequest();
    await react(site, "❌", "333");
    await react(command, "❌", "333");
    expect(site.delete).not.toHaveBeenCalled();
    expect(command.delete).not.toHaveBeenCalled();
  });
});
