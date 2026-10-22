import { badBotRows } from "./bot-prisma";

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
vi.mock("../../features/raid-bots/update-bots", () => ({}));
vi.mock("../../features/raid-bots/park-bot-button-command", () => ({}));
vi.mock("../../features/raid-bots/bot-embed", () => ({}));
vi.mock("../..", () => ({}));

const row = (rowIndex: number, Name: string, Class = "Wizard") => ({
  rowIndex,
  Name,
  Class,
});

describe("badBotRows", () => {
  it("finds rows without a name or class, and a name used twice, saying why", () => {
    expect(
      badBotRows([
        row(2, "Aleph"),
        row(3, " ", "Cleric"),
        row(4, "Bet", ""),
        row(5, "aleph"),
        row(6, "", ""),
        row(7, " Gimel "),
        row(8, "gimel"),
      ])
    ).toEqual([
      "Row 3: no name",
      "Row 4 (Bet): no class",
      "Row 5 (aleph): the name is on an earlier row too",
      "Row 8 (gimel): the name is on an earlier row too",
    ]);
  });
});
