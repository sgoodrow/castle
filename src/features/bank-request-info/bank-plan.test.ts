import { planMessages, type Plan } from "./bank-plan";

const planWith = (password: string): Plan => ({
  logins: [
    { char: "Mulea", login: { account: "mulea1", password }, takes: [] },
  ],
  auctions: [],
  multiquests: [],
  backups: [],
  short: [],
});

describe("a login's code span", () => {
  it("keeps a password's spaces at its ends, which Discord would trim", () => {
    expect(planMessages(planWith(" pw ")).join("\n")).toContain(
      "• Password: `  pw  `"
    );
  });

  it("shows a plain password in one pair of backticks", () => {
    expect(planMessages(planWith("test")).join("\n")).toContain(
      "• Password: `test`"
    );
  });
});
