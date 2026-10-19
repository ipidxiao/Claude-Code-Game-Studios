/**
 * B9: status semantics — canAct, sensory mods, prone/grapple, bout cleanup, affliction penalty.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(typeof CoCEngine.canAct, 'function');
assert.equal(typeof CoCEngine.standUp, 'function');
assert.equal(typeof CoCEngine.SituationalEngine.resolveCheckModifiers, 'function');
assert.equal(typeof CoCEngine.SanityEngine.clearBoutEffects, 'function');
assert.equal(typeof CoCEngine.SanityEngine.applyAfflictionTrigger, 'function');
assert.equal(typeof CoCEngine.ConditionsEngine.syncGrapples, 'function');

function char(name, extra) {
    return Object.assign({
        name,
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, INT: 60, POW: 50 },
        skills: { '斗殴': 50, '手枪': 50, '侦查': 50, '聆听': 40 },
        derived: { hp: 10, maxHp: 10, sanity: 50, maxSan: 90, db: 0, build: 0 },
        hp: 10,
        status: {},
        insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] }
    }, extra || {});
}

// —— canAct gates ——
const awake = char('清醒者');
assert.equal(CoCEngine.canAct(awake, 'melee').ok, true);

const faint = char('昏厥者', { status: { boutFaint: true, isUnconscious: true } });
assert.equal(CoCEngine.canAct(faint, 'fire').ok, false);
assert.ok(/昏厥|昏迷/.test(CoCEngine.canAct(faint, 'fire').desc));

const dying = char('濒死者', { status: { isDying: true } });
assert.equal(CoCEngine.canAct(dying, 'melee').ok, false);
assert.equal(CoCEngine.canAct(dying, 'rescue').ok, true);

const stunned = char('眩晕者', { status: { stunned: { roundsLeft: 1 } } });
assert.equal(CoCEngine.canAct(stunned, 'chase').ok, false);

const para = char('麻痹者', { status: { boutSense: 'paralyzed' } });
assert.equal(CoCEngine.canAct(para, 'cast').ok, false);

const flee = char('逃跑发作', { status: { boutFlee: true } });
assert.equal(CoCEngine.canAct(flee, 'melee').ok, false);
assert.equal(CoCEngine.canAct(flee, 'chase').ok, true);

const violence = char('暴力发作', { status: { boutViolence: true } });
assert.equal(CoCEngine.canAct(violence, 'cast').ok, false);
assert.equal(CoCEngine.canAct(violence, 'melee').ok, true);

const grappled = char('被擒者', { status: { grappled: { by: '甲', build: 1 } } });
assert.equal(CoCEngine.canAct(grappled, 'move').ok, false);
assert.equal(CoCEngine.canAct(grappled, 'fire').ok, false);
assert.equal(CoCEngine.canAct(grappled, 'break_free').ok, true);
assert.equal(CoCEngine.canAct(grappled, 'melee').ok, true);

// —— Sensory modifiers ——
const blind = char('盲者', { status: { boutSense: 'blind' } });
const blindMod = CoCEngine.SituationalEngine.resolveCheckModifiers('侦查', blind);
assert.ok(blindMod.penaltyDice >= 2, 'blind should add penalty');

const deaf = char('聋者', { status: { boutSense: 'deaf' } });
const deafMod = CoCEngine.SituationalEngine.resolveCheckModifiers('聆听', deaf);
assert.ok(deafMod.penaltyDice >= 2);

const sitBlindAtk = CoCEngine.resolveSituation({
    attacker: blind,
    defender: char('靶'),
    weapon: { type: 'firearm', damage: '1D6', skill: '手枪' },
    ranged: true,
    distance: 10
});
assert.ok(sitBlindAtk.penaltyDice >= 1, 'blind attacker ranged penalty');

// —— Prone: attack must NOT clear; standUp clears ——
const prone = char('倒地者', { status: { prone: true } });
assert.equal(prone.status.prone, true);
const standFailGate = CoCEngine.canAct(faint, 'stand');
assert.equal(standFailGate.ok, false);
const stood = CoCEngine.standUp(prone);
assert.equal(stood.ok, true);
assert.equal(!!prone.status.prone, false);
assert.equal(CoCEngine.standUp(char('站立者')).ok, false);

const proneAtk = CoCEngine.resolveSituation({
    attacker: char('趴着打', { status: { prone: true } }),
    defender: char('立靶'),
    weapon: { type: 'melee', damage: '1D3+DB' },
    ranged: false
});
assert.ok(proneAtk.penaltyDice >= 1, 'prone melee penalty');
assert.ok(proneAtk.notes.some((n) => String(n).includes('倒地')));

// —— Grapple auto-clear when partner down ——
const a = char('擒抱者', { status: { grappling: { target: '被擒B', build: 1 } } });
const b = char('被擒B', { status: { grappled: { by: '擒抱者', build: 1 }, isUnconscious: true } });
const clears = CoCEngine.ConditionsEngine.syncGrapples([a, b]);
assert.ok(clears.length >= 1);
assert.equal(!!a.status.grappling, false);
assert.equal(!!b.status.grappled, false);

// —— Bout cleanup via tickMadness ——
const bouted = char('发作中', {
    status: { boutFlee: true, boutSense: 'blind', boutViolence: true },
    insanity: {
        tempInsane: true, indefInsane: false, phobias: [], manias: [],
        boutRoundsLeft: 1, tempHoursLeft: 5, dailyLoss: 0, history: []
    }
});
const tick = CoCEngine.SanityEngine.tickMadness(bouted, { rounds: 1 });
assert.equal(tick.boutEnded, true);
assert.equal(!!bouted.status.boutFlee, false);
assert.equal(!!bouted.status.boutSense, false);
assert.equal(!!bouted.status.boutViolence, false);

// —— Affliction → pendingPenalty → checkSkill ——
const phobic = char('恐暗者', {
    insanity: {
        tempInsane: false, indefInsane: true,
        phobias: [{ name: '黑暗恐惧症', desc: '害怕黑暗' }],
        manias: [], dailyLoss: 0, history: []
    },
    status: {}
});
const trig = CoCEngine.SanityEngine.applyAfflictionTrigger(phobic, '黑暗');
assert.equal(trig.triggered, true);
assert.ok(phobic.status.pendingPenalty);
assert.ok((phobic.status.pendingPenalty.penaltyDice || 0) >= 1);

CoCEngine._setTestRolls([50]);
const rolled = CoCEngine.checkSkill('侦查', phobic, 'normal', {});
CoCEngine._clearTestRolls();
assert.equal(!!phobic.status.pendingPenalty, false, 'pendingPenalty must be consumed');
// With penalty dice path, roll still returns a result object
assert.ok(rolled && typeof rolled.success === 'boolean');

// Second check without affliction should not invent pending
const clean = char('无恐惧', { skills: { '侦查': 99 } });
CoCEngine._setTestRolls([1]);
const cleanRoll = CoCEngine.checkSkill('侦查', clean, 'normal');
CoCEngine._clearTestRolls();
assert.equal(cleanRoll.success, true);

// RoundTick wires bout tick + grapple sync
const gs = {
    roster: [bouted],
    combat: { round: 2, enemies: [] }
};
bouted.insanity.boutRoundsLeft = 1;
bouted.status.boutFlee = true;
const pr = CoCEngine.processRound(gs);
assert.ok(pr.events.some((e) => e.kind === 'bout_tick'), 'RoundTick should emit bout_tick when bout ends');
assert.equal(!!bouted.status.boutFlee, false);

console.log('rules_b9_status_semantics_smoke: ok');
