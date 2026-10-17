"""Bake bank sheet + item DB + wiki auctions + icons into web/payload.json.

usage: python3 -I scripts/build.py <project dir>
"""
import base64, csv, datetime, json, os, sys

ROOT = sys.argv[1]
DATA = os.path.join(ROOT, "data")

itemdb = json.load(open(os.path.join(DATA, "itemdb.json")))
spells = json.load(open(os.path.join(DATA, "spells.json")))
rows = [r for r in csv.reader(open(os.path.join(DATA, "bank.csv"), encoding="utf-8")) if r and r[0]]

bank, items, snap_dates = [], {}, set()
for char, loc, name, iid, count, _slots, date in rows:
    iid = int(iid)
    snap_dates.add(date)
    # NO DROP items can't be traded out of the bank, so buyers never see them.
    if (itemdb.get(str(iid)) or {}).get("nodrop"):
        continue
    bank.append([char, loc, iid, int(count or 1)])
    if iid in items:
        continue
    it = dict(itemdb.get(str(iid)) or {"name": name, "unknown": True})
    it["name"] = name  # the sheet's spelling matches the P99 client
    wpath = os.path.join(DATA, "wiki", "%d.json" % iid)
    if os.path.exists(wpath):
        w = json.load(open(wpath))
        it["wiki"] = w["url"]
        if w.get("icon"):
            it["icon"] = w["icon"]  # P99 wiki icons are what players see
        if w.get("green") is not None:
            it["green"] = w["green"]
    items[iid] = it

used_spells = {}
for it in items.values():
    for k in ("click", "proc", "worn", "focus", "scroll"):
        sid = str(it.get(k, ""))
        if sid in spells:
            used_spells[sid] = spells[sid]

icons = {}
for it in items.values():
    p = os.path.join(DATA, "icons", "%s.png" % it.get("icon"))
    if it.get("icon") and os.path.exists(p):
        icons[it["icon"]] = base64.b64encode(open(p, "rb").read()).decode()

def parse_date(s):
    m, d, y = s.split("/")
    return "%s-%02d-%02d" % (y, int(m), int(d))

payload = {
    "snapshot": max(parse_date(d) for d in snap_dates),
    "built": datetime.date.today().isoformat(),
    "builtAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "bank": bank,
    "items": items,
    "spells": used_spells,
    "icons": icons,
}
# The web app (bank/web) bakes this into the page at build time.
out = json.dumps(payload, separators=(",", ":"))
open(os.path.join(ROOT, "web", "payload.json"), "w", encoding="utf-8").write(out)
print("items", len(items), "rows", len(bank), "icons", len(icons), "spells", len(used_spells), "bytes", len(out))
