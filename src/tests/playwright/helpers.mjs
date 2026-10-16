/**
 * Shared Playwright helpers for CoC Engine UI smoke paths.
 * Seeds state via CoCStateAccessor — no second HP/SAN write path.
 */

/** @param {import('@playwright/test').Page} page */
export async function waitForApp(page) {
    await page.goto('/');
    await page.waitForFunction(() => {
        return !!(window.CoCState && window.CoCStateAccessor && window.CoCAI && window.Vue);
    }, null, { timeout: 45_000 });
}

export function minimalInvestigator(name = 'Alice') {
    return {
        name,
        isActive: true,
        hp: 12,
        maxHp: 12,
        san: 55,
        maxSan: 55,
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 60, APP: 50, INT: 60, POW: 55, EDU: 60, LUCK: 50 },
        derived: { hp: 12, maxHp: 12, mp: 11, san: 55, db: '0', build: 0, mov: 8 },
        status: { hasMajorWound: false, isDying: false, isUnconscious: false },
        skills: { '斗殴': 50, '闪避': 40, '手枪': 45 },
        inventory: []
    };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   location?: string,
 *   roster?: object[],
 *   combat?: object|null,
 *   chase?: object|null,
 *   stubTools?: boolean
 * }} seed
 */
export async function enterStorySeed(page, seed = {}) {
    await page.evaluate((opts) => {
        const Acc = window.CoCStateAccessor;
        const state = Acc.getState();
        const gs = state.gameState;

        if (opts.stubTools && window.CoCAI && typeof window.CoCAI.dispatchToolHandler === 'function') {
            window.__pwToolCalls = [];
            if (!window.__pwOrigDispatch) {
                window.__pwOrigDispatch = window.CoCAI.dispatchToolHandler.bind(window.CoCAI);
            }
            window.CoCAI.dispatchToolHandler = (tool, args) => {
                window.__pwToolCalls.push({ tool, args: args || {} });
                return 'pw-stub-ok';
            };
        }

        const roster = opts.roster && opts.roster.length
            ? opts.roster
            : [{
                name: 'Alice',
                isActive: true,
                hp: 12,
                maxHp: 12,
                san: 55,
                maxSan: 55,
                attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 60, APP: 50, INT: 60, POW: 55, EDU: 60, LUCK: 50 },
                derived: { hp: 12, maxHp: 12, mp: 11, san: 55, db: '0', build: 0, mov: 8 },
                status: { hasMajorWound: false, isDying: false, isUnconscious: false },
                skills: { '斗殴': 50, '闪避': 40, '手枪': 45 },
                inventory: []
            }];

        gs.roster.splice(0, gs.roster.length, ...roster);
        gs.currentLocation = opts.location || 'E2E 测试房间';
        if (!gs.knownLocations.includes(gs.currentLocation)) {
            gs.knownLocations.push(gs.currentLocation);
        }
        gs.activeModuleId = gs.activeModuleId || 'default';
        gs.activeModal = null;
        gs.pendingRuleCheck = null;
        gs.pendingRuleChecks = [];

        if (opts.combat) {
            Object.assign(gs.combat, {
                active: false,
                round: 1,
                enemies: [],
                initiativeOrder: [],
                currentTurnIdx: 0,
                location: '',
                notes: ''
            }, opts.combat);
        } else {
            Object.assign(gs.combat, {
                active: false,
                round: 1,
                enemies: [],
                initiativeOrder: [],
                currentTurnIdx: 0,
                location: '',
                notes: ''
            });
        }

        if (opts.chase) {
            gs.chase = opts.chase;
        } else {
            gs.chase = { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null };
        }

        state.switchScreen('story');
    }, seed);
}

/** @param {import('@playwright/test').Page} page */
export async function getToolCalls(page) {
    return page.evaluate(() => window.__pwToolCalls || []);
}
