import { PrismaPublicAccounts, badBotRows } from "./bot-prisma";

const calls: string[] = [];
const alerts: string[] = [];
let sheetRows: () => Promise<unknown[]>;

vi.mock("discord.js", () => ({
  spoiler: (s: string) => s,
  ActionRowBuilder: class {},
  ComponentType: {},
}));
vi.mock("../../config", () => ({ noBotsRoleId: "", noBotWizardsRoleId: "" }));
vi.mock("../../shared/logger", () => ({ log: () => {} }));
vi.mock("../accounts", () => ({
  accounts: {
    refreshAccountData: async () => {},
    getRolesForAccount: async () => [],
  },
}));
vi.mock("./public-accounts-sheet", () => ({
  Bot: class {},
  SheetPublicAccountService: {},
}));
vi.mock("../sheet-updater/public-sheet", () => ({
  BOT_SPREADSHEET_COLUMNS: { Name: "Name", Class: "Class" },
}));
vi.mock("./bot-sheet-alerts", () => ({
  BotSheetAlerts: class {
    loaded = async () => alerts.push("loaded");
    failed = async (err: unknown) => alerts.push(`failed ${err}`);
  },
}));
vi.mock("../../features/raid-bots/update-bots", () => ({}));
vi.mock("../../features/raid-bots/park-bot-button-command", () => ({}));
vi.mock("../../features/raid-bots/bot-embed", () => ({}));
vi.mock("../..", () => ({
  getMember: async () => undefined,
  getMembers: async () => [],
  publicSheetService: { getBotSheetRows: () => sheetRows() },
  prismaClient: {
    $transaction: async (ops: unknown[]) => ops,
    bot: {
      deleteMany: () => calls.push("deleteMany"),
      createMany: ({ data }: { data: { name: string }[] }) =>
        calls.push(`createMany ${data.map((b) => b.name)}`),
    },
  },
}));

const row = (rowIndex: number, Name: string, Class = "Wizard") => ({
  rowIndex,
  Name,
  Class,
});

describe("PrismaPublicAccounts refresh", () => {
  beforeEach(() => {
    calls.length = 0;
    alerts.length = 0;
  });

  it("keeps the stored bots, tells raid chat and turns bot commands off when the sheet can't be read", async () => {
    sheetRows = async () => {
      throw new Error("no bot sheet");
    };
    const accounts = new PrismaPublicAccounts();

    await expect(accounts.guardReady()).rejects.toThrow(
      "A knight needs to fix the sheet and restart the bot."
    );

    expect(calls).toEqual([]);
    expect(alerts).toEqual(["failed Error: no bot sheet"]);
  });

  it("replaces the stored bots with the sheet's in one go", async () => {
    sheetRows = async () => [row(2, "Aleph"), row(3, "", ""), row(4, "Bet")];
    const accounts = new PrismaPublicAccounts();

    await accounts.guardReady();

    expect(calls).toEqual(["deleteMany", "createMany Aleph,Bet"]);
    expect(alerts).toEqual(["loaded"]);
  });

  it("fails the whole load on a bad row, naming the rows to fix", async () => {
    sheetRows = async () => [row(2, "Aleph"), row(3, "Bet", "")];
    const accounts = new PrismaPublicAccounts();

    await expect(accounts.guardReady()).rejects.toThrow();

    expect(calls).toEqual([]);
    expect(alerts).toEqual([
      "failed Error: these rows need fixing:\n• Row 3 (Bet): no class",
    ]);
  });
});

describe("badBotRows", () => {
  it("finds rows without a name or class, and a name used twice, saying why", () => {
    expect(
      badBotRows([
        row(2, "Aleph"),
        row(3, "", "Cleric"),
        row(4, "Bet", ""),
        row(5, "aleph"),
        row(6, "", ""),
        row(7, "Gimel"),
      ])
    ).toEqual([
      "Row 3: no name",
      "Row 4 (Bet): no class",
      "Row 5 (aleph): the name is on an earlier row too",
    ]);
  });
});
