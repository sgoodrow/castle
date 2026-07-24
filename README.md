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
- **EQNotify** - per-user phone notifications (WirePusher / Telegram) for the batphones you care about
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

| Environment Variable  | Purpose                                                        | Features                                  | How to Retrieve                 |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| `castleDkpTokenRO`    | Admin token for making authenticated requests to CastleDKP.com | Discord DKP Auctions, Discord DKP Uploads | Discuss with a Castle Moderator |
| `GOOGLE_CLIENT_EMAIL` | The Google Drive account for accessing guild resources         | Banking, Shared Characters                | Discuss with a Castle Moderator |
| `GOOGLE_PRIVATE_KEY`  | The Google Drive account key for accessing guild resources     | Banking, Shared Characters                | Discuss with a Castle Moderator |
| `TELEGRAM_BOT_TOKEN`  | Bot token from Telegram's @BotFather                           | EQNotify Telegram delivery                | Create a bot via [@BotFather](https://t.me/BotFather) |
| `eqnotifyChannelId`   | [Optional] Channel EQNotify watches; defaults to the batphone channel | EQNotify                           | Any batphone-style channel ID   |

#### 📣 EQNotify

`/eqnotify` lets raiders subscribe to phone notifications for the raid targets they care about. It watches the batphone channel and, for each subscriber whose keyword tags match the batphone (buff / last-hour RTE calls are filtered out), pushes an alert to their phone. Alerts are only delivered to subscribers who **currently hold the Raider role**, so anyone who goes inactive or leaves stops receiving them automatically.

- **Delivery channels**: **WirePusher** (free, Android-only) or **Telegram** (iOS/Android/desktop). Telegram delivery requires `TELEGRAM_BOT_TOKEN`; if unset, only WirePusher is offered.
- **Getting your ID**: WirePusher users use their device ID from the app. Telegram users must **first open the guild's EQNotify bot and send it a message (e.g. `/start`)** — a Telegram bot cannot message a user who hasn't contacted it, so sends fail with `chat not found` until this is done — then register with their numeric chat ID (e.g. from [@userinfobot](https://t.me/userinfobot)).
- **Subcommands**:
  - `/eqnotify register <type> <id>` — sign yourself up (self-service).
  - `/eqnotify unregister` — remove yourself.
  - `/eqnotify add-tag <tag>` / `remove-tag <tag>` / `list-tags` / `clear-tags` — manage your keywords (use `all` to be notified for every batphone).
  - `/eqnotify test` — send yourself a test alert to verify delivery.
  - `/eqnotify add-user <member> <type> <id>` / `remove-user <member>` — Officer/Mod/Knight tools to enroll or remove others.
  - `/eqnotify list-users` — Officer/Mod/Knight tool listing everyone registered, their delivery channel, current Raider status, and tag count.

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

