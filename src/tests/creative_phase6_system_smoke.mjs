/**
 * Creative Phase 6 — system polish smokes (S1–S4).
 */
import { strict as assert } from 'node:assert';
import {
    previewScenarioCapabilities,
    formatCapabilityPreview,
    chapterMapProgress,
    buildEndingSaveBlurb,
    composeSaveBlurb,
    CAPABILITY_GLOSSARY,
    capabilityGloss
} from '../js/data/capability_system.mjs';
import { buildUnreliableSaveBlurb } from '../js/state/mythos_heat.mjs';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { chapterMapStatus } from '../js/data/arc_chapters.mjs';

assert.ok(CAPABILITY_GLOSSARY.length >= 6);
assert.ok(capabilityGloss('双时钟').includes('双轨'));

const court = BUILTIN_BY_ID.court_recess;
const caps = previewScenarioCapabilities(court);
assert.ok(caps.includes('证据分叉'), 'court evidence');
assert.ok(caps.includes('双时钟'), 'court clocks');
assert.ok(caps.includes('假线索'), 'court false lead');
assert.ok(caps.includes('战役账本'), 'court arc');
assert.ok(formatCapabilityPreview(caps).startsWith('本局会用到：'));

const watch = BUILTIN_BY_ID.lighthouse_night_watch;
const wCaps = previewScenarioCapabilities(watch);
assert.ok(!wCaps.includes('追逐'), 'night watch has no chase');
assert.ok(wCaps.includes('假线索'));

const cliff = BUILTIN_BY_ID.cliff_mist_run;
assert.ok(previewScenarioCapabilities(cliff).includes('追逐'));

const rows = chapterMapStatus(
    { chapters: { unlocked: ['hearing_room'], completed: [{ id: 'deep_one_shadow' }] } },
    (id) => BUILTIN_BY_ID[id]
);
const prog = chapterMapProgress(rows);
assert.equal(prog.done + prog.playable + prog.locked, prog.total);
assert.ok(prog.label.includes('已完成'));
assert.ok(prog.doneRatio >= 0 && prog.doneRatio <= 1);

const recap = {
    endingKey: 'ending_win',
    lines: [
        { t: 'end', text: '终局节点：ending_win' },
        { t: 'evidence', text: '证据档：solid · 热度：2/5' }
    ],
    capabilitiesUsed: ['双时钟', '假线索']
};
const endBlurb = buildEndingSaveBlurb(recap);
assert.ok(endBlurb.includes('ending_win'));
assert.ok(endBlurb.includes('用到：'));

const gs = {
    endingSaveBlurb: endBlurb,
    currentLocation: '休庭室',
    journalLog: [],
    mythosHeat: 0
};
assert.equal(composeSaveBlurb(gs, buildUnreliableSaveBlurb), endBlurb);

const gs2 = { currentLocation: '雨巷', journalLog: [{ summary: '只剩脚印' }], mythosHeat: 1 };
const heat = composeSaveBlurb(gs2, buildUnreliableSaveBlurb);
assert.ok(heat.includes('雨巷'));

console.log('creative_phase6_system_smoke: OK');
