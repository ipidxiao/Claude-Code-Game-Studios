/**
 * ADR-0003 per-player visibility smoke.
 * Builds state through the real writers (state core, gameplay, investigator records, KP engine)
 * rather than hand-made private records, then checks what projectFor lets through.
 * Also covers the v9 save normalisation (invId, exploredBy, msgId) and idempotence.
 */
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

// --- browser globals the state core expects at import time ---
const API_KEY = 'sk-LEAKTEST-0123456789abcdef';
const storage = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
globalThis.sessionStorage = storage();
globalThis.localStorage = storage();
globalThis.sessionStorage.setItem('vue_coc_api_cloud', JSON.stringify({
    baseUrl: 'https://api.deepseek.com/chat/completions', apiKey: API_KEY, model: 'deepseek-chat'
}));
globalThis.window = globalThis.window || {};
globalThis.window.Vue = { reactive: (o) => o, ref: (v) => ({ value: v }), nextTick: (fn) => fn && fn() };

const { CoCStateCore } = await import('../js/state/core.mjs');
const { CoCStateGameplay } = await import('../js/state/gameplay.mjs');
const { createInvestigatorRecord, ensureInvIds, resolveInvId } = await import('../js/state/char_record.mjs');
const { KpExecutionEngine } = await import('../js/campaign/kp_execution_engine.mjs');
const {
    projectFor, projectHistoryPage, canSee, applySafety, assignStableIds,
    GUEST_TOP_LEVEL_ALLOWLIST, NEVER_PROJECT, CHAT_WINDOW
} = await import('../js/state/visibility.mjs');
const { CoCStatePersistence, SAVE_SCHEMA_VERSION } = await import('../js/state/persistence.mjs');

const core = CoCStateCore;
const gs = core.gameState;
const play = CoCStateGameplay.create(core);

// --- real writers ---
assert.equal(gs.aiSettings.apiKey, API_KEY, 'fixture: the key is in runtime gameState like in the app');
assert.ok(gs.chatHistory.some((m) => m.role === 'system' && m.isHidden), 'fixture: core wrote the keeper system prompt');
const systemPrompt = gs.chatHistory.find((m) => m.role === 'system').content.slice(0, 30);

gs.roster.push(createInvestigatorRecord({ name: 'Ann', backstory: { description: '灰色风衣', ideology: 'ANN-SECRET-IDEOLOGY' } }));
gs.roster.push(createInvestigatorRecord({ name: 'Bo', backstory: { description: '圆框眼镜', ideology: 'BO-SECRET-IDEOLOGY' } }));
const [ann, bo] = gs.roster;
assert.match(ann.invId, /^inv_/);
assert.notEqual(ann.invId, bo.invId);

gs.chatHistory.push({ role: 'user', content: '我检查门锁。', charName: 'Ann' });
gs.chatHistory.push({ role: 'assistant', content: '门锁上有新鲜的划痕。', tool_calls: [{ id: 'call_1', function: { name: 'request_skill_check', arguments: '{"secret":"TOOLARG"}' } }] });
// Shapes written by ai_logic.mjs:679-696 / :728 during a skill check.
gs.chatHistory.push({ role: 'system', isLocalOnly: true, content: '【Ann】进行【侦查】检定：骰出 37/50，成功。' });
gs.chatHistory.push({ role: 'tool', name: 'request_skill_check', isHidden: true, tool_call_id: 'call_1', content: '结果：成功（37/50）。TOOLRESULT' });

// Defense in depth: each layer must hold on its own. Today every system/tool message also carries
// isHidden/isLocalOnly, so add one record that only the role rule stops and one only the flag rule stops.
gs.chatHistory.push({ role: 'system', content: 'UNFLAGGED-SYSTEM-NOTE' });
gs.chatHistory.push({ role: 'assistant', isHidden: true, content: 'HIDDEN-ASSISTANT-DRAFT' });

play.rollCustomDice('1d6', '伤害', 'Ann', 'test');
play.createMap('码头仓库', [{ id: 'hall', name: '大厅' }, { id: 'cellar', name: '地下室', note: 'KEEPER-ROOM-NOTE' }]);
play.setPosition('hall');
play.addClue('c_pub', '撕下的日记页', '公开线索', 'document');
play.addClue('c_ann', '密码纸条', 'ANN-PRIVATE-CLUE', 'document');
play.addClue('c_kp', '守秘人备忘', 'KEEPER-ONLY-CLUE', 'note');
play.linkClues('c_pub', 'c_kp', 'KEEPER-LINK-NOTE');
gs.clueBoard.clues.find((c) => c.id === 'c_ann').vis = { to: [ann.invId] };   // vis-aware writers come with ADR-0003 step 4
gs.clueBoard.clues.find((c) => c.id === 'c_kp').vis = { to: 'keeper' };

// Real KP engine hidden operation (kp_execution_engine.mjs applySocialInfiltration).
gs.npcRegistry.push({ id: 'n1', name: '码头工头', status: 'alive', relation: 'ally', notes: [] });
const kp = Object.assign(Object.create(KpExecutionEngine), {
    isEnabled: () => true,
    adaptStrategy: () => ({ weights: { socialInfiltration: 1 } })
});
const origRandom = Math.random;
Math.random = () => 0;
try { assert.ok(kp.applySocialInfiltration(gs, { type: 'test' }), 'fixture: KP engine wrote its hidden note'); }
finally { Math.random = origRandom; }

assignStableIds(gs);

const annView = { memberId: 'mA', role: 'guest', invIds: [ann.invId], limits: null };
const boView = { memberId: 'mB', role: 'guest', invIds: [bo.invId], limits: null };
const devView = { memberId: 'mD', role: 'developer', invIds: [], limits: null };

// --- guest: nothing secret gets through ---
for (const viewer of [annView, boView]) {
    const v = projectFor(viewer, gs);
    const text = JSON.stringify(v);
    assert.ok(!text.includes(systemPrompt), 'keeper system prompt must not reach a guest');
    assert.ok(!text.includes(API_KEY), 'AI key must not reach a guest');
    assert.ok(!text.includes('TOOLARG') && !text.includes('TOOLRESULT'), 'tool calls/results must not reach a guest');
    assert.ok(!text.includes('骰出 37/50'), 'local-only check line must not reach a guest');
    assert.ok(!text.includes('_kpCompromised') && !text.includes('社交渗透'), 'KP hidden operation must not reach a guest');
    assert.ok(!text.includes('KEEPER-ONLY-CLUE') && !text.includes('KEEPER-LINK-NOTE'), 'keeper clue and its link must not reach a guest');
    assert.ok(!text.includes('KEEPER-ROOM-NOTE'), 'room note must not reach a guest');
    assert.ok(!text.includes('UNFLAGGED-SYSTEM-NOTE'), 'system messages never reach a guest, flagged or not');
    assert.ok(!text.includes('HIDDEN-ASSISTANT-DRAFT'), 'hidden messages never reach a guest, whatever their role');
    assert.ok(v.clueBoard.links.every((l) => l.from !== 'c_kp' && l.to !== 'c_kp'), 'links to hidden clues must not reach a guest');
    for (const k of Object.keys(v)) assert.ok(GUEST_TOP_LEVEL_ALLOWLIST.includes(k), `unexpected guest field ${k}`);
    for (const k of ['kpEngine', 'kpState', 'npcRegistry', 'flags', 'scenarioRunner', 'aiSettings', 'ui']) {
        assert.equal(v[k], undefined, `${k} must not reach a guest`);
    }
    assert.ok(v.chatHistory.every((m) => m.role === 'user' || m.role === 'assistant' || m.kind === 'roll'));
    assert.ok(v.chatHistory.every((m) => !('tool_calls' in m)));
}

const a = projectFor(annView, gs);
const b = projectFor(boView, gs);
assert.ok(JSON.stringify(a).includes('ANN-PRIVATE-CLUE'), 'Ann sees her own clue');
assert.ok(!JSON.stringify(b).includes('ANN-PRIVATE-CLUE'), 'Bo does not see Ann\'s clue');
assert.ok(JSON.stringify(a).includes('ANN-SECRET-IDEOLOGY'), 'Ann sees her own full card');
assert.ok(!JSON.stringify(b).includes('ANN-SECRET-IDEOLOGY'), 'Bo sees only Ann\'s public card');
assert.equal(b.roster.find((c) => c.invId === ann.invId).appearance, '灰色风衣', 'public appearance is shared');
assert.deepEqual(a.sceneMap.rooms.map((r) => r.id), ['hall'], 'only rooms the party explored');
assert.equal(typeof a.sceneMap.rooms[0].x, 'number', 'rooms keep drawing coordinates');
assert.deepEqual(projectFor({ role: 'guest', invIds: [] }, gs).sceneMap.rooms, [], 'a viewer with no investigators sees no rooms');

// --- positive: every allowlisted field is delivered ---
for (const k of GUEST_TOP_LEVEL_ALLOWLIST) assert.ok(k in a, `guest view must include ${k}`);
assert.ok(a.chatHistory.some((m) => m.content === '门锁上有新鲜的划痕。'), 'narration reaches guests');
assert.ok(a.diceHistory.some((d) => d.label === '伤害'), 'public roll reaches guests');

// --- developer: game data yes, secrets and local UI no ---
const d = projectFor(devView, gs);
const dText = JSON.stringify(d);
assert.ok(!dText.includes(API_KEY), 'AI key must not reach a developer either (ADR-0003 R3-F1)');
for (const k of NEVER_PROJECT) assert.equal(d[k], undefined, `${k} must not reach a developer`);
const { KEEPER_DATA_FIELDS } = await import('../js/state/visibility.mjs');
for (const k of NEVER_PROJECT) {
    assert.ok(!GUEST_TOP_LEVEL_ALLOWLIST.includes(k) && !KEEPER_DATA_FIELDS.includes(k), `${k} must not be on any allowlist`);
}
assert.ok(dText.includes('KEEPER-ONLY-CLUE') && Array.isArray(d.npcRegistry), 'developer sees keeper data');

// --- personal limits apply to developers and guests alike ---
gs.chatHistory.push({ role: 'assistant', content: 'GORE-DETAIL', safety: { tags: ['gore'], summary: '你们发现了遇害者。' } });
assignStableIds(gs);
const veiled = projectFor(Object.assign({}, devView, { limits: { veils: ['gore'] } }), gs);
assert.ok(!JSON.stringify(veiled.chatHistory).includes('GORE-DETAIL') && JSON.stringify(veiled).includes('你们发现了遇害者。'));
assert.ok(JSON.stringify(projectFor(annView, gs)).includes('GORE-DETAIL'), 'others still see the full text');
assert.ok(!JSON.stringify(projectFor(Object.assign({}, annView, { limits: { lines: ['gore'] } }), gs)).includes('GORE-DETAIL'));
assert.equal(applySafety({ content: 'x' }, { lines: ['gore'] }).content, 'x', 'untagged records are untouched');

// --- dark roll placeholders are generated, never stored ---
gs.diceHistory.unshift({ rollId: 'r_dark', label: '侦查', total: 88, vis: { to: 'keeper' } });
gs.chatHistory.push({ role: 'system', kind: 'roll', rollId: 'r_dark', label: '侦查', content: '侦查 骰出 88/50', vis: { to: 'keeper' } });
assignStableIds(gs);
const g2 = projectFor(annView, gs);
const darkDice = g2.diceHistory.filter((x) => x.rollId === 'r_dark');
assert.equal(darkDice.length, 1, 'one entry per rollId in a view');
assert.equal(darkDice[0].hidden, true);
assert.equal(darkDice[0].total, undefined, 'dark-roll total must not reach a guest');
assert.ok(!JSON.stringify(g2).includes('骰出 88'), 'dark-roll chat line must not reach a guest');
assert.ok(g2.chatHistory.some((m) => m.rollId === 'r_dark' && /暗骰/.test(m.content)), 'placeholder appears in the guest chat window');
assert.equal(gs.diceHistory.filter((x) => x.rollId === 'r_dark').length, 1, 'authoritative state holds no placeholder');
assert.ok(JSON.stringify(projectFor(devView, gs)).includes('骰出 88'), 'developer sees the value');

// --- projection is pure ---
const before = JSON.stringify(gs.roster);
projectFor(annView, gs);
assert.equal(JSON.stringify(gs.roster), before, 'projectFor must not mutate gameState');

// --- chat window and history page ---
for (let i = 0; i < CHAT_WINDOW + 20; i++) gs.chatHistory.push({ role: 'assistant', content: 'line ' + i });
assignStableIds(gs);
const w = projectFor(annView, gs);
assert.equal(w.chatHistory.length, CHAT_WINDOW);
const firstInWindow = w.chatHistory[0].msgId;
const page = projectHistoryPage(annView, gs, firstInWindow, 10);
assert.equal(page.length, 10);
assert.ok(page.every((m) => m.role === 'user' || m.role === 'assistant' || m.kind === 'roll'), 'history pages use the same rules');
assert.ok(!JSON.stringify(projectHistoryPage(annView, gs, null, CHAT_WINDOW)).includes(systemPrompt));

// --- helpers ---
assert.equal(canSee(annView, undefined), true);
assert.equal(canSee(annView, { to: 'keeper' }), false);
assert.equal(canSee(devView, { to: 'keeper' }), true);
assert.equal(resolveInvId('Ann', gs.roster), ann.invId);
assert.equal(resolveInvId(ann.invId, gs.roster), ann.invId);
assert.equal(resolveInvId('Nobody', gs.roster), null, 'unknown names resolve to null (caller must use keeper-only)');
const dup = ensureInvIds([{ name: 'X', invId: 'inv_same' }, { name: 'Y', invId: 'inv_same' }]);
assert.notEqual(dup[0].invId, dup[1].invId, 'duplicate invIds are repaired');

// --- every roster entry point yields invIds ---
{
    const { restoreCarrySnapshot } = await import('../js/state/arc_ledger.mjs');
    const target = { roster: [], inventory: [], storage: [] };
    restoreCarrySnapshot(target, { ledger: { characterSnapshot: [{ name: 'Legacy' }], inventorySnapshot: [], storageSnapshot: [] } });
    assert.match(target.roster[0].invId, /^inv_/, 'arc-ledger restore gives old characters an invId');
    const { CoCStateAccessor } = await import('../js/state/accessor.mjs');
    assert.equal(typeof CoCStateAccessor.addToRoster, 'function');
}

// --- v9 save normalisation ---
assert.equal(SAVE_SCHEMA_VERSION, 9);
{
    const api = CoCStatePersistence.create({ gameState: gs, switchScreen: () => {} }, {
        showToast: () => {}, _safeLocalStorageSetItem: () => true, _pushSystemNotice: () => {},
        compactChatHistory: () => {}, _formatStorageError: (_e, f) => f
    });
    const migrate = api.migrateSaveData;
    assert.equal(typeof migrate, 'function', 'migrateSaveData must be reachable');
    {
        const v8 = JSON.parse(await readFile(new URL('./fixtures/r29_19_save.json', import.meta.url), 'utf8'));
        v8.data.sceneMap = { title: 't', rooms: [{ id: 'a', status: 'explored' }, { id: 'b', status: 'unknown' }], currentRoomId: null };
        const m1 = migrate(structuredClone(v8));
        assert.equal(m1.version, 9);
        assert.ok(m1.data.roster.every((c) => /^inv_/.test(c.invId)), 'v8 roster gains invIds');
        const everyone = m1.data.roster.map((c) => c.invId);
        assert.deepEqual(m1.data.sceneMap.rooms[0].exploredBy, everyone, 'pre-v9 explored rooms belong to everyone');
        assert.equal(m1.data.sceneMap.rooms[1].exploredBy, undefined, 'unexplored rooms stay unexplored');
        assert.ok(m1.data.chatHistory.every((m) => m.msgId), 'chat messages gain msgId');
        const m2 = migrate(structuredClone(m1));
        assert.deepEqual(m2.data.roster.map((c) => c.invId), everyone, 'normalisation is idempotent');
        const v9 = structuredClone(m1);
        v9.data.sceneMap.rooms.push({ id: 'c', status: 'explored' });
        const m3 = migrate(v9);
        assert.equal(m3.data.sceneMap.rooms.find((r) => r.id === 'c').exploredBy, undefined, 'v9 rooms without exploredBy are not widened');
    }
}

console.log('visibility_leak_smoke: OK');
