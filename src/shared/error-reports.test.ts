import { fingerprint, reportError } from "./error-reports";

jest.mock("./logger", () => ({ log: jest.fn() }));

const calls: { url: string; method: string; body: any }[] = [];
let searchHits: number[] = [];

beforeEach(() => {
  calls.length = 0;
  searchHits = [];
  process.env.githubErrorToken = "ghp_testtoken1234";
  process.env.GIT_REV = "abc123";
  global.fetch = jest.fn(async (url: string, init: any) => {
    calls.push({ url, method: init.method, body: init.body && JSON.parse(init.body) });
    const json = url.includes("/search/") ? { items: searchHits.map(number => ({ number })) } : { number: 42 };
    return { ok: true, status: 200, json: async () => json } as Response;
  }) as any;
});

describe("fingerprint", () => {
  it("ignores line numbers and values that change", () => {
    const a = { source: "page" as const, message: "Cannot read 'x' of 3", stack: "TypeError\n    at f (bank/web/src/data.ts:174:64)" };
    const b = { source: "page" as const, message: "Cannot read 'y' of 7", stack: "TypeError\n    at f (bank/web/src/data.ts:180:2)" };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it("tells different places apart", () => {
    const a = { source: "page" as const, message: "boom", stack: "at f (bank/web/src/data.ts:1:1)" };
    expect(fingerprint(a)).not.toBe(fingerprint({ ...a, stack: "at g (bank/web/src/tab.ts:1:1)" }));
    expect(fingerprint(a)).not.toBe(fingerprint({ ...a, source: "web" }));
  });
});

describe("reportError", () => {
  it("only logs without a token", async () => {
    delete process.env.githubErrorToken;
    await reportError({ source: "web", message: "no token here" });
    expect(calls).toHaveLength(0);
  });

  it("files one labelled issue for a burst of the same error", async () => {
    const r = { source: "web" as const, message: "burst", stack: "at f (src/web/x.ts:1:1)" };
    await Promise.all([reportError(r), reportError(r), reportError(r)]);
    const created = calls.filter(c => c.method === "POST" && c.url.endsWith("/repos/sgoodrow/castle/issues"));
    expect(created).toHaveLength(1);
    expect(created[0].body.labels).toEqual(["error"]);
    expect(created[0].body.title).toBe("[web] burst");
    expect(created[0].body.body).toContain("**Commit:** abc123");
    expect(created[0].body.body).toMatch(/<!-- error-fingerprint:[0-9a-f]{12} -->/);
  });

  it("comments on an open issue for the same error instead of opening another", async () => {
    searchHits = [7];
    await reportError({ source: "worker", message: "already filed", stack: "at f (src/a.ts:1:1)" });
    expect(calls.map(c => `${c.method} ${c.url.replace(/\?.*/, "")}`)).toEqual([
      "GET https://api.github.com/search/issues",
      "POST https://api.github.com/repos/sgoodrow/castle/issues/7/comments",
    ]);
  });

  it("keeps secrets and URL passwords out of the issue", async () => {
    process.env.DATABASE_URL = "postgres://castle:hunter22@db:5432/castle";
    await reportError({ source: "web", message: "connect failed", stack: "Error: postgres://castle:hunter22@db:5432/castle token ghp_testtoken1234\n at f (src/web/q.ts:1:1)" });
    const text = JSON.stringify(calls);
    expect(text).not.toContain("hunter22");
    expect(text).not.toContain("ghp_testtoken1234");
  });
});
