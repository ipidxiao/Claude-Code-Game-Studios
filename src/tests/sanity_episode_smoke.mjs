/**
 * W3 sanity episode smoke — INT success → temp insanity
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { CoCInsanityTables } from '../js/data/insanity_tables.mjs';

assert.ok(CoCInsanityTables.BOUT_SUMMARY);
assert.ok(CoCInsanityTables.BOUT_REAL_TIME);

const ch = {
    name: '目击者',
    attrs: { INT: 70, POW: 50 },
    derived: { sanity: 60, maxSan: 99 },
    sanity: 60,
    insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] },
    status: {}
};

const insane = CoCEngine.SanityEngine.resolveTempInsanityCheck(ch, {
    success: true, level: '成功', rolledValue: 20, targetValue: 70
});
assert.equal(insane.tempInsanity, true);
assert.equal(ch.insanity.tempInsane, true);
assert.ok(ch.insanity.boutEffect || ch.status.boutFaint || ch.status.boutFlee || ch.status.boutViolence
    || ch.status.boutSense || ch.status.boutAmnesia || ch.status.boutHallucination
    || ch.status.boutHysteria || ch.status.boutAttachment || ch.insanity.boutName);

const ch2 = {
    name: '未解者',
    attrs: { INT: 70 },
    derived: { sanity: 60, maxSan: 99 },
    insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] },
    status: {}
};
const ok = CoCEngine.SanityEngine.resolveTempInsanityCheck(ch2, {
    success: false, level: '失败', rolledValue: 90, targetValue: 70
});
assert.equal(ok.tempInsanity, false);
assert.equal(ch2.insanity.tempInsane, false);

const gs = { sanCaps: {} };
const victim = {
    name: 'V',
    derived: { sanity: 50, maxSan: 99 },
    sanity: 50,
    attrs: { POW: 50 },
    insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] }
};
const r1 = CoCEngine.SanityEngine.applyCappedSanLoss(gs, victim, '深潜者', '0/1D6', false, { rolledValue: 80, targetValue: 50 });
assert.ok((r1.sanLoss || 0) >= 0);
const rem = gs.sanCaps['深潜者'];
assert.ok(typeof rem === 'number');

ch.insanity.phobias = [{ name: '黑暗恐惧症 (Nyctophobia)', desc: '对黑暗的恐惧' }];
const trig = CoCEngine.SanityEngine.triggerPhobiaMania(ch, '黑暗');
assert.equal(trig.triggered, true);
assert.equal(trig.penaltyDice, 1);

const summaryBout = CoCEngine.SanityEngine.rollBoutOfMadness({ summary: true });
assert.equal(summaryBout.mode, 'summary');

function freshWitness(name) {
    return {
        name,
        attrs: { INT: 70, POW: 60 },
        derived: { sanity: 60, maxSan: 99 },
        sanity: 60,
        insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] },
        status: {}
    };
}

globalThis.window = globalThis;
let sanWarnings = 0;
window.CoCSFX = { playSanWarning(n) { sanWarnings += n; } };
CoCEngine._setTestRolls([100]);
const warned = CoCEngine.SanityEngine.applySanLoss(freshWitness('惊'), 5, '冲击');
CoCEngine._clearTestRolls();
assert.equal(warned.tempInsanity, false);
assert.equal(sanWarnings, 1, 'a failed INT check after SAN loss plays one warning');

delete window.CoCSFX;
CoCEngine._setTestRolls([100]);
assert.doesNotThrow(() => CoCEngine.SanityEngine.applySanLoss(freshWitness('静'), 5, '冲击'));
CoCEngine._clearTestRolls();
assert.equal(sanWarnings, 1, 'missing SFX must not throw or invent a call');

window.CoCSFX = { playSanWarning(n) { sanWarnings += n; } };
CoCEngine._setTestRolls([20]);
const understood = CoCEngine.SanityEngine.applySanLoss(freshWitness('悟'), 5, '冲击');
CoCEngine._clearTestRolls();
assert.equal(understood.tempInsanity, true);
assert.equal(sanWarnings, 1, 'temporary insanity does not play the warning');

console.log('sanity_episode_smoke: OK');
