import { RULESET_PROFILES, getRulesetId, getRulesetProfile, setRulesetProfile, resolveInitiativeScore } from './ruleset_profile.mjs';
import { compileIntent } from './compile.mjs';
import { executeEffects } from './execute.mjs';
import { OPS } from './effect_ir.mjs';
import { attachModifierBus } from './modifier_bus.mjs';
import { attachTickBus } from './tick_bus.mjs';

export function attachRulesetEngine(CoCEngine) {
    attachModifierBus(CoCEngine);
    attachTickBus(CoCEngine);
    CoCEngine.Ruleset = {
        profiles: RULESET_PROFILES,
        getId: getRulesetId,
        get: getRulesetProfile,
        set: setRulesetProfile,
        resolveInitiativeScore: resolveInitiativeScore
    };
    CoCEngine.Rules = {
        compile: compileIntent,
        execute: executeEffects,
        OPS: OPS
    };
    CoCEngine.getRulesetProfile = getRulesetProfile;
    CoCEngine.setRulesetProfile = setRulesetProfile;
    CoCEngine.compileIntent = compileIntent;
    CoCEngine.executeEffects = executeEffects;
}
