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
globalThis.window.Vue = { reactive: (o) => o, ref: (v) => ({ value: v }), nextTick: (fn) => fn && fn(), watch: () => () => {}, computed: (f) => ({ get value() { return f(); } }) };

const { CoCStateCore } = await import('../js/state/core.mjs');
const { CoCStateGameplay } = await import('../js/state/gameplay.mjs');
const { createInvestigatorRecord, ensureInvIds, resolveInvId } = await import('../js/state/char_record.mjs');
const { KpExecutionEngine } = await import('../js/campaign/kp_execution_engine.mjs');
const { restoreCarrySnapshot, exportArcLedger } = await import('../js/state/arc_ledger.mjs');
const {
    projectFor, projectHistoryPage, canSee, applySafety, assignStableIds, rollVisibility, narrationForGuest, DARK_ROLL_AI_NOTE,
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

// ═══ Dark rolls from the real writers (ADR-0003 step 4) ══════════════════════
{
    const { dice } = await import('../js/tools/handlers/dice.mjs');
    const { CoCAI } = await import('../js/ai_logic.mjs');
    const { CoCState } = await import('../js/state/state.mjs');
    assert.equal(CoCState.gameState, gs, 'fixture: the AI path writes the same gameState');
    // The real AI path (triggerAI) with the network stubbed: it writes the narration message.
    const origFetch = globalThis.fetch;
    const narrate = async (content) => {
        globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }),
            { status: 200, headers: { 'content-type': 'application/json' } });
        try { await CoCAI.triggerAI(0); } finally { globalThis.fetch = origFetch; }
        return gs.chatHistory.filter((m) => m.role === 'assistant').pop();
    };
    // Narration written BEFORE any dark roll, mentioning the number the dark roll will later show.
    const before = await narrate('【叙事】旧事：阿尔弗雷德骰出 87，失去 87 点理智。');
    assert.equal(before.darkRolls, undefined);
    const origRand = Math.random;
    Math.random = () => 0.86;   // d100 → 87, d6 → 6: fixed values so leaks can be searched for
    let toolText, skill, pub, mine;
    try {
        // roll_dice tool → rollCustomDice: dice entry, journal entry and chat line share rollId and vis.
        toolText = dice({ gameState: gs, rollCustomDice: play.rollCustomDice }).roll_dice({ notation: '1d100', label: '暗中聆听', hidden: true });
        // request_skill_check resolved by executeSkillCheck (no msg: no AI call follows).
        await CoCAI.executeSkillCheck({ id: 'call_dark', function: { name: 'request_skill_check',
            arguments: JSON.stringify({ target_name: 'Ann', skill_name: '心理学', hidden: true }) } }, null, '心理学', 'Ann');
        skill = gs.diceHistory.find((x) => x.label === '心理学');
        pub = play.rollCustomDice('1d100', '公开的运气', '守秘人', '');
        Math.random = () => 0.42;   // 43: a number of its own, so redaction per viewer can be told apart
        mine = play.rollCustomDice('1d100', '安的直觉', '守秘人', '', { visibleTo: ['Ann'] });
    } finally { Math.random = origRand; }
    const tool = gs.diceHistory.find((x) => x.label === '暗中聆听');
    assert.ok(toolText.includes(DARK_ROLL_AI_NOTE), 'the AI is told not to repeat a dark roll');
    const skillResult = gs.chatHistory.find((m) => m.role === 'tool' && m.tool_call_id === 'call_dark');
    assert.ok(skillResult && skillResult.content.includes(DARK_ROLL_AI_NOTE), 'so is it for a dark skill check');
    for (const r of [tool, skill]) {
        assert.ok(r && r.rollId && r.vis && r.vis.to === 'keeper', 'the roll site decided keeper-only');
        const kin = (list) => list.filter((x) => x && x.rollId === r.rollId);
        assert.equal(kin(gs.chatHistory.filter((m) => m.kind === 'roll')).length, 1, 'one chat roll line carries the same rollId');
        assert.equal(kin(gs.journalLog).length, 1, 'one journal entry carries the same rollId');
        assert.ok([...kin(gs.chatHistory), ...kin(gs.journalLog)].every((x) => x.vis && x.vis.to === 'keeper'), 'and the same vis');
    }
    assert.ok(Number.isFinite(skill.target), 'skill rolls record their target for redaction');
    const secret = `${skill.total}/${skill.target}`;
    // The AI broke the rule: its narration repeats the dark numbers, and copies the engine's check
    // line (with 【name】【skill】 brackets and the outcome) into the dice section (audit N3).
    const darkNarration = await narrate(`【骰子】\n【安】进行【心理学】检定：骰出 ${secret}，失败。\n\n【叙事】安看着他，骰出 ${skill.total}，心里有数（${secret}）。安的直觉骰出 ${mine.total}。`);
    assert.deepEqual((darkNarration.darkRolls || []).map((r) => r.rollId).sort(), [tool.rollId, skill.rollId, mine.rollId].sort(),
        'the narration carries exactly the dark rolls it was written from (Ann-only counts as dark for others)');
    assert.equal(gs.pendingDarkRolls.length, 3, 'the turn stays open: later narration this turn may still describe them (audit A1)');
    assignStableIds(gs);
    const ga = projectFor(annView, gs);
    for (const r of [tool, skill]) {
        const d = ga.diceHistory.find((x) => x.rollId === r.rollId);
        assert.deepEqual([d.hidden, d.total], [true, undefined], 'dice entry becomes a placeholder');
        const j = ga.journalLog.find((x) => x.rollId === r.rollId);
        assert.ok(j && j.hidden && j.summary.includes(r.label), 'journal placeholder names the roll (review F4)');
        const c = ga.chatHistory.find((x) => x.rollId === r.rollId);
        assert.ok(c && c.hidden && c.content.includes(r.label) && !c.content.includes(String(r.total)), 'chat roll line becomes a placeholder');
    }
    const guestMsg = (m) => ga.chatHistory.find((x) => x.msgId === m.msgId);
    const narration = guestMsg(darkNarration).content;
    assert.ok(!narration.includes('【骰子】') && !narration.includes('失败'), 'the whole dice section is dropped, outcome included: ' + narration);
    assert.ok(!narration.includes(secret) && !narration.includes('骰出 ' + skill.total), 'dark numbers in the narration are redacted');
    assert.ok(narration.includes('安看着他'), 'the narration itself still arrives');
    assert.ok(narration.includes(`安的直觉骰出 ${mine.total}`), 'Ann reads the number of the roll she may see');
    const boNarration = projectFor(boView, gs).chatHistory.find((x) => x.msgId === darkNarration.msgId).content;
    assert.ok(!boNarration.includes(`骰出 ${mine.total}`), 'Bo does not');
    assert.ok(guestMsg(before).content.includes('骰出 87') && guestMsg(before).content.includes('87 点'), 'and so is narration written before the dark roll');
    assert.ok(!has(ga.chatHistory, 'darkRolls'), 'a message\'s dark-roll list never reaches a guest');
    assert.ok(has(projectFor(devView, gs), secret), 'the developer view keeps the numbers');
    assert.equal(darkNarration.content.includes(secret), true, 'redaction happens in the view, not in the state');
    // Public and per-investigator rolls.
    assert.ok(ga.diceHistory.some((x) => x.rollId === pub.rollId && x.total === pub.total), 'a public roll shows its total');
    assert.equal(pub.vis, undefined);
    assert.deepEqual(mine.vis, { to: [ann.invId] }, 'visibleTo resolves names to invIds');
    assert.ok(ga.diceHistory.some((x) => x.rollId === mine.rollId && x.total === mine.total), 'Ann sees her roll');
    assert.ok(projectFor(boView, gs).diceHistory.some((x) => x.rollId === mine.rollId && x.hidden), 'Bo sees a placeholder');
    assert.deepEqual(rollVisibility(gs, { visibleTo: ['Ann', 'Nobody'] }), { to: 'keeper' }, 'an unresolved name makes the roll keeper-only');
    assert.equal(rollVisibility(gs, {}), undefined, 'no options: public');
    assert.equal(narrationForGuest('【叙事】骰出 5 次门', [{ total: 5 }]).includes('（暗骰）'), true);

    // Placeholders carry only what a placeholder needs (review F7 V19): no target, level or total.
    for (const d of ga.diceHistory.filter((x) => x.hidden)) {
        assert.deepEqual(Object.keys(d).sort(), ['hidden', 'label', 'rollId'], 'dice placeholder fields');
    }
    for (const c of ga.chatHistory.filter((x) => x.hidden)) {
        assert.deepEqual(Object.keys(c).sort(), ['content', 'hidden', 'kind', 'msgId', 'role', 'rollId'], 'chat placeholder fields');
    }

    // A pushed dark roll stays dark (review F2), and the AI note survives the push-failure text.
    Math.random = () => 0.86;
    try {
        await CoCAI.executeSkillCheck({ id: 'call_push', isPushed: true, function: { name: 'push_skill_check',
            arguments: JSON.stringify({ target_name: 'Ann', skill_name: '心理学' }) } }, null, '心理学', 'Ann');
    } finally { Math.random = origRand; }
    const pushed = gs.diceHistory[0];
    assert.equal(pushed.label, '心理学', 'fixture: the push was rolled');
    assert.notEqual(pushed.rollId, skill.rollId);
    assert.deepEqual(pushed.vis, { to: 'keeper' }, 'the push inherits the original roll\'s visibility');
    const pushResult = gs.chatHistory.find((m) => m.role === 'tool' && m.tool_call_id === 'call_push');
    assert.ok(pushResult && pushResult.content.includes(DARK_ROLL_AI_NOTE), 'push-failure text is appended, not assigned over the note');
    assignStableIds(gs);
    assert.ok(projectFor(annView, gs).chatHistory.some((m) => m.rollId === pushed.rollId && m.hidden), 'the guest sees a placeholder for the push');
    assert.ok(Object.values(gs.skillAttempts || {}).some((a) => a.skill === '心理学' && a.vis && a.vis.to === 'keeper'),
        'the attempt the push gate checks carries the original roll\'s visibility (audit L1)');
    // The original dark roll scrolled off the 30-entry dice panel: the push still knows it (attempt record).
    Math.random = () => 0.86;
    try {
        await CoCAI.executeSkillCheck({ id: 'call_listen', function: { name: 'request_skill_check',
            arguments: JSON.stringify({ target_name: 'Bo', skill_name: '聆听', hidden: true, visible_to: ['Bo'] }) } }, null, '聆听', 'Bo');
        for (let i = 0; i < 35; i++) play.rollCustomDice('1d6', '填充', '守秘人', '');
        assert.ok(!gs.diceHistory.some((x) => x.label === '聆听'), 'fixture: the original left the panel');
        await CoCAI.executeSkillCheck({ id: 'call_listen_push', isPushed: true, function: { name: 'push_skill_check',
            arguments: JSON.stringify({ target_name: 'Bo', skill_name: '聆听' }) } }, null, '聆听', 'Bo');
    } finally { Math.random = origRand; }
    assert.equal(gs.diceHistory[0].label, '聆听', 'fixture: the push was rolled');
    assert.deepEqual(gs.diceHistory[0].vis, { to: [bo.invId] }, 'the push keeps the original roll\'s visibility via its attempt record');
    // An exempt push (rule check) whose original roll cannot be found is keeper-only, never public.
    Math.random = () => 0.86;
    try {
        await CoCAI.executeSkillCheck({ id: 'call_lone_push', isPushed: true, function: { name: 'push_skill_check',
            arguments: JSON.stringify({ target_name: 'Ann', skill_name: '图书馆使用' }) } },
        { _ruleCheck: true, tool_calls: [{ id: 'call_lone_push' }, { id: 'still_open', isResolved: false }] }, '图书馆使用', 'Ann');
    } finally { Math.random = origRand; }
    const lone = gs.diceHistory[0];
    assert.equal(lone.label, '图书馆使用', 'fixture: the lone push was rolled');
    assert.deepEqual(lone.vis, { to: 'keeper' }, 'a push with no original found is keeper-only');

    // visible_to on a skill check (review F7 V21).
    Math.random = () => 0.86;
    try {
        await CoCAI.executeSkillCheck({ id: 'call_bo', function: { name: 'request_skill_check',
            arguments: JSON.stringify({ target_name: 'Bo', skill_name: '侦查', hidden: true, visible_to: ['Bo'] }) } }, null, '侦查', 'Bo');
    } finally { Math.random = origRand; }
    const boRoll = gs.diceHistory[0];
    assert.deepEqual(boRoll.vis, { to: [bo.invId] });
    assignStableIds(gs);
    assert.ok(projectFor(boView, gs).diceHistory.some((x) => x.rollId === boRoll.rollId && x.total === boRoll.total), 'Bo sees his own dark roll');
    assert.ok(projectFor(annView, gs).diceHistory.some((x) => x.rollId === boRoll.rollId && x.hidden), 'Ann does not');

    // Redaction outlives the 30-entry dice panel, and covers history pages (review F3, V14).
    for (let i = 0; i < 40; i++) play.rollCustomDice('1d6', '杂项', '守秘人', '');
    assert.ok(!gs.diceHistory.some((x) => x.rollId === skill.rollId), 'fixture: the dark roll left the dice panel');
    assignStableIds(gs);
    const later = projectFor(annView, gs).chatHistory;
    const oldNarration = later.find((m) => m.msgId === darkNarration.msgId);
    assert.ok(oldNarration && !oldNarration.content.includes(secret), 'old narration is still redacted');
    const lastMsg = gs.chatHistory[gs.chatHistory.length - 1];
    const page = projectHistoryPage(annView, gs, lastMsg.msgId, CHAT_WINDOW);
    assert.ok(page.length && !has(page, secret), 'history pages redact too');

    // Other phrasings and section aliases (review F3, F6).
    const forms = narrationForGuest(`【判定】心理学 ${secret}\n【故事】安皱眉。心理学 ${skill.total}，掷了 ${skill.total} 点，指针停在 ${skill.total} 点，目标 ${skill.target}。`,
        [{ total: skill.total, target: skill.target, label: '心理学' }]);
    assert.ok(forms.startsWith('【故事】安皱眉'), 'an alias header ends the dice section instead of swallowing the story');
    assert.ok(!new RegExp('(^|[^0-9])' + skill.total + '(?![0-9])').test(forms), 'label, 掷了 and 点 forms are redacted: ' + forms);
    assert.ok(!forms.includes('目标 ' + skill.target), 'so is the target');
    // Brackets inside the dice section are not section titles (audit N3).
    for (const text of [
        `【骰子】\n【安】进行【心理学】检定：骰出 ${secret}，失败。\n【叙事】安皱起眉。`,
        '【骰子】守秘人为【安】进行了【心理学】检定：失败（困难成功需 30）。\n【叙事】安皱起眉。',
        `【骰子】心理学检定 ${secret} →【失败】\n【叙事】安皱起眉。`
    ]) {
        const out = narrationForGuest(text, []);
        assert.equal(out, '【叙事】安皱起眉。', 'dice section removed whole: ' + out);
    }
    // The protocol's ASCII / English headers end the dice section too (audit A5): the narration
    // is kept, not dropped with it.
    for (const [text, want] of [
        [`【骰子】心理学 ${secret} →【失败】\n[叙事] 安皱起眉。\n[旁白] 夜深了。`, '[叙事] 安皱起眉。\n[旁白] 夜深了。'],
        [`DICE_PHASE 心理学 ${secret}\nSTORY_PHASE 安皱起眉。`, 'STORY_PHASE 安皱起眉。'],
        [`[骰子] ${secret}\nNARRATION_PHASE 夜深了。`, 'NARRATION_PHASE 夜深了。']
    ]) {
        assert.equal(narrationForGuest(text, []), want, 'alias headers end the dice section: ' + text);
    }

    // A narration's dark-roll list is saved with the chat, so redaction survives a reload (audit D13).
    const api = CoCStatePersistence.create({ gameState: gs, switchScreen: () => {} }, {
        showToast: () => {}, _safeLocalStorageSetItem: () => true, _pushSystemNotice: () => {},
        compactChatHistory: () => {}, _formatStorageError: (_e, f) => f
    });
    gs.pendingDarkRolls = [{ rollId: 'r_pending', vis: { to: 'keeper' }, total: 12, label: 'x' }];
    const built = api._buildSaveData('reload');
    assert.ok(built.data.chatHistory.some((m) => m.msgId === darkNarration.msgId && m.darkRolls.length), 'saved with the message');
    assert.ok(Array.isArray(built.data.pendingDarkRolls), 'pending dark rolls are saved too');
    gs.pendingDarkRolls = [];
    assert.equal(api._restoreFromData(JSON.parse(JSON.stringify(built))), true);
    const afterReload = projectFor(annView, gs).chatHistory.find((m) => m.msgId === darkNarration.msgId);
    assert.ok(afterReload && afterReload.content.includes('安看着他'), 'fixture: the narration was reloaded');
    assert.ok(!afterReload.content.includes(secret), 'and is still redacted after the reload');
    assert.deepEqual(gs.pendingDarkRolls.map((r) => r.rollId), ['r_pending'], 'a dark roll not yet narrated survives the reload');

    // The player's next input ends the turn, through the real input writer.
    const playerSays = async (text, content) => {
        globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }),
            { status: 200, headers: { 'content-type': 'application/json' } });
        CoCState.playerInput.value = text;
        // Fixture: no earlier check is still waiting for its dice button (that blocks input).
        for (const m of gs.chatHistory) if (m.role === 'assistant' && m.tool_calls) { m.isResolved = true; m.tool_calls.forEach((t) => { t.isResolved = true; }); }
        globalThis.document = { getElementById: () => null };   // scrollToBottom
        try { await CoCAI.handlePlayerAction(); } finally { globalThis.fetch = origFetch; delete globalThis.document; }
        assert.equal(gs.chatHistory.filter((m) => m.role === 'user').pop().content, text, 'fixture: the player input was written');
        return gs.chatHistory.filter((m) => m.role === 'assistant').pop();
    };
    // A later turn with a public number equal to the dark roll.
    const laterTurn = await playerSays('我后退', `【叙事】怪物扑来，安受到 ${skill.total} 点伤害。`);
    assert.deepEqual(gs.pendingDarkRolls, [], 'the player\'s input closed the turn');
    assert.equal(laterTurn.darkRolls, undefined, 'narration of the next turn carries none of them');
    assignStableIds(gs);
    assert.ok(projectFor(annView, gs).chatHistory.find((x) => x.msgId === laterTurn.msgId).content.includes(`受到 ${skill.total} 点伤害`),
        'an equal public number in a later turn is left alone (audit N2)');

    // Check → a tool-only round → narration, and narration split over two rounds (audit A1).
    // The AI settles consequences before it narrates; the narration repeats the dark number anyway.
    const rounds = [];
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: rounds.shift() }] }),
        { status: 200, headers: { 'content-type': 'application/json' } });
    const ask = { id: 'call_turn', function: { name: 'request_skill_check',
        arguments: JSON.stringify({ target_name: 'Ann', skill_name: '侦查', hidden: true }) } };
    try {
        rounds.push({ role: 'assistant', content: null, tool_calls: [ask] });
        await CoCAI.triggerAI(0);
        const asking = gs.chatHistory.filter((m) => m.role === 'assistant').pop();
        assert.ok(asking.tool_calls && asking.tool_calls[0].id === 'call_turn', 'fixture: round 1 asked for the check');
        Math.random = () => 0.86;
        rounds.push({ role: 'assistant', content: null, tool_calls: [{ id: 'call_settle', type: 'function',
            function: { name: 'update_character_status', arguments: JSON.stringify({ target_name: 'Ann', hp_change: 0 }) } }] });
        rounds.push({ role: 'assistant', content: '【叙事】安扫视房间，侦查骰出 87', tool_calls: [{ id: 'call_more', type: 'function',
            function: { name: 'update_character_status', arguments: JSON.stringify({ target_name: 'Ann', hp_change: 0 }) } }] });
        rounds.push({ role: 'assistant', content: '【叙事】……侦查 87，她什么也没看见。' });
        try { await CoCAI.executeSkillCheck(ask, asking, '侦查', 'Ann'); } finally { Math.random = origRand; }
    } finally { globalThis.fetch = origFetch; }
    assert.equal(rounds.length, 0, 'fixture: all three AI rounds after the check ran');
    const turnRoll = gs.diceHistory.find((x) => x.label === '侦查' && x.vis);
    assert.equal(turnRoll.total, 87, 'fixture: the dark check rolled 87');
    const turnMsgs = gs.chatHistory.slice(gs.chatHistory.indexOf(gs.chatHistory.find((m) => m.tool_calls && m.tool_calls[0] && m.tool_calls[0].id === 'call_turn')) + 1)
        .filter((m) => m.role === 'assistant');
    assert.equal(turnMsgs.length, 3, 'fixture: tool-only round, then two narration rounds');
    assert.equal(turnMsgs[0].darkRolls, undefined, 'a tool-only round carries nothing to redact');
    for (const m of turnMsgs.slice(1)) {
        assert.deepEqual((m.darkRolls || []).map((r) => r.rollId), [turnRoll.rollId], 'every narration of the turn carries the dark roll');
    }
    assignStableIds(gs);
    const boTurn = projectFor(boView, gs).chatHistory;
    for (const m of turnMsgs.slice(1)) {
        const seen = boTurn.find((x) => x.msgId === m.msgId).content;
        assert.ok(!/(^|[^0-9])87(?![0-9])/.test(seen) && seen.includes('（暗骰）'), 'the guest does not read the dark number: ' + seen);
    }
}

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
    assert.ok(m1._idsChanged > 0, 'migration reports that ids were issued, so loadGame persists them');
    const everyone = m1.data.roster.map((c) => c.invId);
    assert.deepEqual(m1.data.sceneMap.rooms[0].exploredBy, everyone, 'pre-v9 explored rooms belong to everyone');
    assert.equal(m1.data.sceneMap.rooms[1].exploredBy, undefined, 'unexplored rooms stay unexplored');
    assert.ok(m1.data.chatHistory.every((m) => m.msgId), 'chat messages gain msgId');
    assert.ok(m1.data.diceHistory.every((x) => x.rollId), 'dice entries gain rollId');
    const m2 = migrate(JSON.parse(JSON.stringify(m1)));
    assert.deepEqual(m2.data.roster.map((c) => c.invId), everyone, 'a stored v9 save keeps its ids');
    assert.equal(m2._idsChanged, undefined, 'and issues none');
    const v9 = JSON.parse(JSON.stringify(m1));
    v9.data.sceneMap.rooms.push({ id: 'c', status: 'explored' });
    assert.equal(migrate(v9).data.sceneMap.rooms.find((r) => r.id === 'c').exploredBy, undefined, 'v9 rooms without exploredBy are not widened');
    // An R30.3 save: dark rolls in a campaign-wide ledger, none on the narration (audit A6).
    const r303 = JSON.parse(JSON.stringify(m1));
    const keeperOnly = { to: 'keeper' };
    r303.data.chatHistory = [
        { role: 'assistant', content: '【叙事】开场时的侦查 55 仍在她脑中。' },               // turn of a roll whose line was trimmed
        { role: 'user', content: '我看看他' },
        { role: 'assistant', content: '【叙事】他沉默着，心理学 87 也看不透。' },            // before this turn's roll: untouched
        { role: 'system', kind: 'roll', rollId: 'r_old', label: '心理学', content: '心理学 骰出 87/60', vis: keeperOnly },
        { role: 'assistant', content: '', tool_calls: [{ id: 't1', function: { name: 'update_character_status', arguments: '{}' } }] },
        { role: 'assistant', content: '【叙事】安盯着他，心理学 87，没看出什么。' },
        { role: 'assistant', content: '【叙事】……心理学 87 让她更不安。' },
        { role: 'user', content: '我离开' },
        { role: 'assistant', content: '【叙事】门外，安受到 87 点伤害。' }
    ];
    r303.data.darkRolls = [
        { rollId: 'r_trimmed', vis: keeperOnly, total: 55, label: '侦查', ts: 1 },
        { rollId: 'r_old', vis: keeperOnly, total: 87, target: 60, label: '心理学', ts: 2 }
    ];
    const up = migrate(r303).data;
    assert.equal(up.darkRolls, undefined, 'the ledger is gone');
    const stamped = up.chatHistory.map((m) => (m.darkRolls || []).map((r) => r.rollId).join(','));
    assert.deepEqual(stamped, ['r_trimmed', '', '', '', '', 'r_old', 'r_old', '', ''],
        'each ledger roll lands on the narration of its own turn');
    assert.ok(!narrationForGuest(up.chatHistory[5].content, up.chatHistory[5].darkRolls).includes('87'), 'and is redacted there');
    assert.ok(narrationForGuest(up.chatHistory[8].content, up.chatHistory[8].darkRolls || []).includes('87 点伤害'), 'a later turn is not');
}

console.log('visibility_leak_smoke: OK');
