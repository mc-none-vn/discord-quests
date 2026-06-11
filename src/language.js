// ─── Language Pack Loader ─────────────────────────────────────────────────────
import { LANG_FOLDER, LOCALE, warn } from './main.js';
import path from 'path';
import fs from 'fs';

function loadLanguagePack() {
    const LANG_FILE = path.join(LANG_FOLDER, LOCALE + '.json');
    const LANG_BKP = JSON.parse(fs.readFileSync(path.join(LANG_FOLDER, 'en-US.json'), 'utf8')) || {
        "name": "Quest Tracker",
        "new_quest": "New Quest",
        "quest_id": "Quest ID",
        "quest_info": "Quest Info",
        "duration": "Duration",
        "game": "Game",
        "application": "Application",
        "tasks": "Tasks",
        "task_condition": {
            "or": "User must complete any of the following tasks",
            "and": "User must complete all of the following tasks"
        },
        "rewards_title": "Rewards",
        "rewards": {
            "1": "Reward Code",
            "3": "Collectible",
            "4": "Virtual Currency"
        },
        "sku_id": "SKU ID",
        "platforms": "Redeemable Platforms",
        "reward_type": "Reward Type",
        "reward_name": {
            "normal": "Reward Name",
            "extra": "Nitro"
        },
        "reward_expires": "Expires In",
        "decor_expires": "Decoration Expiry",
        "error_title": "Quest Tracker — Error Notice",
        "error": {
            "new_quest": "*Unknown Quest*",
            "game_name": "*Unknown*",
            "game_publisher": "*Unknown*",
            "reward": "*Unknown*",
            "reward_type": "*Unknown*"
        }
    };

    try {
        if (fs.existsSync(LANG_FILE)) return JSON.parse(fs.readFileSync(LANG_FILE, 'utf8'));
        else return LANG_BKP;

    } catch (err) {
        warn(`Không thể đọc file ${LANG_FILE}.json: ${err.message}. Dùng cấu hình dự phòng.`);
        return LANG_BKP;
    }
}
export const i18n = loadLanguagePack();
