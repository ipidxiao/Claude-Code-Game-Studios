/**
 * P5: backstory five + credit lifestyle + Idea/Know/Luck characteristic checks.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { normalizeBackstory, filledBackstoryKeys, summarizeBackstory } from '../js/data/backstory.mjs';
import { lookupLifestyle } from '../js/data/credit_lifestyle.mjs';

assert.ok(CoCEngine.InvestigatorEngine);
assert.equal(CoCEngine.resolveSpecialCheck('灵感'), 'INT');
assert.equal(CoCEngine.resolveSpecialCheck('Know'), 'EDU');
assert.equal(CoCEngine.resolveSpecialCheck('运气'), 'LUCK');

const ch = {
    name: '测',
    attrs: { INT: 60, EDU: 70, LUCK: 45, POW: 50 },
    skills: { '信用评级': 35 },
    derived: { sanity: 40, maxSan: 99 },
    insanity: { indefInsane: true },
    backstory: {
        ideology: '科学至上',
        significantPeople: '',
        meaningfulLocations: '旧书店',
        treasuredPossessions: '',
        traits: '固执'
    }
};

assert.equal(CoCEngine.getSkillValue(ch, '灵感'), 60);
assert.equal(CoCEngine.getSkillValue(ch, 'Idea'), 60);
assert.equal(CoCEngine.getSkillValue(ch, '知识'), 70);
assert.equal(CoCEngine.getSkillValue(ch, 'Know'), 70);
assert.equal(CoCEngine.getSkillValue(ch, '运气'), 45);
assert.equal(CoCEngine.getSkillValue(ch, '幸运'), 45);
assert.equal(CoCEngine.isPushableSkill('灵感'), false);
assert.equal(CoCEngine.isPushableSkill('知识'), false);
assert.equal(CoCEngine.isPushableSkill('运气'), false);

const idea = CoCEngine.checkSkill('灵感', ch, 'normal', { skipStatusMods: true });
assert.equal(idea.skillValue, 60);
assert.equal(idea.pushable, false);

const filled = filledBackstoryKeys(ch.backstory);
assert.ok(filled.includes('ideology'));
assert.ok(filled.includes('meaningfulLocations'));
assert.ok(filled.includes('traits'));
assert.ok(!filled.includes('significantPeople'));
assert.ok(/科学至上/.test(summarizeBackstory(ch.backstory)));

const miss = CoCEngine.InvestigatorEngine.connectBackstory(ch, '重要之人');
assert.equal(miss.ok, false);

const before = ch.derived.sanity;
const conn = CoCEngine.InvestigatorEngine.connectBackstory(ch, 'ideology', {
    rewardDice: '1D6',
    clearIndef: true
});
assert.equal(conn.ok, true);
assert.ok(conn.recovered >= 1 && conn.recovered <= 6);
assert.equal(ch.derived.sanity, before + conn.recovered);
assert.equal(ch.insanity.indefInsane, false);

const life = lookupLifestyle(35);
assert.equal(life.id, 'average');
assert.equal(life.spendingLevel, 10);
assert.equal(life.cash, 35);
assert.equal(life.assets, 350);

CoCEngine.InvestigatorEngine.ensureWealth(ch, { reset: true });
assert.equal(ch.wealth.cash, 35);
assert.equal(ch.wealth.lifestyleId, 'average');

// Average CR35: cash $35, weekly $70 → hardship + credit drop
const short = CoCEngine.InvestigatorEngine.spendLifestyle(ch, { days: 7 });
assert.equal(short.ok, false);
assert.equal(short.hardship, true);
assert.equal(ch.skills['信用评级'], 34);
assert.equal(ch.wealth.cash, 0);

// Wealthy CR80: cash $400, weekly $350 → can pay
ch.skills['信用评级'] = 80;
CoCEngine.InvestigatorEngine.ensureWealth(ch, { reset: true });
assert.equal(ch.wealth.cash, 400);
const paid = CoCEngine.InvestigatorEngine.spendLifestyle(ch, { days: 7 });
assert.equal(paid.ok, true);
assert.equal(ch.wealth.cash, 50);
assert.equal(ch.skills['信用评级'], 80);

const norm = normalizeBackstory({ ideology: 'x' });
assert.equal(norm.traits, '');
assert.equal(norm.ideology, 'x');

console.log('rules_p5_investigator_smoke: OK');
