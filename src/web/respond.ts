// Small response helpers for the bank web server.
import { IncomingMessage, ServerResponse } from "http";
import { gzipSync } from "zlib";

export function send(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  type: string,
  body: string | Buffer,
  headers: Record<string, string | string[]> = {}
) {
  let buf = typeof body === "string" ? Buffer.from(body) : body;
  const h: Record<string, string | string[]> = { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers };
  if (buf.length > 1024 && !type.startsWith("image/") && /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""))) {
    buf = gzipSync(buf);
    h["Content-Encoding"] = "gzip";
  }
  res.writeHead(status, h);
  res.end(req.method === "HEAD" ? undefined : buf);
}

export function redirect(res: ServerResponse, to: string, setCookie?: string[]) {
  res.writeHead(302, { Location: to, "Cache-Control": "no-store", ...(setCookie ? { "Set-Cookie": setCookie } : {}) });
  res.end();
}

// A plain page for sign-in problems and the like.
export function message(req: IncomingMessage, res: ServerResponse, status: number, title: string, text: string, again = true) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Castle Guild Bank</title>
<style>body{font:16px system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;color:#222;background:#f6f7f9}@media(prefers-color-scheme:dark){body{color:#dde3e9;background:#1a1b1e}a{color:#74a7ff}}</style>
<h1>${title}</h1><p>${text}</p>${again ? '<p><a href="/auth/login">Sign in</a></p>' : ""}`;
  send(req, res, status, "text/html; charset=utf-8", html);
}
