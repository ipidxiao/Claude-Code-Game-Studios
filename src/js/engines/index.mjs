// Engine assembly — import order matches index.html script chain
import { attachDiceEngine } from './dice.mjs';
import { attachAttributesEngine } from './attributes.mjs';
import { attachSkillsEngine } from './skills.mjs';
import { attachSituationalEngine } from './situational.mjs';
import { attachCombatEngine } from './combat.mjs';
import { attachHealingEngine } from './healing.mjs';
import { attachSanityEngine } from './sanity.mjs';
import { attachMajorWoundEngine } from './wound.mjs';
import { attachMythosEngine } from './mythos.mjs';
import { attachEnvironmentalEngine } from './environmental.mjs';
import { attachPoisonEngine } from './poison.mjs';
import { attachDamageEngine } from './damage.mjs';
import { attachConditionsEngine } from './conditions.mjs';
import { attachSkillAttemptEngine } from './skill_attempt.mjs';
import { attachChaseEngine } from './chase.mjs';
import { attachSocialEngine } from './social.mjs';
import { attachInvestigatorEngine } from './investigator.mjs';
import { attachNpcBehaviorEngine } from './npc_behavior.mjs';
import { attachRulesetEngine } from '../rules/attach.mjs';

export function buildCoCEngine() {
    const CoCEngine = {};
    attachRulesetEngine(CoCEngine);
    attachDiceEngine(CoCEngine);
    attachAttributesEngine(CoCEngine);
    attachSkillsEngine(CoCEngine);
    attachSituationalEngine(CoCEngine);
    attachCombatEngine(CoCEngine);
    attachHealingEngine(CoCEngine);
    attachSanityEngine(CoCEngine);
    attachMajorWoundEngine(CoCEngine);
    attachDamageEngine(CoCEngine);   // Must be after SanityEngine + MajorWoundEngine
    attachMythosEngine(CoCEngine);
    attachEnvironmentalEngine(CoCEngine);
    attachPoisonEngine(CoCEngine);
    attachConditionsEngine(CoCEngine);
    attachSkillAttemptEngine(CoCEngine);
    attachChaseEngine(CoCEngine);
    attachSocialEngine(CoCEngine);
    attachInvestigatorEngine(CoCEngine);
    attachNpcBehaviorEngine(CoCEngine);
    return CoCEngine;
}
