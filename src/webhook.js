// ─── Webhook ──────────────────────────────────────────────────────────────────
import { ERR_WEBHOOK, i18n, error } from './main.js'

function withComponentsUrl(url) {
    const u = new URL(url);
    u.searchParams.set('with_components', 'true');
    return u.toString();
}

export async function sendWebhook(url, payload, useComponentsV2 = false) {
    const finalUrl = useComponentsV2 ? withComponentsUrl(url) : url;
    const res = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook ${res.status}: ${await res.text().catch(() => '')}`);
}

export async function sendErrorNotice(message) {
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
