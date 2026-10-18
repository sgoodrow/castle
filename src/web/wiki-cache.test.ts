import type { Mock } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "fs";
import { tmpdir } from "os";
import path from "path";
import { parseTracker, WikiCache, WikiItem } from "./wiki-cache";

vi.mock("../shared/logger", () => ({ log: vi.fn() }));

const NAME = "Zzz Not A Real Item";
const ID = 777;

const page = `<div class="itemicon"><img src="/images/Item_1234.png"></div>
<h2>Project 1999 Auction Tracker (Green)</h2><table>
<tr><td>2026-01-02</td><td>Seller&#039;s Alt</td><td>150</td></tr>
<tr><td>2026-01-01</td><td>Other</td><td>200</td></tr>
</table>Last 20 Recorded Auctions`;

const textRes = (status: number, body = "") =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  }) as Response;

describe("parseTracker", () => {
  test("reads the rows for the server", () => {
    expect(parseTracker(page, "Green")).toEqual([
      ["2026-01-02", "Seller's Alt", 150],
      ["2026-01-01", "Other", 200],
    ]);
  });

  test("is null when the server has no tracker", () => {
    expect(parseTracker(page, "Blue")).toBeNull();
  });
});

describe("WikiCache", () => {
  const realFetch = global.fetch;
  let dir: string;
  let fetchMock: Mock;
  const file = () => path.join(dir, "wiki", `${ID}.json`);
  // fetchItem is private; refresh() would also sleep between pages.
  const fetchItem = (cache: WikiCache) =>
    (
      cache as unknown as { fetchItem(id: number, name: string): Promise<void> }
    ).fetchItem(ID, NAME);

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "wiki-cache-test-"));
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
    rmSync(dir, { recursive: true, force: true });
  });

  test("loads records from disk", () => {
    new WikiCache(dir); // creates the folders
    const rec: WikiItem = { url: "u", icon: 5, green: null, fetchedAt: 123 };
    writeFileSync(file(), JSON.stringify(rec));
    writeFileSync(path.join(dir, "wiki", "888.json"), "{half-writ");
    const cache = new WikiCache(dir);
    expect(cache.get(ID)).toEqual(rec);
    expect(cache.get(888)).toBeUndefined();
  });

  test("a successful fetch is parsed and written to disk", async () => {
    fetchMock.mockResolvedValueOnce(textRes(200, page));
    const cache = new WikiCache(dir);
    await fetchItem(cache);
    const rec = cache.get(ID)!;
    expect(rec.icon).toBe(1234);
    expect(rec.green).toHaveLength(2);
    expect(rec.url).toBe("https://wiki.project1999.com/Zzz_Not_A_Real_Item");
    expect(JSON.parse(readFileSync(file(), "utf-8"))).toEqual(rec);
  });

  test("a 404 is cached as an empty record", async () => {
    fetchMock.mockResolvedValueOnce(textRes(404));
    const cache = new WikiCache(dir);
    await fetchItem(cache);
    expect(cache.get(ID)).toMatchObject({ icon: null, green: null });
    expect(existsSync(file())).toBe(true);
  });

  test.each([
    ["a server error", () => Promise.resolve(textRes(503))],
    ["a network error", () => Promise.reject(new Error("ECONNRESET"))],
  ])(
    "%s keeps the previous record and leaves the cache file alone",
    async (_, failure) => {
      new WikiCache(dir);
      const had: WikiItem = {
        url: "u",
        icon: 99,
        green: [["2025-01-01", "S", 10]],
        fetchedAt: 1,
      };
      const onDisk = JSON.stringify(had);
      writeFileSync(file(), onDisk);
      const cache = new WikiCache(dir);

      fetchMock.mockImplementationOnce(failure);
      await fetchItem(cache);

      const rec = cache.get(ID)!;
      expect(rec).toMatchObject({ url: "u", icon: 99, green: had.green });
      // Retried in about a day, not right away and not after a full week.
      expect(rec.fetchedAt).toBeGreaterThan(1);
      expect(rec.fetchedAt).toBeLessThan(Date.now());
      expect(readFileSync(file(), "utf-8")).toBe(onDisk);
    }
  );

  test("a failure with nothing cached records an empty entry but writes no file", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    const cache = new WikiCache(dir);
    await fetchItem(cache);
    expect(cache.get(ID)).toMatchObject({ icon: null, green: null });
    expect(existsSync(file())).toBe(false);
  });
});
