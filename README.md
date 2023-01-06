# Castle Discord Bot [![CI](https://github.com/sgoodrow/castle/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/sgoodrow/castle/actions/workflows/test.yml)

## Develop

### Requirements

1. docker
2. docker-compose@2
3. yarn
4. git
5. heroku

### Discord Setup

To develop or deploy, you will need a Discord application, bot, and test server.

1. Follow Discord's [Developer Portal - Getting Started](https://discord.com/developers/docs/getting-started) guide to provision and connect a development bot to a test server.
2. Set the local environment variables described in [`./src/config.ts`](src/config.ts). If you are using Pumped's Test Server, many of the channel and role IDs are pinned in #general.

### Run

```sh
yarn install
yarn dev
```

### Migrations

After mutating the TypeORM entities, you must generate a migration.

```sh
yarn typeorm migration:generate ./src/db/migrations/NAME
```

Migrations are run automatically when deployed to production.

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

This app may be offline to save credits.

### Release

Push the latest app to the production environment.

```sh
yarn release
```
