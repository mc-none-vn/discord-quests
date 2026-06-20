<div align="center">

<!-- ![Discord Quests Tracker Background][background] -->
# <sub><img src="https://raw.githubusercontent.com/mc-none-vn/discord-quests/refs/heads/assets/quests.png" height="41"></sub> Discord Quests Tracker <sub><img src="https://raw.githubusercontent.com/mc-none-vn/discord-quests/refs/heads/assets/quests.png" height="41"></sub>
Automatically tracking Discord Quests then sending notifications to a webhook every 5 minutes only when **a new quest is found**.

</div>

> [!WARNING]
> **discord-quests** is a Discord Quests tracker developed solely for personal educational and monitoring purposes. To fetch current quests, thisproject requires your Discord user token to access Discord's internal API. Please note that using user tokens or self-bots violates Discord's Terms of Service and **may result in your account being permanently banned**. Use this software entirely at your own risk.

---

# <div align="left"><sub><img src="https://raw.githubusercontent.com/mc-none-vn/discord-quests/refs/heads/assets/projectStructure.png" height="30"></sub> Project Structure </div>
<!-- START_METADATA_DISCORD_QUEST_TREE -->
```
discord-quests/
├── .github/                      ← GitHub Actions config
│   └── workflows/
│       ├── questsTracker.yml
│       └── updateStructure.yml
├── src/                          ← Main folder
│   ├── languages/                ← Language config
│   │   ├── en-US.json
│   │   └── vi-VN.json
│   ├── config.js
│   ├── discord.js
│   ├── embed.js
│   ├── generateReadme.js
│   ├── language.js
│   ├── logging.js
│   ├── main.js                   ← Main script
│   ├── module.js
│   ├── readmeMap.json
│   ├── readmeSource.md
│   ├── state.js
│   └── webhook.js
├── .env.example                  ← For local hosting
├── .gitignore
├── LICENSE
├── README.md
├── package-lock.json
├── package.json
└── state.json                    ← Atomic write
```
<!-- END_METADATA_DISCORD_QUEST_TREE -->

---

# <div align="left"><sub><img src="https://raw.githubusercontent.com/mc-none-vn/discord-quests/refs/heads/assets/install.webp" height="30"></sub> Installation & Setup </div>
Choose one of the two deployment methods below to host your tracker:

## Method 1: Running on GitHub Actions (Cloud 24/7 & Free)
### 1. Fork and config
Go to your forked repository: **Settings** → **Secrets and variables** → **Actions**

* **In tab Secrets** (Click "**New repository secret**"):
  | Secret | Description |
  |--------|--------------|
  | `DISCORD_TOKEN` | Your Discord user token |
  | `MAIN_WEBHOOK` | URL of the main webhook for notifications |
  | `ERROR_WEBHOOK` | URL of the webhook for error logs (can be left empty) |

* **In tab Variables** (Click "**New repository variable**"):
  | Variable | Description | Value Examples |
  |----------|-------------|---------------|
  | `LOCALE` | Language display for Quest titles/information | `vi-VN`, `en-US`, `zh-CN` |
  | `PING_ROLE_ID` | The Discord Role ID you want to ping when a new quest is found | Fill with Role ID (or leave empty) |

### 2. Turn on GitHub Actions
Go to tab **Actions** → turn on (if it's off) → Select **Discord Quest Tracker** workflow → Click **Run workflow** to start tracking.

## Method 2: Running on Localhost / VPS (Self-Hosted)
> [!TIP]
> To clone this repository without downloading the hidden asset files, use the **Shallow Clone** command:
> ```bash
> git clone --branch main --single-branch https://github.com/mc-none-vn/discord-quest.git
> ```

### 1. Install Dependencies
Make sure you have [Node.js](https://nodejs.org/) (v20 or higher) installed. Run the following command in your terminal:
> ```bash
> npm install
> ```

### 2. Environment Configuration
Create a `.env` file in the root directory by copying the example file:
> ```bash
> cp .env.example .env
> ```
Open `.env` and fill in your credentials:
> ```env
> DISCORD_TOKEN="YOUR_DISCORD_TOKEN"                                         # Required
> MAIN_WEBHOOK="https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN"   # Required
> ERROR_WEBHOOK="https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN"  # Optional
> GITHUB_TOKEN="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  # Required
> REPOSITORY="YOUR_NAME/YOUR_REPO_NAME"                    # Required
> PING_ROLE_ID=""  # Optional
> LOCALE="en-US"   # e.g., en-US, vi-VN
> ```

### 3. Start the Tracker
To execute the tracker script directly, run:
> ```bash
> node src/main.js
> ```

> [!NOTE]
> To repeat the task every 5 minutes on your local system or VPS, it is recommended to use a process manager like **PM2** or configure a system **crontab**.

---

# <div align="left"><sub><img src="https://raw.githubusercontent.com/mc-none-vn/discord-quests/refs/heads/assets/settings.webp" height="30"></sub> How It Works? </div>
```
Every 5 minutes (via GitHub Actions Loop or Local Task)
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
  Save & Sync state.json (Commit back to Repo or Local disk)
```
---

# <div align="left"><sub><img src="https://raw.githubusercontent.com/mc-none-vn/discord-quests/refs/heads/assets/file.png" height="30"></sub> File state.json </div>
This file is automatically managed by the script. You can:
- **Read**: Directly view it on GitHub or local storage.
- **Reset**: Delete all IDs inside `sent_ids` → The bot will resend all currently active quests.
- **Delete 1 quest**: Remove a specific ID from `sent_ids` → The bot will resend only that quest.
**Safety mode:** The script writes data to `state.tmp.json` first, then renames it to `state.json`. If an error occurs while running, `state.json` remains intact and your data is safe.

---

# <div align="left"><sub><img src="https://raw.githubusercontent.com/mc-none-vn/discord-quests/refs/heads/assets/acknowledgements.png" height="30"></sub> Acknowledgements </div>
Special thanks to the following repository for inspiring this project:
- [cc-plugins](https://github.com/BachLe2000/cc-plugins/tree/master)

---

###### <footer><div align="center"> [© 2026 Mc's Team. All rights reserved.](?tab=AGPL-3.0-1-ov-file) </div></footer>

<!-- README_VARIABLES -->
[background]: https://raw.githubusercontent.com/mc-none-vn/discord-quests/refs/heads/assets/discordQuests.png
