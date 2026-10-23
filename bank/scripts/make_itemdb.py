"""Trim the item and spell tables into data/itemdb.json and data/spells.json.

Items are Project Quarm's (github.com/SecretsOTheP/EQMacEmu, utils/sql/database_full, as JSON made
by parse_sql.py), but Quarm has changed stats and added focus effects P99 doesn't have. So an item's
stats and focus come from IdleQuest (github.com/brynnb/idlequest-content, data/items/*.ndjson), a
TAKP database corrected to match Project 1999, whenever it has the same item. Its other columns
follow a later EQEmu schema (slot bits, class and race masks, spell ids, lore), so they stay Quarm's.
Spells are Quarm's.

usage: python3 -I scripts/make_itemdb.py <idlequest items dir> <items_raw.json> <spells_raw.json> <project dir>
"""
import glob, json, os, re, sys

idlequest_items, items_raw, spells_raw, root = sys.argv[1:5]

KEEP = {
    "Name": "name", "ac": "ac", "hp": "hp", "mana": "mana",
    "astr": "str", "asta": "sta", "aagi": "agi", "adex": "dex", "awis": "wis", "aint": "int", "acha": "cha",
    "mr": "mr", "fr": "fr", "cr": "cr", "dr": "dr", "pr": "pr",
    "damage": "dmg", "delay": "dly", "range": "rng", "itemtype": "type", "itemclass": "cls",
    "slots": "slots", "classes": "classes", "races": "races", "deity": "deity",
    "magic": "magic", "lore": "lore", "nodrop": "nodrop", "norent": "norent",
    "weight": "wt", "size": "size", "reqlevel": "reqlvl", "reclevel": "reclvl",
    "bagslots": "bagslots", "bagsize": "bagsize", "bagwr": "bagwr",
    "banedmgamt": "baneamt", "banedmgbody": "banebody", "banedmgrace": "banerace",
    "elemdmgtype": "elemtype", "elemdmgamt": "elemamt",
    "skillmodtype": "skillmod", "skillmodvalue": "skillmodval",
    "maxcharges": "charges", "stacksize": "stack", "icon": "icon", "light": "light",
    "clickeffect": "click", "clicktype": "clicktype", "clicklevel": "clicklvl", "casttime": "casttime",
    "proceffect": "proc", "proclevel": "proclvl", "worneffect": "worn", "worntype": "worntype",
    "focuseffect": "focus", "scrolleffect": "scroll", "bardtype": "bardtype", "bardvalue": "bardval",
}
# Quarm's list spells these items differently from the game's uploads and the bankers' sheets; the game's spelling wins.
GAME_NAME = {
    16337: "Spell: Wrath of Ap'Sagor",
    11701: "A Faded Velishoul's Tome Page",
    16093: "Velishoul's Tome Pg.76",
}
# A value equal to the default carries no information, so it is dropped.
DEFAULT = {"click": -1, "proc": -1, "worn": -1, "focus": -1, "scroll": -1, "charges": 0}

P99_COLS = ("ac", "hp", "mana", "astr", "asta", "aagi", "adex", "awis", "aint", "acha",
            "mr", "fr", "cr", "dr", "pr", "damage", "focuseffect")

s = json.load(open(spells_raw))
scols = s["cols"]
spells = {}
for row in s["rows"]:
    r = dict(zip(scols, row))
    levels = [r["classes%d" % k] for k in range(1, 16)]
    spells[r["id"]] = {"name": r["name"], "lv": [l if l < 255 else 0 for l in levels]}

p99 = {}
for path in glob.glob(os.path.join(idlequest_items, "*.ndjson")):
    for line in open(path):
        r = json.loads(line)
        p99[r["id"]] = r

# A few ids hold a different item in each table; only the same item, by name, is corrected.
def same_name(a, b):
    def key(name):
        name = re.sub(r"[^a-z0-9 ]", "", name.lower())
        return re.sub(r"^(a|an|the) ", "", name).replace(" ", "")
    return key(a) == key(b)

# Quarm's ids are the item list: IdleQuest also keeps thousands of later-era items.
d = json.load(open(items_raw))
cols = d["cols"]
items = {}
corrected = 0
for row in d["rows"]:
    r = dict(zip(cols, row))
    r["Name"] = GAME_NAME.get(r["id"], r["Name"])
    fix = p99.get(r["id"])
    if fix and same_name(fix["Name"], r["Name"]):
        corrected += 1
        r.update({c: fix[c] for c in P99_COLS})
        # IdleQuest numbers some focus spells past the end of Quarm's spell table.
        if r["focuseffect"] not in spells:
            r["focuseffect"] = -1
    out = {}
    for src, dst in KEEP.items():
        v = r.get(src)
        if v in (None, "", 0) or DEFAULT.get(dst) == v:
            continue
        if isinstance(v, float) and v.is_integer():
            v = int(v)
        out[dst] = v
    # EQ marks LORE items with a leading '*' in the lore text; nodrop/norent 0 means NO DROP / NO RENT.
    out["nodrop"] = r.get("nodrop") == 0
    out["norent"] = r.get("norent") == 0
    out["lore"] = str(r.get("lore") or "").startswith("*")
    items[r["id"]] = out

# Only keep spells that items reference.
used = set()
for it in items.values():
    for k in ("click", "proc", "worn", "focus", "scroll"):
        if k in it:
            used.add(it[k])
spells = {k: v for k, v in spells.items() if k in used}

json.dump(items, open(os.path.join(root, "data", "itemdb.json"), "w"), separators=(",", ":"))
json.dump(spells, open(os.path.join(root, "data", "spells.json"), "w"), separators=(",", ":"))
print(len(items), "items,", corrected, "corrected from IdleQuest,", len(spells), "spells")
