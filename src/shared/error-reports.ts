// Files errors as GitHub issues labelled `error`, one per distinct error, so they get seen and,
// through .github/workflows/auto-fix.yml, picked up by Claude for a fix. Used by the bot worker,
// the bank web process and (through /api/errors) the bank page. Without githubErrorToken it only logs.
import { createHash } from "crypto";
import { hostname } from "os";
import { log } from "./logger";

const API = "https://api.github.com";
const REPO = "/repos/sgoodrow/castle";
const LABEL = "error";
const COMMENT_EVERY = 6 * 3600e3; // at most one "happened again" comment per issue this often
const NEW_PER_DAY = 5; // a storm of new errors can't open more issues (or fix runs) than this

export type ErrorSource = "page" | "web" | "worker";
const WHERE: Record<ErrorSource, string> = { page: "bank page (browser)", web: "bank web process", worker: "bot worker" };

// An issue has to say enough to fix the cause, not just the line that threw: what someone was doing,
// what they saw, and what led up to it. Without those a fix guesses (#302's first fix did).
export interface ErrorReport {
  source: ErrorSource;
  message: string;
  stack?: string;
  // What was being done: a command and subcommand, a button, a page route, a background job. Never
  // anything a member typed: the issue is public.
  feature: string;
  // What the person saw because of it, or that nobody saw anything.
  outcome: string;
  details?: Record<string, string>;
}

// Times of the same error since the last comment, by feature and message, so a repeat says which.
interface Known { issue: number | null; since: Map<string, number>; lastComment: number }
const known = new Map<string, Known>();
let opened: number[] = [];

// The commit this code is from: baked into the image by its build (Dokku's own GIT_REV for an image
// deploy is a commit Dokku makes), or GIT_REV from a git push deploy.
export const commit = () => process.env.SOURCE_REV || process.env.GIT_REV || "";

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

// An error's name, message and Discord or HTTP status, with its causes, for a report.
export function describeError(err: unknown): { message: string; stack?: string } {
  const one = (e: unknown) => {
    if (!(e instanceof Error)) return { message: String(e) };
    const status = (e as { status?: unknown }).status;
    const name = e.name === "Error" ? "" : `${e.name}: `; // DiscordAPIError[10062], TypeError, not plain Error
    return { message: `${name}${e.message}${typeof status === "number" ? ` (HTTP ${status})` : ""}`, stack: e.stack };
  };
  const top = one(err);
  const causes: string[] = [];
  for (let e = (err as { cause?: unknown })?.cause, n = 0; e !== undefined && n < 3; e = (e as { cause?: unknown })?.cause, n++) {
    const c = one(e);
    causes.push(`Caused by: ${c.stack || c.message}`);
  }
  return causes.length ? { message: top.message, stack: [top.stack || top.message, ...causes].join("\n") } : top;
}

// What happened just before an error, newest last: failures that were handled, a deploy stopping
// this process. An error that escapes its handler (like #302's) loses the error behind it; this keeps it.
const TRAIL_FOR = 2 * 60e3;
let trail: { at: number; what: string }[] = [];
export function remember(what: string) {
  trail = [...trail.filter(t => Date.now() - t.at < TRAIL_FOR).slice(-9), { at: Date.now(), what }];
}

// A deploy starts the new container before stopping the old one, so for a while both get every
// interaction. An error from a stopping process is often that overlap.
let stoppedAt = 0;
export function stopping(signal: string) {
  stoppedAt = Date.now();
  remember(`received ${signal}: this instance is stopping`);
}

const ago = (at: number) => `${((Date.now() - at) / 1000).toFixed(1)}s`;
function instance() {
  const up = Math.round(process.uptime());
  const upText = up < 120 ? `${up}s` : up < 7200 ? `${Math.round(up / 60)}m` : `${Math.round(up / 3600)}h`;
  return `${hostname()}, up ${upText}${stoppedAt ? `, stopping (signalled ${ago(stoppedAt)} earlier)` : ""}`;
}
function before() {
  const recent = trail.filter(t => Date.now() - t.at < TRAIL_FOR);
  return recent.length ? fence(recent.map(t => `${ago(t.at)} earlier: ${clip(t.what, 400)}`).join("\n")) : "(nothing recorded)";
}
const occurrence = (r: ErrorReport) => clip(`${r.feature} — ${r.message.split("\n")[0]}`, 200);

// The same error from anywhere in the same code: the message without numbers or quoted values,
// plus the first frame in our own code (src, or dist when built), without line numbers (they move
// with every edit). Not the feature: the same bug reached from two commands is one issue.
export function fingerprint(r: Pick<ErrorReport, "source" | "message" | "stack">) {
  const msg = r.message.replace(/(["'`]).*?\1/g, "…").replace(/\d+/g, "#");
  const frame = (r.stack || "").split("\n").find(l => /(src|dist|bank\/web)\//.test(l) && !l.includes("node_modules")) || "";
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
  const rev = (commit() || "unknown").slice(0, 12);
  const lines = [
    `**Where:** ${WHERE[r.source]}`,
    `**Feature:** ${clip(scrub(r.feature), 200)}`,
    `**What they saw:** ${clip(scrub(r.outcome), 500)}`,
    `**Commit:** ${rev}`,
    `**Instance:** ${instance()}`,
    `**First seen:** ${new Date().toISOString()}`,
    ...Object.entries(r.details || {}).map(([k, v]) => `**${k}:** ${clip(scrub(v), 200)}`),
    "",
    fence([clip(r.message, 500), clip(r.stack || "(no stack)", 6000)].join("\n")),
    "",
    "**Just before:**",
    before(),
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
    const again = [
      `Happened again on ${(commit() || "unknown").slice(0, 12)} (${new Date().toISOString()}): ${scrub(occurrence(r))}`,
      `**What they saw:** ${clip(scrub(r.outcome), 500)}`,
      `**Instance:** ${instance()}`,
      "**Just before:**",
      before(),
    ].join("\n");
    await github(`${REPO}/issues/${existing}/comments`, { method: "POST", body: { body: again } });
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
      const fresh: Known = { issue: null, since: new Map(), lastComment: Date.now() };
      known.set(fp, fresh); // set before any await, so a burst of the same error files once
      return await file(fp, r, fresh);
    }
    const what = occurrence(r);
    k.since.set(what, (k.since.get(what) || 0) + 1);
    if (k.issue && Date.now() - k.lastComment > COMMENT_EVERY) {
      k.lastComment = Date.now();
      const counts = [...k.since].sort((a, b) => b[1] - a[1]);
      k.since = new Map();
      const n = counts.reduce((sum, [, c]) => sum + c, 0);
      const list = counts.map(([w, c]) => `- ${scrub(w)} ×${c}`).join("\n");
      await github(`${REPO}/issues/${k.issue}/comments`, { method: "POST", body: { body: `Happened ${n} more time${n === 1 ? "" : "s"} (latest ${new Date().toISOString()}, on ${instance()}):\n${list}` } });
    }
  } catch (e) {
    if (!k) known.delete(fp); // try again next time it happens
    log(`error reports: couldn't file ${fp}: ${e}`);
  }
}
