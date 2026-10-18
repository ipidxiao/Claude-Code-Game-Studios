/**
 * The 行动 button opens a list of actions (author, 2026-10-18: the quarter-circle fan was replaced
 * by a menu-level list), and an ending names itself instead of showing the developer replay.
 * Phone viewport; screenshots retained in production/qa/evidence/.
 */
import { test, expect, devices } from '@playwright/test';
import { waitForApp, enterStorySeed, minimalInvestigator } from './helpers.mjs';

const EVIDENCE = '../production/qa/evidence/';

// iPhone 13 size and touch, on the project's Chromium (the device preset would pick WebKit).
const { defaultBrowserType: _webkit, ...phone } = devices['iPhone 13'];
test.use(phone);

test.describe('action list and ending on a phone', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { try { localStorage.clear(); } catch (_e) { /* ignore */ } });
        await waitForApp(page);
        await enterStorySeed(page, { roster: [minimalInvestigator('Alice')] });
        await page.evaluate(async () => {
            const m = await import('/js/scenario/ensure_runner.mjs');
            await m.startScenarioById('tutorial');
            window.CoCStateAccessor.switchScreen('story');
        });
    });

    test('行动 lists every choice in full and picking one advances the story', async ({ page }) => {
        const choices = await page.evaluate(() => window.CoCStateAccessor.getState().gameState.scenarioRunner.choices.map((c) => c.label));
        expect(choices.length).toBeGreaterThan(1);
        const trigger = page.getByRole('button', { name: /展开行动列表/ });
        await trigger.click();
        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible();
        const items = menu.getByRole('menuitem');
        await expect(items).toHaveCount(choices.length);
        for (const label of choices) await expect(menu.getByText(label, { exact: false }).first()).toBeVisible();
        const box = await menu.boundingBox();
        const vw = page.viewportSize().width;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(vw);
        await page.screenshot({ path: EVIDENCE + 'action-list-2026-10-18-open.png' });

        const before = await page.evaluate(() => window.CoCStateAccessor.getState().gameState.scenarioRunner.currentNodeId);
        await items.first().click();
        await expect(menu).toBeHidden();
        await expect.poll(() => page.evaluate(() => window.CoCStateAccessor.getState().gameState.scenarioRunner.currentNodeId))
            .not.toBe(before);
    });

    test('an ending names itself in the panel and the chat', async ({ page }) => {
        await page.evaluate(async () => {
            const { getScenarioRunner } = await import('/js/scenario/ensure_runner.mjs');
            getScenarioRunner().goToNode('finale');
        });
        await expect(page.getByText('结局：封印井口').first()).toBeVisible();
        const panelText = await page.locator('.apex-panel', { hasText: '复制完整记录' }).innerText();
        expect(panelText).not.toMatch(/终局节点|证据档|遭遇裁决|桌规卡|finale|decisive/);
        await page.screenshot({ path: EVIDENCE + 'ending-panel-2026-10-18.png' });
    });
});
