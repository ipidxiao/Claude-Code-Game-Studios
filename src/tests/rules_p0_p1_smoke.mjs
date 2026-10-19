/**
 * P0/P1: ruleset profile, SAN/5 indefinite, SAN0 permanent, POW spend flag, initiative modes.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CoCEngine } from '../js/coc.mjs';
import { CoCStudyState } from '../js/data/mythos_tomes.mjs';

assert.equal(typeof CoCEngine.getRulesetProfile, 'function');
assert.equal(typeof CoCEngine.setRulesetProfile, 'function');
assert.ok(CoCEngine.Ruleset);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const coverage = JSON.parse(readFileSync(path.join(root, 'js/data/rules_coverage.json'), 'utf8'));
assert.ok(Array.isArray(coverage.entries) && coverage.entries.length >= 10);
assert.ok(
    coverage.entries.every((e) => e.status === 'kernel' || e.status === 'table' || e.status === 'na-optional'),
    'core_index statuses must be kernel|table|na-optional'
);
assert.ok(Number(coverage.schemaVersion) === 2 || coverage.version === '2.0');

// Default profile is 7e-full
assert.equal(CoCEngine.getRulesetProfile().id, '7e-full');
assert.equal(CoCEngine.getRulesetProfile().permanentPowCost, true);
assert.equal(CoCEngine.getRulesetProfile().initiative, 'dex_firearm_first');

const core = CoCEngine.setRulesetProfile('7e-core');
assert.equal(core.ok, true);
assert.equal(CoCEngine.getRulesetProfile().permanentPowCost, false);

// —— Indefinite uses current SAN/5, not POW/5 ——
// POW=100 would wrongly require dailyLoss>=20; SAN=40 requires >=8
CoCEngine.setRulesetProfile('7e-full');
const indefCh = {
    name: '临界者',
    attrs: { POW: 100, INT: 50 },
    derived: { sanity: 40, maxSan: 99 },
    sanity: 40,
    insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] },
    status: {}
};
const r1 = CoCEngine.SanityEngine.applySanLoss(indefCh, 7, '测试', { deferInt: true });
assert.equal(r1.indefInsanity, false, '7 < 40/5 should not trigger');
const r2 = CoCEngine.SanityEngine.applySanLoss(indefCh, 1, '测试2', { deferInt: true });
assert.equal(r2.indefInsanity, true, 'dailyLoss 8 >= 40/5 should trigger');
assert.equal(indefCh.insanity.indefInsane, true);

// —— Permanent at SAN 0 ——
const zeroCh = {
    name: '归零者',
    attrs: { POW: 50 },
    derived: { sanity: 3, maxSan: 99 },
    insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] },
    status: {}
};
const rz = CoCEngine.SanityEngine.applySanLoss(zeroCh, 10, '崩溃', { deferInt: true });
assert.equal(zeroCh.derived.sanity, 0);
assert.equal(rz.permanentInsanity, true);
assert.equal(!!zeroCh.insanity.permanentInsane, true);
assert.equal(CoCEngine.canAct(zeroCh, 'melee').ok, false);

// —— POW spend follows profile ——
const caster = {
    name: '术士',
    attrs: { POW: 60 },
    skills: { '克苏鲁神话': 20, '意志': 50 },
    derived: { sanity: 50, maxSan: 79, mp: 20, hp: 10 },
    sanity: 50,
    mythos: 20,
    status: {},
    insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] }
};
CoCStudyState.initForChar(caster);
CoCStudyState.learnSpell(caster, '枯萎术');

CoCEngine.setRulesetProfile('7e-core');
const powBeforeCore = caster.attrs.POW;
const castCore = CoCEngine.MythosEngine.castSpell(caster, '枯萎术', null, { ritualComplete: true });
assert.equal(castCore.success, true);
assert.equal(castCore.powSpent || 0, 0);
assert.equal(caster.attrs.POW, powBeforeCore);

caster.derived.mp = 20;
caster.derived.sanity = 50;
CoCEngine.setRulesetProfile('7e-full');
const castFull = CoCEngine.MythosEngine.castSpell(caster, '枯萎术', null, { ritualComplete: true });
assert.equal(castFull.success, true);
assert.equal(castFull.powSpent, 8);
assert.equal(caster.attrs.POW, powBeforeCore - 8);

// —— Initiative modes ——
CoCEngine.setRulesetProfile('7e-full');
const armed = { name: '枪手', attrs: { DEX: 60 }, equipment: { weapon: '手枪' } };
const unarmed = { name: '徒手', attrs: { DEX: 60 }, equipment: { weapon: '' } };
const a = CoCEngine.Ruleset.resolveInitiativeScore(armed, { firearmReady: true, rollD10: () => 5 });
const b = CoCEngine.Ruleset.resolveInitiativeScore(unarmed, { firearmReady: false, rollD10: () => 5 });
assert.ok(a.sortKey > b.sortKey, 'firearm ready sorts higher at equal DEX');

CoCEngine.setRulesetProfile('7e-core');
const house = CoCEngine.Ruleset.resolveInitiativeScore(armed, { firearmReady: true, rollD10: () => 3 });
assert.equal(house.initiative, 63);

// restore default
CoCEngine.setRulesetProfile('7e-full');

console.log('rules_p0_p1_smoke: OK');
