"""Trim the Project Quarm items + spells tables into data/itemdb.json and data/spells.json.

Input is JSON made by parse_sql.py from the Quarm database dump
(github.com/SecretsOTheP/EQMacEmu, utils/sql/database_full).

usage: python3 -I scripts/make_itemdb.py <items_raw.json> <spells_raw.json> <project dir>
"""
import json, os, sys

items_raw, spells_raw, root = sys.argv[1:4]

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
# A value equal to the default carries no information, so it is dropped.
DEFAULT = {"click": -1, "proc": -1, "worn": -1, "focus": -1, "scroll": -1, "charges": 0}

d = json.load(open(items_raw))
cols = d["cols"]
items = {}
for row in d["rows"]:
    r = dict(zip(cols, row))
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

s = json.load(open(spells_raw))
scols = s["cols"]
spells = {}
for row in s["rows"]:
    r = dict(zip(scols, row))
    levels = [r["classes%d" % k] for k in range(1, 16)]
    spells[r["id"]] = {"name": r["name"], "lv": [l if l < 255 else 0 for l in levels]}

# Only keep spells that items reference.
used = set()
for it in items.values():
    for k in ("click", "proc", "worn", "focus", "scroll"):
        if k in it:
            used.add(it[k])
spells = {k: v for k, v in spells.items() if k in used}

json.dump(items, open(os.path.join(root, "data", "itemdb.json"), "w"), separators=(",", ":"))
json.dump(spells, open(os.path.join(root, "data", "spells.json"), "w"), separators=(",", ":"))
print(len(items), "items", len(spells), "spells")
