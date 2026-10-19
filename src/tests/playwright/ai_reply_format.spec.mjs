/**
 * The online keeper's reply on a phone: the story reads as prose, and its options are the 行动 list
 * in words (phone test 2026-10-19: "ACTION_ORDER：A1 查客厅湿窗帘；A2 …" was shown in the story).
 * The reply goes through the same two functions ai_logic uses; screenshot retained in
 * production/qa/evidence/.
 */
import { test, expect, devices } from '@playwright/test';
import { waitForApp, enterStorySeed, minimalInvestigator } from './helpers.mjs';

const EVIDENCE = '../production/qa/evidence/';
const { defaultBrowserType: _webkit, ...phone } = devices['iPhone 13'];
test.use(phone);

// The reply from the phone screenshot, as the model wrote it.
const PHONE_REPLY = [
    '客厅方向传来窗帘被拖拽的声音，湿布刮过护墙板，一长声，慢慢收住。地砖上的那些砂砾、那道撬痕，你再低头看时，只觉得它们排得杂乱，毫无指向。手电的电池隔着铁壳传来微温，掌心却全是冷的汗。',
    '“谁在那儿？”你压低声音问。',
    '没有人回答。楼梯上方，有什么东西轻轻挪了一步。',
    'ACTION_ORDER：A1 查客厅湿窗帘；A2 侧室书房（需先经客厅）；B1 上楼；C1 绕屋外查井口'
].join('\n\n');

test('the keeper reply shows prose only and lists its options as actions', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_e) { /* ignore */ } });
    await waitForApp(page);
    await enterStorySeed(page, { roster: [minimalInvestigator('Alice')] });
    await page.evaluate(async (raw) => {
        const { formatAssistantDisplay, parseAiActionChoices } = await import('/js/components/chat_format_helpers.mjs');
        const gs = window.CoCStateAccessor.getState().gameState;
        gs.chatHistory.push({ role: 'assistant', content: raw, displayContent: formatAssistantDisplay(raw) });
        gs.aiActionChoices = parseAiActionChoices(raw);
        window.CoCStateAccessor.switchScreen('story');
    }, PHONE_REPLY);

    const bubble = page.getByText('湿布刮过护墙板', { exact: false }).first();
    await expect(bubble).toBeVisible();
    await expect(page.getByText('ACTION_ORDER', { exact: false })).toHaveCount(0);
    await expect(page.getByText('“谁在那儿？”你压低声音问。')).toBeVisible();
    await page.getByText('没有人回答。', { exact: false }).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: EVIDENCE + 'ai-reply-format-2026-10-19-story.png' });

    await page.getByRole('button', { name: /展开行动列表/ }).click();
    const items = page.getByRole('menu').getByRole('menuitem');
    await expect(items).toHaveText(['查客厅湿窗帘', '侧室书房（需先经客厅）', '上楼', '绕屋外查井口']);
    await page.screenshot({ path: EVIDENCE + 'ai-reply-format-2026-10-19-actions.png' });
});
