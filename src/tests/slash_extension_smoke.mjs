/**
 * Phase 3 — extension shell + slash commands smoke (+ hunt fixes).
 */
import { strict as assert } from 'node:assert';

globalThis.window = globalThis;

import {
    on, off, emit, getGameContext, registerExtension, listExtensions, CoCExtensions
} from '../js/core/extensions.mjs';
import { executeSlash, trySlash, parseSlash, CoCSlash } from '../js/tools/slash.mjs';
import { buildLorePromptInjection, CoCLorebook } from '../js/ai/lorebook.mjs';

window.CoCExtensions = CoCExtensions;

window.gameState = {
    currentLocation: '测试码头',
    inventory: [],
    chatHistory: [],
    roster: [{ name: 'Alice', isActive: true, hp: 10, derived: { hp: 10, maxHp: 12 } }],
    combat: { active: false },
    chase: { active: false },
    scenarioRunner: { scenarioId: 'tutorial', scenarioTitle: '引擎教程', currentNodeId: 'hall' },
    lorebook: [
        { id: 't_tone', always: true, content: '语气A', title: '语气' },
        { id: 't_dock', keys: ['码头'], content: '码头条目', title: '码头' }
    ],
    aiSettings: { loreBudgetChars: 2000 }
};
window.CoCState = { gameState: window.gameState };

// --- extension bus ---
let seen = null;
let combatHandler = (p) => { seen = p; };
const unsub = on('combat:start', combatHandler);
assert.equal(emit('combat:start', { enemies: 1 }), 1);
assert.deepEqual(seen, { enemies: 1 });
unsub();
seen = null;
emit('combat:start', { enemies: 2 });
assert.equal(seen, null);
on('combat:start', combatHandler);
off('combat:start', combatHandler);
emit('combat:start', { enemies: 3 });
assert.equal(seen, null);

let hits = 0;
const unregister = registerExtension({
    id: 'smoke_ext',
    setup(ctx) {
        assert.ok(ctx);
        assert.ok(ctx.gameState);
        ctx.on('save:load', () => { hits++; });
    }
});
assert.deepEqual(listExtensions(), ['smoke_ext']);
emit('save:load', { slot: 'auto' });
assert.equal(hits, 1);
unregister();
assert.deepEqual(listExtensions(), []);
emit('save:load', { slot: 'auto2' });
assert.equal(hits, 1, 'unregister must off setup listeners');

// setup throw → no zombie
{
    let threw = false;
    try {
        registerExtension({
            id: 'bad_ext',
            setup() { throw new Error('setup boom'); }
        });
    } catch (e) {
        threw = true;
        assert.match(String(e.message || e), /setup boom/);
    }
    assert.ok(threw);
    assert.ok(!listExtensions().includes('bad_ext'));
}

assert.ok(CoCExtensions.emit);
assert.ok(getGameContext().gameState);
assert.equal(globalThis.CoCLorebook, undefined);
assert.equal(getGameContext().lorebook, CoCLorebook);
assert.equal(window.CoCSlash, undefined);

// --- slash ---
assert.match(executeSlash('/help'), /\/state/);
assert.match(executeSlash('/state'), /tutorial/);
assert.match(executeSlash('/state'), /Alice/);
assert.match(executeSlash('/roll 2d6'), /🎲/);
assert.match(executeSlash('/lore'), /尚无 lore|Lore/);

const give = executeSlash('/give 火把');
assert.match(give, /已添加/);
assert.ok(window.gameState.inventory.includes('火把'));

assert.equal(trySlash('普通说话').handled, false);
assert.equal(trySlash('/help').handled, true);

// false positive: narrative must NOT be handled
assert.equal(trySlash('/1920年我走进港口').handled, false);
assert.equal(parseSlash('/1920年我走进港口'), null);
assert.equal(executeSlash('/1920年我走进港口'), null);
assert.equal(trySlash('/unknowncmd').handled, false);

// /state never prints undefined
{
    window.gameState.roster = [{ name: 'Ann', isActive: true }];
    const st = executeSlash('/state');
    assert.ok(!/undefined/.test(st), st);
    assert.match(st, /HP: —\/—/);
    window.gameState.roster = [{ name: 'Alice', isActive: true, hp: 10, derived: { hp: 10, maxHp: 12 } }];
}

assert.ok(CoCSlash.execute);

// lore inject emits when CoCExtensions present
{
    let loreEvt = null;
    on('lore:injected', (p) => { loreEvt = p; });
    const inj = buildLorePromptInjection(window.gameState);
    assert.match(inj, /相关设定/);
    assert.ok(loreEvt);
    assert.ok(loreEvt.ids.includes('t_tone'));
    assert.match(executeSlash('/lore'), /t_tone/);
}

console.log('slash_extension_smoke: OK', {
    cmds: ['/help', '/state', '/roll', '/lore', '/give'],
    events: ['combat:start', 'save:load', 'lore:injected'],
    fixes: ['pass-through', 'state-hp', 'setup-zombie', 'unreg-off']
});
