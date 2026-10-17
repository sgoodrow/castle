#!/usr/bin/env python3
"""Download the guild bank sheet CSV to <ROOT>/data/bank.csv.

Usage: python3 -I scripts/fetch_sheet.py <ROOT>
Exits non-zero, leaving any existing bank.csv untouched, on failure or if the
result does not look like the expected 7-column inventory.
"""
import csv, io, os, sys, urllib.request

URL = ("https://docs.google.com/spreadsheets/d/e/2PACX-1vTO32y9CIjkSDsfgqaLDeD7ShFlyEGNnyi8lx3SfIHAeDUNK1Vc1GiwErCm3nuP8jAkEF3gCwY0-oeR/pub?output=csv")
MIN_ROWS = 100


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: fetch_sheet.py <ROOT>")
    data_dir = os.path.join(sys.argv[1], "data")
    dest = os.path.join(data_dir, "bank.csv")
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "castle-bank/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
        text = raw.decode("utf-8-sig")
    except Exception as e:
        sys.exit(f"fetch_sheet: download failed: {e}")

    if text.lstrip().lower().startswith(("<!doctype", "<html")):
        sys.exit("fetch_sheet: got HTML instead of CSV")
    rows = list(csv.reader(io.StringIO(text)))
    good = [r for r in rows if len(r) == 7 and r[0].strip() and r[2].strip()]
    if len(good) < MIN_ROWS or len(good) < 0.9 * len(rows):
        sys.exit(f"fetch_sheet: unexpected shape ({len(good)} valid of {len(rows)} rows)")

    os.makedirs(data_dir, exist_ok=True)
    tmp = dest + ".tmp"
    with open(tmp, "wb") as f:
        f.write(raw)
    os.replace(tmp, dest)
    print(f"fetch_sheet: wrote {dest} ({len(good)} item rows)")


if __name__ == "__main__":
    main()
