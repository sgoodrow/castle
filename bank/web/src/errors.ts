// Sends the page's crashes to the bank server (/api/errors), which files them for fixing.
const REV = document.querySelector<HTMLMetaElement>('meta[name="bank-rev"]')?.content ?? "";
const MAX = 5; // a crash loop doesn't need to say it more than this

let sent = 0;
export function reportError(err: unknown, componentStack?: string) {
  if (sent++ >= MAX) return;
  const e = err instanceof Error ? err : new Error(String(err));
  fetch("/api/errors", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `${e.name}: ${e.message}`, stack: e.stack, componentStack, rev: REV }),
  }).catch(() => {});
}

window.addEventListener("error", ev => reportError(ev.error ?? ev.message));
window.addEventListener("unhandledrejection", ev => reportError(ev.reason));
