# 🤖 Castle Steward [![CI](https://github.com/sgoodrow/castle/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/sgoodrow/castle/actions/workflows/test.yml) [![Release](https://github.com/sgoodrow/castle/actions/workflows/release.yml/badge.svg)](https://github.com/sgoodrow/castle/actions/workflows/release.yml)

## ✨ Features

Provides various features for the Castle EverQuest guild's Discord server.

- **Volunteer Applications** - list of Castle jobs and how to apply for them
- **Raid Schedule** - summarize upcoming Discord raid events
- **EQ DKP Plus Raid Import** - upload raids to an EQ DKP Plus instance
- **EQ DKP Plus Raid Bonuses** - create bonuse raids in an EQ DKP Plus instance
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

### 🔼 Secret-dependent Features

Some features required secrets, such as to connect to CastleDKP.com or the Castle Google account. This connectivity is enabled by the following configuration variables, and if they are not set, some features will be disabled or not work.

| Environment Variable | Purpose                                                        | Features                                  | How to Retrieve                 |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| `castleDkpTokenRO`   | Admin token for making authenticated requests to CastleDKP.com | Discord DKP Auctions, Discord DKP Uploads | Discuss with a Castle Moderator |
| `GOOGLE_PRIVATE_KEY` | The Google Drive account key for accessing guild resources     | Banking, Shared Characters                | Discuss with a Castle Moderator |

### ⏺️ Local

If you don't want to use a Gitpod (or have run out of credits 😅), extract the environment variables from [`.gitpod.yml`](./.gitpod.yml) into a local `.env` file. This will be loaded by dotenv. You will also need to include the environment variables not present in the `.gitpod.yml` file, described above.

## 🚀 Release (Dokku)

This bot is deployed to a [Dokku](https://dokku.com/docs/) instance running on Linode with the application name `castle-discord-bot`.

**Automatic deployment is configured on a push to the 'dokku' branch in github.**

With appropriate SSH access, Dokku can be managed through the CLI at:

`ssh -t dokku@172.105.106.208 "help"` - Specify the "castle-discord-bot" application in your commands.

**Dokku logs** can be tailed with:

`ssh -t dokku@172.105.106.208 "logs castle-discord-bot -t"`

**Environment variables** are set in Dokku with:

`ssh -t dokku@172.105.106.208 'config:set castle-discord-bot VAR="Value" VAR2="Val2'`

`update-dokku-env.sh` can be used to update the full castle-discord-bot Dokku config from a local .env file.
