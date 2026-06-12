// ─── State (atomic read/write) ────────────────────────────────────────────────
import { STATE_FILE, STATE_TMP } from './config.js';
import { warn } from './logging.js';
import fs from 'fs';

export function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            if (!state.sent_ids || Array.isArray(state.sent_ids)) state.sent_ids = {};
            return state;
        }
    } catch (err) {
        warn(`Không đọc được state: ${err.message} — dùng state trống.`);
    }
    return { sent_ids: {}, last_check: null };
}

export function saveState(state) {
    const data = JSON.stringify(state, null, 2);
    fs.writeFileSync(STATE_TMP, data, 'utf8');
    fs.renameSync(STATE_TMP, STATE_FILE);
}
