/**
 * Creator experience list comes from the ESM export, filtered by era.
 * SAN loss dice stay unrolled.
 */
import { strict as assert } from 'node:assert';
import { CoCExperiences } from '../js/data/experiences.mjs';

const VETERAN = '一战/战场老兵 (War Veteran)';
const HACKER = '暗网黑客 (Dark Web Hacker)';

const draftChar = {
    era: '1920s',
    expPackage: null,
    attrs: { STR: 0, POW: 60 },
    job: null,
    skillAllocations: {},
    derived: { san: 60 },
    sanPenalty: 0
};
const gameState = { currentScreen: 'creator', roster: [], scenarioRunner: {} };

globalThis.window = globalThis;
window.Vue = {
    computed(fn) { return { get value() { return fn(); } }; },
    ref(v) { return { value: v }; },
    watch(source) { if (typeof source === 'function') source(); },
    nextTick(fn) { return Promise.resolve(typeof fn === 'function' ? fn() : undefined); }
};
window.CoCStateAccessor = { getState() { return { draftChar, gameState, activeCreatorTab: { value: 'stats' } }; } };

const { CoCCreator } = await import('../js/components/char_creator.mjs');

function namesFor(era) {
    draftChar.era = era;
    return CoCCreator.availableExperiences.value.map((exp) => exp.name);
}

assert.equal(CoCExperiences.length, 22);
const gaslight = namesFor('1920s');
assert.ok(gaslight.includes(VETERAN), '1920s lists the war veteran');
assert.ok(!gaslight.includes(HACKER), '1920s hides the dark-web hacker');
const modern = namesFor('现代');
assert.ok(modern.includes(HACKER), 'modern lists the dark-web hacker');
assert.ok(!modern.includes(VETERAN), 'modern hides the war veteran');

console.log('creator_experience_smoke: OK', { packages: CoCExperiences.length, gaslight: gaslight.length, modern: modern.length });
