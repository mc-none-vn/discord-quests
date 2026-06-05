import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'state.json');
const STATE_TMP  = path.join(ROOT, 'state.tmp.json');


// ─── CLI Args ─────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      result[key] = args[i + 1] ?? true;
      i++;
    }
  }
  return result;
}

const args = parseArgs();
const TOKEN = args['token'];
const WEBHOOK = args['webhook'];
const ERR_WEBHOOK = args['error-webhook'];
const PING_ROLE = args['ping-role'];
const LOCALE = args['locale'] ?? 'en';

if (!TOKEN || !WEBHOOK) {
  console.error('❌  --token và --webhook là bắt buộc.');
  process.exit(1);
}


// ─── i18n ─────────────────────────────────────────────────────────────────────
const i18n = {
  vi: {
    newQuest: '🎯 Quest Mới Xuất Hiện!',
    reward: '🎁 Phần thưởng',
    expires: '⏰ Còn lại',
    game: '🎮 Game',
    footer: 'Discord Quest Tracker',
    expired: 'Đã hết hạn',
    days: (d, h) => `${d} ngày ${h} giờ`,
    hours: (h, m) => `${h} giờ ${m} phút`,
    mins: (m)    => `${m} phút`,
    unknown: 'Không xác định',
    noDesc: '*(không có mô tả)*',
  },
  en: {
    newQuest: '🎯 New Quest Available!',
    reward: '🎁 Reward',
    expires: '⏰ Time Left',
    game: '🎮 Game',
    footer: 'Discord Quest Tracker',
    expired: 'Expired',
    days: (d, h) => `${d}d ${h}h`,
    hours: (h, m) => `${h}h ${m}m`,
    mins: (m)    => `${m}m`,
    unknown: 'Unknown',
    noDesc: '*(no description)*',
  },
};
const t = i18n[LOCALE] ?? i18n.en;


// ─── Logging ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function warn(msg) { console.warn(`[${new Date().toISOString()}] ⚠️  ${msg}`); }
function error(msg) { console.error(`[${new Date().toISOString()}] ❌  ${msg}`); }


// ─── State (atomic read/write) ────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    warn(`Không đọc được state: ${e.message} — dùng state trống.`);
  }
  return { sent_ids: [], last_seen: {}, last_check: null };
}

function saveState(state) {
  const data = JSON.stringify(state, null, 2);
  fs.writeFileSync(STATE_TMP, data, 'utf8');
  fs.renameSync(STATE_TMP, STATE_FILE);
}


// ─── Discord API ──────────────────────────────────────────────────────────────
async function fetchQuests() {
  const res = await fetch('https://discord.com/api/v9/quests/@me', {
    headers: {
      Authorization: TOKEN,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'X-Super-Properties': Buffer.from(JSON.stringify({
        os: 'Windows', browser: 'Chrome', device: '',
      })).toString('base64'),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discord API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.quests;
}


// ─── Webhook ──────────────────────────────────────────────────────────────────
async function sendWebhook(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Webhook ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

async function sendErrorNotice(message) {
  if (!ERR_WEBHOOK) return;
  try {
    await sendWebhook(ERR_WEBHOOK, {
      embeds: [{
        title: '❌ Quest Tracker — Lỗi',
        description: `\`\`\`\n${String(message).slice(0, 1800)}\n\`\`\``,
        color: 0xE74C3C,
        timestamp: new Date().toISOString(),
        footer: { text: t.footer },
      }],
    });
  } catch (e) {
    error(`Không gửi được error webhook: ${e.message}`);
  }
}


// ─── Embed Builder ────────────────────────────────────────────────────────────
function formatTimeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return t.expired;

  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);

  if (d > 0) return t.days(d, h);
  if (h > 0) return t.hours(h, m);
  return t.mins(m);
}

function buildQuestEmbed(quest) {
  const cfg = quest.config ?? {};
  const msgs = cfg.messages ?? {};

  const name = msgs.quest_name ?? cfg.application_name ?? quest.label ?? t.unknown;
  const desc = msgs.quest_description ?? t.noDesc;
  const game = cfg.application_name ?? t.unknown;
  const reward = cfg.reward_code ?? t.unknown;
  const expires = cfg.expires_at;

  const fields = [
    { name: t.game, value: game, inline: true },
    { name: t.reward, value: reward, inline: true },
  ];

  if (expires) {
    fields.push({ name: t.expires, value: formatTimeLeft(expires), inline: true });
  }

  return {
    title: `${t.newQuest}`,
    description: `**${name}**\n${desc}`,
    color: 0xF1C40F,
    fields,
    footer: { text: `${t.footer} • ID: ${quest.id}` },
    timestamp: new Date().toISOString(),
  };
}


// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('Đang kiểm tra quests...');
  const state = loadState();

  let quests;
  try {
    quests = await fetchQuests();
  } catch (e) {
    error(`Fetch thất bại: ${e.message}`);
    await sendErrorNotice(e.message);
    process.exit(1);
  }
  log(`Tìm thấy ${quests.length} quest(s) đang hoạt động.`);

  const newQuests = quests.filter(q => !state.sent_ids.includes(q.id));
  if (newQuests.length === 0) {
    log('Không có quest mới. Kết thúc.');
    state.last_check = new Date().toISOString();
    saveState(state);
    return;
  }

  log(`Phát hiện ${newQuests.length} quest mới — đang gửi thông báo...`);
  for (const quest of newQuests) {
    log(quest);
    try {
      const embed = buildQuestEmbed(quest);
      const content = PING_ROLE ? `<@&${PING_ROLE}>` : '';

      await sendWebhook(WEBHOOK, { content, embeds: [embed] });
      state.sent_ids.push(quest.id);
      state.last_seen[quest.id] = new Date().toISOString();
      saveState(state);

      log(`✅ Đã gửi: ${quest.id}`);
      await new Promise(r => setTimeout(r, 1100));

    } catch (e) {
      error(`Gửi quest ${quest.id} thất bại: ${e.message}`);
      await sendErrorNotice(`Quest ${quest.id}: ${e.message}`);
    }
  }

  const activeIds = new Set(quests.map(q => q.id));
  const before = state.sent_ids.length;
  state.sent_ids = state.sent_ids.filter(id => activeIds.has(id));

  for (const id of Object.keys(state.last_seen)) {
    if (!activeIds.has(id)) delete state.last_seen[id];
  }

  if (state.sent_ids.length < before) {
    log(`Đã dọn ${before - state.sent_ids.length} quest hết hạn khỏi state.`);
  }

  state.last_check = new Date().toISOString();
  saveState(state);
  log('Hoàn tất ✨');
}

main().catch(async e => {
  error(e.message);
  await sendErrorNotice(e.stack ?? e.message);
  process.exit(1);
});
