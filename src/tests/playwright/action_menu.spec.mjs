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
        // Every action rolls first (author, 2026-10-18); the story moves on after the roll.
        const rollButton = page.getByRole('button', { name: /掷骰：【侦查】/ });
        await expect(rollButton).toBeVisible();
        await page.screenshot({ path: EVIDENCE + 'action-roll-2026-10-19-prompt.png' });
        expect(await page.evaluate(() => window.CoCStateAccessor.getState().gameState.scenarioRunner.currentNodeId)).toBe(before);
        await rollButton.click();
        await expect.poll(() => page.evaluate(() => window.CoCStateAccessor.getState().gameState.scenarioRunner.currentNodeId))
            .toMatch(/^hall_look$|^intro__hall_look__fail$/);
    });

    test('a failed roll tells its own passage and the story goes on', async ({ page }) => {
        await page.getByRole('button', { name: /展开行动列表/ }).click();
        await page.getByRole('menu').getByRole('menuitem', { name: /环顾门厅/ }).click();
        // Dice forced high: 95+ fails for any skill an investigator starts with.
        await page.evaluate(() => { Math.random = () => 0.985; });
        await page.getByRole('button', { name: /掷骰：【侦查】/ }).click();
        await expect.poll(() => page.evaluate(() => window.CoCStateAccessor.getState().gameState.scenarioRunner.currentNodeId))
            .toBe('intro__hall_look__fail');
        await expect(page.getByText('什么也没留住', { exact: false }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /掷骰：/ })).toHaveCount(0);
        const state = await page.evaluate(() => {
            const gs = window.CoCStateAccessor.getState().gameState;
            return { clues: gs.clueBoard.clues.map((c) => c.id), n: gs.scenarioRunner.choices.length };
        });
        expect(state.clues).not.toContain('tut_wax');
        expect(state.n).toBeGreaterThan(0);
        await page.getByText('什么也没留住', { exact: false }).first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: EVIDENCE + 'action-roll-2026-10-19-failed.png' });
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
