/**
 * R30 regressions: browser boot, AI party snapshot, save fallback,
 * scenario-start isolation, and clue-quality validation.
 */
import { strict as assert } from 'node:assert';
import { buildTeamDetails } from '../js/ai/team_snapshot.mjs';
import { auditScenario } from '../js/scenario/scenario_audit.mjs';

const full = buildTeamDetails([{
    name: 'Alice',
    isActive: true,
    hp: 13,
    sanity: 55,
    derived: { hp: 13, maxHp: 13, sanity: 55 },
    equipment: { weapon: '左轮手枪' }
}]);
assert.match(full, /HP:13\/13/);
assert.match(full, /SAN:55/);
assert.match(full, /weapon:左轮手枪/);

const wounded = buildTeamDetails([{
    name: 'Alice',
    isActive: true,
    hp: 5,
    sanity: 51,
    derived: { hp: 5, maxHp: 13, sanity: 51 },
    equipment: {}
}]);
assert.match(wounded, /HP:5\/13/);
assert.doesNotMatch(wounded, /HP:5\/5/);

const legacy = buildTeamDetails([{
    name: 'Legacy',
    isActive: true,
    hp: 5,
    san: 42,
    derived: { hp: 13 },
    equipment: {}
}]);
assert.match(legacy, /HP:5\/13/);
assert.match(legacy, /SAN:42/);

const sparse = buildTeamDetails([{ name: 'Sparse', isActive: true }]);
assert.match(sparse, /HP:—\/—/);
assert.match(sparse, /SAN:—/);

const invalidScenario = auditScenario({
    id: 'invalid_quality',
    startNode: 'start',
    nodes: {
        start: {
            checkpoint: true,
            narrative: '调查员沿着潮湿走廊前行。'.repeat(12),
            choices: [{
                id: 'bad_gate',
                label: '携带现有证据继续追查仪式源头',
                next: 'ending',
                requiresClueQuality: 'decisve'
            }]
        },
        ending: {
            checkpoint: true,
            end: true,
            narrative: '调查员在黎明前离开了现场。'.repeat(12) + '【结局：测试】'
        }
    }
});
assert.ok(
    invalidScenario.errors.some((e) => e.includes('invalid requiresClueQuality "decisve"')),
    invalidScenario.errors.join('\n')
);

console.log('bugfix_round30_smoke: OK');
