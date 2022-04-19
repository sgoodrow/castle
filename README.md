# Castle Discord Bot

## Develop

### Requirements

1. docker
2. yarn
3. git
4. heroku

Create a [Discord Application](https://discord.com/developers/applications), bot and test server. Set these local environment variables in `.env`:

```sh
token="<redacted>" # Bot token
guildId="<redacted>" # Discord ID
clientId="<redacted>" # Bot ID
auctionChannelId="<redacted>"
bankerRoleId="<redacted>"
DATABASE_URL="postgresql://postgres:root@localhost:5432/postgres"
```

### Run

```sh
yarn install
yarn dev
```

## Deploy

This bot is deployed to two environments with Heroku:

- [castle-banker-bot-test](https://dashboard.heroku.com/apps/castle-banker-bot-test/settings) - Pumped's test server
- [castle-banker-bot-prod](https://dashboard.heroku.com/apps/castle-banker-bot-prod/settings) - Castle's server

```sh
# Connect git to test environment
heroku git:remote -a castle-banker-bot-test
git remote rename heroku heroku-test

# Connect git to prod environment
heroku git:remote -a castle-banker-bot-prod
git remote rename heroku heroku-prod
```

### UAT

Push the latest app to the test environment for UAT.

```sh
yarn deploy
```

### Release

Push the latest app to the production environment.

```sh
yarn release
```
