// Files errors as GitHub issues labelled `error`, one per distinct error, so they get seen and,
// through .github/workflows/auto-fix.yml, picked up by Claude for a fix. Used by the bot worker,
// the bank web process and (through /api/errors) the bank page. Without githubErrorToken it only logs.
import { createHash } from "crypto";
import { log } from "./logger";

const API = "https://api.github.com";
const REPO = "/repos/sgoodrow/castle";
const LABEL = "error";
const COMMENT_EVERY = 6 * 3600e3; // at most one "happened again" comment per issue this often
const NEW_PER_DAY = 5; // a storm of new errors can't open more issues (or fix runs) than this

export type ErrorSource = "page" | "web" | "worker";
const WHERE: Record<ErrorSource, string> = { page: "bank page (browser)", web: "bank web process", worker: "bot worker" };

export interface ErrorReport {
  source: ErrorSource;
  message: string;
  stack?: string;
  details?: Record<string, string>;
}

interface Known { issue: number | null; since: number; lastComment: number }
const known = new Map<string, Known>();
let opened: number[] = [];

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

// The same error from anywhere in the same code: the message without numbers or quoted values,
// plus the first frame in our own code, without line numbers (they move with every edit).
export function fingerprint(r: ErrorReport) {
  const msg = r.message.replace(/(["'`]).*?\1/g, "…").replace(/\d+/g, "#");
  const frame = (r.stack || "").split("\n").find(l => /(src|bank\/web)\//.test(l) && !l.includes("node_modules")) || "";
  return createHash("sha1").update(`${r.source}\n${msg}\n${frame.replace(/:\d+(:\d+)?/g, "").trim()}`).digest("hex").slice(0, 12);
}

async function github(path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(API + path, {
    method: init.method || "GET",
    headers: { Authorization: `Bearer ${process.env.githubErrorToken}`, Accept: "application/vnd.github+json", "User-Agent": "castle-error-reports" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`GitHub ${init.method || "GET"} ${path.split("?")[0]}: ${res.status}`);
  return res.json();
}

// The repo is public: no secret from the environment, and no password in a URL, goes in an issue.
function scrub(text: string) {
  let out = text.replace(/(\w+:\/\/)[^\s/:@]+:[^\s/@]+@/g, "$1[credentials]@");
  for (const [k, v] of Object.entries(process.env)) {
    if (v && v.length >= 8 && /token|secret|password|key|url|dsn/i.test(k)) out = out.split(v).join(`[${k}]`);
  }
  return out;
}

// Fenced so nothing in a report (some of it comes from browsers) renders as markdown.
const fence = (s: string) => "````\n" + scrub(s).replace(/````/g, "```") + "\n````";

function body(fp: string, r: ErrorReport) {
  const rev = (process.env.GIT_REV || "unknown").slice(0, 12);
  const lines = [
    `**Where:** ${WHERE[r.source]}`,
    `**Commit:** ${rev}`,
    `**First seen:** ${new Date().toISOString()}`,
    ...Object.entries(r.details || {}).map(([k, v]) => `**${k}:** ${clip(scrub(v), 200)}`),
    "",
    fence([clip(r.message, 500), clip(r.stack || "(no stack)", 6000)].join("\n")),
    "",
    `<!-- error-fingerprint:${fp} -->`,
  ];
  return lines.join("\n");
}

async function file(fp: string, r: ErrorReport, k: Known) {
  const found = await github(`/search/issues?q=${encodeURIComponent(`repo:sgoodrow/castle is:issue is:open label:${LABEL} "error-fingerprint:${fp}" in:body`)}`);
  const existing = found.items?.[0]?.number;
  if (existing) {
    k.issue = existing;
    await github(`${REPO}/issues/${existing}/comments`, { method: "POST", body: { body: `Happened again on ${(process.env.GIT_REV || "unknown").slice(0, 12)} (${new Date().toISOString()}).` } });
    return;
  }
  opened = opened.filter(t => Date.now() - t < 864e5);
  if (opened.length >= NEW_PER_DAY) return log(`error reports: ${NEW_PER_DAY} issues opened today already; not filing ${fp}`);
  opened.push(Date.now());
  const issue = await github(`${REPO}/issues`, { method: "POST", body: { title: clip(scrub(`[${r.source}] ${r.message.split("\n")[0]}`), 120), body: body(fp, r), labels: [LABEL] } });
  k.issue = issue.number;
  log(`error reports: filed #${issue.number} for ${fp}`);
}

export async function reportError(r: ErrorReport) {
  log(`error (${r.source}): ${r.message}${r.stack ? "\n" + r.stack : ""}`);
  if (!process.env.githubErrorToken) return;
  const fp = fingerprint(r);
  const k = known.get(fp);
  try {
    if (!k) {
      const fresh: Known = { issue: null, since: 0, lastComment: Date.now() };
      known.set(fp, fresh); // set before any await, so a burst of the same error files once
      return await file(fp, r, fresh);
    }
    k.since++;
    if (k.issue && Date.now() - k.lastComment > COMMENT_EVERY) {
      k.lastComment = Date.now();
      const n = k.since;
      k.since = 0;
      await github(`${REPO}/issues/${k.issue}/comments`, { method: "POST", body: { body: `Happened ${n} more time${n === 1 ? "" : "s"} (latest ${new Date().toISOString()}).` } });
    }
  } catch (e) {
    if (!k) known.delete(fp); // try again next time it happens
    log(`error reports: couldn't file ${fp}: ${e}`);
  }
}
