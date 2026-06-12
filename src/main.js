// ─── Main ─────────────────────────────────────────────────────────────────────
import { fetchQuests, buildQuestEmbed, i18n, log, warn, error, loadState, saveState, sendWebhook, sendErrorNotice } from './module.js';
import { TOKEN, WEBHOOK, PING_ROLE, REPOSITORY, ERR_WEBHOOK, GITHUB_TOKEN } from './config.js';
import { fileURLToPath } from 'url';

if (!TOKEN || !WEBHOOK || !GITHUB_TOKEN || !REPOSITORY) {
    console.error('❌  --token, --webhook, --github-token, --repository là bắt buộc.');
    process.exit(1);
};

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
    if (newQuests.length > 0) {
        newQuests.sort((a, b) => {
            const timeA = new Date(a.config?.starts_at || 0).getTime();
            const timeB = new Date(b.config?.starts_at || 0).getTime();
            return timeA - timeB;
        });
        log('Đã sắp xếp thứ tự Quest: Cũ nhất sẽ được ưu tiên gửi trước.');
    }
    if (newQuests.length === 0) {
        log('Không có quest mới. Tiến hành dọn state hết hạn.');
    } else {
        log('Đang chuẩn bị tài nguyên hình ảnh từ GitHub...');
        let avatarWebhook = await getAttachments('quests.png');
        if (!avatarWebhook) avatarWebhook = await getAttachments('discord.webp');
        const rewardIconUrl = 'https://cdn.discordapp.com/assets/content/fb761d9c206f93cd8c4e7301798abe3f623039a4054f2e7accd019e1bb059fc8.webm';
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
