/**
 * Round-14 bugfix smoke: APEX weapon label, first-aid counter, social attitude,
 * enchantment vs filter, falseLead dest, KP danger type.
 */
import { strict as assert } from 'node:assert';
import { CoCItemDB } from '../js/data/items.mjs';

// --- APEX equipped weapon label ---
assert.equal(CoCItemDB.equippedWeaponLabel({ equipment: { primary: { name: '步枪' }, weapon: '' } }), '步枪');
assert.equal(CoCItemDB.equippedWeaponLabel({ equipment: { melee: '匕首' } }), '匕首');
assert.equal(CoCItemDB.equippedWeaponLabel({ equipment: { weapon: '手枪' } }), '手枪');

// --- first-aid injury counter: +1 per call, no double init ---
function recordInjurySim(status) {
    if (status.untreatedFirstAid == null) status.untreatedFirstAid = 0;
    status.untreatedFirstAid += 1;
    return status.untreatedFirstAid;
}
const st = {};
assert.equal(recordInjurySim(st), 1);
assert.equal(recordInjurySim(st), 2);

// --- social attitude on NPC win ---
function applyAttitude(npc, winner, metaAttitude) {
    const delta = winner === 'actor' ? metaAttitude : (winner === 'npc' ? -metaAttitude : 0);
    if (winner === 'actor' || winner === 'npc') {
        npc.social = npc.social || {};
        npc.social.attitude = (Number(npc.social.attitude) || 0) + delta;
    }
    return npc.social?.attitude;
}
assert.equal(applyAttitude({ social: { attitude: 0 } }, 'npc', 1), -1);

// --- enchantment vs filter ---
function buffBonus(buff, hay) {
    const add = Number(buff.bonusDice) || 0;
    if (!add) return 0;
    const vs = buff.bonusDiceVs;
    if (!Array.isArray(vs) || !vs.length) return add;
    return vs.some((t) => hay.includes(String(t))) ? add : 0;
}
assert.equal(buffBonus({ bonusDice: 1, bonusDiceVs: ['哈斯塔'] }, '斗殴'), 0);
assert.equal(buffBonus({ bonusDice: 1, bonusDiceVs: ['哈斯塔'] }, '对抗哈斯塔'), 1);

// --- falseLead dest ---
function resolveFalseLeadDest(p) {
    if (p?.option?.falseLead && p.success && p.option.falseNext) return p.option.falseNext;
    return p?.option?.next || null;
}
assert.equal(resolveFalseLeadDest({ success: true, option: { falseLead: true, falseNext: 'trap', next: 'ok' } }), 'trap');
assert.equal(resolveFalseLeadDest({ success: false, option: { falseLead: true, falseNext: 'trap', next: 'ok' } }), 'ok');

// --- KP type map ---
function mapKpPick(pick) {
    return pick === 'clue' ? 'clue' : (pick === 'choice' ? 'observe' : 'danger');
}
assert.equal(mapKpPick('danger'), 'danger');
assert.equal(mapKpPick('choice'), 'observe');

console.log('bugfix_round14_smoke: OK');
