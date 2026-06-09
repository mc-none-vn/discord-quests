import { fileURLToPath } from 'url';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'state.json');
const STATE_TMP = path.join(ROOT, 'state.tmp.json');
const LANG_FOLDER = path.join(__dirname, 'languages');


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
const i18n = loadLanguagePack();


// ─── State (atomic read/write) ────────────────────────────────────────────────
function loadState() {
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
    const githubUrl = `https://raw.githubusercontent.com/${REPOSITORY}/refs/heads/assets/${path}`;
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
    const timestamp = Math.floor(d.getTime() / 1000);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `<t:${timestamp}:d>`;
};

function getReward(reward, rewardName) {
    let extraReward = ''; if (reward?.type === 4 && reward?.premium_orb_quantity) {
        const normalOrbs = String(reward?.orb_quantity || '');
        const premiumOrbs = String(reward?.premium_orb_quantity || '');
        extraReward = `\n**${i18n.reward_name.extra}:** ${String(rewardName).replace(normalQty, premiumQty)}`;
    }; let expires = ''; if (reward?.type === 3 && reward?.expires_at) expires = `\n**${i18n.decor_expires}:** ${formatDate(reward?.expires_at)}`;

    const keyword = Object.keys(i18n.rewards).find(key => reward?.type == key);
    return { rewardType: i18n.rewards[String(keyword)] || i18n.error.reward_type, extraReward, expires };
}

async function buildQuestEmbed(content, quest, assets) {
    const config = quest.config;
    if (!config) return null;

    const embed = []; const subComponents = []; if (content) subComponents.push({ type: 10, content });
    const durationStr = `${formatDate(config.starts_at)} - ${formatDate(config.expires_at)}`;
    let videoUrl; const taskList = Object.values(config.task_config_v2?.tasks || {}).map(task => {
        const minutes = task.target ? task.target / 60 : 0;
        const taskName = task.type
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/^\w/, c => c.toUpperCase());

        try {
            for (const type of ['video', 'video_low_res', 'video_hls']) {
                videoUrl = task.assets[type].url; if (videoUrl) break;
            };
        } catch { }; return `* ${taskName} (${minutes} minutes)`;
    }).join('\n');
    const task_condition = config.task_config_v2?.join_operator || "or";

    const primaryReward = config.rewards_config?.rewards?.[0];
    const rewardName = primaryReward?.messages?.name || i18n.error.reward;
    const rewardExpires = `${formatDate(config.rewards_config?.rewards_expire_at)}`;
    const skuId = primaryReward?.sku_id || '';
    const rewards = getReward(primaryReward, rewardName);
    const rewardType = rewards?.rewardType;
    const extraReward = rewards?.extraReward;
    const decorExpires = rewards?.expires;

    const questName = config.messages?.quest_name || i18n.error.new_quest;
    const gameTitle = config.messages?.game_title || i18n.error.game_name;
    const gamePublisher = config.messages?.game_publisher || i18n.error.game_publisher;

    const questId = quest.id || '';
    const questLink = `https://canary.discord.com/quests/${questId}`;

    const applicationLink = config.application?.link || questLink || 'https://discord.com';
    const applicationName = config.application?.name || '';
    const applicationId = config.application?.id || '';

    const CDN_BASE = 'https://cdn.discordapp.com/';
    const heroUrl = config.assets?.hero ? `${CDN_BASE}${config.assets.hero}` : assets.discordQuests;
    let currentRewardIcon = assets.rewardIconUrl;
    if (!rewardName.toLowerCase().includes('orb')) currentRewardIcon = (CDN_BASE + primaryReward?.asset) || assets.emptyIconUrl;

    subComponents.push({
        type: 10,
        content: `# ${i18n.new_quest} - [${questName}](${questLink})`
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
        content: `**${i18n.duration}:** ${durationStr}\n**${i18n.game}:** ${gameTitle} (${gamePublisher})\n**${i18n.application}:** [${applicationName}](${applicationLink}) (\`${applicationId}\`)`
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
            type: 10, content: `## ${i18n.rewards_title}`
        }, {
            type: 10,
            content: `**${i18n.reward_type}:** ${rewardType}${decorExpires}\n**${i18n.sku_id}:** \`${skuId}\`\n**${i18n.reward_name.normal}:** ${rewardName}${extraReward}\n**${i18n.reward_expires}:** ${rewardExpires}`
        }],
        accessory: {
            type: 11,
            media: { url: currentRewardIcon }
        }
    });

    if (videoUrl) subComponents.push({
        type: 14, divider: true, spacing: 1
    }, {
        type: 12,
        items: [{
            media: { url: videoUrl },
            description: applicationName
        }]
    });

    subComponents.push({
        type: 14, divider: true, spacing: 1
    }, {
        type: 10,
        content: `${i18n.quest_id}: \`${questId}\``
    });
    embed.push({
        type: 17,
        components: subComponents
    });
    return {
        flags: 1 << 15,
        username: i18n.name,
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
    const now = new Date();
    const newQuests = quests.filter(q => {
        const hasConfig = q.config && q.config.expires_at;
        const isNew = !state.sent_ids[q.id];
        const isNotExpired = hasConfig ? new Date(q.config.expires_at) > now : false;
        return isNew && isNotExpired;
    });
    if (newQuests.length === 0) {
        log('Không có quest mới. Tiến hành dọn state hết hạn.');
    } else {
        log('Đang chuẩn bị tài nguyên hình ảnh từ GitHub...');
        let avatarWebhook = await getAttachments('quests.png');
        if (!avatarWebhook) avatarWebhook = await getAttachments('discord.webp');
        const rewardIconUrl = await getAttachments('orbs.png');
        const emptyIconUrl = await getAttachments('empty.png');
        const discordQuests = await getAttachments('discord_quests.webp');
        const globalAssets = { avatarWebhook, rewardIconUrl, emptyIconUrl, discordQuests };

        log(`Phát hiện ${newQuests.length} quest mới — đang gửi thông báo...`);
        for (const quest of newQuests) {
            try {
                const content = PING_ROLE ? `<@&${PING_ROLE}>` : '';
                const embed = await buildQuestEmbed(content, quest, globalAssets);
                await sendWebhook(WEBHOOK, embed, true);

                const expiresAt = quest.config?.rewards_config?.rewards_expire_at || quest.config?.expires_at || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
                state.sent_ids[quest.id] = {
                    starts_at: quest.config?.starts_at || new Date().toISOString(),
                    expires_at: expiresAt,
                    sent_at: new Date().toISOString()
                };

                log(`✅ Đã gửi: ${quest.id}`);
                await new Promise(r => setTimeout(r, 1100));

            } catch (err) {
                error(`Gửi quest ${quest.id} thất bại: ${err.message}`);
                await sendErrorNotice(`Quest ${quest.id}: ${err.message}`);
            }
        }
        saveState(state);
    }

    log('Đang xử lý các quest hết hạn trong state.json...');
    let deletedCount = 0;
    for (const id of Object.keys(state.sent_ids)) {
        const questData = state.sent_ids[id];
        const expireTime = new Date(questData.expires_at || questData);
        if (expireTime < now) { delete state.sent_ids[id]; deletedCount++; };
    }
    if (deletedCount > 0) log(`♻️ Đã dọn dẹp thành công ${deletedCount} quest(s) đã hết hạn khỏi state.json.`);
    else log(`🛑 Không có quest(s) nào hết hạn cần dọn dẹp.`)

    state.last_check = new Date().toISOString();
    saveState(state);
    log('Hoàn tất ✨');
}

main().catch(async err => {
    error(err.message);
    await sendErrorNotice(err.stack ?? err.message);
    process.exit(1);
});
