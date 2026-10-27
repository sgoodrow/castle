// The steps the bank's features are written in. Each is what a member does or sees on the page;
// a few check a rule the page doesn't show, by asking the page's own code.
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect } from "vitest";
import { PAYLOAD, WITH_JEWELRY, WITH_RESEARCH, WITH_SHEET, WITH_SKY } from "../src/__fixtures__/bank";
import { bankPage } from "../src/app";
import { ALL_CLASSES, CLASS_BIT, CLASSES, ITEM_LIST, bankRequest, maskText, prettyLoc, type EqClassLevels, type Payload } from "../src/data";
import { server } from "./support/setup";

interface World { payload: Payload; status: number; user: UserEvent; reports: string[]; posts: { embeds: { description: string }[]; lines: { id: number; qty: number }[] }[]; postStatus: number; jewelryStatus: number }
let world: World;

// A fresh page, bank and browser for every scenario.
export function reset() {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  history.replaceState(null, "", "/");
  world = { payload: PAYLOAD, status: 200, user: userEvent.setup(), reports: [], posts: [], postStatus: 204, jewelryStatus: 0 };
  server.use(http.post("/api/errors", async ({ request }) => {
    world.reports.push(((await request.json()) as { message: string }).message);
    return new HttpResponse(null, { status: 204 });
  }));
  server.use(http.post("/api/bank-request", async ({ request }) => {
    const post = (await request.json()) as World["posts"][number] & { channel: string };
    const status = post.channel === "jewelry" && world.jewelryStatus ? world.jewelryStatus : world.postStatus;
    if (status === 204) world.posts.push(post);
    return new HttpResponse(null, { status });
  }));
}

type Extra = { table: Record<string, string>[]; doc: string | null };
const cell = (row: Record<string, string>, col: string) => {
  const v = row[col];
  if (v == null) throw new Error(`The table needs a ${col} column`);
  return v;
};
type Fn = (x: Extra, ...args: string[]) => unknown;
const steps: [RegExp, Fn][] = [];
const step = (re: RegExp, fn: Fn) => steps.push([re, fn]);

export async function runStep(text: string, x: Extra) {
  const hits = steps.flatMap(([re, fn]) => {
    const m = text.match(re);
    return m ? [{ fn, args: m.slice(1) }] : [];
  });
  const [hit, ...more] = hits;
  if (!hit || more.length) throw new Error(`${hit ? "More than one step matches" : "No step matches"}: ${text}`);
  await hit.fn(x, ...hit.args);
}

// ---------- reading the page ----------
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
// Elements reading exactly this, however the text is split across tags.
const reading = (text: string) => (_: string, el: Element | null) =>
  norm(el?.textContent) === text && ![...(el?.children ?? [])].some(c => norm(c.textContent) === text);
// Every "quoted" part: the odd pieces between quote marks.
const quoted = (s: string) => s.split('"').filter((_, i) => i % 2);
// The first match, or a failure naming what was looked for.
const first = <T>(found: T[], what: string) => {
  const [it] = found;
  if (!it) throw new Error(`Found no ${what}`);
  return it;
};

const list = () => screen.getByRole("list", { name: "Items in the bank" });
const rows = () => within(list()).queryAllByRole("listitem");
const row = (name: string) => {
  const r = rows().find(li => within(li).queryByText(name, { exact: true }));
  if (!r) throw new Error(`The bank doesn't list ${name}`);
  return r;
};
const rowButton = (name: string) => first(within(row(name)).getAllByRole("button"), `button on the row for ${name}`);
const listed = () => rows().map(li => ITEM_LIST.find(it => within(li).queryByText(it.name, { exact: true }))?.name);
const group = (name: string) => screen.getByRole("group", { name });
const picker = (kind: string, name: string) => within(group(`Filter by ${kind}`)).getByRole("button", { name });
const slots = (slot: string) => within(group("Filter by slot")).getAllByRole("button", { name: new RegExp(`^${slot.toLowerCase()} slot\\b`) });
const notWorn = (name: string) => within(group("Not worn")).getByRole("button", { name });
const searchBox = () => screen.getByRole("textbox", { name: "Search the bank" });
const tab = () => screen.findByRole("dialog", { name: /Your tab/ });
const classId = (match: (c: (typeof CLASSES)[number]) => boolean, what: string) => {
  const c = CLASSES.find(match);
  if (!c) throw new Error(`No class ${what}`);
  return c.id;
};
const cls = (who: string) => (/^any/.test(who) ? null : classId(c => c.name === who.replace(/^an? /, ""), `called ${who}`));
const item = (name: string) => {
  const it = ITEM_LIST.find(i => i.name === name);
  if (!it) throw new Error(`The bank doesn't hold ${name}`);
  return it;
};
const pressed = (el: HTMLElement) => el.getAttribute("aria-pressed") === "true";

// ---------- the bank ----------
step(/^the bank holds the usual stock$/, () => { world.payload = PAYLOAD; });
step(/^the bank also holds spells priced by the spell sheet$/, () => { world.payload = WITH_SHEET; });
step(/^the bank also holds the Plane of Sky items$/, () => { world.payload = WITH_SKY; });
step(/^the bank also holds research spells and components$/, () => { world.payload = WITH_RESEARCH; });
step(/^the jewelers also make jewelry to order$/, () => { world.payload = WITH_JEWELRY; });
step(/^the bank is empty$/, () => { world.payload = { ...PAYLOAD, bank: [], items: {} }; });
// Rows land after the usual stock, in the order given, the way the database may return them.
step(/^the bank also holds:$/, ({ table }) => {
  const id = (name: string) => +first(Object.entries(world.payload.items).filter(([, it]) => it.name === name), `item ${name}`)[0];
  world.payload = { ...world.payload, bank: [...world.payload.bank, ...table.map((r): Payload["bank"][number] => [cell(r, "character"), cell(r, "spot"), id(cell(r, "item")), +cell(r, "count")])] };
});
step(/^the spell data for "(.*)" has only (\d+) class levels$/, (_, name, n) => {
  const [id, sp] = first(Object.entries(PAYLOAD.spells).filter(([, sp]) => sp.name === name), `spell ${name}`);
  // What a bad spells.json would send. The type rules it out, so it takes a cast; the page checks anyway.
  const lv = sp.lv.slice(0, +n) as unknown as EqClassLevels;
  world.payload = { ...PAYLOAD, spells: { ...PAYLOAD.spells, [id]: { ...sp, lv } } };
});
step(/^the page reports one error: "(.*)"$/, (_, message) => waitFor(() => expect(world.reports).toEqual([message])));
step(/^the bank server answers (\d+)$/, (_, status) => { world.status = +status; });

async function open(link: string) {
  history.replaceState(null, "", link.startsWith("?") ? `/${link}` : link);
  server.use(http.get("/api/bank", () =>
    world.status === 200 ? HttpResponse.json(world.payload) : new HttpResponse(null, { status: world.status })));
  render(await bankPage());
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Castle Guild Bank" }) ?? screen.queryByText(/^Couldn't load the bank/)).toBeTruthy());
}
step(/^I (?:open|have opened) the bank page$/, () => open("/"));
step(/^I (?:open|have opened) the link "(.*)"$/, (_, link) => open(link));
step(/^I come back to the bank page$/, () => { cleanup(); return open("/"); });

// ---------- searching and filtering ----------
step(/^I search for "(.*)"$/, async (_, q) => {
  await world.user.clear(searchBox());
  await world.user.type(searchBox(), q);
});
step(/^I clear the search$/, () => world.user.click(screen.getByRole("button", { name: "Clear search" })));
step(/^I clear the filters$/, () => world.user.click(screen.getByRole("button", { name: "Clear filters" })));
step(/^I (?:pick|have picked) the (class|race) "(.*)"$/, (_, kind, name) => world.user.click(picker(kind, name)));
step(/^I play (?:an? )?(.+)$/, (_, name) => (/^any/.test(name) ? undefined : world.user.click(picker("class", name))));
step(/^I pick the (\w+) slot$/, (_, slot) => world.user.click(first(slots(slot), `${slot} slot`)));
step(/^I pick "(Spells|Sky|Other)"$/, (_, kind) => world.user.click(notWorn(kind)));

const sortHeader = (column: string) => within(list().parentElement!).getByRole("button", { name: column });
step(/^I (?:sort|have sorted) by "(Item|Guild price)"(?: again)?$/, (_, column) => world.user.click(sortHeader(column)));
step(/^"(Item|Guild price)" is sorted (ascending|descending|none)$/, (_, column, how) => {
  expect(sortHeader(column).closest("[aria-sort]")?.getAttribute("aria-sort")).toBe(how);
});
step(/^the bank lists (\d+) items?$/, (_, n) => { screen.getByText(`${n} ${n === "1" ? "item" : "items"}`); });
step(/^the bank lists, in order:$/, ({ table }) => { expect(listed()).toEqual(table.map(r => r.item)); });
step(/^the bank lists only (.*)$/, (_, names) => { expect(listed().sort()).toEqual(quoted(names).sort()); });
step(/^the bank lists (".*)$/, (_, names) => { for (const n of quoted(names)) row(n); });
step(/^the bank doesn't list (".*)$/, (_, names) => { for (const n of quoted(names)) expect(listed()).not.toContain(n); });
step(/^the (class|race) "(.*)" is (not )?picked$/, (_, kind, name, not) => { expect(pressed(picker(kind, name))).toBe(!not); });
step(/^the (\w+) slots? (?:is|are) (not )?picked$/, (_, slot, not) => { for (const b of slots(slot)) expect(pressed(b)).toBe(!not); });
step(/^"(Spells|Sky|Other)" is (not )?picked$/, (_, kind, not) => { expect(pressed(notWorn(kind))).toBe(!not); });
step(/^the search box reads "(.*)"$/, (_, q) => { expect(searchBox()).toHaveProperty("value", q); });
step(/^I can (not )?clear the filters$/, (_, not) => {
  expect(screen.getByRole("button", { name: "Clear filters" })).toHaveProperty("disabled", !!not);
});
step(/^the address reads "(.*)"$/, (_, url) => waitFor(() => expect(location.pathname + location.search).toBe(url)));

// ---------- items ----------
step(/^I (?:click|have clicked) "(.*)" in the bank$/, (_, name) => world.user.click(rowButton(name)));
step(/^I press (up|down)(?: (\d+) times)?$/, async (_, dir, n) => world.user.keyboard(`{Arrow${dir === "up" ? "Up" : "Down"}>${n || 1}/}`));
step(/^"(.*)" is selected in the bank$/, (_, name) => waitFor(() => expect(rowButton(name).getAttribute("aria-current")).toBe("true")));
step(/^"(.*)" is priced "(.*)"$/, (_, name, price) => { within(row(name)).getByText(price); });
step(/^"(.*)" has no price$/, (_, name) => { expect(within(row(name)).queryByText(/^(\d+pp|free)$/)).toBeNull(); });
step(/^"(.*)" is priced "(.*)" with low confidence$/, (_, name, price) => {
  within(row(name)).getByText(price);
  within(row(name)).getByLabelText("Low confidence");
});
step(/^the row for "(.*)" shows (".*)$/, (_, name, parts) => {
  for (const p of quoted(parts)) expect(within(row(name)).getAllByText(reading(p)).length).toBeGreaterThan(0);
});
step(/^"(.*)" is marked "(.*)"$/, (_, name, badge) => { within(row(name)).getByText(badge); });
step(/^"(.*)" isn't marked "(.*)"$/, (_, name, badge) => { expect(within(row(name)).queryByText(badge)).toBeNull(); });
step(/^the page says "(.*)"$/, async (_, text) => { await screen.findAllByText(reading(text)); });
step(/^the page doesn't say "(.*)"$/, (_, text) => { expect(screen.queryAllByText(reading(text))).toEqual([]); });
step(/^the page says:$/, async ({ table }) => {
  for (const { text } of table) {
    if (text == null) throw new Error("The table needs a text column");
    await screen.findAllByText(reading(text));
  }
});
step(/^the doll shows "(.*)" fits the (.+) slots?$/, (_, name, slot) => {
  for (const s of slot.split(/ and /)) {
    const fit = slots(s);
    expect(fit.length).toBeGreaterThan(0);
    for (const b of fit) expect(b.getAttribute("aria-label")).toBe(`${s.toLowerCase()} slot, ${name} fits here`);
  }
});
step(/^I point at "(.*)" among the holders$/, (_, char) => world.user.hover(screen.getByText(reading(char))));

// ---------- the tab ----------
step(/^I (?:add|have added) (?:(\d+) )?"(.*)" to my tab$/, async (_, n, name) => {
  for (let i = 0; i < +(n || 1); i++) await world.user.dblClick(rowButton(name));
});
step(/^I have added one each of (".*") to my tab$/, async (_, names) => {
  for (const name of quoted(names)) await world.user.dblClick(rowButton(name));
});
step(/^my tab from last time holds one of each of (".*")$/, (_, names) => {
  const ids = quoted(names).map(n => first(Object.entries(world.payload.items).filter(([, it]) => it.name === n), `item ${n}`)[0]);
  localStorage.setItem("castle-bank-tab", JSON.stringify(Object.fromEntries(ids.map(id => [id, 1]))));
});
const details = () => first(screen.getAllByRole("group", { name: "On your tab" }), "tab count in the details");
step(/^I add one "(.*)" from its details$/, (_, name) =>
  world.user.click(within(details()).getByRole("button", { name: `Add one ${name} to your tab` })));
step(/^I take one "(.*)" off my tab from its details$/, (_, name) =>
  world.user.click(within(details()).getByRole("button", { name: `Remove one ${name} from your tab` })));
step(/^the details show "(.*)" on my tab$/, (_, count) => { within(details()).getByText(count); });
step(/^I take one "(.*)" off my tab$/, (_, name) =>
  world.user.click(within(row(name)).getByRole("button", { name: `Remove one ${name} from your tab` })));
step(/^I am told "(.*)"$/, async (_, text) => {
  await waitFor(() => expect(norm(screen.getByRole("status").textContent)).toBe(text));
});
step(/^the tab button shows "(.*)"$/, (_, total) => { screen.getByRole("button", { name: `Show tab, ${total}` }); });
step(/^I open my tab$/, async () => {
  await world.user.click(screen.getByRole("button", { name: /^Show tab/ }));
  await tab();
});
step(/^my tab says "(.*)"$/, async (_, text) => { within(await tab()).getAllByText(reading(text)); });
step(/^my tab lists (".*)$/, async (_, lines) => { for (const l of quoted(lines)) within(await tab()).getAllByText(reading(l)); });
const confirm = () => screen.findByRole("dialog", { name: "Post these?" });
step(/^the post reads "(.*)"$/, async (_, text) => {
  expect(norm((await confirm()).textContent)).toContain(text);
});
step(/^the post links "(.*)" to "(.*)"$/, async (_, name, url) => {
  expect(within(await confirm()).getByRole("link", { name }).getAttribute("href")).toBe(url);
});
step(/^#bank-requests gets the item line "(.*)"$/, async (_, line) => {
  await waitFor(() => expect(world.posts).toHaveLength(1));
  expect(world.posts[0]?.embeds[0]?.description.split("\n")).toContain(`• ${line}`);
});
step(/^the post doesn't read "(.*)"$/, async (_, text) => {
  expect(norm((await confirm()).textContent)).not.toContain(text);
});
step(/^the post reads, in order:$/, async ({ table }) => {
  const text = norm((await confirm()).textContent);
  const at = table.map(r => text.indexOf(cell(r, "line")));
  expect(at).not.toContain(-1);
  expect(at).toEqual([...at].sort((a, b) => a - b));
});
step(/^I send my tab to Discord$/, async () => { await world.user.click(within(await tab()).getByRole("button", { name: "Send to Discord" })); });
step(/^I confirm the post$/, async () => { await world.user.click(within(await confirm()).getByRole("button", { name: "Send" })); });
step(/^I send my tab to Discord again$/, async () => { await world.user.click(within(await tab()).getByRole("button", { name: "Send to Discord" })); });
step(/^I confirm the retry$/, async () => { await world.user.click(within(await confirm()).getByRole("button", { name: "Send" })); });
step(/^I'm told "(.*)" before it posts$/, async (_, text) => { await within(await confirm()).findByText(text); });
step(/^the site (?:refuses|has refused) posts with (\d+)$/, (_, status) => { world.postStatus = +status; });
step(/^the site refuses posts to #jewelry-requests with (\d+)$/, (_, status) => { world.jewelryStatus = +status; });
step(/^the site accepts posts to #jewelry-requests again$/, () => { world.jewelryStatus = 0; });
step(/^my tab doesn't list (".*)$/, async (_, lines) => { for (const l of quoted(lines)) expect(within(await tab()).queryByText(reading(l))).toBeNull(); });
step(/^#bank-requests gets my request for (".*)$/, async (_, names) => {
  await waitFor(() => expect(world.posts).toHaveLength(1));
  expect(world.posts[0]?.lines.map(l => ITEM_LIST.find(it => it.id === l.id)?.name)).toEqual(quoted(names));
});
step(/^nothing is posted$/, () => expect(world.posts).toEqual([]));
step(/^I'm told "(.*)"$/, async (_, text) => { await screen.findByText(text); });
step(/^I remove "(.*)" from my tab$/, async (_, name) => world.user.click(within(await tab()).getByRole("button", { name: `Remove ${name}` })));
step(/^I click "(.*)" on my tab$/, async (_, name) => world.user.click(within(await tab()).getByRole("button", { name })));
step(/^I clear my tab$/, async () => world.user.click(within(await tab()).getByRole("button", { name: "Clear tab" })));

// ---------- rules the page doesn't show ----------
step(/^the request line for (?:(\d+) )?"(.*)" for (.+) reads "(.*)"$/, (_, n, name, who, line) => {
  expect(bankRequest(item(name), cls(who), +(n || 1)).text).toBe(line);
});
step(/^the price of "(.*)" for (.+) is explained as "(.*)"$/, (_, name, who, cost) => {
  expect(bankRequest(item(name), cls(who)).cost).toBe(cost);
});
step(/^"(.*)" can be paid with DKP for (.+)$/, (_, name, who) => {
  expect(bankRequest(item(name), cls(who))).toMatchObject({ price: { kind: "pp", dkp: true } });
});
const mask = (who: string) => {
  if (who === "everyone") return undefined;
  if (who === "no one") return 0;
  const bits = (codes: string) => codes.split(" ").reduce((m, code) => m | CLASS_BIT[classId(c => c.id === code, code)], 0);
  const [, except] = who.match(/^everyone except (.+)$/) ?? [];
  return except ? ALL_CLASSES & ~bits(except) : bits(who);
};
step(/^an item for (.+) lists its classes as "(.*)"$/, (_, who, text) => { expect(maskText(mask(who), CLASSES, ALL_CLASSES)).toBe(text); });
step(/^the bank spot "(.*)" reads "(.*)"$/, (_, loc, text) => { expect(prettyLoc(loc)).toBe(text); });
