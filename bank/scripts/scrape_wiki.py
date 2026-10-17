"""Scrape P99 wiki item pages for every item in the bank sheet.

Saves one JSON per item in data/wiki/<id>.json with the wiki icon id, the
Green auction tracker rows (date, seller, price) and the page URL. Pages
fetched within MAX_AGE_DAYS are skipped. Icons land in data/icons/.

usage: python3 -I scripts/scrape_wiki.py <project dir>
"""
import csv, html, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = sys.argv[1]
DATA = os.path.join(ROOT, "data")
WIKI = "https://wiki.project1999.com"
UA = {"User-Agent": "castle-bank-browser/1.0 (guild bank tool)"}
MAX_AGE_DAYS = 7


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read()


def wiki_paths():
    # The bot's own item-name -> wiki-path map.
    text = open(os.path.join(ROOT, "..", "src", "shared", "items.ts"), encoding="utf-8").read()
    return {k: v for k, v in re.findall(r'^\s*"(.+?)": "(.+?)",?$', text, re.M)}


def strip(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def parse_tracker(page, label):
    i = page.find("Project 1999 Auction Tracker (%s)" % label)
    if i < 0:
        return None
    j = page.find("Last 20 Recorded Auctions", i)
    block = page[i: j if j > 0 else i + 20000]
    cells = [strip(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", block, re.S)]
    rows = []
    for k in range(len(cells) - 2):
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", cells[k]) and re.fullmatch(r"\d+", cells[k + 2] or ""):
            rows.append([cells[k], cells[k + 1], int(cells[k + 2])])
    return rows


def main():
    paths = wiki_paths()
    rows = [r for r in csv.reader(open(os.path.join(DATA, "bank.csv"), encoding="utf-8")) if r and r[0]]
    items = {}
    for r in rows:
        items.setdefault(int(r[3]), r[2])
    now = time.time()
    for n, (iid, name) in enumerate(sorted(items.items())):
        out = os.path.join(DATA, "wiki", "%d.json" % iid)
        if os.path.exists(out) and now - os.path.getmtime(out) < MAX_AGE_DAYS * 86400:
            continue
        path = paths.get(name.lower()) or "/" + urllib.parse.quote(name.replace(" ", "_"))
        rec = {"id": iid, "name": name, "url": WIKI + path, "icon": None, "green": None, "ok": False}
        try:
            status, body = get(WIKI + path)
            page = body.decode("utf-8", "replace")
            m = re.search(r'class="itemicon".*?/images/Item_(\d+)\.png', page, re.S)
            rec["icon"] = int(m.group(1)) if m else None
            rec["green"] = parse_tracker(page, "Green")
            rec["ok"] = m is not None
        except Exception as e:  # missing page or network error: record and move on
            rec["error"] = str(e)
        json.dump(rec, open(out, "w"))
        print(n, iid, name, rec["icon"], len(rec["green"] or []), rec.get("error", ""), flush=True)
        time.sleep(1)

    icons = set()
    for f in os.listdir(os.path.join(DATA, "wiki")):
        rec = json.load(open(os.path.join(DATA, "wiki", f)))
        if rec.get("icon"):
            icons.add(rec["icon"])
    db = os.path.join(DATA, "itemdb.json")
    if os.path.exists(db):
        itemdb = json.load(open(db))
        icons |= {itemdb[str(i)]["icon"] for i in items if str(i) in itemdb and itemdb[str(i)].get("icon")}
    for icon in sorted(icons):
        out = os.path.join(DATA, "icons", "%d.png" % icon)
        if os.path.exists(out):
            continue
        try:
            _, body = get("%s/images/Item_%d.png" % (WIKI, icon))
            if body[:8] == b"\x89PNG\r\n\x1a\n":
                open(out, "wb").write(body)
        except Exception as e:
            print("icon", icon, e, flush=True)
        time.sleep(0.3)
    print("done", len(items), "items", len(icons), "icons")


main()
