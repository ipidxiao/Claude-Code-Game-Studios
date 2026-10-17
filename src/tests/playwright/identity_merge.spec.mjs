/**
 * ADR-0003 §1.1 — the same investigator in two unrelated legacy saves: suggested, merged by the
 * player, and read back with one id.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(readFileSync(join(here, '../fixtures/r29_17_save.json'), 'utf8'));
const legacy = (savedAt, location) => {
    const s = structuredClone(base);
    s.savedAt = savedAt;
    s.location = location;
    s.data.currentLocation = location;
    s.data.roster.forEach((c) => { delete c.invId; });
    return JSON.stringify(s);
};

test('same investigator in two old saves is merged on confirmation', async ({ page }) => {
    await page.addInitScript(({ one, two }) => {
        if (sessionStorage.getItem('seeded')) return;
        sessionStorage.setItem('seeded', '1');
        localStorage.clear();
        localStorage.setItem('coc_save_slot1', one);
        localStorage.setItem('coc_save_slot2', two);
    }, { one: legacy('2026-01-01T00:00:00.000Z', '旧钟楼'), two: legacy('2026-02-01T00:00:00.000Z', '码头仓库') });
    await waitForApp(page);
    await page.getByRole('button', { name: '存档管理' }).click();
    const panel = page.locator('.apex-identity-panel');
    await panel.getByRole('button', { name: '检查全部存档' }).click();
    const pair = panel.locator('.apex-identity-pair');
    await expect(pair).toHaveCount(1);
    await expect(pair).toContainText('Alice 可能是同一人？');
    await expect(pair).toContainText('默认模组 · 槽位 1');
    await expect(pair).toContainText('默认模组 · 槽位 2');
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({ path: join(here, '../../../production/qa/evidence/identity-merge-suggestion.png') });

    await pair.getByRole('button', { name: '是同一人', exact: true }).click();
    await page.locator('.apex-confirm-panel').getByRole('button', { name: '合并', exact: true }).click();
    await expect(panel.locator('.apex-identity-merge')).toHaveCount(1);
    await expect(pair).toHaveCount(0);
    await panel.screenshot({ path: join(here, '../../../production/qa/evidence/identity-merge-done.png') });

    const ids = await page.evaluate(async () => {
        const state = window.CoCStateAccessor.getState();
        await state.loadGame('slot1');
        const one = state.gameState.roster[0].invId;
        await state.loadGame('slot2');
        const two = state.gameState.roster[0].invId;
        const stored2 = JSON.parse(localStorage.getItem('coc_save_slot2')).data.roster[0];
        return { one, two, stored2 };
    });
    expect(ids.one).toMatch(/^inv_[0-9a-f]{16}$/);
    expect(ids.two).toBe(ids.one);
    expect(ids.stored2.invId).toBe(ids.one);
    expect(ids.stored2.formerInvIds).toHaveLength(1);

    await page.reload();
    await waitForApp(page);
    const afterReload = await page.evaluate(async () => {
        const state = window.CoCStateAccessor.getState();
        await state.loadGame('slot2');
        return state.gameState.roster[0].invId;
    });
    expect(afterReload).toBe(ids.one);
});
