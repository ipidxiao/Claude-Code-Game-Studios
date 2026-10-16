/**
 * Phase 2 — lorebook budgeted injection smoke.
 */
import { strict as assert } from 'node:assert';

globalThis.window = globalThis;

import {
    selectLoreEntries,
    formatLoreBlock,
    buildLorePromptInjection,
    buildLoreTextBlob,
    collectLoreEntries,
    DEFAULT_LORE_BUDGET_CHARS
} from '../js/ai/lorebook.mjs';
import { CoCAIPromptConfig } from '../js/data/ai_prompt_config.mjs';
import { CoCScenarioDeepOneShadow } from '../js/data/scenarios/deep_one_shadow.mjs';
import { CoCScenarioCatalog } from '../js/data/scenarios/catalog.mjs';

window.CoCScenarioCatalog = CoCScenarioCatalog;

const sample = [
    { id: 'a_always', always: true, priority: 100, content: 'ALWAYS_BLOCK', title: 'A' },
    { id: 'b_high', keys: ['码头'], priority: 50, content: 'HIGH_' + 'X'.repeat(80), title: 'B' },
    { id: 'c_low', keys: ['码头'], priority: 1, content: 'LOW_' + 'Y'.repeat(80), title: 'C' },
    { id: 'd_other', keys: ['教堂'], priority: 90, content: 'CHURCH_ONLY', title: 'D' }
];

// keyword match: 码头 hits b+c (+always); not d
{
    const r = selectLoreEntries({
        entries: sample,
        textBlob: '我们走到码头看看',
        budgetChars: 5000
    });
    const ids = r.selected.map((e) => e.id);
    assert.ok(ids.includes('a_always'));
    assert.ok(ids.includes('b_high'));
    assert.ok(ids.includes('c_low'));
    assert.ok(!ids.includes('d_other'));
}

// budget trim by priority: always first, then high before low when budget tight
{
    const r = selectLoreEntries({
        entries: sample,
        textBlob: '码头',
        budgetChars: 120 // fits always + maybe one more
    });
    const ids = r.selected.map((e) => e.id);
    assert.deepEqual(ids[0], 'a_always');
    assert.ok(ids.includes('b_high') || ids.length === 1);
    if (ids.includes('b_high')) assert.ok(!ids.includes('c_low'), 'low priority trimmed first');
}

// always-on without keywords
{
    const r = selectLoreEntries({
        entries: [{ id: 'tone', always: true, content: '语气' }],
        textBlob: '',
        budgetChars: 2000
    });
    assert.equal(r.selected.length, 1);
}

// no match → empty
{
    const r = selectLoreEntries({
        entries: [{ id: 'x', keys: ['黑礁'], content: 'reef' }],
        textBlob: '完全无关的闲聊',
        budgetChars: 2000
    });
    assert.equal(r.selected.length, 0);
    assert.equal(formatLoreBlock(r.selected), '');
}

// format block header
{
    const block = formatLoreBlock([{ id: 't', title: '标题', content: '正文' }]);
    assert.match(block, /## 相关设定/);
    assert.match(block, /### 标题/);
    assert.match(block, /正文/);
}

// scenarioIds gate
{
    const r = selectLoreEntries({
        entries: [{ id: 's', keys: ['码头'], scenarioIds: ['deep_one_shadow'], content: 'ok' }],
        textBlob: '码头',
        scenarioId: 'other',
        budgetChars: 2000
    });
    assert.equal(r.selected.length, 0);
    const r2 = selectLoreEntries({
        entries: [{ id: 's', keys: ['码头'], scenarioIds: ['deep_one_shadow'], content: 'ok' }],
        textBlob: '码头',
        scenarioId: 'deep_one_shadow',
        budgetChars: 2000
    });
    assert.equal(r2.selected.length, 1);
}

// pilot data present
assert.ok(Array.isArray(CoCScenarioDeepOneShadow.lorebook));
assert.ok(CoCScenarioDeepOneShadow.lorebook.length >= 8);
assert.ok(CoCScenarioDeepOneShadow.lorebook.some((e) => e.always));

// injection + debug stamp
{
    const gs = {
        currentLocation: '马布尔港·码头',
        aiSettings: { loreBudgetChars: DEFAULT_LORE_BUDGET_CHARS },
        scenarioRunner: { active: true, scenarioId: 'deep_one_shadow', currentNodeId: 'arrival', scenarioTitle: '深潜者之影' },
        chatHistory: [
            { role: 'user', content: '我们去码头找老渔夫打听满月失踪案' },
            { role: 'assistant', content: '雾很浓，缆桩上坐着抽烟的渔夫。' }
        ],
        lorebook: CoCScenarioDeepOneShadow.lorebook
    };
    const inj = buildLorePromptInjection(gs);
    assert.match(inj, /## 相关设定/);
    assert.ok(gs.__loreLastInjected);
    assert.ok(gs.__loreLastInjected.ids.length >= 1);
    assert.ok(gs.__loreLastInjected.ids.includes('dos_always_tone'));
}

// wired into system injection
{
    const gs = {
        currentLocation: '锚与烛台旅馆',
        aiSettings: { difficultyPreset: 'standard', loreBudgetChars: 2000 },
        scenarioRunner: { scenarioId: 'deep_one_shadow', currentNodeId: 'inn_talk' },
        chatHistory: [{ role: 'user', content: '询问玛莎关于神父与黑礁' }],
        lorebook: CoCScenarioDeepOneShadow.lorebook,
        kpEngine: { enabled: false },
        activeCampaign: null
    };
    const inj = CoCAIPromptConfig.buildSystemInjection('【Bob】(HP:10/10)', 'standard', gs);
    assert.match(inj, /相关设定/);
}


// pack lore expansion: other builtins have entries; select works for asylum
import { CoCScenarioAbandonedAsylum } from '../js/data/scenarios/abandoned_asylum.mjs';
import { CoCScenarioMidnightMuseum } from '../js/data/scenarios/midnight_museum.mjs';
import { BUILTIN_SCENARIOS } from '../js/data/scenarios/builtins.mjs';

{
    assert.ok(Array.isArray(CoCScenarioAbandonedAsylum.lorebook));
    assert.ok(CoCScenarioAbandonedAsylum.lorebook.length >= 5);
    assert.ok(CoCScenarioAbandonedAsylum.lorebook.some((e) => e.always));
    const r = selectLoreEntries({
        entries: CoCScenarioAbandonedAsylum.lorebook,
        textBlob: '我们在铁门前犹豫，准备进入疗养院调查',
        scenarioId: 'abandoned_asylum',
        location: '石岭疗养院·铁门',
        budgetChars: 2000
    });
    assert.ok(r.selected.length >= 1, 'asylum lore should select');
    assert.ok(Array.isArray(CoCScenarioMidnightMuseum.lorebook));
    assert.ok(CoCScenarioMidnightMuseum.lorebook.length >= 5);
    const withLore = BUILTIN_SCENARIOS.filter((s) => Array.isArray(s.lorebook) && s.lorebook.length >= 5);
    assert.ok(withLore.length >= 10, 'most builtins should carry lorebook');
}


// hunt fixes: budget 0 + no title false-hit
{
    const r0 = selectLoreEntries({
        entries: [{ id: 'a', always: true, content: 'HELLO' }],
        budgetChars: 0
    });
    assert.equal(r0.selected.length, 0, 'budget 0 selects nothing');
    assert.equal(r0.usedChars, 0);
    assert.equal(r0.leftoverBudget, 0);

    const gs0 = {
        lorebook: [{ id: 'a', always: true, content: 'HELLO_WORLD' }],
        aiSettings: { loreBudgetChars: 0 },
        scenarioRunner: { scenarioId: 'deep_one_shadow', scenarioTitle: '深潜者之影' },
        chatHistory: []
    };
    const inj0 = buildLorePromptInjection(gs0);
    assert.equal(inj0, '');
    assert.equal(gs0.__loreLastInjected.chars, 0);
}

{
    const blob = buildLoreTextBlob({
        currentLocation: '',
        scenarioRunner: { scenarioId: 'deep_one_shadow', scenarioTitle: '深潜者之影', currentNodeId: 'arrival' },
        chatHistory: []
    });
    assert.ok(!blob.includes('深潜者之影'), 'scenarioTitle must not enter keyword blob');
    const r = selectLoreEntries({
        entries: [{ id: 'dos_mythos', keys: ['深潜', '神话'], content: 'myth', scenarioIds: ['deep_one_shadow'] }],
        textBlob: blob,
        scenarioId: 'deep_one_shadow',
        budgetChars: 500
    });
    assert.equal(r.selected.length, 0, 'title alone must not trigger mythos keys');
}


console.log('lorebook_smoke: OK', {
    defaultBudget: DEFAULT_LORE_BUDGET_CHARS,
    pilotEntries: CoCScenarioDeepOneShadow.lorebook.length,
    asylumEntries: CoCScenarioAbandonedAsylum.lorebook.length
});
