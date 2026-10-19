import { BotSheetAlerts } from "./bot-sheet-alerts";

vi.mock("../../config", () => ({}));
vi.mock("../../shared/logger", () => ({ log: () => {} }));
vi.mock("../..", () => ({}));

describe("BotSheetAlerts", () => {
  let posts: string[];
  let alerts: BotSheetAlerts;
  beforeEach(() => {
    posts = [];
    alerts = new BotSheetAlerts(async (m) => {
      posts.push(m);
    });
  });

  it("says nothing while the sheet loads cleanly", async () => {
    await alerts.loaded();
    await alerts.loaded();
    expect(posts).toEqual([]);
  });

  it("tells raid chat once when it breaks, and once when it's fixed", async () => {
    await alerts.failed(new Error("no Bot Info tab"));
    await alerts.failed(new Error("no Bot Info tab"));
    await alerts.loaded();
    await alerts.loaded();

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatch(/couldn't be loaded.*no Bot Info tab/);
    expect(posts[1]).toBe(`The bots load from the "Bot Info" sheet again.`);
  });

  it("tries again on the next failure when Discord couldn't be reached", async () => {
    let down = true;
    alerts = new BotSheetAlerts(async (m) => {
      if (down) throw new Error("Discord is down");
      posts.push(m);
    });
    await alerts.failed("oops");
    down = false;
    await alerts.failed("oops");
    expect(posts).toHaveLength(1);
  });

  it("keeps going when Discord can't be reached", async () => {
    alerts = new BotSheetAlerts(async () => {
      throw new Error("Discord is down");
    });
    await expect(alerts.failed("oops")).resolves.toBeUndefined();
  });
});
