/**
 * V18.4 absorb: engines, tool catalog, HP cap, no ghost Worker/tool names.
 */
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CoCEngine } from '../js/coc.mjs';
import { CoCToolDefinitions } from '../js/tools/definitions.mjs';
import { CoCToolHandlers } from '../js/tools/handlers/index.mjs';
import { charMaxHp, buildQuickActionText } from '../js/components/combat_ui_helpers.mjs';
import { charFlags, charWoundMarks, charMythosHud, charSanMax, charSanCurrent } from '../js/components/char_hud_helpers.mjs';
import { CoCRuleCheck, resolvePendingRuleCheck } from '../js/state/rule_check.mjs';
import { createInvestigatorRecord } from '../js/state/char_record.mjs';
import { getCacheName } from '../scripts/asset_manifest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(typeof CoCEngine.canAttemptSkill, 'function');
assert.equal(typeof CoCEngine.ChaseEngine.start, 'function');
assert.equal(typeof CoCEngine.MajorWoundEngine.dealDamage, 'function');
assert.equal(typeof CoCEngine.applyHealing, 'function');
assert.equal(typeof CoCEngine.maxHp, 'function');

assert.ok(!CoCToolDefinitions.getNames().includes('apply_dice_modifier'), 'ghost tool name must not be in catalog');
assert.ok(CoCToolDefinitions.getNames().includes('apply_healing'));
assert.ok(CoCToolDefinitions.getNames().includes('reality_check'));
assert.ok(CoCToolDefinitions.getNames().includes('start_chase'));
assert.ok(CoCToolDefinitions.getNames().includes('advance_time'));
assert.ok(CoCToolDefinitions.getNames().includes('bonus_penalty_roll'));
assert.ok(CoCToolDefinitions.getNames().includes('aim_weapon'));
assert.ok(CoCToolDefinitions.getNames().includes('melee_attack'));
assert.ok(CoCToolDefinitions.getNames().includes('study_tome'));

const audit = CoCToolDefinitions.auditAgainstHandlers(CoCToolDefinitions.getNames(), ['request_skill_check', 'push_skill_check']);
assert.equal(audit.ok, true, 'tiers/catalog mismatch: ' + JSON.stringify(audit.tiersWithoutCatalog));
assert.deepEqual(audit.tiersWithoutCatalog, []);

const handlers = CoCToolHandlers.create({
    gameState: { roster: [], chatHistory: [], inventory: [] },
    addJournalEntry() {}, addNpc() {}, updateNpcStatus() {}, startCombat() {}, endCombat() {},
    updateEnemy() {}, advanceTurn() {}, createMap() {}, updateRoom() {}, setPosition() {},
    addClue() {}, linkClues() {}, markClueStatus() {}, rollCustomDice() {}, groupRoll() {}
}, CoCEngine);
const wired = CoCToolDefinitions.auditAgainstHandlers(Object.keys(handlers), ['request_skill_check', 'push_skill_check']);
assert.equal(wired.ok, true, JSON.stringify({ missing: wired.missingHandlers, extra: wired.handlersWithoutCatalog }));
assert.ok(typeof handlers.apply_healing === 'function');
assert.ok(typeof handlers.start_chase === 'function');
assert.ok(typeof handlers.advance_time === 'function');
assert.ok(typeof handlers.apply_therapy === 'function');
assert.ok(typeof handlers.aim_weapon === 'function');
assert.ok(typeof handlers.melee_attack === 'function');
assert.ok(typeof handlers.study_tome === 'function');

assert.equal(CoCEngine.fumbleThreshold(49), 100);
assert.equal(CoCEngine.fumbleThreshold(50), 96);
assert.equal(CoCEngine.getSkillValue({ sanity: 55, derived: { sanity: 55 } }, 'SAN'), 55);
assert.equal(CoCEngine.getSkillValue({ sanity: 40, derived: {} }, '理智'), 40);
assert.equal(typeof CoCEngine.CombatEngine.calculateDamage('1D3', 0, 0).finalDamage, 'number');
assert.equal(typeof CoCEngine.CombatEngine.aimShot, 'function');
assert.equal(typeof CoCEngine.CombatEngine.checkKnockback, 'function');
assert.equal(CoCEngine.CombatEngine.malfunctionThreshold({ malfunction: '00' }), 100);
assert.equal(typeof CoCEngine.MythosEngine.applySanCap, 'function');
assert.equal(typeof CoCEngine.MythosEngine.wouldCompleteStudy, 'function');

const caster = {
    name: '施法者',
    attrs: { POW: 60 },
    derived: { mp: 12, sanity: 50 },
    skills: { '克苏鲁神话': 20 },
    mythosStudy: { knownSpells: ['水晶占卜'] }
};
CoCEngine.setRulesetProfile('7e-core');
const powBefore = caster.attrs.POW;
const cast = CoCEngine.MythosEngine.castSpell(caster, '水晶占卜', null);
assert.equal(cast.success, true, cast.description);
assert.equal(caster.attrs.POW, powBefore, '7e-core: castSpell must not permanently drain POW');
caster.derived.mp = 12;
CoCEngine.setRulesetProfile('7e-full');
const castFull = CoCEngine.MythosEngine.castSpell(caster, '水晶占卜', null);
assert.equal(castFull.success, true, castFull.description);
assert.ok((castFull.powSpent || 0) > 0, '7e-full: castSpell should spend POW');
CoCEngine.setRulesetProfile('7e-full');

assert.equal(charMaxHp({ hp: 7, derived: { hp: 7, maxHp: 12 } }), 12);
assert.equal(charMaxHp({ hp: 7, derived: { hp: 7, maxHp: 0 } }), 7);

assert.equal(existsSync(join(root, 'js/ai/worker.js')), false, 'worker.js must be deleted');
assert.equal(existsSync(join(root, 'js/ai/worker_client.js')), false, 'worker_client.js must be deleted');
assert.equal(existsSync(join(root, 'js/coc.js')), false, 'dual-track coc.js must stay deleted');
assert.equal(existsSync(join(root, 'js/app.js')), false, 'dual-track app.js must stay deleted');
assert.equal(existsSync(join(root, 'js/engines/combat.js')), false, 'dual-track engines/*.js must stay deleted');
assert.equal(existsSync(join(root, 'js/components/canvas_chat.mjs')), false, 'unused CanvasChat must be deleted');
assert.equal(existsSync(join(root, 'js/data/items_db.mjs')), false, 'items_db.mjs must stay deleted');
assert.equal(typeof CoCRuleCheck.emitRuleSkillCheck, 'undefined');
assert.equal(typeof CoCRuleCheck.pauseForRuleCheck, 'function');

const swText = readFileSync(join(root, 'sw.js'), 'utf8');
assert.ok(existsSync(join(root, 'scripts/build_browser.mjs')), 'build_browser.mjs must exist');
assert.ok(existsSync(join(root, 'scripts/asset_manifest.mjs')), 'asset_manifest.mjs must exist');
assert.equal(swText.match(/const CACHE_NAME = '([^']+)'/)?.[1], getCacheName(), 'SW CACHE_NAME must match asset_manifest');
assert.ok(swText.includes('asylum_care.mjs'));
assert.ok(swText.includes('push_consequences.mjs'));
assert.equal(typeof CoCEngine.spendLuckOnCheck, 'function');
assert.equal(typeof CoCEngine.CombatEngine.resolveSweepFire, 'function');
assert.equal(typeof CoCEngine.MythosEngine.startRitual, 'function');
assert.ok(!swText.includes('items_db.mjs'), 'SW must not precache deleted items_db');
assert.ok(!swText.includes('canvas_chat.mjs'), 'SW must not precache deleted CanvasChat');
assert.ok(!swText.includes('dice_canvas.js'), 'SW must not precache unused dice canvas');
assert.ok(!swText.includes('js/lib/anime.mjs'), 'SW must not precache deleted anime.mjs');
assert.ok(!swText.includes('icons/icon-180.png'), 'SW must not precache missing icon-180');
assert.ok(swText.includes('situational.mjs'));
assert.ok(swText.includes('conditions.mjs'));
assert.ok(swText.includes('social.mjs'));
assert.ok(!swText.includes('sanity_effects.js'));
assert.ok(swText.includes('sanity_effects.mjs'));
assert.ok(swText.includes('char_record.mjs'));
assert.equal(existsSync(join(root, 'js/components/dice_canvas.js')), false);
assert.equal(existsSync(join(root, 'js/components/sanity_effects.js')), false);

assert.equal(typeof CoCEngine.resolveSituation, 'function');
assert.equal(typeof CoCEngine.processRound, 'function');
assert.equal(typeof CoCEngine.resolveManeuver, 'function');
assert.equal(typeof CoCEngine.resolveSocial, 'function');
assert.equal(typeof CoCEngine.resolveChaseAction, 'function');
assert.ok(CoCToolDefinitions.getNames().includes('social_opposed'));
assert.ok(CoCToolDefinitions.getNames().includes('set_combat_situation'));
assert.ok(CoCToolDefinitions.getNames().includes('shove'));

const storyView = readFileSync(join(root, 'js/views/story_view.mjs'), 'utf8');
assert.ok(storyView.includes("import { StoryEquip }"), 'StoryEquip must be imported');
assert.ok(storyView.includes("'story-equip': StoryEquip"), 'StoryEquip must be registered in ViewStory');

const resistPoison = CoCToolDefinitions.catalog.resist_poison.description;
assert.ok(!resistPoison.includes('自动 tick'), 'resist_poison must not claim combat auto-tick');
assert.ok(resistPoison.includes('process_poison_tick'));

const wounded = {
    name: '伤者',
    hp: 5,
    attrs: { CON: 50, SIZ: 50 },
    derived: { hp: 5, maxHp: 0 },
    status: {}
};
const heal = CoCEngine.applyHealing(wounded, 3, { type: 'first_aid' });
assert.ok(heal.newHp > 5, 'maxHp 0 must not cap heal at current HP, got ' + heal.newHp);
assert.equal(heal.newHp, 8);

const fresh = {
    name: '新伤',
    hp: 10,
    attrs: { CON: 50, SIZ: 50 },
    derived: { hp: 10, maxHp: 10 },
    status: {}
};
const dmg = CoCEngine.MajorWoundEngine.dealDamage(fresh, 3);
assert.equal(dmg.hp, 7);
assert.equal(dmg.damage, 3);

const dyingChar = {
    name: '濒死',
    hp: 2,
    attrs: { CON: 50, SIZ: 50 },
    derived: { hp: 2, maxHp: 10 },
    status: { hasMajorWound: true }
};
const lethal = CoCEngine.MajorWoundEngine.dealDamage(dyingChar, 5);
assert.equal(lethal.dying, true);
assert.equal(dyingChar.status.isDead, undefined, 'dying CON must wait for the dice panel');
assert.equal(dyingChar.status.isDying, true);

const dyingGs = {
    roster: [{ name: '濒死', attrs: { CON: 50 }, status: { isDying: true }, isActive: true }],
    chatHistory: [],
    pendingRuleCheck: { kind: 'dying', skill: '体质', roller: '濒死', target: '濒死' }
};
resolvePendingRuleCheck(dyingGs, {
    skill: '体质',
    charName: '濒死',
    success: false,
    rolledValue: 99,
    targetValue: 50
}, CoCEngine);
assert.equal(dyingGs.roster[0].status.isDead, true, 'failed dyingCheck must mark dead');
assert.equal(dyingGs.roster[0].isActive, false);

const origParse = CoCEngine.parseDice;
CoCEngine.parseDice = (s) => (String(s).toUpperCase().includes('D4') ? 4 : 6);
try {
    const gunHit = CoCEngine.CombatEngine.resolveCombatExchange(
        { name: '射手', derived: { db: '1D4' } },
        { name: '目标', armor: 3, isEnemy: true },
        {
            weapon: { type: 'firearm', skill: '步枪', damage: '1D10' },
            preRolledAttack: { success: true, level: '成功', rolledValue: 20, targetValue: 50 },
            preRolledDefense: { success: false, level: '失败', rolledValue: 99, targetValue: 1 }
        }
    );
    assert.equal(gunHit.damage, 3, 'firearms ignore DB but apply armor (6-3), got ' + gunHit.damage);
    const meleeHit = CoCEngine.CombatEngine.resolveCombatExchange(
        { name: '打手', derived: { db: '1D4' } },
        { name: '目标', armor: 2, isEnemy: true },
        {
            weapon: { type: 'melee', skill: '斗殴', damage: '1D3' },
            preRolledAttack: { success: true, level: '成功', rolledValue: 20, targetValue: 50 },
            preRolledDefense: { success: false, level: '失败', rolledValue: 99, targetValue: 1 }
        }
    );
    assert.equal(meleeHit.damage, 8, 'melee still adds DB then armor, got ' + meleeHit.damage);
} finally {
    CoCEngine.parseDice = origParse;
}

const hudChar = {
    sanity: 40,
    derived: { sanity: 40 },
    status: {
        hasMajorWound: true,
        isDying: true,
        wounds: [{ location: { location: '右臂', area: 'right_arm', desc: '武器掉落' }, bleeding: true }]
    },
    skills: { '克苏鲁神话': 12 },
    mythosStudy: {
        knownSpells: ['水晶占卜'],
        studiedTomes: { '死灵书': { phase: '研读中', weeks: 8, totalWeeks: 32 } }
    }
};
assert.equal(charFlags(hudChar).hasMajorWound, true);
assert.equal(charFlags(hudChar).isDying, true);
assert.deepEqual(charWoundMarks(hudChar).slots, ['rightArm']);
assert.equal(charWoundMarks(hudChar).chips[0].bleeding, true);
assert.equal(charMythosHud(hudChar).visible, true);
assert.equal(charMythosHud(hudChar).spells[0], '水晶占卜');
assert.equal(charMythosHud(hudChar).tomes[0].pct, 25);
assert.equal(charSanMax(hudChar), 87);
assert.equal(charSanCurrent({ derived: { sanity: 10 }, sanity: 99 }), 10);
assert.equal(charFlags({ status: {} }).hasMajorWound, false);
assert.equal(charMythosHud({}).visible, false);
assert.ok(swText.includes('char_hud_helpers.mjs'));

const rec = createInvestigatorRecord({
    name: '接口',
    hp: 11,
    sanity: 60,
    derived: { maxHp: 11, san: 60 },
    isActive: true,
    hasMajorWound: true
});
assert.equal(rec.status.hasMajorWound, true);
assert.equal(rec.hasMajorWound, undefined);
assert.equal(rec.derived.sanity, 60);
assert.equal(rec.insanity.tempInsane, false);
assert.equal(buildQuickActionText('melee'), '我向最近的敌人发起近战攻击！');
assert.equal(typeof CoCEngine.SanityEngine.getSanNarrative, 'function');
assert.equal(typeof CoCEngine.SanityEngine.getTomeNarrative, 'function');
assert.equal(typeof CoCEngine.SanityEngine.getSanitySummary, 'function');
assert.equal(typeof CoCEngine.MythosEngine.getKnownSpells, 'function');

console.log('v18_absorb_smoke: ok');
