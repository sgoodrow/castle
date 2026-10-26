// What's outside the bot, as each scenario sets it up, and what the bot did to it: Discord and the
// Google Sheets it reads. The database is real (database.ts).
import { Collection } from "discord.js";
import { emptyTables } from "./database";

// The bot's settings in every scenario.
export const ENV = {
  NODE_ENV: "test",
  SSL: "false",
  GOOGLE_CLIENT_EMAIL: "bot@example.com",
  GOOGLE_PRIVATE_KEY: "not-a-key",
  publicCharactersGoogleSheetId: "public-sheet",
  sharedCharactersGoogleSheetId: "accounts-sheet",
  raidChatChannelId: "raid-chat",
  bankRequestsChannelId: "bank-requests",
  jewelryChannelId: "jewelry-requests",
  jewelerRoleId: "jeweler",
  bankTransactionsChannelId: "bank-transactions",
  modRoleId: "mod",
  officerRoleId: "officer",
  knightRoleId: "knight",
  guardRoleId: "guard",
  bankerRoleId: "banker",
  raiderRoleId: "raider",
};

export type Row = Record<string, string> & { rowIndex: number };

export const BOT_ID = "1";

// A Discord message, with what the bot's code reads of it.
export interface Message {
  id: string;
  channel: { id: string };
  createdTimestamp: number;
  content: string;
  embeds: { title?: string; url?: string; description?: string }[];
  buttons: { label: string; customId: string }[];
  author: { id: string; bot: boolean; toString: () => string };
  mentions: { users: Map<string, unknown> };
  delete: () => Promise<void>;
  reply: (content: string) => Promise<void>;
  pings: boolean; // whether Discord would notify those it mentions
  gone: boolean; // deleted, by the bot or anyone else
}
type Post =
  | string
  | {
      content?: string;
      embeds?: Message["embeds"];
      buttons?: Message["buttons"];
      attachments?: string[];
      allowedMentions?: { parse?: string[] };
    };

export interface Member {
  id: string;
  name: string;
  roles: string[];
  takesDms: boolean;
}

interface World {
  // Each sheet's tabs by title, in order, and their rows; a tab that's an Error fails to read.
  sheets: Record<string, Record<string, Row[] | Error>>;
  // Each channel's messages, oldest first, deleted ones included.
  channels: Record<string, Message[]>;
  members: Record<string, Member>; // by name
  dms: { to: string; text: string }[]; // what the bot sent members, by their name
  told: { to: string; text: string }[]; // what the bot answered a member's button press, only to them
  discordDown: boolean;
  dmsDown: boolean; // DMs fail for a reason other than the member's settings
  logs: string[];
  restore: (() => unknown)[]; // undone after the scenario, last first
}
export let world: World;

export async function reset() {
  world = {
    sheets: { "accounts-sheet": { Accounts: [] } },
    channels: {},
    members: {},
    dms: [],
    told: [],
    discordDown: false,
    dmsDown: false,
    logs: [],
    restore: [],
  };
  await emptyTables(process.env.DATABASE_URL!);
  const log = vi
    .spyOn(console, "log")
    .mockImplementation((s: unknown) => void world.logs.push(String(s)));
  world.restore.push(() => log.mockRestore());
  // The bot's own clock: its loops run when a scenario says time passes.
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  world.restore.push(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });
}

export async function teardown() {
  for (const r of world.restore.splice(0).reverse()) await r();
}

// What Discord answers a DM to a member who doesn't take them.
export const closedDms = () =>
  Object.assign(new Error("Cannot send messages to this user"), {
    code: 50007,
  });

let ids = 1000;
export const newId = () => String(ids++);
const mentions = (text: string) =>
  new Map([...text.matchAll(/<@(\d+)>/g)].map((m) => [m[1]!, {}]));

// A message in a channel, as of now unless it's older.
export const post = (
  channel: string,
  authorId: string,
  {
    content = "",
    embeds = [],
    buttons = [],
    attachments = [],
    allowedMentions,
  }: Exclude<Post, string>,
  ageMs = 0
) => {
  const message: Message = {
    id: newId(),
    channel: { id: channel },
    createdTimestamp: Date.now() - ageMs,
    content,
    embeds,
    buttons,
    attachments: new Map(attachments.map((url, i) => [String(i), { url }])),
    author: {
      id: authorId,
      bot: authorId === BOT_ID,
      toString: () => `<@${authorId}>`,
    },
    mentions: { users: mentions(content) },
    pings: allowedMentions?.parse?.length !== 0,
    gone: false,
    delete: async () => {
      if (message.gone) throw new Error("Unknown Message");
      message.gone = true;
    },
    reply: async (content) => void textChannel(channel).send(content),
  };
  (world.channels[channel] ??= []).push(message);
  return message;
};

const memberById = (id: string) =>
  Object.values(world.members).find((m) => m.id === id);

const textChannel = (channel: string) => ({
  id: channel,
  send: async (message: Post) => {
    if (world.discordDown) throw new Error("Discord can't be reached");
    post(
      channel,
      BOT_ID,
      typeof message === "string" ? { content: message } : message
    );
  },
  // Newest first, at most a page of `limit` at a time, as Discord gives them.
  messages: {
    fetch: async ({ limit, before }: { limit: number; before?: string }) => {
      const newest = (world.channels[channel] ?? [])
        .filter((m) => !m.gone)
        .reverse();
      const from = before ? newest.findIndex((m) => m.id === before) + 1 : 0;
      return new Collection(
        newest.slice(from, from + limit).map((m) => [m.id, m])
      );
    },
  },
});

// Discord, as the bot reaches it through src/index.ts. The database client is the real one.
export async function discord() {
  const { PrismaClient } = await import("@prisma/client");
  const { PublicSheetService } =
    await import("../services/sheet-updater/public-sheet");
  const member = (id: string) => {
    const found = memberById(id);
    return (
      found && {
        id,
        roles: { cache: { has: (role: string) => found.roles.includes(role) } },
      }
    );
  };
  return {
    prismaClient: new PrismaClient(),
    publicSheetService: new PublicSheetService(),
    client: {
      user: { id: BOT_ID },
      users: {
        send: async (id: string, text: string) => {
          const to = memberById(id);
          if (!to?.takesDms) throw closedDms();
          world.dms.push({ to: to.name, text });
        },
      },
    },
    getTextChannel: async (id: string) => textChannel(id),
    getChannel: async (id: string) => textChannel(id),
    getMember: async (id: string) => member(id),
    getMembers: async () => [],
  };
}

// Google Sheets, as google-spreadsheet reads them.
export function sheets() {
  class GoogleSpreadsheet {
    sheetsByTitle: Record<string, { getRows: () => Promise<Row[]> }> = {};
    sheetsByIndex: { getRows: () => Promise<Row[]> }[] = [];
    constructor(private id: string) {}
    useServiceAccountAuth() {}
    async loadInfo() {
      const tabs = Object.entries(world.sheets[this.id] ?? {}).map(
        ([title, rows]) =>
          [
            title,
            {
              getRows: async () => {
                if (rows instanceof Error) throw rows;
                return rows.map((r) => ({ ...r }));
              },
            },
          ] as const
      );
      this.sheetsByTitle = Object.fromEntries(tabs);
      this.sheetsByIndex = tabs.map(([, tab]) => tab);
    }
  }
  return { GoogleSpreadsheet, GoogleSpreadsheetRow: class {} };
}
