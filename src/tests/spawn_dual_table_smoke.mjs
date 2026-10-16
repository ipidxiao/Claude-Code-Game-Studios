/**
 * Dual-table spawn bridge: npc_templates preferred; creatures_summary fallback.
 * Also: English id aliases → template stats; fuzzy match min length 2.
 */
import { strict as assert } from 'node:assert';
import {
    generateNpcFromTemplate,
    CoCNpcTemplates,
    getSummaryIdToTemplateMap
} from '../js/data/npc_templates.mjs';
import { lookupCreature } from '../js/data/creatures_summary.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { buildCoCEngine } from '../js/engines/index.mjs';

const aliasMap = getSummaryIdToTemplateMap();
assert.equal(aliasMap.cultist, '邪教徒');
assert.equal(aliasMap.deepone, '深潜者');
assert.equal(aliasMap.migo, '米·戈');
assert.equal(aliasMap.cthulhu, undefined, 'cthulhu must not alias to 星之眷族');
assert.equal(aliasMap.deepone_hybrid, undefined, 'hybrid must not alias to 深潜者');

// Chinese → template
assert.equal(generateNpcFromTemplate('深潜者').hp, 13);
assert.equal(generateNpcFromTemplate('深潜者').sourceTable, 'npc_templates');
assert.equal(generateNpcFromTemplate('邪教徒').hp, 11);

// English ids → template stats (not weaker summary)
for (const [id, zh, hp] of [
    ['cultist', '邪教徒', 11],
    ['deepone', '深潜者', 13],
    ['migo', '米·戈', 12],
    ['nightgaunt', '夜魇', 13],
    ['shoggoth', '修格斯', 19],
    ['byakhee', '拜亚基', 13],
    ['ghoul', '食尸鬼', 13]
]) {
    const n = generateNpcFromTemplate(id);
    assert.ok(n, id);
    assert.equal(n.sourceTable, 'npc_templates', id + ' source');
    assert.equal(n.hp, hp, id + ' hp');
    assert.equal(n.name, zh, id + ' default name uses template key');
}

// Summary-only still works
assert.equal(CoCNpcTemplates['保安'], undefined);
const guard = generateNpcFromTemplate('保安', { name: '门岗' });
assert.equal(guard.sourceTable, 'creatures_summary');
assert.equal(guard.creatureId, 'security_guard');
assert.equal(guard.hp, 11);

const kid = generateNpcFromTemplate('darkyoung');
assert.equal(kid.sourceTable, 'creatures_summary');
assert.equal(kid.creatureId, 'darkyoung');

const hybrid = generateNpcFromTemplate('deepone_hybrid');
assert.equal(hybrid.sourceTable, 'creatures_summary', 'hybrid stays on summary');
assert.equal(hybrid.creatureId, 'deepone_hybrid');
assert.equal(hybrid.hp, 12);

const cthulhu = generateNpcFromTemplate('cthulhu');
assert.equal(cthulhu.sourceTable, 'creatures_summary');
assert.equal(cthulhu.hp, 160);

// Fuzzy: intentional partial ≥2
const fuzzy = generateNpcFromTemplate('深潜');
assert.ok(fuzzy);
assert.equal(fuzzy.name, '深潜者');
assert.equal(fuzzy.hp, 13);

// Fuzzy: single-char must NOT resolve
for (const ch of ['教', '者', '深', '鬼', '米', '人']) {
    assert.equal(generateNpcFromTemplate(ch), null, 'single-char must fail: ' + ch);
}

assert.equal(generateNpcFromTemplate('不存在的生物xyz'), null);

// spawn_npc end-to-end
const Engine = buildCoCEngine();
const gs = {
    roster: [], chatHistory: [], inventory: [],
    combat: { active: true, enemies: [], initiativeOrder: [], currentTurnIdx: 0 }
};
const cb = combat({ gameState: gs, Engine, addJournalEntry: () => {}, advanceTurn: () => {} });
assert.match(cb.spawn_npc({ template: 'cultist', name: '信徒甲' }), /已生成/);
assert.equal(gs.combat.enemies[0].hp, 11, 'spawn_npc cultist uses template hp');
assert.equal(gs.combat.enemies[0]._rosterName, '信徒甲');
assert.equal(gs.combat.enemies[0].sourceTable, 'npc_templates');
assert.match(cb.spawn_npc({ template: 'security_guard', name: '馆保安' }), /已生成/);
assert.equal(gs.combat.enemies[1].creatureId, 'security_guard');

console.log('spawn_dual_table_smoke: OK');
