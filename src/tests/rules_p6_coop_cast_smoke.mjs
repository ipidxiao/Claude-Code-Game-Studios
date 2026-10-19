/**
 * P6: cooperative casting (shared MP) + POW oppose on damage spells.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { CoCStudyState } from '../js/data/mythos_tomes.mjs';

function makeCaster(name, opts) {
    opts = opts || {};
    const ch = {
        name: name,
        attrs: { POW: opts.pow != null ? opts.pow : 60, INT: 50 },
        skills: { '克苏鲁神话': opts.mythos != null ? opts.mythos : 20 },
        mythos: opts.mythos != null ? opts.mythos : 20,
        derived: {
            mp: opts.mp != null ? opts.mp : 5,
            sanity: opts.san != null ? opts.san : 50,
            maxSan: 79
        },
        status: {},
        insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] }
    };
    CoCStudyState.initForChar(ch);
    if (opts.spell) CoCStudyState.learnSpell(ch, opts.spell);
    return ch;
}

CoCEngine.setRulesetProfile('7e-core');

const lead = makeCaster('主施', { mp: 3, spell: '枯萎术', mythos: 10 });
const help = makeCaster('助手', { mp: 4, san: 40 });

// Solo: mp 3 < cost 6 → fail
const alone = CoCEngine.MythosEngine.castSpell(lead, '枯萎术', null);
assert.equal(alone.success, false);
assert.ok(/魔法值不足|分摊/.test(alone.description));

// Coop: 3+4 covers 6 → lead pays 3, helper 3 (even split rem on lead: floor(6/2)=3 each)
lead.derived.mp = 3;
help.derived.mp = 4;
const coop = CoCEngine.MythosEngine.castSpell(lead, '枯萎术', null, { assistants: [help] });
assert.equal(coop.success, true);
assert.equal(coop.coop, true);
assert.equal(coop.mpCost, 6);
assert.deepEqual(
    coop.mpShares.map((s) => ({ name: s.name, mp: s.mp, role: s.role })),
    [
        { name: '主施', mp: 3, role: 'lead' },
        { name: '助手', mp: 3, role: 'assistant' }
    ]
);
assert.equal(lead.derived.mp, 0);
assert.equal(help.derived.mp, 1);
assert.equal(help.derived.sanity, 39, 'assistant pays 1 SAN');
assert.ok(/协作/.test(coop.description));

// Helper too poor
const poorLead = makeCaster('穷主', { mp: 1, spell: '枯萎术', mythos: 10 });
const poorHelp = makeCaster('穷助', { mp: 1 });
const failCoop = CoCEngine.MythosEngine.castSpell(poorLead, '枯萎术', null, { assistants: [poorHelp] });
assert.equal(failCoop.success, false);

// POW oppose on damage (wither)
const caster = makeCaster('攻', { mp: 20, spell: '枯萎术', mythos: 10, pow: 80 });
const foe = { name: '敌', attrs: { POW: 40 }, derived: { hp: 10, maxHp: 10 }, isEnemy: true };
const win = CoCEngine.MythosEngine.castSpell(caster, '枯萎术', foe, {
    preCasterPow: { success: true, level: '成功', rolledValue: 20 },
    preTargetPow: { success: false, level: '失败', rolledValue: 90 }
});
assert.equal(win.powOpposed, 'caster');

const lose = CoCEngine.MythosEngine.castSpell(caster, '枯萎术', foe, {
    preCasterPow: { success: false, level: '失败', rolledValue: 90 },
    preTargetPow: { success: true, level: '成功', rolledValue: 20 }
});
assert.equal(lose.powOpposed, 'target');

assert.equal(typeof CoCEngine.MythosEngine.planCoopMp, 'function');

CoCEngine.setRulesetProfile('7e-full');
console.log('rules_p6_coop_cast_smoke: OK');
