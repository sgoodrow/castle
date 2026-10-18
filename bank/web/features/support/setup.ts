// What a browser has and jsdom doesn't, plus a stand-in bank server for the page to talk to.
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll } from "vitest";

// A desktop-width window: min-width queries match, so the page lays out as a table.
window.matchMedia = (query: string) => ({
  matches: /min-width/.test(query),
  media: query,
  onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  dispatchEvent: () => false,
});
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
// Row flashes and shakes; nothing to see in a test.
Element.prototype.animate = function () { return { finished: Promise.resolve(), cancel() {} } as unknown as Animation; };

// The page reports its crashes here; a scenario that crashes fails on its own.
export const server = setupServer(http.post("/api/errors", () => new HttpResponse(null, { status: 204 })));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
