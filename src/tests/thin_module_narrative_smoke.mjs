/**
 * Thin modules: narrative/check contract for museum + deep-one (no 100k prose).
 */
import { strict as assert } from 'node:assert';
import { auditScenario } from '../js/scenario/scenario_audit.mjs';
import { CoCScenarioMidnightMuseum } from '../js/data/scenarios/midnight_museum.mjs';
import { CoCScenarioDeepOneShadow } from '../js/data/scenarios/deep_one_shadow.mjs';

const FILLER = /下定决心|保持警惕|留意周围动静/;
const SPOILER = /检定成功|检定失败|若成功|若失败|成功则|失败则/;

function assertThinContract(scenario) {
    const audit = auditScenario(scenario);
    assert.equal(audit.ok, true, scenario.id + ': ' + audit.errors.join('; '));

    for (const [id, node] of Object.entries(scenario.nodes || {})) {
        for (const c of node.choices || []) {
            assert.ok(!FILLER.test(c.label || ''), `${scenario.id}/${id}: filler label «${c.label}»`);
            if (c.skillCheck) {
                const target = scenario.nodes[c.next];
                assert.ok(target, `${scenario.id}/${id}: missing next ${c.next}`);
                assert.ok(target.branch, `${scenario.id}/${id}→${c.next}: need branch`);
                assert.ok(target.groupOutcome, `${scenario.id}/${id}→${c.next}: need groupOutcome`);
            }
        }
        if (node.branch) {
            assert.ok(!SPOILER.test(node.narrative || ''), `${scenario.id}/${id}: setup must not spoil check outcome`);
        }
    }
}

assertThinContract(CoCScenarioMidnightMuseum);
assertThinContract(CoCScenarioDeepOneShadow);
console.log('thin_module_narrative_smoke: ok');
