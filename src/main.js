import { fileURLToPath } from 'url';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'state.json');
const STATE_TMP = path.join(ROOT, 'state.tmp.json');
const LANG_FILE = path.join(__dirname, 'language.json');


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
const PING_ROLE = args['ping-role'];
const REPOSITORY = args['repository'];
const ERR_WEBHOOK = args['error-webhook'];
const GITHUB_TOKEN = args['github-token'];
const LOCALE = args['locale'] || 'en-US';

if (!TOKEN || !WEBHOOK || !GITHUB_TOKEN || !REPOSITORY) {
  console.error('❌  --token, --webhook, --github-token, --repository là bắt buộc.');
  process.exit(1);
};


// ─── Logging ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function warn(msg) { console.warn(`[${new Date().toISOString()}] ⚠️  ${msg}`); }
function error(msg) { console.error(`[${new Date().toISOString()}] ❌  ${msg}`); }


// ─── Language Pack Loader ─────────────────────────────────────────────────────
function loadLanguagePack() {
  try {
    if (fs.existsSync(LANG_FILE)) {
      const allLangs = JSON.parse(fs.readFileSync(LANG_FILE, 'utf8'));
      return allLangs[LOCALE] || allLangs['en-US'];
    }
  } catch (err) { warn(`Không thể đọc file language.json: ${err.message}. Dùng cấu hình dự phòng.`); }

  return {
    new_quest: "New Quest", quest_info: "Quest Info", duration: "Duration",
    platforms: "Redeemable Platforms", game: "Game", application: "Application",
    tasks: "Tasks", task_condition: "User must complete any of the following tasks",
    rewards: "Rewards", reward_type: "Reward Type", reward_name: "Name",
    orbs_amount: "Orbs Amount", error_title: "Quest Tracker — Error"
  };
}
const i18n = loadLanguagePack();


// ─── State (atomic read/write) ────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (err) {
    warn(`Không đọc được state: ${err.message} — dùng state trống.`);
  }
  return { sent_ids: [], last_seen: {}, last_check: null };
}

function saveState(state) {
  const data = JSON.stringify(state, null, 2);
  fs.writeFileSync(STATE_TMP, data, 'utf8');
  fs.renameSync(STATE_TMP, STATE_FILE);
};


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
};


// ─── Webhook ──────────────────────────────────────────────────────────────────
function withComponentsUrl(url) {
  const u = new URL(url);
  u.searchParams.set('with_components', 'true');
  return u.toString();
}

async function sendWebhook(url, payload, useComponentsV2 = false) {
  const finalUrl = useComponentsV2 ? withComponentsUrl(url) : url;
  const res = await fetch(finalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error(JSON.stringify(payload));
  if (!res.ok) throw new Error(`Webhook ${res.status}: ${await res.text().catch(() => '')}`);
}

async function sendErrorNotice(message) {
  if (!ERR_WEBHOOK) return;
  try {
    await sendWebhook(ERR_WEBHOOK, {
      embeds: [{
        title: `❌ ${i18n.error_title}`,
        description: `\`\`\`\n${String(message).slice(0, 1800)}\n\`\`\``,
        color: 0xE74C3C,
        timestamp: new Date().toISOString(),
        footer: { text: 'Discord Quest Tracker' },
      }],
    });
  } catch (err) { error(`Không gửi được error webhook: ${err.message}`); }
};


// ─── Embed Builder ────────────────────────────────────────────────────────────
const getAttachments = async (path) => {
  const githubUrl = `https://raw.githubusercontent.com/${REPOSITORY}/refs/heads/main/${path}`;
  try {
    // const response = await fetch(githubUrl, {
    //   headers: {
    //     'Authorization': `token ${GITHUB_TOKEN}`,
    //     'Accept': 'application/vnd.github.v3.raw'
    //   }
    // });
    // if (!response.ok) {
    //   error(`Không tìm thấy ảnh trên GitHub (Status: ${response.status})`);
    //   return null;
    // }

    // const arrayBuffer = await response.arrayBuffer();
    // const buffer = Buffer.from(arrayBuffer);
    // const base64Image = buffer.toString('base64');
    // const contentType = path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    // return `data:${contentType};base64,${base64Image}`;
    const response = new URL(githubUrl);
    response.searchParams.append('uuid', crypto.randomUUID());
    return response.href;

  } catch (err) {
    error(`Lỗi hệ thống khi lấy attachments: ${err.message}`);
    return null;
  }
};

const formatDate = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

async function buildQuestEmbed(content, quest, assets) {
  const config = quest.config;
  if (!config) return null;

  const embed = []; const subComponents = []; if (content) subComponents.push({ type: 10, content });
  const durationStr = `${formatDate(config.starts_at)} - ${formatDate(config.expires_at)}`;
  const taskList = Object.values(config.task_config_v2?.tasks || {}).map(task => {
    const minutes = task.target ? task.target / 60 : 0;
    const taskName = task.type
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
    
    return `* ${taskName} (${minutes} minutes)`;
  }).join('\n');
  const task_condition = config.task_config_v2?.join_operator || "or";

  const primaryReward = config.rewards_config?.rewards?.[0];
  const rewardName = primaryReward?.messages?.name || "Unknown Reward";
  let currentRewardIcon = assets.rewardIconUrl;
  const skuId = primaryReward?.sku_id || "";

  const questName = config.messages?.quest_name || "New Quest";
  const gameTitle = config.messages?.game_title || "Unknown Game";
  const gamePublisher = config.messages?.game_publisher || "Unknown Publisher";
  const applicationId = config.application?.id || "";
  const questId = quest.id || "";

  const CDN_BASE = "https://cdn.discordapp.com/";
  const heroUrl = config.assets?.hero ? `${CDN_BASE}${config.assets.hero}` : assets.discordQuests;
  if (!rewardName.toLowerCase().includes('orb')) currentRewardIcon = (CDN_BASE + primaryReward?.asset) || assets.emptyIconUrl;

  subComponents.push({
    type: 10,
    content: `# ${i18n.new_quest} - [${questName}](${config.application?.link || 'https://discord.com'})`
  }, {
    type: 12,
    items: [{
      media: { url: heroUrl },
      description: questName
    }]
  }, {
    type: 14, divider: true, spacing: 1 
  }, {
    type: 10,
    content: `## ${i18n.quest_info}`
  }, {
    type: 10,
    content: `**${i18n.duration}:** \`${durationStr}\`\n**${i18n.game}:** ${gameTitle} (${gamePublisher})\n**${i18n.application}:** [${gameTitle.toUpperCase()}](${config.application?.link || '#'}) ( \`${applicationId}\` )`
  }, {
    type: 14, divider: true, spacing: 1 
  }, {
    type: 10,
    content: `## ${i18n.tasks}`
  }, {
    type: 10,
    content: `${i18n.task_condition[task_condition]}\n${taskList}`
  }, {
    type: 14, divider: true, spacing: 1
  }, {
    type: 9,
    components: [{
      type: 10, content: `## ${i18n.rewards}`
    }, { 
      type: 10, 
      content: `**SKU ID:** \`${skuId}\`\n**${i18n.reward_name}:** ${rewardName}` 
    }],
    accessory: {
      type: 11, 
      media: { url: currentRewardIcon }
    }
  }, {
    type: 14, divider: true, spacing: 1
  }, {
    type: 10,
    content: `Quest ID: \`${questId}\``
  });

  embed.push({
      type: 17,
      components: subComponents
  });
  return {
    flags: 1 << 15,
    username: "Quests",
    components: embed,
    avatar_url: assets.avatarWebhook
  };
}


// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('Đang kiểm tra quests...');
  const state = loadState();
  let quests;
  try {
    quests = await fetchQuests();
  } catch (err) {
    error(`Fetch thất bại: ${err.message}`);
    await sendErrorNotice(err.message);
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

  log('Đang chuẩn bị tài nguyên hình ảnh từ GitHub...');
  let avatarWebhook = await getAttachments('assets/quests.webp');
  if (!avatarWebhook) avatarWebhook = await getAttachments('assets/discord.webp');
  const rewardIconUrl = await getAttachments('assets/orbs.png');
  const emptyIconUrl = await getAttachments('assets/empty.png');
  const discordQuests = await getAttachments('assets/discord_quests.webp');
  const globalAssets = {
    avatarWebhook,
    rewardIconUrl,
    emptyIconUrl,
    discordQuests
  };

  log(`Phát hiện ${newQuests.length} quest mới — đang gửi thông báo...`);
  for (const quest of newQuests) {
    try {
      const content = PING_ROLE ? `<@&${PING_ROLE}>` : '';
      const embed = await buildQuestEmbed(content, quest, globalAssets);

      await sendWebhook(WEBHOOK, embed, true);
      state.sent_ids.push(quest.id);
      state.last_seen[quest.id] = new Date().toISOString();
      saveState(state);

      log(`✅ Đã gửi: ${quest.id}`);
      await new Promise(r => setTimeout(r, 1100));

    } catch (err) {
      error(`Gửi quest ${quest.id} thất bại: ${err.message}`);
      await sendErrorNotice(`Quest ${quest.id}: ${err.message}`);
    }
  }

  const activeIds = new Set(quests.map(q => q.id));
  const before = state.sent_ids.length;
  state.sent_ids = state.sent_ids.filter(id => activeIds.has(id));

  for (const id of Object.keys(state.last_seen)) {
    if (!activeIds.has(id)) delete state.last_seen[id];
  }

  if (state.sent_ids.length < before) log(`Đã dọn ${before - state.sent_ids.length} quest hết hạn khỏi state.`);
  state.last_check = new Date().toISOString();
  saveState(state);
  log('Hoàn tất ✨');
}

main().catch(async err => {
  error(err.message);
  await sendErrorNotice(err.stack ?? err.message);
  process.exit(1);
});
