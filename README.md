# <p align="center"><b style="font-size: 20px; vertical-align: middle;;">Discord Quest Tracker</b></p>
Automaticly tracking Discord Quests then send notification to webhook after every 5 minutes only when **it see new quest**.

## ⚠️ Disclaimer
Discord-quest just created for use by yourself and this project using your token discord to working clearly. So, that why you can get ban by discord because of using token user. **Use at your own risk.**

## 📂 Project Structure
<!-- START_METADATA_DISCORD_QUEST_TREE -->
```
discord-quest/
├── .github/                       ← GitHub Actions config
│   └── workflows/
│       ├── tracker.yml
│       └── update-structure.yml
├── assets/                        ← Assets of system
│   ├── discord_quests.webp
│   ├── discord.webp
│   ├── empty.png
│   ├── orbs.png
│   └── quests.png
├── src/                           ← Main
│   ├── languages/                 ← Language config
│   │   ├── en-US.json
│   │   └── vi-VN.json
│   ├── generate-readme.js
│   ├── main.js                    ← Main script
│   └── readme_map.json
├── package.json
├── README.md
└── state.json                     ← Atomic write
```
<!-- END_METADATA_DISCORD_QUEST_TREE -->

## 🛠️ Installation & Setup
### 1. Fork and config
> **Settings → Secrets and variables → Actions**

#### 1.1. In tab Secrets (Click "New repository secret"):
| Secret | Descriptions |
|--------|--------------|
| `DISCORD_TOKEN` | User token Discord |
| `MAIN_WEBHOOK` | URL webhook main notification |
| `ERROR_WEBHOOK` | URL webhook main errors log (it can be empty if you want) |

#### 1.2. In tab Variables (Click "New repository variable"):
| Variable | Decriptions | value examples |
|----------|-------|---------------|
| `LOCALE` | Language display titles/information of Quest | `vi-VN`, `en-US`, `zh-CN` |
| `PING_ROLE_ID` | ID role Discord you want to ping when it find a quest | fill with ID Role (or empty) |

### 2. Turn on GitHub Actions
> **Actions** → turn on (only if it's off) → test.

## ⚙️ How It Works?
```
Every 5 minutes
      ↓
Fetch /quests/@me from Discord API
      ↓
Compare with state.json
      ↓
When it has found new quest → Send embed using webhook
                            → Ping role (if so)
                            → Save ID in state.json (atomic)
When it hasn't found → End
      ↓
Commit state.json to repository
```

## 📦 File state.json
Those files will be manage by bot. You can:
- **Read**: using GitHub
- **Reset**: delete all `sent_ids` → bot resend all present quest
- **Delete 1 quest**: delete ID out of `sent_ids` → bot resend that quest

**Safety mode:** script write to `state.tmp.json` first, then rename to `state.json`. If errors when it's still running → `state.json` still here, datas still fine.

## 🤝 Acknowledgements
Thank for this source give our a idea to create this repository:
- [cc-plugins](https://github.com/BachLe2000/cc-plugins/tree/master)

#### <footer><div align="center">© 2026 Mc's Team. All rights reserved.</div></footer>
