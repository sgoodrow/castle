import { PrismaPublicAccounts } from "./bot-prisma";

const calls: string[] = [];
let sheetRows: () => Promise<unknown[]>;

vi.mock("discord.js", () => ({
  spoiler: (s: string) => s,
  ActionRowBuilder: class {},
  ComponentType: {},
}));
vi.mock("../../config", () => ({ noBotsRoleId: "", noBotWizardsRoleId: "" }));
vi.mock("../../shared/logger", () => ({ log: () => {} }));
vi.mock("../accounts", () => ({
  accounts: { refreshAccountData: async () => {}, getRolesForAccount: async () => [] },
}));
vi.mock("./public-accounts-sheet", () => ({
  Bot: class {},
  SheetPublicAccountService: {},
}));
vi.mock("../sheet-updater/public-sheet", () => ({
  BOT_SPREADSHEET_COLUMNS: { Name: "Name" },
}));
vi.mock("../../features/raid-bots/update-bots", () => ({}));
vi.mock("../../features/raid-bots/park-bot-button-command", () => ({}));
vi.mock("../../features/raid-bots/bot-embed", () => ({}));
vi.mock("../..", () => ({
  getMember: async () => undefined,
  getMembers: async () => [],
  publicSheetService: { getBotSheetRows: () => sheetRows() },
  prismaClient: {
    bot: {
      deleteMany: async () => calls.push("deleteMany"),
      create: async () => calls.push("create"),
    },
  },
}));

describe("PrismaPublicAccounts refresh", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("keeps the stored bots and still becomes ready when the sheet can't be read", async () => {
    sheetRows = async () => {
      throw new Error("no bot sheet");
    };
    const accounts = new PrismaPublicAccounts();

    await accounts.guardReady();

    expect(calls).toEqual([]);
  });

  it("replaces the stored bots with the sheet's rows", async () => {
    sheetRows = async () => [{ Name: "Aleph" }];
    const accounts = new PrismaPublicAccounts();

    await accounts.guardReady();

    expect(calls).toEqual(["deleteMany", "create"]);
  });
});
