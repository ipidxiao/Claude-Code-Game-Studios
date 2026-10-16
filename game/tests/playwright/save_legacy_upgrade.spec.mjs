/**
 * R29.25 — browser acceptance for legacy saves, refresh, offline start, and cross-tab sync.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers.mjs';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');
const r2917Save = JSON.parse(readFileSync(join(fixtureDir, 'r29_17_save.json'), 'utf8'));
const r2919Save = JSON.parse(readFileSync(join(fixtureDir, 'r29_19_save.json'), 'utf8'));

async function seedIndexedDb(page, slotKey, save) {
    await page.evaluate(async ({ slotKey: key, payload, savedAt }) => {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open('coc-engine-saves', 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('saves')) {
                    db.createObjectStore('saves', { keyPath: 'slotKey' });
                }
            };
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('saves', 'readwrite');
                tx.objectStore('saves').put({ slotKey: key, payload, savedAt });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
        });
    }, {
        slotKey,
        payload: JSON.stringify(save),
        savedAt: Date.parse(save.savedAt)
    });
}

async function openSaveManager(page) {
    await page.getByRole('button', { name: '存档管理' }).click();
    await expect(page.locator('.apex-lobby-save-slot').filter({ hasText: '槽位 1' })).toBeVisible();
}

async function waitForServiceWorkerCache(page) {
    await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active && !navigator.serviceWorker.controller) {
            await new Promise((resolve) => {
                navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
            });
        }
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
            const keys = await caches.keys();
            const cacheName = keys.find((key) => key.startsWith('coc-engine-'));
            if (cacheName) {
                const cache = await caches.open(cacheName);
                const indexHit = await cache.match(new URL('index.html', location.href));
                const appHit = await cache.match(new URL('js/app.mjs', location.href));
                if (indexHit && appHit && navigator.serviceWorker.controller) return;
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error('service worker cache was not ready');
    });
}

test.describe('legacy save upgrade', () => {
    test('R29.17 local save stays visible after refresh and loads', async ({ page }) => {
        await page.addInitScript((payload) => {
            try { localStorage.clear(); } catch (_e) { /* ignore */ }
            localStorage.setItem('coc_save_slot1', payload);
        }, JSON.stringify(r2917Save));
        await waitForApp(page);
        await openSaveManager(page);
        const slot1 = page.locator('.apex-lobby-save-slot').filter({ hasText: '槽位 1' });
        await expect(slot1).toContainText('旧钟楼');
        await expect(slot1).toContainText('Alice');

        await page.reload();
        await waitForApp(page);
        await openSaveManager(page);
        await expect(slot1).toContainText('旧钟楼');

        const loaded = await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            const ok = await state.loadGame('slot1');
            return {
                ok,
                location: state.gameState.currentLocation,
                names: state.gameState.roster.map((char) => char.name),
                stored: localStorage.getItem('coc_save_slot1')
            };
        });
        expect(loaded.ok).toBe(true);
        expect(loaded.location).toBe('旧钟楼');
        expect(loaded.names).toEqual(['Alice']);
        expect(JSON.parse(loaded.stored).location).toBe('旧钟楼');
        expect(JSON.parse(loaded.stored).version).toBe(8);
    });

    test('R29.19 IDB-only save survives refresh and beats a damaged local replica', async ({ page }) => {
        await waitForApp(page);
        await seedIndexedDb(page, 'coc_save_slot1', r2919Save);
        await page.reload();
        await waitForApp(page);
        await openSaveManager(page);
        const slot1 = page.locator('.apex-lobby-save-slot').filter({ hasText: '槽位 1' });
        await expect(slot1).toContainText('码头仓库');

        await page.evaluate(() => {
            localStorage.setItem('coc_save_slot1', '{legacy-broken');
        });
        await page.reload();
        await waitForApp(page);
        await openSaveManager(page);
        await expect(slot1).toContainText('码头仓库');

        const loaded = await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            const ok = await state.loadGame('slot1');
            return {
                ok,
                location: state.gameState.currentLocation,
                inventory: [...state.gameState.inventory],
                localRaw: localStorage.getItem('coc_save_slot1')
            };
        });
        expect(loaded.ok).toBe(true);
        expect(loaded.location).toBe('码头仓库');
        expect(loaded.inventory).toEqual(['航运清单']);
        expect(loaded.localRaw).toBe('{legacy-broken');
    });

    test('newer R29.19 IDB replica wins over older R29.17 local replica', async ({ page }) => {
        await page.addInitScript((payload) => {
            try { localStorage.clear(); } catch (_e) { /* ignore */ }
            localStorage.setItem('coc_save_slot1', payload);
        }, JSON.stringify(r2917Save));
        await waitForApp(page);
        await seedIndexedDb(page, 'coc_save_slot1', r2919Save);
        await page.reload();
        await waitForApp(page);
        await openSaveManager(page);
        await expect(page.locator('.apex-lobby-save-slot').filter({ hasText: '槽位 1' })).toContainText('码头仓库');

        const loaded = await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            await state.loadGame('slot1');
            return {
                location: state.gameState.currentLocation,
                localLocation: JSON.parse(localStorage.getItem('coc_save_slot1')).location
            };
        });
        expect(loaded.location).toBe('码头仓库');
        expect(loaded.localLocation).toBe('旧钟楼');
    });

    test('offline start still boots after the first cached visit', async ({ page, context }) => {
        await page.addInitScript(() => {
            try { localStorage.clear(); } catch (_e) { /* ignore */ }
        });
        await waitForApp(page);
        await waitForServiceWorkerCache(page);
        await context.setOffline(true);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
            return !!(window.CoCState && window.CoCStateAccessor && window.Vue);
        }, null, { timeout: 45_000 });
        await expect(page.getByRole('button', { name: '存档管理' })).toBeVisible();
        await context.setOffline(false);
    });

    test('cross-tab save appears in the other lobby without reload', async ({ context }) => {
        const pageA = await context.newPage();
        const pageB = await context.newPage();
        await pageA.addInitScript(() => {
            try { localStorage.clear(); } catch (_e) { /* ignore */ }
        });
        await waitForApp(pageA);
        await waitForApp(pageB);
        await openSaveManager(pageB);
        const slot1 = pageB.locator('.apex-lobby-save-slot').filter({ hasText: '槽位 1' });
        await expect(slot1).toContainText('空槽位');

        await pageA.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            state.gameState.currentLocation = '跨标签页新地点';
            state.gameState.roster.splice(0, state.gameState.roster.length, { name: 'Carol' });
            return state.saveGame('slot1', '槽位 1');
        });

        await expect(slot1).toContainText('跨标签页新地点', { timeout: 8_000 });
        await expect(slot1).toContainText('Carol');
        await pageA.close();
        await pageB.close();
    });
});
