/**
 * Numeric bounds found by the R29.68 tool fuzzer (inputs the AI can send):
 * 1) parseDice('1D0') → NaN (apply_sanity_reward wrote NaN SAN into the save); '0D6' rolled 1 die.
 * 2) Dice counts had no ceiling: '1000000000D6' froze the tab ~10s.
 * 3) Net bonus/penalty dice had no ceiling (7e: never more than two); bonus_penalty_roll accepted
 *    1e9 bonus dice → guaranteed critical + freeze; stacked sources could reach 5.
 * 4) apply_therapy looped once per month with no ceiling: months=1e9 ran the heap out (tab crash).
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { CoCToolHandlers } from '../js/tools/handlers/index.mjs';
import { createInvestigatorRecord } from '../js/state/char_record.mjs';

const timed = (fn) => { const t0 = Date.now(); const r = fn(); return { r, ms: Date.now() - t0 }; };

// ---- 1) zero / degenerate dice never produce NaN ------------------------------------------------
for (const [expr, want] of [['1D0', 0], ['0D6', 0], ['0D0', 0], ['2D0+3', 3], ['1D6-1D0', null]]) {
    const v = CoCEngine.parseDice(expr);
    assert.ok(Number.isFinite(v), `parseDice(${expr}) must be finite, got ${v}`);
    if (want != null) assert.equal(v, want, `parseDice(${expr})`);
    assert.ok(Number.isFinite(CoCEngine.maxDice(expr)), `maxDice(${expr}) must be finite`);
}
assert.equal(CoCEngine.maxDice('0D6'), 0, 'zero dice have max 0');
for (let i = 0; i < 50; i++) {
    const v = CoCEngine.parseDice('1D6');
    assert.ok(v >= 1 && v <= 6, 'ordinary dice unchanged: ' + v);
}
assert.equal(CoCEngine.maxDice('15D10'), 150, 'largest dice in game data unchanged');

// ---- 2) dice count ceiling ----------------------------------------------------------------------
{
    const { r, ms } = timed(() => CoCEngine.parseDice('1000000000D6'));
    assert.ok(ms < 200, `huge dice count must not freeze (took ${ms}ms)`);
    assert.ok(r >= 100 && r <= 600, 'dice count capped at 100: ' + r);
    assert.equal(CoCEngine.maxDice('1000000000D6'), 600);
    assert.equal(CoCEngine.maxDice('1D1000000'), 1000, 'sides capped at 1000');
}

// ---- 3) never more than two net bonus/penalty dice ---------------------------------------------
{
    const seen = [];
    const ob = CoCEngine.rollBonusDice, op = CoCEngine.rollPenaltyDice;
    CoCEngine.rollBonusDice = (n) => { seen.push(n); return ob.call(CoCEngine, n); };
    CoCEngine.rollPenaltyDice = (n) => { seen.push(-n); return op.call(CoCEngine, n); };
    try {
        const c = { name: 'A', skills: { '侦查': 60 }, attrs: {}, derived: {}, status: {} };
        const cases = [
            [{ bonusDice: 1e9 }, 2], [{ penaltyDice: 1e9 }, -2], [{ bonusDice: 3, penaltyDice: 1 }, 2],
            [{ bonusDice: 5, penaltyDice: 4 }, 1], [{ bonusDice: 2 }, 2], [{ bonusDice: 1 }, 1], [{ bonusDice: 0.5 }, 0]
        ];
        for (const [opts, want] of cases) {
            seen.length = 0;
            const { ms } = timed(() => CoCEngine.checkSkill('侦查', c, 'normal', Object.assign({ skipStatusMods: true }, opts)));
            assert.ok(ms < 200, 'no freeze for ' + JSON.stringify(opts));
            assert.equal(seen[0] || 0, want, 'net dice for ' + JSON.stringify(opts));
        }
    } finally {
        CoCEngine.rollBonusDice = ob;
        CoCEngine.rollPenaltyDice = op;
    }
}

// ---- tool-level: bonus_penalty_roll prompt, sanity reward, therapy months ----------------------
function makeHandlers() {
    const mk = (n) => createInvestigatorRecord({
        name: n, isActive: true,
        attrs: { STR: 55, CON: 60, SIZ: 65, DEX: 60, APP: 50, INT: 70, POW: 65, EDU: 70, LUCK: 50 },
        derived: { hp: 12, maxHp: 12, sanity: 40, mp: 13, mov: 8, db: '0' },
        skills: { '侦查': 60, '精神分析': 40, '克苏鲁神话': 5 }
    });
    const gs = {
        roster: [mk('Ann')], selectedCharIndex: 0, inventory: [], chatHistory: [], journalLog: [], npcRegistry: [],
        combat: { active: false, enemies: [], initiativeOrder: [] }, chase: { active: false, participants: [] },
        clueBoard: { clues: [], links: [] }, scenarioRunner: { active: false, flags: {} }, flags: {},
        pendingRuleChecks: [], pendingAftermath: [], skillAttempts: {}, sanCaps: {}, worldClock: { day: 1, hour: 8 }
    };
    const noop = () => {};
    const h = CoCToolHandlers.create({
        gameState: gs, addJournalEntry: noop, addNpc: noop, updateNpcStatus: noop, startCombat: noop, endCombat: noop,
        updateEnemy: noop, advanceTurn: noop, createMap: noop, updateRoom: noop, setPosition: noop, addClue: noop,
        linkClues: noop, markClueStatus: noop, rollCustomDice: noop, groupRoll: () => []
    }, CoCEngine);
    return { gs, h };
}

{
    const { gs, h } = makeHandlers();
    const out = h.bonus_penalty_roll({ target_name: 'Ann', skill_name: '侦查', bonus_dice: 1e9 });
    const text = typeof out === 'string' ? out : out.msg;
    assert.ok(!text.includes('1000000000'), 'prompt must not promise 1e9 bonus dice: ' + text);
    assert.ok(text.includes('2奖励骰'), 'prompt shows the capped net: ' + text);
    assert.ok(gs.pendingRuleCheck, 'dice panel still opens');
}

{
    const { gs, h } = makeHandlers();
    const out = h.apply_sanity_reward({ target_name: 'Ann', reward_dice: '1D0' });
    const text = typeof out === 'string' ? out : out.msg;
    assert.ok(Number.isFinite(gs.roster[0].derived.sanity), 'SAN stays finite: ' + gs.roster[0].derived.sanity);
    assert.ok(!/NaN|undefined/.test(text), 'no NaN in text: ' + text);
}

{
    const { gs, h } = makeHandlers();
    const { r, ms } = timed(() => h.apply_therapy({ target_name: 'Ann', months: 1e9, asylum_care: 'good' }));
    assert.ok(ms < 1000, `therapy months must be bounded (took ${ms}ms)`);
    const text = typeof r === 'string' ? r : (r && r.msg) || '';
    assert.ok(!text.includes('1000000000'), 'result must state the months actually settled: ' + text.slice(0, 120));
    assert.ok(Number.isFinite(gs.roster[0].derived.sanity) && gs.roster[0].derived.sanity <= 99);
}

console.log('numeric_bounds_smoke: OK');
