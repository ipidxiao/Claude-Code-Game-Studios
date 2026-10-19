/**
 * Blind-hunt fixes: start_chase re-entry, treat_disease healthy early-exit,
 * apply_deprivation sleep must not fold to hunger.
 */
import { strict as assert } from 'node:assert';
import { chase } from '../js/tools/handlers/chase.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { buildCoCEngine } from '../js/engines/index.mjs';

const Engine = buildCoCEngine();

function bob() {
    return {
        name: 'Bob',
        isActive: true,
        attrs: { CON: 50, DEX: 50, STR: 50, POW: 50 },
        skills: { '体质': 50, '医学': 40 },
        derived: { mov: 8, hp: 10, maxHp: 10, sanity: 50 },
        status: {},
        inventory: []
    };
}

// --- 1. double start_chase ---
{
    const gs = {
        roster: [bob()],
        chatHistory: [],
        inventory: [],
        combat: { active: false },
        chase: { active: false },
        npcRegistry: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        pendingRuleCheck: null,
        pendingRuleChecks: []
    };
    const ch = chase({ gameState: gs, Engine, addJournalEntry: () => {} });
    const first = ch.start_chase({ quarry_name: 'A', pursuer_names: ['Bob'], lead: 2 });
    assert.ok(first && (typeof first === 'object' ? first.forceCheck : true), 'first start ok');
    assert.equal(gs.chase.active, true);
    assert.equal(gs.chase.quarryName, 'A');
    const pending1 = gs.pendingRuleCheck && gs.pendingRuleCheck.kind;
    assert.equal(pending1, 'chase_speed');

    const second = ch.start_chase({ quarry_name: 'B', pursuer_names: ['Bob'], lead: 5 });
    assert.equal(typeof second, 'string');
    assert.ok(/进行中的追逐/.test(second), 'reject second start: ' + second);
    assert.equal(gs.chase.quarryName, 'A', 'chase not overwritten');
    assert.equal(gs.chase.lead, 2);
    assert.equal((gs.pendingRuleChecks || []).length, 0, 'no orphan queued speed checks');
    assert.equal(gs.pendingRuleCheck && gs.pendingRuleCheck.kind, 'chase_speed');

    // end then restart cleanly
    const ended = ch.chase_action({ action: 'end', outcome: 'other' });
    assert.ok(/追逐结束/.test(String(ended)));
    assert.equal(gs.chase.active, false);
    assert.equal(gs.pendingRuleCheck, null);
    const third = ch.start_chase({ quarry_name: 'C', pursuer_names: ['Bob'], lead: 1, skip_speed_check: true });
    assert.ok(typeof third === 'string' || (third && third.msg) || gs.chase.active);
    assert.equal(gs.chase.quarryName, 'C');
    assert.equal(gs.chase.active, true);
}

// --- 2. treat_disease when healthy ---
{
    const gs = {
        roster: [bob()],
        chatHistory: [],
        inventory: [],
        combat: { active: false },
        chase: { active: false },
        pendingRuleCheck: null,
        pendingRuleChecks: []
    };
    const sys = system({ gameState: gs, Engine, addJournalEntry: () => {} });
    const msg = sys.treat_disease({ target_name: 'Bob', healer_name: 'Bob' });
    assert.equal(typeof msg, 'string');
    assert.ok(/未染病/.test(msg), msg);
    assert.equal(gs.pendingRuleCheck, null, 'must not enqueue medicine check');

    // diseased path still enqueues
    gs.roster[0].status.disease = { id: 'flu', name: '流感', daysLeft: 3, treatSkill: '医学' };
    const ok = sys.treat_disease({ target_name: 'Bob', healer_name: 'Bob' });
    assert.ok(ok && ok.forceCheck, 'diseased should pause for check');
    assert.equal(gs.pendingRuleCheck.kind, 'treat_disease');
}

// --- 3. deprivation sleep reject ---
{
    const gs = {
        roster: [bob()],
        chatHistory: [],
        inventory: [],
        combat: { active: false },
        chase: { active: false }
    };
    const sys = system({ gameState: gs, Engine, addJournalEntry: () => {} });
    const sleepMsg = sys.apply_deprivation({ target_name: 'Bob', kind: 'sleep', days_without: 2 });
    assert.ok(/不支持|可用：hunger/.test(sleepMsg), sleepMsg);
    assert.ok(!gs.roster[0].status.hunger, 'must not create hunger from sleep');
    assert.ok(!gs.roster[0].status.sleep, 'no sleep status invented');

    const bad = sys.apply_deprivation({ target_name: 'Bob', type: 'fatigue', days: 1 });
    assert.ok(/不支持|可用/.test(bad), bad);

    const hunger = sys.apply_deprivation({ target_name: 'Bob', kind: 'hunger', days_without: 2 });
    assert.ok(/饥饿/.test(hunger), hunger);
    assert.ok(gs.roster[0].status.hunger, 'hunger applied');

    const thirst = sys.apply_deprivation({ target_name: 'Bob', kind: 'thirst', days_without: 1 });
    assert.ok(/渴|脱水|thirst|饮水/i.test(thirst) || gs.roster[0].status.thirst, thirst);
}

console.log('chase_treat_deprivation_smoke: OK');
