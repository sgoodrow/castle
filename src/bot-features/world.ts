// What's outside the bot, as each scenario sets it up, and what the bot did to it: Discord and the
// Google Sheets it reads. The database is real (database.ts).
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
  officerRoleId: "officer",
  knightRoleId: "knight",
  guardRoleId: "guard",
  bankerRoleId: "banker",
  raiderRoleId: "raider",
};

export type Row = Record<string, string> & { rowIndex: number };

interface World {
  // Each sheet's tabs by title, in order, and their rows; a tab that's an Error fails to read.
  sheets: Record<string, Record<string, Row[] | Error>>;
  posts: { channel: string; content: string }[]; // what the bot posted, in order
  discordDown: boolean;
  logs: string[];
  restore: (() => unknown)[]; // undone after the scenario, last first
}
export let world: World;

export async function reset() {
  world = {
    sheets: { "accounts-sheet": { Accounts: [] } },
    posts: [],
    discordDown: false,
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

// Discord, as the bot reaches it through src/index.ts. The database client is the real one.
export async function discord() {
  const { PrismaClient } = await import("@prisma/client");
  const textChannel = (channel: string) => ({
    id: channel,
    send: async (content: string) => {
      if (world.discordDown) throw new Error("Discord can't be reached");
      world.posts.push({ channel, content });
    },
  });
  const { PublicSheetService } =
    await import("../services/sheet-updater/public-sheet");
  return {
    prismaClient: new PrismaClient(),
    publicSheetService: new PublicSheetService(),
    getTextChannel: async (id: string) => textChannel(id),
    getChannel: async (id: string) => textChannel(id),
    getMember: async () => undefined,
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
