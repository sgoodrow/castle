# 🤖 Castle Steward [![CI](https://github.com/sgoodrow/castle/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/sgoodrow/castle/actions/workflows/test.yml) [![Release](https://github.com/sgoodrow/castle/actions/workflows/release.yml/badge.svg)](https://github.com/sgoodrow/castle/actions/workflows/release.yml)

## ✨ Features

Provides various features for the Castle EverQuest guild's Discord server.

- **Volunteer Applications** - list of Castle jobs and how to apply for them
- **Raid Schedule** - summarize upcoming Discord raid events
- **EQ DKP Plus** - upload raids to an EQ DKP Plus instance
- **Banking** - bank instructions and management tools
- **Jewelry** - jewerly instructions and management tools
- **Auctions** - commands to create and complete DKP auctions
- **Orientation** - welcome instructions and access provisioning
- **Invites** - invite list and management tools
- **Raid Enlistment** - raid instructions and enlistment tools
- **Monitoring** - player departures, application requests, etc.
- **Utilities** - silently add roles to threads

## 💻 Develop

The codebase is written in TypeScript and uses `discord.js`.

Development typically happens in a [Gitpod](https://www.gitpod.io/)-provisioned environment against a Discord test server that has the [appropriate channels and roles set up](./src/config.ts). You can probably use Pumped's test server, just ask him.

> **Note:** Some features are disabled if the appropriate environment variables are not set. These are detailed in [Optional Features](#optional-features)

### ⏩ Use the shared bot

1. Join Pumped's test server.
2. Use the [pinned link](https://discord.com/channels/954825353392709682/954825353392709685/966541314063745105) in `#general` to spin up a workspace using the shared development bot.

> Only one developer can use it at a time.

### ▶️ Use your own bot

1. Join Pumped's test server and ask to be an admin.
2. [Create a bot with administrator permissions](https://discord.com/developers/docs/getting-started) and invite it to Pumped's test server.
3. Generate an [OAuth2 token and client ID](https://www.writebots.com/discord-bot-token/).
4. Create [Gitpod variables](https://gitpod.io/user/variables) for them labeled `token` and `clientID`.
5. Then, [click here to open a Gitpod](https://gitpod.io/#https://github.com/sgoodrow/castle).

> Multiple developers can run development bots at the same time, however you should set a variable named `commandSuffix` to a short unique value so your Discord commands do not conflict.

### 🔼 Optional Features

Some features connect to CastleDKP.com and manipulate DKP values. This connectivity is enabled by the following configuration variables, and if they are not set, the features will not work.

| Environment Variable     | Purpose                                                              | Features                                  | How to Retrieve                    |
| ------------------------ | -------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| `castleDkpTokenRO`       | Admin token for making authenticated requests to CastleDKP.com       | Discord DKP Auctions, Discord DKP Uploads | Discuss with a CastleDKP.com Admin |
| `castleDkpAuctionRaidID` | The ID of the current raid to upload Discord DKP auction results to. | Discord DKP Auctions                      | Discuss with a Castle DKP Deputy   |

### ⏺️ Local

If you don't want to use a Gitpod (or have run out of credits 😅), extract the environment variables from [`.gitpod.yml`](./.gitpod.yml) into a local `.env` file. This will be loaded by dotenv. You will also need to include the environment variables not present in the `.gitpod.yml` file, described above.

## 🚀 Release

This bot is [deployed to Heroku](https://dashboard.heroku.com/apps/castle-banker-bot-prod/settings).

Successful merge into `main` will automatically deploy into production using the [Release](https://github.com/sgoodrow/castle/actions/workflows/release.yml) GitHub action.

If an issue occurs, revert or branch off the last known working commit and manually run the action on that branch.
