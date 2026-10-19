/**
 * Playwright smoke — enemy-turn attack UI, chase/vehicle panel, save/load.
 * Optional: npm run test:playwright (not in default test:engine).
 */
import { test, expect } from '@playwright/test';
import { waitForApp, enterStorySeed, getToolCalls, minimalInvestigator } from './helpers.mjs';

test.describe('critical UI paths', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            try { localStorage.clear(); } catch (_e) { /* ignore */ }
        });
        await waitForApp(page);
    });

    test('enemy turn shows attack CTA and dispatches enemy_attack', async ({ page }) => {
        await enterStorySeed(page, {
            stubTools: true,
            roster: [minimalInvestigator('Alice')],
            combat: {
                active: true,
                round: 2,
                location: '巷口',
                enemies: [
                    { id: 'e1', name: '邪教徒甲', hp: 10, maxHp: 10, isDefeated: false, attacks: '匕首 1D4' }
                ],
                initiativeOrder: [
                    { id: 'e1', name: '邪教徒甲', initiative: 90, isEnemy: true },
                    { id: 'Alice', name: 'Alice', initiative: 50, isEnemy: false }
                ],
                currentTurnIdx: 0
            }
        });

        const panel = page.locator('.combat-panel');
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(panel.getByText('敌人回合')).toBeVisible();
        await expect(panel.getByRole('button', { name: '敌方出手' })).toBeVisible();

        await expect.poll(async () => {
            const calls = await getToolCalls(page);
            return calls.some((c) => c.tool === 'enemy_attack');
        }, { timeout: 8_000 }).toBe(true);

        const calls = await getToolCalls(page);
        const ea = calls.find((c) => c.tool === 'enemy_attack');
        expect(ea.args.enemy_name).toBe('邪教徒甲');
        expect(ea.args.target_name).toBe('Alice');
    });

    test('chase / vehicle panel mounts with chase actions', async ({ page }) => {
        await enterStorySeed(page, {
            stubTools: true,
            roster: [minimalInvestigator('Alice')],
            combat: { active: false },
            chase: {
                active: true,
                round: 2,
                vehicle: true,
                speedResolved: true,
                quarryName: '逃车',
                participants: [
                    { name: 'Alice', isEnemy: false, isQuarry: false },
                    { name: '追车', isEnemy: true, isQuarry: true }
                ],
                outcome: null
            }
        });

        const panel = page.locator('.combat-panel');
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(panel.getByRole('heading', { name: /载具枪战/ })).toBeVisible();
        const chase = page.locator('.apex-chase-panel');
        await expect(chase).toBeVisible();
        await expect(chase.getByRole('button', { name: '加速/拉近' })).toBeVisible();
        await expect(chase.getByRole('button', { name: '撞击' })).toBeVisible();
        await expect(chase.getByRole('button', { name: '载具射击' })).toBeVisible();
        await expect(chase.getByRole('button', { name: '下一轮' })).toBeVisible();
    });

    test('chase speed check disables push until resolved', async ({ page }) => {
        await enterStorySeed(page, {
            stubTools: true,
            roster: [minimalInvestigator('Alice')],
            combat: { active: false },
            chase: {
                active: true,
                round: 1,
                vehicle: false,
                speedResolved: false,
                quarryName: '逃',
                participants: [
                    { name: '逃', isQuarry: true, location: 2 },
                    { name: 'Alice', isQuarry: false, location: 0 }
                ],
                outcome: null
            }
        });

        const chase = page.locator('.apex-chase-panel');
        await expect(chase).toBeVisible({ timeout: 10_000 });
        await expect(chase.getByRole('button', { name: '加速/拉近' })).toBeDisabled();
        await expect(chase.getByRole('button', { name: '结束追逐' })).toBeEnabled();
    });

    test('rain dock style vehicle chase mounts with speed gate', async ({ page }) => {
        await enterStorySeed(page, {
            stubTools: true,
            roster: [minimalInvestigator('Alice')],
            combat: { active: false },
            chase: {
                active: true,
                round: 1,
                vehicle: true,
                speedResolved: false,
                quarryName: '走私客莉娜',
                participants: [
                    { name: '走私客莉娜', isQuarry: true, location: 2 },
                    { name: 'Alice', isQuarry: false, location: 0 }
                ],
                outcome: null
            }
        });

        const chase = page.locator('.apex-chase-panel');
        await expect(chase).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: /载具枪战/ })).toBeVisible();
        await expect(chase.getByRole('button', { name: '加速/拉近' })).toBeDisabled();
    });

    test('fog lighthouse foot chase mounts with speed gate', async ({ page }) => {
        await enterStorySeed(page, {
            stubTools: true,
            roster: [minimalInvestigator('Alice')],
            combat: { active: false },
            chase: {
                active: true,
                round: 1,
                vehicle: false,
                speedResolved: false,
                quarryName: '守塔人卡尔',
                participants: [
                    { name: '守塔人卡尔', isQuarry: true, location: 2 },
                    { name: 'Alice', isQuarry: false, location: 0 }
                ],
                outcome: null
            }
        });

        const chase = page.locator('.apex-chase-panel');
        await expect(chase).toBeVisible({ timeout: 10_000 });
        await expect(chase.getByRole('button', { name: '加速/拉近' })).toBeDisabled();
        await expect(chase.getByRole('button', { name: '结束追逐' })).toBeEnabled();
    });

    test('story save modal: save then load restores location', async ({ page }) => {
        const locA = 'E2E 存档点 A';
        const locB = 'E2E 存档点 B';

        await enterStorySeed(page, {
            location: locA,
            roster: [minimalInvestigator('Alice')],
            combat: { active: false }
        });

        await page.getByRole('button', { name: '存档管理' }).click();
        await expect(page.locator('#apex-save-title')).toBeVisible();

        const slot1 = page.locator('.apex-save-slot').filter({ hasText: '槽位 1' });
        await slot1.getByRole('button', { name: '存入' }).click();
        await expect(page.locator('.coc-toast-body').filter({ hasText: '已保存至' })).toBeVisible({ timeout: 8_000 });

        await page.evaluate((nextLoc) => {
            const gs = window.CoCStateAccessor.getState().gameState;
            gs.currentLocation = nextLoc;
        }, locB);

        const afterMutate = await page.evaluate(() => window.CoCStateAccessor.getState().gameState.currentLocation);
        expect(afterMutate).toBe(locB);

        await slot1.getByRole('button', { name: '读取' }).click();
        await expect(page.getByText('载入存档将覆盖当前游戏进度')).toBeVisible();
        await page.getByRole('button', { name: '确认' }).click();

        await expect.poll(async () => {
            return page.evaluate(() => window.CoCStateAccessor.getState().gameState.currentLocation);
        }, { timeout: 10_000 }).toBe(locA);
    });

    test('story save modal: save then load restores chase', async ({ page }) => {
        const chaseSeed = {
            active: true,
            round: 3,
            vehicle: true,
            quarryName: '逃车',
            vehicleId: 'automobile',
            hazardKind: 'obstacle',
            participants: [
                { name: 'Alice', isEnemy: false, isQuarry: false, mov: 8, effectiveMov: 10, location: 0, actionsLeft: 1 },
                {
                    name: '逃车',
                    isEnemy: true,
                    isQuarry: true,
                    mov: 12,
                    effectiveMov: 12,
                    location: 2,
                    actionsLeft: 2,
                    vehicle: { id: 'automobile', mov: 12, hp: 18, maxHp: 20, armor: 2, wrecked: false, crew: [] }
                }
            ],
            outcome: null
        };

        await enterStorySeed(page, {
            location: 'E2E 追逐公路',
            roster: [minimalInvestigator('Alice')],
            combat: { active: false },
            chase: chaseSeed
        });

        await expect(page.locator('.apex-chase-panel')).toBeVisible({ timeout: 10_000 });

        // Overlay blocks toolbar; exercise persistence API (UI save covered by location test).
        const saved = await page.evaluate(async () => {
            const s = window.CoCStateAccessor.getState();
            return !!(await s.saveGame('slot1', '槽位 1'));
        });
        expect(saved).toBe(true);

        await page.evaluate(() => {
            const gs = window.CoCStateAccessor.getState().gameState;
            gs.chase = { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null };
        });

        await expect.poll(async () => {
            return page.evaluate(() => !!(window.CoCStateAccessor.getState().gameState.chase && window.CoCStateAccessor.getState().gameState.chase.active));
        }).toBe(false);

        const loaded = await page.evaluate(async () => {
            const s = window.CoCStateAccessor.getState();
            return !!(await s.loadGame('slot1'));
        });
        expect(loaded).toBe(true);

        await expect.poll(async () => {
            return page.evaluate(() => {
                const c = window.CoCStateAccessor.getState().gameState.chase;
                if (!c || !c.active) return null;
                const quarry = (c.participants || []).find((p) => p && p.isQuarry) || {};
                return {
                    round: c.round,
                    vehicle: c.vehicle,
                    quarryName: c.quarryName,
                    vehicleId: c.vehicleId,
                    hazardKind: c.hazardKind,
                    parts: (c.participants || []).map((p) => p && p.name),
                    quarryHp: quarry.vehicle && quarry.vehicle.hp
                };
            });
        }, { timeout: 10_000 }).toEqual({
            round: 3,
            vehicle: true,
            quarryName: '逃车',
            vehicleId: 'automobile',
            hazardKind: 'obstacle',
            parts: ['Alice', '逃车'],
            quarryHp: 18
        });

        await expect(page.locator('.apex-chase-panel')).toBeVisible({ timeout: 10_000 });
    });

    test('AI request includes current and maximum HP', async ({ page }) => {
        await enterStorySeed(page, {
            roster: [{
                ...minimalInvestigator('Alice'),
                hp: 5,
                sanity: 51,
                derived: {
                    ...minimalInvestigator('Alice').derived,
                    hp: 5,
                    maxHp: 13,
                    sanity: 51
                }
            }]
        });

        let requestBody = null;
        await page.route('**/pw-ai', async (route) => {
            requestBody = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    choices: [{ message: { role: 'assistant', content: '走廊里暂时一片寂静。' } }]
                })
            });
        });

        await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            state.gameState.aiSettings.apiKey = 'pw-test';
            state.gameState.aiSettings.baseUrl = 'http://127.0.0.1:8080/pw-ai';
            state.playerInput.value = '检查前方走廊';
            await window.CoCAI.handlePlayerAction();
        });

        expect(requestBody).not.toBeNull();
        const sent = JSON.stringify(requestBody.messages);
        expect(sent).toContain('HP:5/13');
        expect(sent).not.toContain('HP:5/5');
    });

    test('IndexedDB fallback remains visible and loadable', async ({ page }) => {
        const saved = await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            const nativeSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = function (key, value) {
                if (String(key).endsWith('slot1')) {
                    throw new DOMException('quota', 'QuotaExceededError');
                }
                return nativeSetItem.call(this, key, value);
            };
            try {
                state.gameState.currentLocation = 'IDB 唯一存档点';
                return await state.saveGame('slot1', '槽位 1');
            } finally {
                Storage.prototype.setItem = nativeSetItem;
            }
        });
        expect(saved).toBe(true);

        await page.getByRole('button', { name: '存档管理' }).click();
        const slot1 = page.locator('.apex-lobby-save-slot').filter({ hasText: '槽位 1' });
        await expect(slot1).toContainText('IDB 唯一存档点');
        await expect(slot1.getByRole('button', { name: '读取' })).toBeEnabled();

        const loaded = await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            state.gameState.currentLocation = '已修改位置';
            const nativeGetItem = Storage.prototype.getItem;
            Storage.prototype.getItem = function (key) {
                if (String(key).endsWith('slot1')) throw new DOMException('blocked', 'SecurityError');
                return nativeGetItem.call(this, key);
            };
            try {
                return await state.loadGame('slot1');
            } finally {
                Storage.prototype.getItem = nativeGetItem;
            }
        });
        expect(loaded).toBe(true);
        await expect.poll(() => page.evaluate(
            () => window.CoCStateAccessor.getState().gameState.currentLocation
        )).toBe('IDB 唯一存档点');

        await waitForApp(page);
        await page.getByRole('button', { name: '存档管理' }).click();
        const refreshedSlot1 = page.locator('.apex-lobby-save-slot').filter({ hasText: '槽位 1' });
        await expect(refreshedSlot1).toContainText('IDB 唯一存档点');
        expect(await page.evaluate(async () => {
            return window.CoCStateAccessor.getState().loadGame('slot1');
        })).toBe(true);

        expect(await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            const deleted = await state.deleteSave('slot1');
            const slots = await state.getSaveSlots();
            const idbKeys = await new Promise((resolve, reject) => {
                const request = indexedDB.open('coc-engine-saves', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const keysRequest = request.result
                        .transaction('saves', 'readonly')
                        .objectStore('saves')
                        .getAllKeys();
                    keysRequest.onerror = () => reject(keysRequest.error);
                    keysRequest.onsuccess = () => resolve(keysRequest.result.map(String));
                };
            });
            return {
                deleted,
                slotVisible: slots.some((slot) => slot.key === 'slot1' && slot.hasData),
                localExists: Object.keys(localStorage).some((key) => key.endsWith('slot1')),
                idbExists: idbKeys.some((key) => key.endsWith('slot1'))
            };
        })).toEqual({
            deleted: true,
            slotVisible: false,
            localExists: false,
            idbExists: false
        });

        expect(await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            const nativeSetItem = Storage.prototype.setItem;
            const nativeTransaction = IDBDatabase.prototype.transaction;
            Storage.prototype.setItem = function (key, value) {
                if (String(key).endsWith('slot2')) throw new DOMException('quota', 'QuotaExceededError');
                return nativeSetItem.call(this, key, value);
            };
            IDBDatabase.prototype.transaction = function (storeNames, mode, options) {
                if (mode === 'readwrite') throw new DOMException('blocked', 'InvalidStateError');
                return nativeTransaction.call(this, storeNames, mode, options);
            };
            try {
                return await state.saveGame('slot2', '槽位 2');
            } finally {
                Storage.prototype.setItem = nativeSetItem;
                IDBDatabase.prototype.transaction = nativeTransaction;
            }
        })).toBe(false);
    });

    test('stale prose load cannot enter a node after scenario stop', async ({ page }) => {
        const result = await page.evaluate(async () => {
            const state = window.CoCStateAccessor.getState();
            const bridgeModule = await import('/js/scenario/prose_bridge.mjs');
            const runnerModule = await import('/js/scenario/runner.mjs');
            const pending = [];
            const originalLoad = bridgeModule.CoCProseBridge.loadProseBank;
            bridgeModule.CoCProseBridge.loadProseBank = () => new Promise((resolve, reject) => {
                pending.push({ resolve, reject });
            });
            try {
                const firstStarted = runnerModule.CoCScenarioRunner.startScenario('tutorial');
                const secondStarted = runnerModule.CoCScenarioRunner.startScenario('tutorial');
                const countBeforeOldRelease = state.gameState.chatHistory.length;
                pending[0].resolve({});
                await new Promise((resolve) => setTimeout(resolve, 30));
                const countAfterOldRelease = state.gameState.chatHistory.length;
                pending[1].resolve({});
                await new Promise((resolve) => setTimeout(resolve, 30));
                const countAfterCurrentRelease = state.gameState.chatHistory.length;

                const stopStarted = runnerModule.CoCScenarioRunner.startScenario('tutorial');
                runnerModule.CoCScenarioRunner.stopScenario({ silent: true });
                const countAfterStop = state.gameState.chatHistory.length;
                pending[2].resolve({});
                await new Promise((resolve) => setTimeout(resolve, 30));
                const countAfterStoppedRelease = state.gameState.chatHistory.length;

                const fallbackStarted = runnerModule.CoCScenarioRunner.startScenario('tutorial');
                const countBeforeFallback = state.gameState.chatHistory.length;
                pending[3].reject(new Error('prose unavailable'));
                await new Promise((resolve) => setTimeout(resolve, 30));
                const countAfterFallback = state.gameState.chatHistory.length;

                const onlineStarted = runnerModule.CoCScenarioRunner.startScenario('tutorial');
                runnerModule.CoCScenarioRunner.switchToOnlineMode();
                const countAfterOnlineSwitch = state.gameState.chatHistory.length;
                pending[4].resolve({});
                await new Promise((resolve) => setTimeout(resolve, 30));
                return {
                    firstStarted,
                    secondStarted,
                    stopStarted,
                    fallbackStarted,
                    onlineStarted,
                    countBeforeOldRelease,
                    countAfterOldRelease,
                    countAfterCurrentRelease,
                    countAfterStop,
                    countAfterStoppedRelease,
                    countBeforeFallback,
                    countAfterFallback,
                    countAfterOnlineSwitch,
                    countAfterOnlineRelease: state.gameState.chatHistory.length,
                    active: state.gameState.scenarioRunner.active
                };
            } finally {
                bridgeModule.CoCProseBridge.loadProseBank = originalLoad;
            }
        });

        expect(result.firstStarted).toBe(true);
        expect(result.secondStarted).toBe(true);
        expect(result.stopStarted).toBe(true);
        expect(result.fallbackStarted).toBe(true);
        expect(result.onlineStarted).toBe(true);
        expect(result.countAfterOldRelease).toBe(result.countBeforeOldRelease);
        expect(result.countAfterCurrentRelease).toBeGreaterThan(result.countAfterOldRelease);
        expect(result.countAfterStoppedRelease).toBe(result.countAfterStop);
        expect(result.countAfterFallback).toBeGreaterThan(result.countBeforeFallback);
        expect(result.countAfterOnlineRelease).toBe(result.countAfterOnlineSwitch);
        expect(result.active).toBe(false);
    });
});
