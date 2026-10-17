# Castle Bank browser

A static page for browsing the Castle guild bank: dress your character in an EQ-style inventory window, filter to items your class and race can use, see recent Green auction prices, and copy a ready-made `#bank-requests` line.

The build produces one self-contained HTML file. `.github/workflows/bank-pages.yml` publishes it to GitHub Pages on changes here and nightly at 10:00 UTC, so the page follows the bank sheet within a day.

## Data sources

- Bank inventory: the published bank Google Sheet (`scripts/fetch_sheet.py`).
- Item stats, classes, races and slots: the Project Quarm item DB from github.com/SecretsOTheP/EQMacEmu `utils/sql/database_full`, trimmed once into `data/itemdb.json` and `data/spells.json` by `parse_sql.py` + `make_itemdb.py`. Spot-checked against the P99 wiki: 40 of 40 items matched on every number.
- Icons and Green auctions: the P99 wiki (`scripts/scrape_wiki.py`, about 1 request/sec, pages cached 7 days). Item names map to wiki pages through the bot's `src/shared/items.ts`.

## Build locally

```
cd bank
python3 -I scripts/fetch_sheet.py .
python3 -I scripts/scrape_wiki.py .
python3 -I scripts/build.py .
```

Open `dist/castle-bank.html`. The first scrape takes about 6 minutes; later ones reuse `data/wiki/` and `data/icons/`.

## Refreshing the item DB

Only needed if item data changes upstream:

```
python3 -I scripts/parse_sql.py <quarm dump.sql> items items_raw.json
python3 -I scripts/parse_sql.py <quarm dump.sql> spells_new spells_raw.json
python3 -I scripts/make_itemdb.py items_raw.json spells_raw.json .
```
