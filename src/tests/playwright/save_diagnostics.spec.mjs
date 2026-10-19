/**
 * R29.26 — lobby diagnostics show replica status and require confirmation.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers.mjs';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');
const save = JSON.parse(readFileSync(join(fixtureDir, 'r29_19_save.json'), 'utf8'));

test('save diagnostics show the selected replica and repair after confirmation', async ({ page }) => {
    await page.addInitScript((payload) => {
        try { localStorage.clear(); } catch (_e) { /* ignore */ }
        localStorage.setItem('coc_save_slot1', payload);
    }, JSON.stringify(save));
    await waitForApp(page);
    await page.getByRole('button', { name: '存档管理' }).click();
    await page.getByRole('button', { name: '诊断' }).click();
    const panel = page.locator('.apex-panel').filter({ hasText: '存档副本诊断' });
    await expect(panel).toContainText('槽位 1');
    await expect(panel).toContainText('选中 localStorage');
    await expect(panel).toContainText('IDB 缺失');
    await expect(panel.getByRole('button', { name: '修复缺失副本' })).toBeVisible();

    await panel.getByRole('button', { name: '修复缺失副本' }).click();
    await expect(page.getByText('操作前会保留原文备份')).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();
    expect(await page.evaluate(async () => {
        const request = indexedDB.open('coc-engine-saves', 1);
        const record = await new Promise((resolve, reject) => {
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const tx = request.result.transaction('saves', 'readonly');
                const getRequest = tx.objectStore('saves').get('coc_save_slot1');
                getRequest.onerror = () => reject(getRequest.error);
                getRequest.onsuccess = () => resolve(getRequest.result || null);
            };
        });
        return record;
    })).toBeNull();

    await panel.getByRole('button', { name: '修复缺失副本' }).click();
    await page.getByRole('button', { name: '修复', exact: true }).click();
    await expect(page.locator('.coc-toast-body').filter({ hasText: '副本已修复' })).toBeVisible();
    await expect(panel).toContainText('选中 localStorage');
    expect(await page.evaluate(async () => {
        const request = indexedDB.open('coc-engine-saves', 1);
        return new Promise((resolve, reject) => {
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const tx = request.result.transaction('saves', 'readonly');
                const getRequest = tx.objectStore('saves').get('coc_save_slot1');
                getRequest.onerror = () => reject(getRequest.error);
                getRequest.onsuccess = () => resolve(getRequest.result && getRequest.result.payload);
            };
        });
    })).toBe(JSON.stringify(save));
});
