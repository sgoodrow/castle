# Castle Discord Bot

## Develop

### Requirements

1. docker
2. yarn
3. git
4. heroku

Create a [Discord Application](https://discord.com/developers/applications), bot and test server. You can reuse an existing test server if you are an admin there. Set these local environment variables in `.env`:

```sh
token="BOT_TOKEN"
clientId="OAUTH2_CLIENT_ID"
# Pinned in Pumped's test server
guildId="DISCORD_SERVER_ID"
auctionChannelId="DISCORD_AUCTION_CHANNEL_ID"
bankerRoleId="DISCORD_BANKER_ROLE_ID"
bankRequestsChannelId="DISCORD_BANK_REQUESTS_CHANNEL_ID"
DATABASE_URL="postgresql://admin:password@localhost:5432/castle"
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

To deploy to these environments, you will need to be a member of the Heroku app.

```sh
# Connect git to test environment
heroku git:remote -a castle-banker-bot-test
git remote rename heroku heroku-test

# Connect git to prod environment
heroku git:remote -a castle-banker-bot-prod
git remote rename heroku heroku-prod
```

### UAT

Push the latest app to the test environment.

```sh
yarn deploy
```

### Release

Push the latest app to the production environment.

```sh
yarn release
```
