// Icons and Green auction history from the P99 wiki, for every item in the bank.
// Pages are fetched politely (one a second) in the background and kept on disk, so the
// bank is served from the cache and never waits on the wiki.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import path from "path";
import { itemsData } from "../shared/items";
import { log } from "../shared/logger";

const WIKI = "https://wiki.project1999.com";
const UA = { "User-Agent": "castle-bank-browser/1.0 (guild bank tool)" };
const MAX_AGE = 7 * 864e5;
const PAUSE = 1000;
const RETRY = 864e5;

export interface WikiItem {
  url: string;
  icon: number | null;
  green: [string, string, number][] | null; // date, seller, price
  fetchedAt: number;
}

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();

// The rows of the wiki's auction tracker table for one server.
export function parseTracker(
  page: string,
  label: string
): [string, string, number][] | null {
  const i = page.indexOf(`Project 1999 Auction Tracker (${label})`);
  if (i < 0) return null;
  const j = page.indexOf("Last 20 Recorded Auctions", i);
  const block = page.slice(i, j > 0 ? j : i + 20000);
  const cells = [...block.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
    strip(m[1])
  );
  const rows: [string, string, number][] = [];
  for (let k = 0; k < cells.length - 2; k++) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(cells[k]) && /^\d+$/.test(cells[k + 2]))
      rows.push([cells[k], cells[k + 1], +cells[k + 2]]);
  }
  return rows;
}

const PATHS: Record<string, string> = itemsData;
const wikiPath = (name: string) =>
  PATHS[name.toLowerCase()] ||
  "/" + encodeURIComponent(name.replace(/ /g, "_"));
// An item's wiki page, known from its name alone, so every item links there before its page is fetched.
export const wikiUrl = (name: string) => WIKI + wikiPath(name);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class WikiCache {
  private items = new Map<number, WikiItem>();
  private running = false;
  private noIcon = new Set<number>(); // the wiki has no such image; don't ask again until restart

  constructor(private dir: string) {
    mkdirSync(path.join(dir, "wiki"), { recursive: true });
    mkdirSync(path.join(dir, "icons"), { recursive: true });
    for (const f of readdirSync(path.join(dir, "wiki"))) {
      try {
        const rec = JSON.parse(
          readFileSync(path.join(dir, "wiki", f), "utf-8")
        );
        // Older caches (the build script's) have no fetchedAt; the file's age stands in.
        rec.fetchedAt ??= statSync(path.join(dir, "wiki", f)).mtimeMs;
        this.items.set(parseInt(f), rec);
      } catch {
        /* a half-written file gets fetched again */
      }
    }
  }

  get(id: number) {
    return this.items.get(id);
  }

  iconPath(icon: number) {
    const p = path.join(this.dir, "icons", `${icon}.png`);
    return existsSync(p) ? p : null;
  }

  // Fetch whatever is missing first, then whatever is oldest. Safe to call often: one runs at a time.
  async refresh(wanted: { id: number; name: string; icon?: number }[]) {
    if (this.running) return;
    this.running = true;
    try {
      const now = Date.now();
      const due = wanted
        .filter((w) => {
          const rec = this.items.get(w.id);
          // A page cached under another address (say, before a spelling was aliased) is fetched again now.
          return (
            !rec || rec.url !== wikiUrl(w.name) || now - rec.fetchedAt > MAX_AGE
          );
        })
        .sort(
          (a, b) =>
            (this.items.get(a.id)?.fetchedAt ?? 0) -
            (this.items.get(b.id)?.fetchedAt ?? 0)
        );
      if (due.length) log(`bank web: fetching ${due.length} wiki pages`);
      for (const w of due) {
        await this.fetchItem(w.id, w.name);
        await sleep(PAUSE);
      }
      for (const w of wanted) {
        for (const icon of new Set([this.items.get(w.id)?.icon, w.icon])) {
          if (!icon || this.noIcon.has(icon) || this.iconPath(icon)) continue;
          await this.fetchIcon(icon);
          await sleep(PAUSE / 3);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async fetchItem(id: number, name: string) {
    const url = wikiUrl(name);
    const rec: WikiItem = {
      url,
      icon: null,
      green: null,
      fetchedAt: Date.now(),
    };
    try {
      const res = await fetch(url, {
        headers: UA,
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const page = await res.text();
        const m = page.match(
          /class="itemicon"[\s\S]*?\/images\/Item_(\d+)\.png/
        );
        // A page with no item icon is probably a maintenance or challenge page: keep the old icon.
        rec.icon = m ? +m[1] : (this.items.get(id)?.icon ?? null);
        rec.green = parseTracker(page, "Green");
      } else if (res.status !== 404) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      // The wiki is down or slow: keep what we had and try again tomorrow.
      log(`bank web: wiki ${name}: ${e}`);
      const had = this.items.get(id);
      this.items.set(id, {
        ...(had ?? rec),
        url,
        fetchedAt: Date.now() - MAX_AGE + RETRY,
      });
      return;
    }
    this.items.set(id, rec);
    writeFileSync(
      path.join(this.dir, "wiki", `${id}.json`),
      JSON.stringify(rec)
    );
  }

  private async fetchIcon(icon: number) {
    try {
      const res = await fetch(`${WIKI}/images/Item_${icon}.png`, {
        headers: UA,
        signal: AbortSignal.timeout(30000),
      });
      const buf = Buffer.from(await res.arrayBuffer());
      if (
        res.ok &&
        buf
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      ) {
        writeFileSync(path.join(this.dir, "icons", `${icon}.png`), buf);
        return;
      }
      // Only a real 404 is final; anything else is tried again on the next run.
      if (res.status === 404) this.noIcon.add(icon);
    } catch (e) {
      log(`bank web: icon ${icon}: ${e}`);
    }
  }
}
