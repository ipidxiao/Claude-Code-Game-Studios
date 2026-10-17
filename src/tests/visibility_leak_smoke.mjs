/**
 * ADR-0003 per-player visibility smoke.
 *
 * State is built through the real writers where they exist (state core, gameplay map / clue /
 * dice / combat, investigator records, KP engine, arc ledger, persistence). Records whose writer
 * does not yet carry vis (ADR-0003 step 4) are added in the shape those writers produce.
 *
 * Each assertion is arranged so that exactly one projection rule stops the secret: a secret that
 * two rules would both stop proves neither. The independent code review of 2026-10-17 broke the
 * filter 23 ways; every one of those breakages must fail this file.
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
const { restoreCarrySnapshot, exportArcLedger } = await import('../js/state/arc_ledger.mjs');
const {
    projectFor, projectHistoryPage, canSee, applySafety, assignStableIds,
    GUEST_TOP_LEVEL_ALLOWLIST, KEEPER_DATA_FIELDS, NEVER_PROJECT, CHAT_WINDOW
} = await import('../js/state/visibility.mjs');
const { CoCStatePersistence, SAVE_SCHEMA_VERSION } = await import('../js/state/persistence.mjs');

const core = CoCStateCore;
const gs = core.gameState;
globalThis.window.CoCState = { gameState: gs };
const { CoCStateAccessor } = await import('../js/state/accessor.mjs');
const play = CoCStateGameplay.create(core);
const has = (obj, s) => JSON.stringify(obj).includes(s);

// ═══ Arrange: real writers ═══════════════════════════════════════════════════
assert.equal(gs.aiSettings.apiKey, API_KEY, 'fixture: the key is in runtime gameState like in the app');
const promptMsg = gs.chatHistory.find((m) => m.role === 'system' && m.isHidden);
assert.ok(promptMsg, 'fixture: core wrote the keeper system prompt');
const systemPrompt = promptMsg.content.slice(0, 30);

const annRecord = createInvestigatorRecord({ name: 'Ann', backstory: { description: '灰色风衣', ideology: 'ANN-SECRET-IDEOLOGY' } });
assert.match(annRecord.invId, /^inv_/, 'createInvestigatorRecord issues the id at creation');
gs.roster.push(annRecord);
CoCStateAccessor.addToRoster({ name: 'Bo', backstory: { description: '圆框眼镜', ideology: 'BO-SECRET-IDEOLOGY' } });
const [ann, bo] = gs.roster;
assert.match(ann.invId, /^inv_/);
assert.match(bo.invId, /^inv_/, 'addToRoster issues an invId for a record without one');
assert.notEqual(ann.invId, bo.invId);

// Chat: one record per rule.
gs.chatHistory.push({ role: 'user', content: '我检查门锁。', charName: 'Ann' });
gs.chatHistory.push({ role: 'assistant', content: '门锁上有新鲜的划痕。', tool_calls: [{ id: 'call_1', function: { name: 'request_skill_check', arguments: '{"secret":"TOOLARG"}' } }] });
gs.chatHistory.push({ role: 'system', isLocalOnly: true, content: '【Ann】进行【侦查】检定：骰出 37/50，成功。' });   // ai_logic.mjs:695
gs.chatHistory.push({ role: 'tool', name: 'request_skill_check', isHidden: true, tool_call_id: 'call_1', content: '结果：成功（37/50）。TOOLRESULT' });   // ai_logic.mjs:728
gs.chatHistory.push({ role: 'system', content: 'UNFLAGGED-SYSTEM-NOTE' });                       // only the role rule stops it
gs.chatHistory.push({ role: 'assistant', isHidden: true, content: 'HIDDEN-ASSISTANT-DRAFT' });   // only the flag rule stops it
gs.chatHistory.push({ role: 'assistant', content: 'BO-ONLY-NARRATION', vis: { to: [bo.invId] } }); // only vis stops it

// Dice: real writer, plus one hidden-by-flag entry.
play.rollCustomDice('1d6', '伤害', 'Ann', 'test');
gs.diceHistory.unshift({ label: 'FLAG-DICE', total: 4, isHidden: true });

// Map: real writers. The note sits on an explored room so only the field rule can stop it.
play.createMap('码头仓库', [
    { id: 'hall', name: '大厅', connections: ['cellar', 'yard'], note: 'HALL-KEEPER-NOTE', x: 3, y: 4 },
    { id: 'yard', name: '后院', status: 'explored', connections: ['hall'] },
    { id: 'cellar', name: '地下室' },
    { id: 'attic', name: '阁楼' }
]);
play.setPosition('hall');
play.updateRoom('attic', 'explored');

// Clues: real writers; vis added in the writer's shape.
play.addClue('c_pub', '撕下的日记页', '公开线索', 'document');
play.addClue('c_pub2', '码头收据', '另一条公开线索', 'document');
play.addClue('c_ann', '密码纸条', 'ANN-PRIVATE-CLUE', 'document');
play.addClue('c_kp', '守秘人备忘', 'KEEPER-ONLY-CLUE', 'note');
play.addClue('c_flag', '隐藏线索', 'FLAG-HIDDEN-CLUE', 'note');
play.linkClues('c_pub', 'c_pub2', 'PUBLIC-LINK-NOTE');   // both ends public: only the field rule stops the note
play.linkClues('c_pub', 'c_kp', 'x');
const clue = (id) => gs.clueBoard.clues.find((c) => c.id === id);
clue('c_ann').vis = { to: [ann.invId] };
clue('c_kp').vis = { to: 'keeper' };
clue('c_flag').isHidden = true;
clue('c_pub').note = 'CLUE-KEEPER-NOTE';

// Journal: real writer, one entry per rule.
core.addJournalEntry({ type: 'skill_check', summary: 'BO-PRIVATE-JOURNAL', vis: { to: [bo.invId] } });
core.addJournalEntry({ type: 'dice', summary: 'FLAG-HIDDEN-JOURNAL', isLocalOnly: true });
core.addJournalEntry({ type: 'note', summary: 'KEEPER-PERSONAL-NOTE' });
core.addJournalEntry({ summary: 'UNTYPED-JOURNAL' });

// Items, atmosphere, combat.
gs.inventory.push('旧怀表');
gs.inventory.push({ name: '左轮手枪', type: 'weapon', qty: 1, scenarioFlag: 'ITEM-SCENARIO-FLAG' });
gs.atmosphere = { level: 'tense', note: 'ATMO-KEEPER-NOTE' };
play.startCombat([{ name: '深潜者', hp: 4321, maxHp: 4321 }], '码头', 'COMBAT-KEEPER-NOTE');

// KP engine hidden operation (kp_execution_engine.mjs applySocialInfiltration).
gs.npcRegistry.push({ id: 'n1', name: '码头工头', status: 'alive', relation: 'ally', notes: [] });
const kp = Object.assign(Object.create(KpExecutionEngine), { isEnabled: () => true, adaptStrategy: () => ({ weights: { socialInfiltration: 1 } }) });
const origRandom = Math.random;
Math.random = () => 0;
try { assert.ok(kp.applySocialInfiltration(gs, { type: 'test' }), 'fixture: KP engine wrote its hidden note'); }
finally { Math.random = origRandom; }

assignStableIds(gs);

// Split-path group check (group_check.mjs syncSplitDisplayLocation): Bo alone moves to the dock.
{
    const { syncSplitDisplayLocation } = await import('../js/campaign/group_check.mjs');
    gs.sceneMap.rooms.push({ id: 'dock', name: '栈桥', status: 'unknown', x: 0, y: 0, connections: [] });
    gs.groupCheckSession = { splitPaths: true, queue: ['Bo'], charLocations: { Bo: { location: '栈桥', mapRoom: 'dock' } } };
    syncSplitDisplayLocation(gs);
    gs.groupCheckSession = null;
    play.setPosition('hall');   // the party view returns to the hall
}

const pristine = JSON.stringify(gs);
const annView = { memberId: 'mA', role: 'guest', invIds: [ann.invId], limits: null };
const boView = { memberId: 'mB', role: 'guest', invIds: [bo.invId], limits: null };
const noneView = { memberId: 'mN', role: 'guest', invIds: [], limits: null };
const devView = { memberId: 'mD', role: 'developer', invIds: [], limits: null };

// ═══ Guests: secrets ═════════════════════════════════════════════════════════
const a = projectFor(annView, gs);
const b = projectFor(boView, gs);
for (const v of [a, b]) {
    assert.ok(!has(v, systemPrompt), 'keeper system prompt');
    assert.ok(!has(v, API_KEY), 'AI key');
    assert.ok(!has(v, 'TOOLARG') && !has(v, 'TOOLRESULT'), 'tool calls and results');
    assert.ok(!has(v, '骰出 37/50'), 'local-only check line');
    assert.ok(!has(v, 'UNFLAGGED-SYSTEM-NOTE'), 'system messages, flagged or not');
    assert.ok(!has(v, 'HIDDEN-ASSISTANT-DRAFT'), 'hidden messages, whatever their role');
    assert.ok(!has(v, '_kpCompromised') && !has(v, '社交渗透'), 'KP hidden operation');
    assert.ok(!has(v, 'KEEPER-ONLY-CLUE'), 'keeper-only clue');
    assert.ok(!has(v, 'FLAG-HIDDEN-CLUE'), 'isHidden clue');
    const flagDice = v.diceHistory.find((x) => x.label === 'FLAG-DICE');
    assert.ok(flagDice && flagDice.hidden === true && flagDice.total === undefined, 'isHidden dice entry becomes a placeholder');
    assert.ok(!has(v, 'FLAG-HIDDEN-JOURNAL'), 'isLocalOnly journal entry');
    assert.ok(!has(v, 'KEEPER-PERSONAL-NOTE'), 'journal notes are keeper-only without vis');
    assert.ok(!has(v, 'UNTYPED-JOURNAL'), 'untyped journal entries are keeper-only');
    assert.ok(!has(v, 'HALL-KEEPER-NOTE'), 'room notes on explored rooms');
    assert.ok(!has(v, 'CLUE-KEEPER-NOTE'), 'clue notes on visible clues');
    assert.ok(!has(v, 'PUBLIC-LINK-NOTE'), 'link notes between visible clues');
    assert.ok(v.clueBoard.links.every((l) => l.from !== 'c_kp' && l.to !== 'c_kp'), 'links to hidden clues');
    assert.ok(v.clueBoard.clues.every((c) => !('vis' in c) && !('note' in c)), 'clue records carry no vis or note');
    assert.ok(!has(v, 'ITEM-SCENARIO-FLAG'), 'scenario fields on items');
    assert.ok(!has(v, 'ATMO-KEEPER-NOTE'), 'atmosphere note');
    assert.ok(!has(v.combat, '4321') && !has(v, 'COMBAT-KEEPER-NOTE'), 'combat numbers and notes');
    assert.ok(!v.sceneMap.rooms.some((r) => r.id === 'cellar'), 'unexplored rooms');
    assert.ok(v.sceneMap.rooms.every((r) => r.connections.every((c) => c !== 'cellar')), 'connections to unexplored rooms');
    for (const k of Object.keys(v)) assert.ok(GUEST_TOP_LEVEL_ALLOWLIST.includes(k), `unexpected guest field ${k}`);
    assert.ok(v.chatHistory.every((m) => !('tool_calls' in m) && !('vis' in m)));
}
assert.ok(!has(a, 'BO-ONLY-NARRATION') && has(b, 'BO-ONLY-NARRATION'), 'narration with vis reaches only its investigator');
assert.ok(!has(a, 'BO-PRIVATE-JOURNAL') && has(b, 'BO-PRIVATE-JOURNAL'), 'journal with vis reaches only its investigator');
assert.ok(has(a, 'ANN-PRIVATE-CLUE') && !has(b, 'ANN-PRIVATE-CLUE'), 'clue with vis reaches only its investigator');
assert.ok(has(a, 'ANN-SECRET-IDEOLOGY') && !has(b, 'ANN-SECRET-IDEOLOGY'), 'full card only for its controller');
assert.equal(b.roster.find((c) => c.invId === ann.invId).appearance, '灰色风衣', 'public appearance is shared');
assert.equal(projectFor(noneView, gs).sceneMap.currentRoomId, null, 'currentRoomId only when that room is in the viewer\'s map');
assert.deepEqual(projectFor(noneView, gs).sceneMap.rooms, [], 'no investigators, no rooms');

// ═══ Guests: what they must get (non-empty, not just present) ═════════════════
assert.deepEqual(a.sceneMap.rooms.map((r) => r.id).sort(), ['attic', 'hall', 'yard'], 'setPosition, updateRoom and createMap(explored) all mark rooms');
assert.ok(b.sceneMap.rooms.some((r) => r.id === 'dock'), 'Bo walked to the dock alone and has it');
assert.ok(!a.sceneMap.rooms.some((r) => r.id === 'dock'), 'Ann, elsewhere on a split path, does not get the dock');
assert.deepEqual(a.sceneMap.rooms.find((r) => r.id === 'hall').connections, ['yard']);
assert.equal(a.sceneMap.rooms.find((r) => r.id === 'hall').x, 3, 'rooms keep drawing coordinates');
assert.equal(a.sceneMap.currentRoomId, 'hall');
assert.equal(a.currentLocation, '大厅');
assert.ok(a.knownLocations.includes('大厅'));
assert.ok(a.chatHistory.some((m) => m.content === '门锁上有新鲜的划痕。'), 'narration');
assert.ok(a.diceHistory.some((d) => d.label === '伤害' && Number.isFinite(d.total)), 'public roll with its value');
assert.ok(a.journalLog.some((e) => e.type === 'map'), 'public journal types');
assert.ok(a.clueBoard.clues.some((c) => c.id === 'c_pub') && a.clueBoard.links.some((l) => l.from === 'c_pub' && l.to === 'c_pub2'));
assert.deepEqual(a.inventory, ['旧怀表', { name: '左轮手枪', type: 'weapon', qty: 1 }]);
assert.ok(Array.isArray(a.storage));
assert.equal(a.atmosphere.level, 'tense');
assert.ok(a.worldClock && Number.isFinite(a.worldClock.day));
assert.equal(typeof a.keeperStyle, 'string');
assert.equal(a.combat.active, true);
assert.ok(a.combat.initiativeOrder.length > 0 && a.combat.initiativeOrder.every((t) => typeof t.name === 'string'));
assert.equal(typeof a.chase.active, 'boolean');

// ═══ Developer: game data yes, secrets and local UI no ═══════════════════════
const d = projectFor(devView, gs);
assert.ok(!has(d, API_KEY), 'AI key must not reach a developer');
for (const k of NEVER_PROJECT) {
    assert.equal(d[k], undefined, `${k} must not reach a developer`);
    assert.ok(!GUEST_TOP_LEVEL_ALLOWLIST.includes(k) && !KEEPER_DATA_FIELDS.includes(k), `${k} must not be on any allowlist`);
}
assert.ok(has(d, 'KEEPER-ONLY-CLUE') && Array.isArray(d.npcRegistry), 'developer sees keeper data');

// ═══ Personal limits: developers and guests alike ════════════════════════════
gs.chatHistory.push({ role: 'assistant', content: 'GORE-DETAIL', safety: { tags: ['gore'], summary: '你们发现了遇害者。' } });
assignStableIds(gs);
const veiled = projectFor(Object.assign({}, devView, { limits: { veils: ['gore'] } }), gs);
assert.ok(!has(veiled.chatHistory, 'GORE-DETAIL') && has(veiled, '你们发现了遇害者。'));
assert.ok(has(projectFor(annView, gs), 'GORE-DETAIL'), 'others still see the full text');
assert.ok(!has(projectFor(Object.assign({}, annView, { limits: { lines: ['gore'] } }), gs), 'GORE-DETAIL'));
assert.equal(applySafety({ content: 'x' }, { lines: ['gore'] }).content, 'x', 'untagged records are untouched');

// ═══ Dark roll: placeholders generated, never stored ═════════════════════════
gs.diceHistory.unshift({ rollId: 'r_dark', label: '侦查', total: 88, vis: { to: 'keeper' } });
gs.chatHistory.push({ role: 'system', kind: 'roll', rollId: 'r_dark', label: '侦查', content: '侦查 骰出 88/50', vis: { to: 'keeper' } });
assignStableIds(gs);
const g2 = projectFor(annView, gs);
const darkDice = g2.diceHistory.filter((x) => x.rollId === 'r_dark');
assert.equal(darkDice.length, 1, 'one entry per rollId in a view');
assert.equal(darkDice[0].hidden, true);
assert.equal(darkDice[0].total, undefined, 'dark-roll total');
assert.ok(!has(g2, '骰出 88'), 'dark-roll chat line');
assert.ok(g2.chatHistory.some((m) => m.rollId === 'r_dark' && /暗骰/.test(m.content)), 'placeholder appears in the guest chat window');
assert.equal(gs.diceHistory.filter((x) => x.rollId === 'r_dark').length, 1, 'authoritative state holds no placeholder');
assert.ok(has(projectFor(devView, gs), '骰出 88'), 'developer sees the value');

// ═══ Purity ══════════════════════════════════════════════════════════════════
// A copy of the state as it was before the first projection, so earlier calls cannot hide a mutation.
{
    const probe = JSON.parse(pristine);
    const snapshot = JSON.stringify(probe);
    projectFor(annView, probe);
    projectFor(devView, probe);
    projectHistoryPage(annView, probe, null, 10);
    assert.equal(JSON.stringify(probe), snapshot, 'projectFor must not mutate gameState');
}

// ═══ Chat window and history page ═════════════════════════════════════════════
for (let i = 0; i < CHAT_WINDOW + 20; i++) gs.chatHistory.push({ role: 'assistant', content: 'line ' + i });
assignStableIds(gs);
const w = projectFor(annView, gs);
assert.equal(w.chatHistory.length, CHAT_WINDOW);
const olderPage = projectHistoryPage(annView, gs, w.chatHistory[0].msgId, CHAT_WINDOW);
assert.ok(olderPage.length > 0);
assert.ok(!has(olderPage, systemPrompt) && !has(olderPage, 'UNFLAGGED-SYSTEM-NOTE') && !has(olderPage, 'TOOLRESULT'),
    'history pages that reach the start of the chat apply the guest rules');
assert.ok(!has(olderPage, 'BO-ONLY-NARRATION'), 'history pages respect vis');
assert.ok(has(projectHistoryPage(boView, gs, w.chatHistory[0].msgId, CHAT_WINDOW), 'BO-ONLY-NARRATION'));

// ═══ Identity helpers ═════════════════════════════════════════════════════════
assert.equal(canSee(annView, undefined), true);
assert.equal(canSee(annView, { to: 'keeper' }), false);
assert.equal(canSee(devView, { to: 'keeper' }), true);
assert.equal(resolveInvId('Ann', gs.roster), ann.invId);
assert.equal(resolveInvId(ann.invId, gs.roster), ann.invId);
assert.equal(resolveInvId('Nobody', gs.roster), null, 'unknown names resolve to null');
assert.equal(resolveInvId('Twin', [{ name: 'Twin', invId: 'inv_1' }, { name: 'Twin', invId: 'inv_2' }]), null, 'ambiguous names resolve to null');
{
    const dup = [{ name: 'X', invId: 'inv_same' }, { name: 'Y', invId: 'inv_same' }];
    assert.equal(ensureInvIds(dup), 1, 'one duplicate re-issued');
    assert.notEqual(dup[0].invId, dup[1].invId);
    assert.equal(ensureInvIds(dup), 0, 'nothing to issue the second time');
}

// ═══ Copies of a person keep one id ═══════════════════════════════════════════
{
    const ledger = exportArcLedger(gs, { scenarioId: 's', endingKey: 'e' });
    assert.deepEqual(ledger.characterSnapshot.map((c) => c.invId), gs.roster.map((c) => c.invId), 'arc-ledger snapshot keeps invIds');
    const target = { roster: [], inventory: [], storage: [] };
    restoreCarrySnapshot(target, { ledger });
    assert.deepEqual(target.roster.map((c) => c.invId), gs.roster.map((c) => c.invId), 'restore keeps them');
    const legacyTarget = { roster: [{ name: 'Legacy', invId: 'inv_legacy' }], inventory: [], storage: [] };
    restoreCarrySnapshot(legacyTarget, { ledger: { characterSnapshot: [{ name: 'Legacy' }], inventorySnapshot: [], storageSnapshot: [] } });
    assert.equal(legacyTarget.roster[0].invId, 'inv_legacy', 'a pre-v9 snapshot pairs with the same person on the roster');
}

// ═══ v9 save normalisation ═══════════════════════════════════════════════════
assert.equal(SAVE_SCHEMA_VERSION, 9);
{
    const api = CoCStatePersistence.create({ gameState: gs, switchScreen: () => {} }, {
        showToast: () => {}, _safeLocalStorageSetItem: () => true, _pushSystemNotice: () => {},
        compactChatHistory: () => {}, _formatStorageError: (_e, f) => f
    });
    const migrate = api.migrateSaveData;
    assert.equal(typeof migrate, 'function', 'migrateSaveData must be reachable');
    const v8 = JSON.parse(await readFile(new URL('./fixtures/r29_19_save.json', import.meta.url), 'utf8'));
    v8.data.sceneMap = { title: 't', rooms: [{ id: 'a', status: 'explored' }, { id: 'b', status: 'unknown' }], currentRoomId: null };
    v8.data.arcLedger = { version: 2, characterSnapshot: structuredClone(v8.data.roster) };
    v8.data.diceHistory = [{ label: 'old', total: 3 }];
    const m1 = migrate(structuredClone(v8));
    assert.equal(m1.version, 9);
    assert.ok(m1.data.roster.every((c) => /^inv_/.test(c.invId)), 'v8 roster gains invIds');
    assert.deepEqual(m1.data.arcLedger.characterSnapshot.map((c) => c.invId), m1.data.roster.map((c) => c.invId),
        'the arc-ledger snapshot of the same people gets the same ids');
    assert.ok(m1._issuedIds > 0, 'migration reports that ids were issued, so loadGame persists them');
    const everyone = m1.data.roster.map((c) => c.invId);
    assert.deepEqual(m1.data.sceneMap.rooms[0].exploredBy, everyone, 'pre-v9 explored rooms belong to everyone');
    assert.equal(m1.data.sceneMap.rooms[1].exploredBy, undefined, 'unexplored rooms stay unexplored');
    assert.ok(m1.data.chatHistory.every((m) => m.msgId), 'chat messages gain msgId');
    assert.ok(m1.data.diceHistory.every((x) => x.rollId), 'dice entries gain rollId');
    const m2 = migrate(JSON.parse(JSON.stringify(m1)));
    assert.deepEqual(m2.data.roster.map((c) => c.invId), everyone, 'a stored v9 save keeps its ids');
    assert.equal(m2._issuedIds, undefined, 'and issues none');
    const v9 = JSON.parse(JSON.stringify(m1));
    v9.data.sceneMap.rooms.push({ id: 'c', status: 'explored' });
    assert.equal(migrate(v9).data.sceneMap.rooms.find((r) => r.id === 'c').exploredBy, undefined, 'v9 rooms without exploredBy are not widened');
}

console.log('visibility_leak_smoke: OK');
