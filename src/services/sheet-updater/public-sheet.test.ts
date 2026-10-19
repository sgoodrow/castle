import { PublicSheetService } from "./public-sheet";

const sheets: Record<string, unknown> = {};

vi.mock("google-spreadsheet", () => ({
  GoogleSpreadsheet: class {
    sheetsByTitle = sheets;
    useServiceAccountAuth = async () => {};
    loadInfo = async () => {};
  },
}));
vi.mock("../../config", () => ({
  GOOGLE_CLIENT_EMAIL: "",
  GOOGLE_PRIVATE_KEY: "",
  publicCharactersGoogleSheetId: "public",
  raidValuesGoogleSheetId: "values",
}));
vi.mock("../gdrive", () => ({ checkGoogleCredentials: () => {} }));
vi.mock("../bot/public-accounts-sheet", () => ({ SHEET_TITLE: "Bots" }));

describe("PublicSheetService.getBotSheetRows", () => {
  beforeEach(() => {
    for (const key of Object.keys(sheets)) delete sheets[key];
  });

  it("returns the rows of the bot sheet", async () => {
    sheets["Bots"] = { getRows: async () => [{ Name: "Aleph" }] };
    expect(await new PublicSheetService().getBotSheetRows()).toEqual([
      { Name: "Aleph" },
    ]);
  });

  it("fails instead of returning undefined when the bot sheet is missing", async () => {
    await expect(new PublicSheetService().getBotSheetRows()).rejects.toThrow(
      /Does it exist in the public sheet/
    );
  });

  it("fails instead of returning undefined when reading the rows fails", async () => {
    sheets["Bots"] = {
      getRows: async () => {
        throw new Error("quota exceeded");
      },
    };
    await expect(new PublicSheetService().getBotSheetRows()).rejects.toThrow(
      "quota exceeded"
    );
  });
});
