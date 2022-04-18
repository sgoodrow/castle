# Castle Discord Bot

## Development

Create a Discord bot and identify a test server. Set these local environment variables in `.env`:

```sh
token="<redacted>" # Bot token
guildId="<redacted>" # Discord ID
clientId="<redacted>" # Bot id
auctionChannelId="<redacted>"
bankerRoleId="<redacted>"
```

Alternatively, check out [the Heroku project settings](https://dashboard.heroku.com/apps/castle-banker-bot/settings).

```sh
yarn install
yarn build
```

## Deploy

```sh
yarn deploy
```
