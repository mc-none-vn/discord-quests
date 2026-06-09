<div align="center">

<!-- ![Discord Quests Tracker Background][background] -->
# <sub><img src="assets/quests.png" height="41"></sub> Discord Quest Tracker <sub><img src="assets/quests.png" height="41"></sub>
Automatically tracking Discord Quests then sending notifications to a webhook every 5 minutes only when **a new quest is found**.

</div>

> [!WARNING]
> **discord-quest** is a Discord Quests tracker developed solely for personal educational and monitoring purposes. To fetch current quests, this project requires your Discord user token to access Discord's internal API. Please note that using user tokens or self-bots violates Discord's Terms of Service and **may result in your account being permanently banned**. Use this software entirely at your own risk.

## <div align="left"><sub><img src="assets/projectStructure.png" height="30"></sub> Project Structure </div>
<!-- START_METADATA_DISCORD_QUEST_TREE -->
```
discord-quest/
├── .github/                      ← GitHub Actions config
│   └── workflows/
│       ├── questsTracker.yml
│       └── updateStructure.yml
├── assets/                       ← Assets of system
│   ├── acknowledgements.png
│   ├── disclaimer.png
│   ├── discord.png
│   ├── discordQuests.png
│   ├── empty.png
│   ├── file.png
│   ├── install.webp
│   ├── orbs.png
│   ├── projectStructure.png
│   ├── quests.png
│   └── settings.webp
├── src/                          ← Main
│   ├── languages/                ← Language config
│   │   ├── en-US.json
│   │   └── vi-VN.json
│   ├── generateReadme.js
│   ├── main.js                   ← Main script
│   └── readmeMap.json
├── LICENSE
├── README.md
├── package-lock.json
├── package.json
└── state.json                    ← Atomic write
```
<!-- END_METADATA_DISCORD_QUEST_TREE -->

## <div align="left"><sub><img src="assets/install.webp" height="30"></sub> Installation & Setup </div>

> [!TIP]
> To clone this repository without downloading the hidden asset files, use the **Shallow Clone** command:
> ```bash
> git clone --branch main --single-branch https://github.com/mc-none-vn/discord-quest.git
> ```

### 1. Fork and config
> **Settings** → **Secrets and variables** → **Actions**

#### 1.1. In tab **Secrets** (Click "**New repository secret**"):
| Secret | Description |
|--------|--------------|
| `DISCORD_TOKEN` | Your Discord user token |
| `MAIN_WEBHOOK` | URL of the main webhook for notifications |
| `ERROR_WEBHOOK` | URL of the webhook for error logs (can be left empty) |

#### 1.2. In tab **Variables** (Click "**New repository variable**"):
| Variable | Decription | Value Examples |
|----------|-------|---------------|
| `LOCALE` | Language display for Quest titles/information | `vi-VN`, `en-US`, `zh-CN` |
| `PING_ROLE_ID` | The Discord Role ID you want to ping when a new quest is found | Fill with Role ID (or leave empty) |

### 2. Turn on GitHub Actions
> **Actions** → turn on (only if it's off) → test.

## <div align="left"><sub><img src="assets/settings.webp" height="30"></sub> How It Works? </div>
```
Every 5 minutes
      ↓
Fetch /quests/@me from Discord API
      ↓
Compare with state.json
      ↓
When a new quest is found → Send a notification using webhook
                          → Ping role (if configured)
                          → Save ID in state.json (atomic write)
When no new quest is found → End
      ↓
Commit state.json to repository
```

## <div align="left"><sub><img src="assets/file.png" height="30"></sub> File state.json </div>
This file is automatically managed by the script. You can:
- **Read**: Directly view it on GitHub.
- **Reset**: Delete all IDs inside `sent_ids` → The bot will resend all currently active quests.
- **Delete 1 quest**: Remove a specific ID from `sent_ids` → The bot will resend only that quest.

**Safety mode:** The script writes data to `state.tmp.json` first, then renames it to `state.json`. If an error occurs while running, `state.json` remains intact and your data is safe.

## <div align="left"><sub><img src="assets/acknowledgements.png" height="30"></sub> Acknowledgements </div>
Special thanks to the following repository for inspiring this project:
- [cc-plugins](https://github.com/BachLe2000/cc-plugins/tree/master)

###### <footer><div align="center">© 2026 Mc's Team. All rights reserved.</div></footer>
[background]: assets/discordQuests.png
