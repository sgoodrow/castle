# Castle Bank browser

A storefront for the Castle guild bank. Browse and filter the bank (by class, race or slot), hover an item for its stats, open it for who holds it and its Green auction prices, and add it to a running tab that totals the price and gives you a table to paste into `#bank-requests`.

It runs as the bot's `web` process (`src/web`, see the `Procfile`), on the same Dokku app and database as the bot. Castle members sign in with Discord; only members with the bank role get in.

## Where the data comes from

- Bank inventory and banker prices: the bot's database (`char`, `slot` and `item`), from the inventory files bankers upload. The page shows the newest upload time.
- Item stats, classes, races and slots: the Project Quarm item DB from github.com/SecretsOTheP/EQMacEmu `utils/sql/database_full`, trimmed once into `data/itemdb.json` and `data/spells.json` by `parse_sql.py` + `make_itemdb.py`. Spot-checked against the P99 wiki: 40 of 40 items matched on every number.
- Icons and Green auctions: the P99 wiki. The web process fetches pages for whatever is in the bank in the background (about 1 request a second, each page refreshed weekly) and keeps them in `cache/` (`bankCacheDir`). Item names map to wiki pages through `src/shared/items.ts`.

## Settings

Set on the Dokku app with `dokku config:set castle-discord-bot ...`:

| Name | What |
|---|---|
| `discordClientSecret` | The Discord application's OAuth2 client secret (with the existing `clientId` and `guildId`). |
| `bankWebRoleId` | The role that may open the bank. |
| `bankWebSessionSecret` | Any long random string; signs the sign-in cookie. |
| `bankWebUrl` | The public address, e.g. `https://bank.172-105-106-208.sslip.io`. Add `<bankWebUrl>/auth/callback` as a redirect in the Discord developer portal. |
| `bankCacheDir` | Optional; where the wiki cache lives. Defaults to `bank/cache`. |

Until the sign-in settings are set, the page says it isn't open yet; the bot itself is unaffected.

## Work on it locally

The page needs the web server for its data. With a database that has bank data in it:

```
npx tsc
DATABASE_URL=... bankWebDevNoAuth=true PORT=5055 node dist/web/server.js
cd bank/web && npm ci && BANK_API=http://localhost:5055 npm run dev
```

`bankWebDevNoAuth` skips sign-in, and only outside production. (Port 5000 is taken by AirPlay on macOS.) `npm run build` in `bank/web` writes `bank/dist/index.html`, which is what the server serves; on deploy the root `yarn build` does this too.

## Refreshing the item DB

Only needed if item data changes upstream:

```
python3 -I scripts/parse_sql.py <quarm dump.sql> items items_raw.json
python3 -I scripts/parse_sql.py <quarm dump.sql> spells_new spells_raw.json
python3 -I scripts/make_itemdb.py items_raw.json spells_raw.json .
```
