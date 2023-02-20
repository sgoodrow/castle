# Castle Discord Bot [![CI](https://github.com/sgoodrow/castle/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/sgoodrow/castle/actions/workflows/test.yml) [![Release](https://github.com/sgoodrow/castle/actions/workflows/release.yml/badge.svg)](https://github.com/sgoodrow/castle/actions/workflows/release.yml)


## Develop

The codebase is written in TypeScript and uses the `discord.js` package.

Development typically happens in a [Gitpod](https://www.gitpod.io/)-provisioned environment against a Discord test server that has the [appropriate channels and roles set up](./src/config.ts). You can probably use Pumped's test server, just ask him.

### Use the shared bot
1. Join Pumped's test server.
2. Use the [pinned link](https://discord.com/channels/954825353392709682/954825353392709685/966541314063745105) in `#general` to spin up a workspace using the shared development bot.

> Only one developer can use it at a time.

### Use your own bot

1. Join Pumped's test server and ask to be an admin.
2. [Create a bot with administrator permissions](https://discord.com/developers/docs/getting-started) and invite it to Pumped's test server.
3. Generate an [OAuth2 token and client ID](https://www.writebots.com/discord-bot-token/).
4. Create [Gitpod variables](https://gitpod.io/user/variables) for them labeled `token` and `clientID`.
5. Then, [click here to open a Gitpod](https://gitpod.io/#https://github.com/sgoodrow/castle).

> Multiple developers can run development bots at the same time, however you should set a variable named `commandSuffix` to a short unique value so your Discord commands do not conflict.

## Release

This bot is [deployed to Heroku](https://dashboard.heroku.com/apps/castle-banker-bot-prod/settings).

Successful merge into `main` will automatically deploy into production using the [Release](https://github.com/sgoodrow/castle/actions/workflows/release.yml) GitHub action.

If an issue occurs, revert or branch off the last known working commit and manually run the action on that branch.
