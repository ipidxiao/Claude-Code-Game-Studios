/**
 * Creative UX + content follow-up smokes.
 */
import { strict as assert } from 'node:assert';
import { pressureChoiceSuffix, pressureHudLine } from '../js/data/arc_pressure_copy.mjs';
import { debunkFalseLeadClues } from '../js/state/false_lead.mjs';
import { maybeTriggerHeatEvent } from '../js/data/mythos_heat_events.mjs';
import { chapterMapStatus, unlockPrerequisites } from '../js/data/arc_chapters.mjs';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { CoCScenarioCatalog } from '../js/data/scenarios/catalog.mjs';
import { applyScenarioEffects } from '../js/scenario/effects_apply.mjs';
import { buildCoCEngine } from '../js/engines/index.mjs';

assert.ok(pressureChoiceSuffix({ police_interest: true }).includes('警察'));
assert.ok(pressureHudLine({ reputation_hit: true }, 3).includes('信誉'));

const gs = {
    clueBoard: {
        clues: [{
            id: 'false_lead_x',
            title: '可疑笔记',
            content: '旧文',
            status: 'investigating',
            meta: { falseLead: true }
        }]
    },
    flags: {},
    scenarioRunner: { flags: {} },
    chatHistory: []
};
const deb = debunkFalseLeadClues(gs, { clueId: 'false_lead_x' });
assert.equal(deb.count, 1);
assert.equal(gs.clueBoard.clues[0].status, 'solved');
assert.equal(gs.clueBoard.clues[0].meta.falseLead, false);

const Engine = buildCoCEngine();
const out = applyScenarioEffects({
    gameState: {
        clueBoard: {
            clues: [{ id: 'f2', title: '可疑', content: 'x', status: 'investigating', meta: { falseLead: true } }]
        },
        flags: {},
        scenarioRunner: { flags: {} },
        chatHistory: []
    },
    Engine,
    pushSystem: () => {},
    ensureFlags: () => ({})
}, { debunkFalseLead: true }, 'A');
assert.ok(out.debunkFalseLead && out.debunkFalseLead.count === 1);

const heatGs = { moduleSeed: 1, flags: {}, mythosHeat: 2, chatHistory: [], scenarioRunner: { flags: {} }, heatEventsLog: [] };
maybeTriggerHeatEvent(heatGs, 2, 4);
assert.ok(heatGs.heatEventsLog.length >= 1);

assert.ok(unlockPrerequisites('newsroom_midnight').includes('hearing_room'));
const map = chapterMapStatus({ chapters: { unlocked: ['hearing_room'], completed: [{ id: 'deep_one_shadow' }] } }, (id) => BUILTIN_BY_ID[id]);
assert.ok(map.some((n) => n.id === 'deep_one_shadow' && n.status === 'done'));
assert.ok(map.some((n) => n.id === 'hearing_room' && n.status === 'playable'));

assert.ok(BUILTIN_BY_ID.newsroom_midnight);
assert.ok(BUILTIN_BY_ID.cliff_mist_run);
assert.ok(!BUILTIN_BY_ID.cliff_mist_run.nodes.ledge_gap.effects.chase.gunfightBeats);
assert.ok(BUILTIN_BY_ID.newsroom_midnight.nodes.ending_by_evidence.endingsByClueQuality);

const v1 = CoCScenarioCatalog.validate(BUILTIN_BY_ID.newsroom_midnight);
assert.ok(v1.ok, 'newsroom: ' + (v1.errors || []).join('; '));
const v2 = CoCScenarioCatalog.validate(BUILTIN_BY_ID.cliff_mist_run);
assert.ok(v2.ok, 'cliff: ' + (v2.errors || []).join('; '));

console.log('creative_ux_content_smoke: OK');
