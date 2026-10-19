/**
 * Lossless reader joins: spawn derived, skills, catalog, chase damage, spell SAN slash.
 * Deterministic. Does not change formulas.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { CoCItemDB } from '../js/data/items.mjs';
import { generateNpcFromTemplate } from '../js/data/npc_templates.mjs';
import { combat, toCombatWeapon, ammoTypeForWeapon } from '../js/tools/handlers/combat.mjs';
import { chase } from '../js/tools/handlers/chase.mjs';
import { character } from '../js/tools/handlers/character.mjs';
import { applyChaseInjury, resolvePendingRuleCheck, applySpellCastResult } from '../js/state/rule_check.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { runEnemyCombatTurn } from '../js/engines/npc_behavior.mjs';
import { CoCSpells } from '../js/data/spells.mjs';
import { buildOpeningContext } from '../js/story_opening.mjs';
import { isActiveCombatEnemy } from '../js/engines/npc_behavior.mjs';
import { CoCStudyState } from '../js/data/mythos_tomes.mjs';
import { applyScenarioEffects } from '../js/scenario/effects_apply.mjs';

const cop = generateNpcFromTemplate('警察');
assert.equal(cop.hp, 13, 'template HP is not recalculated');
assert.equal(cop.derived.hp, 13);
assert.equal(cop.derived.db, '1D4');
assert.equal(cop.derived.build, 1);
assert.equal(cop.derived.mov, 8);

const shoggoth = generateNpcFromTemplate('修格斯');
assert.equal(shoggoth.hp, 19);
assert.equal(shoggoth.derived.hp, 19);
assert.equal(shoggoth.derived.db, '2D6');
assert.equal(shoggoth.mov, 6, 'book MOV is kept');

const cult = generateNpcFromTemplate('邪教徒');
assert.equal(cult.derived.sanity, 45);
assert.equal(CoCEngine.getSkillValue(cult, '理智'), 45);

const bare = { hp: 10, maxHp: 10 };
const hurt = CoCEngine.applyDamage(bare, 3, { type: 'combat', desc: 'test' });
assert.equal(hurt.damageDealt, 3);
assert.equal(bare.hp, 7);
assert.equal(bare.derived.hp, 7);

{
    const gs = {
        combat: { active: true, enemies: [], initiativeOrder: [], currentTurnIdx: 0 },
        chatHistory: [],
        npcRegistry: [],
        roster: []
    };
    const h = combat({ gameState: gs, Engine: CoCEngine, addJournalEntry() {} });
    h.spawn_npc({ template: '警察' });
    const turn = gs.combat.initiativeOrder[0];
    assert.equal(turn.sortKey, 551, 'DEX 55 with a readied firearm');
    assert.equal(turn.firearmReady, true);
}

{
    const opening = buildOpeningContext({
        selectedCharIndex: 1,
        roster: [
            { name: '甲', isActive: true, era: '1920s' },
            { name: '乙', isActive: true, era: 'modern' }
        ],
        chatHistory: []
    }, { local: true, location: '码头' });
    assert.equal(opening.time, '现代');
}

const foe = {
    isEnemy: true,
    attrs: { STR: 70, CON: 65, DEX: 50, POW: 55 },
    skills: { '手枪': 50, '步枪': 60 }
};
assert.equal(CoCEngine.getSkillValue(foe, '力量'), 70);
assert.equal(CoCEngine.getSkillValue(foe, '体质'), 65);
assert.equal(CoCEngine.getSkillValue(foe, '意志'), 55);
assert.equal(CoCEngine.getSkillValue(foe, '闪避'), 25);
assert.equal(CoCEngine.getSkillValue(foe, '射击'), 50);
assert.equal(CoCEngine.getSkillValue(foe, '霰弹枪'), 60);
assert.equal(CoCEngine.getSkillValue(foe, '潜行'), 25);

const shooter = { attrs: { DEX: 60 }, skills: { '手枪': 70, '步枪': 65, '冲锋枪': 45 } };
assert.equal(CoCEngine.getSkillValue(shooter, '霰弹枪'), 65);
assert.equal(CoCEngine.getSkillValue(shooter, '射击：冲锋枪'), 45);
const untrainedSmg = { attrs: { DEX: 60 }, skills: { '手枪': 70 } };
assert.equal(CoCEngine.getSkillValue(untrainedSmg, '射击：冲锋枪'), 0);

const bow = toCombatWeapon('弓箭', 'firearm');
assert.equal(bow.skill, '射击：弓箭');
assert.notEqual(bow.skill, '手枪');
const smg = toCombatWeapon('汤普森冲锋枪', 'firearm');
assert.equal(smg.skill, '射击：冲锋枪');
assert.equal(smg.damage, '1D10+2');
const garand = toCombatWeapon('加兰德M1、M2步枪', 'firearm');
assert.equal(garand.damage, '2D6+4');
assert.equal(garand.capacity, 8);
const pump = toCombatWeapon('12 号霰弹枪(泵动)', 'firearm');
assert.equal(pump.impale, false);
assert.equal(pump.range, '10/20/50');
assert.ok(String(pump.damage).includes('/'));
const shortPump = toCombatWeapon('泵动霰弹枪', 'firearm');
assert.equal(shortPump.impale, false);
const revolver = toCombatWeapon('.45 左轮', 'firearm');
assert.ok(String(revolver.name).includes('.45'));
assert.equal(revolver.damage, '1D10+2');
const whip = toCombatWeapon('长鞭', 'melee');
assert.equal(whip.damage, '1D3+DB/2');
const spear = toCombatWeapon('投矛', 'melee');
assert.equal(spear.skill, '投掷');
assert.equal(spear.damage, '1D8+DB/2');

const half = CoCEngine.resolveWeaponDamage('1D6+半DB', { db: '2D6', rangeBand: 'close' });
assert.equal(half.expr, '1D6+1D6');

assert.equal(ammoTypeForWeapon('9mm 自动手枪'), '手枪');
assert.equal(ammoTypeForWeapon('.45 自动手枪'), '手枪');
assert.equal(ammoTypeForWeapon('.45 左轮手枪'), '左轮');
assert.equal(ammoTypeForWeapon('汤普森冲锋枪'), '9mm');
assert.equal(ammoTypeForWeapon('弓箭'), '箭');
assert.equal(ammoTypeForWeapon('弩'), '弩箭');
assert.equal(CoCItemDB.resolve('加兰德M1、M2步枪').damage, '2D6+4');

{
    const gs = {
        roster: [
            { name: '在场', isActive: true, attrs: { CON: 60, DEX: 60, STR: 50, SIZ: 50 }, derived: { mov: 8 }, skills: {} },
            { name: '离场', isActive: false, attrs: { CON: 40, DEX: 40, STR: 40, SIZ: 40 }, derived: { mov: 8 }, skills: {} }
        ],
        npcRegistry: [{ name: '路人', attrs: { CON: 70 }, skills: { '汽车驾驶': 40 }, mov: 8 }],
        combat: { enemies: [] },
        chatHistory: [],
        chase: null
    };
    const h = chase({ gameState: gs, Engine: CoCEngine, addJournalEntry() {} });
    h.start_chase({ quarry_name: '路人' });
    const names = (gs.chase.participants || []).map((p) => p.name);
    assert.ok(names.includes('在场'));
    assert.ok(!names.includes('离场'));
    assert.equal(CoCEngine.getSkillValue(
        { attrs: { CON: 70 }, skills: { '汽车驾驶': 40 } },
        '体质'
    ), 70);
}

{
    const gs = {
        roster: [],
        combat: { enemies: [{ name: '修格斯', hp: 19, maxHp: 19, derived: { hp: 19 } }] },
        chatHistory: []
    };
    const hit = applyChaseInjury(gs, CoCEngine, '修格斯', 4);
    assert.equal(hit.hp, 15);
    assert.equal(gs.combat.enemies[0].hp, 15);
    assert.equal(gs.combat.enemies[0].derived.hp, 15);
    const stale = { name: '残血', hp: 10, derived: { hp: 19, maxHp: 19 } };
    gs.combat.enemies.push(stale);
    applyChaseInjury(gs, CoCEngine, '残血', 4);
    assert.equal(stale.hp, 6);
    assert.equal(stale.derived.hp, 6);
    applyChaseInjury(gs, CoCEngine, '残血', 6);
    assert.equal(stale.hp, 0);
    assert.equal(stale.derived.hp, 0);
    assert.equal(stale.isDefeated, true);
}

{
    CoCEngine._setTestRolls([1]);
    const social = CoCEngine.resolveSocial(
        { name: '甲', skills: { '恐吓': 40 }, attrs: { POW: 50 } },
        { name: '空', skills: {} },
        'intimidate',
        { opponent_value: 0 }
    );
    assert.equal(social.resistVal, 0);
    assert.notEqual(social.npcLevel, '大成功');
    CoCEngine._clearTestRolls();
}

{
    const gs = {
        roster: [{ name: '调查员', isActive: true, skills: { '意志': 40 }, attrs: { POW: 40 } }],
        combat: { enemies: [{ name: '深潜者', isEnemy: true, hp: 13, attrs: { POW: 80, STR: 70 }, skills: {} }] },
        npcRegistry: [{ name: '深潜者' }],
        chatHistory: [],
        pendingRuleCheck: {
            kind: 'opposed_roll',
            skill: '意志',
            roller: '调查员',
            target: '调查员',
            opponentName: '深潜者',
            opponentValue: null
        }
    };
    CoCEngine._setTestRolls([60]);
    const out = resolvePendingRuleCheck(gs, {
        skill: '意志',
        charName: '调查员',
        success: false,
        level: '失败',
        rolledValue: 90,
        targetValue: 40,
        skillValue: 40
    }, CoCEngine);
    assert.match(String(out), /胜出/);
    const alert = gs.chatHistory.map((m) => m.content).join('\n');
    assert.match(alert, /60\/80/);
    CoCEngine._clearTestRolls();
}

{
    const spells = CoCEngine.MythosEngine._spells();
    const spell = spells['接触奈亚拉托提普'];
    const saved = spell.sanCost;
    spell.sanCost = '1D6/8';
    const ch = {
        name: '法师',
        attrs: { POW: 80 },
        skills: { '克苏鲁神话': 20 },
        derived: { mp: 12, sanity: 70, maxSan: 80 },
        mythosStudy: { knownSpells: ['接触奈亚拉托提普'], studiedTomes: {} }
    };
    const cast = CoCEngine.MythosEngine.castSpell(ch, '接触奈亚拉托提普', null, {});
    spell.sanCost = saved;
    assert.equal(cast.success, true, cast.description);
    assert.equal(ch.derived.sanity, 62, 'slash SAN deducts the right side');
}

{
    const rateParen = CoCEngine.CombatEngine.parseAttacksRate('1(3)');
    assert.equal(rateParen.shotsPerRound, 3);
    assert.equal(rateParen.alternateRound, false);
    const rateOr = CoCEngine.CombatEngine.parseAttacksRate('1 or 2');
    assert.equal(rateOr.shotsPerRound, 2);
    const rateSlow = CoCEngine.CombatEngine.parseAttacksRate('1/4');
    assert.equal(rateSlow.alternateRound, true);
    assert.equal(rateSlow.period, 4);
    const rateHalf = CoCEngine.CombatEngine.parseAttacksRate('1/2');
    assert.equal(rateHalf.alternateRound, true);
    assert.equal(rateHalf.period, 2);
    const auto = CoCEngine.CombatEngine.parseAttacksRate('全自动');
    assert.equal(auto.volley, true);
    assert.equal(auto.shotsPerRound, 1);
}

{
    const vest = {
        name: '穿甲', armor: 0, derived: { hp: 12, db: 0 }, skills: { '闪避': 1 },
        equipment: { armor: { name: '防弹背心', armor: 8, notes: '仅对枪弹' } }
    };
    const hitter = { name: '打', isEnemy: true, derived: { db: 0 }, skills: { '斗殴': 80 } };
    const melee = CoCEngine.CombatEngine.autoResolveExchange(hitter, vest, { damage: '6', type: 'melee', skill: '斗殴' }, {}, {
        flatDamage: 6,
        preRolledAttack: { success: true, level: '成功', rolledValue: 10, targetValue: 80, skillValue: 80 },
        preRolledDefense: { success: false, level: '失败', rolledValue: 90, targetValue: 1, skillValue: 1 }
    });
    assert.equal(melee.damage, 6, 'bullet-only vest does not soak a club');
    const shot = CoCEngine.CombatEngine.autoResolveExchange(hitter, vest, { damage: '10', type: 'firearm', skill: '手枪' }, {}, {
        flatDamage: 10,
        preRolledAttack: { success: true, level: '成功', rolledValue: 10, targetValue: 80, skillValue: 80 },
        preRolledDefense: { success: false, level: '失败', rolledValue: 90, targetValue: 1, skillValue: 1 }
    });
    assert.equal(shot.damage, 2, 'bullet-only vest soaks a firearm');
}

{
    const ghost = generateNpcFromTemplate('幽灵');
    assert.equal(ghost.hp, 0);
    assert.equal(ghost.physicalImmune, true);
    assert.equal(isActiveCombatEnemy(ghost), true);
    const pc = { name: '人', derived: { db: 0 }, skills: { '斗殴': 80 } };
    const swing = CoCEngine.CombatEngine.autoResolveExchange(pc, ghost, { damage: '1D6', type: 'melee', skill: '斗殴' }, {}, {
        flatDamage: 4,
        preRolledAttack: { success: true, level: '成功', rolledValue: 10, targetValue: 80, skillValue: 80 },
        preRolledDefense: { success: false, level: '失败', rolledValue: 90, targetValue: 1, skillValue: 1 }
    });
    assert.equal(swing.damage, 0);
    assert.match(swing.msg, /物理攻击无效/);
    assert.equal(ghost.isDefeated, undefined);
}

{
    const leader = generateNpcFromTemplate('邪教首领');
    assert.equal(CoCStudyState.knowsSpell(leader, '枯萎术'), true);
    const foe = { name: '靶', isEnemy: true, hp: 10, maxHp: 10, attrs: { POW: 40 } };
    const cast = applySpellCastResult({ chatHistory: [], combat: null, roster: [] }, CoCEngine, {
        success: true,
        spellType: 'damage',
        damage: '4',
        effect: 'wither',
        powOpposed: 'caster',
        description: '枯萎'
    }, foe, { name: '首领' });
    assert.match(cast.desc, /4 点伤害/);
    assert.equal(foe.hp, 6);
}

{
    const gs = { chatHistory: [], combat: { active: true, enemies: [] }, roster: [] };
    applySpellCastResult(gs, CoCEngine, {
        success: true,
        spellType: 'summon',
        effect: 'summon_ghoul',
        powOpposed: 'caster',
        description: '召唤'
    }, null, { name: '法师' });
    assert.equal(gs.combat.enemies.length, 1);
    assert.equal(gs.combat.enemies[0].name, '食尸鬼');
}

{
    const patient = { name: '伤者', hp: 4, maxHp: 12, derived: { hp: 4, maxHp: 12 }, attrs: { CON: 40 }, status: {} };
    CoCEngine._setTestRolls([90]);
    const healed = CoCEngine.HealingEngine.applyHealing(patient, {
        type: 'consumable', name: '吗啡', heal: '2', target: 'HP', sideEffect: 'con'
    }, patient);
    assert.equal(healed.success, true);
    assert.match(healed.message, /惩罚骰/);
    assert.equal(patient.status.pendingPenalty.penaltyDice, 1);
    CoCEngine._clearTestRolls();
}

{
    const gs = {
        inventory: ['急救箱'],
        chatHistory: [],
        roster: [{
            name: '医生', isActive: true, hp: 4, maxHp: 12,
            derived: { hp: 4, maxHp: 12 },
            status: { untreatedFirstAid: 1 },
            skills: { '急救': 50 }
        }]
    };
    const h = character({ gameState: gs, addJournalEntry() {} });
    const msg = h.apply_healing({ target_name: '医生', item_name: '绷带' });
    assert.equal(gs.pendingRuleCheck.bonusDice, 1, msg);
    assert.match(gs.pendingRuleCheck.prompt, /急救箱/);
}

{
    const byakhee = generateNpcFromTemplate('拜亚基');
    assert.equal(CoCEngine.ChaseEngine.movOf(byakhee), 5);
    byakhee.chaseMode = 'air';
    assert.equal(CoCEngine.ChaseEngine.movOf(byakhee), 20);
    const walker = { derived: { mov: 8 }, equipment: { armor: { name: '锁子甲', armor: 5, movPenalty: 1 } } };
    assert.equal(CoCEngine.ChaseEngine.movOf(walker), 7);
}

{
    const gs = {
        chatHistory: [],
        roster: [{ name: '逃', isActive: true, derived: { mov: 8 }, attrs: { CON: 50 } }],
        pendingRuleCheck: null
    };
    applyScenarioEffects({
        gameState: gs,
        Engine: CoCEngine,
        pushSystem() {}
    }, { chase: { quarry: 'pc', pursuer: '守卫' } }, '逃');
    assert.equal(gs.pendingRuleCheck && gs.pendingRuleCheck.kind, 'chase_speed');
    assert.equal(gs.chase.speedResolved, false);
}

{
    const cop = generateNpcFromTemplate('警察');
    const gs = {
        chatHistory: [],
        roster: [{ name: '目标', isActive: true, skills: { '闪避': 20 }, derived: { hp: 10 }, attrs: { CON: 50 } }],
        combat: { active: true, enemies: [cop], round: 1 },
        npcRegistry: []
    };
    const h = combat({ gameState: gs, Engine: CoCEngine, addJournalEntry() {}, advanceTurn() {} });
    CoCEngine._setTestRolls([10]);
    h.enemy_attack({ target_name: '目标', enemy_name: '警察', ranged: true });
    CoCEngine._clearTestRolls();
    assert.equal(gs.pendingRuleCheck.damageDice, '1D10');
    const cop2 = generateNpcFromTemplate('警察');
    const gs2 = {
        chatHistory: [],
        roster: [{ name: '目标', isActive: true, skills: { '闪避': 20 }, derived: { hp: 10 }, attrs: { CON: 50 } }],
        combat: { active: true, enemies: [cop2], round: 1 },
        npcRegistry: []
    };
    const h2 = combat({ gameState: gs2, Engine: CoCEngine, addJournalEntry() {}, advanceTurn() {} });
    CoCEngine._setTestRolls([10]);
    h2.enemy_attack({ target_name: '目标', enemy_name: '警察' });
    CoCEngine._clearTestRolls();
    assert.equal(gs2.pendingRuleCheck.damageDice, '1D6+DB');
}

{
    const foe = { name: '匪', isEnemy: true, hp: 12, maxHp: 12, derived: { hp: 12, maxHp: 12 }, armor: 0, skills: { '斗殴': 40 } };
    const ghost = generateNpcFromTemplate('幽灵');
    const hero = { name: '目标', isActive: true, hp: 12, maxHp: 12, derived: { hp: 12, maxHp: 12 }, armor: 0, skills: { '闪避': 20 }, attrs: { CON: 50 } };
    const gs = {
        chatHistory: [],
        roster: [hero],
        combat: { active: true, enemies: [foe, ghost], round: 1 },
        pendingRuleCheck: {
            kind: 'combat_react',
            skill: '闪避',
            roller: '目标',
            target: '目标',
            attackerName: '匪',
            attackRes: { success: true, level: '成功', rolledValue: 20, targetValue: 50 },
            flatDamage: 4,
            riderText: '火把 1D6+燃烧+眩晕',
            ranged: false
        }
    };
    resolvePendingRuleCheck(gs, {
        skill: '闪避', charName: '目标', success: false, level: '失败',
        rolledValue: 90, targetValue: 20, ruleKind: 'combat_react'
    }, CoCEngine);
    assert.equal(hero.status.stunned.roundsLeft, 1);
    assert.equal(hero.status.burning.intensity, 'minor');
    const shooter = { name: '射手', isActive: true, skills: { '斗殴': 50 }, derived: { hp: 10, maxHp: 10, db: 0 }, attrs: { STR: 50, DEX: 50 } };
    const living = { name: '匪徒', isEnemy: true, hp: 12, maxHp: 12, derived: { hp: 12, maxHp: 12 }, armor: 0, skills: { '闪避': 1 } };
    const gsHit = {
        chatHistory: [],
        roster: [shooter],
        combat: { active: true, enemies: [living, ghost], round: 1 },
        pendingRuleCheck: {
            kind: 'combat_attack',
            skill: '斗殴',
            roller: '射手',
            target: '射手',
            shooterName: '射手',
            enemyName: '匪徒',
            weapon: { name: '火把', skill: '斗殴', type: 'melee', damage: '4' },
            riderText: '火把 1D6+燃烧+眩晕'
        }
    };
    CoCEngine._setTestRolls([99]);
    resolvePendingRuleCheck(gsHit, {
        skill: '斗殴', charName: '射手', success: true, level: '成功',
        rolledValue: 20, targetValue: 50, ruleKind: 'combat_attack'
    }, CoCEngine);
    CoCEngine._clearTestRolls();
    assert.equal(living.status.stunned.roundsLeft, 1);
    assert.equal(living.status.burning.intensity, 'minor');
    const gsGhost = {
        chatHistory: [],
        roster: [shooter],
        combat: { active: true, enemies: [ghost], round: 1 },
        pendingRuleCheck: {
            kind: 'combat_attack',
            skill: '斗殴',
            roller: '射手',
            target: '射手',
            shooterName: '射手',
            enemyName: '幽灵',
            weapon: { name: '火把', skill: '斗殴', type: 'melee', damage: '4' },
            riderText: '1D6+眩晕+燃烧'
        }
    };
    CoCEngine._setTestRolls([99]);
    resolvePendingRuleCheck(gsGhost, {
        skill: '斗殴', charName: '射手', success: true, level: '成功',
        rolledValue: 20, targetValue: 50, ruleKind: 'combat_attack'
    }, CoCEngine);
    CoCEngine._clearTestRolls();
    assert.equal(ghost.status && ghost.status.stunned, undefined);
    assert.equal(ghost.status && ghost.status.burning, undefined);
}

{
    const shooter = {
        name: '射手', isActive: true,
        skills: { '射击：冲锋枪': 55 },
        equipment: { weapon: '汤普森冲锋枪', ammo: { count: 20, type: '9mm' } },
        attrs: { DEX: 60 }, derived: { hp: 10, maxHp: 10 }
    };
    const foe = { name: '靶', isEnemy: true, hp: 10, maxHp: 10, derived: { hp: 10, maxHp: 10 } };
    const gs = { chatHistory: [], inventory: ['9mm子弹×20'], roster: [shooter], combat: { active: true, enemies: [foe], round: 1 } };
    const h = combat({ gameState: gs, Engine: CoCEngine, addJournalEntry() {}, advanceTurn() {} });
    const msg = h.fire_weapon({ shooter_name: '射手', enemy_name: '靶' });
    assert.equal(gs.pendingRuleCheck.burst, true, msg);
    assert.equal(gs.pendingRuleCheck.mode, 'auto');
    assert.equal(gs.pendingRuleCheck.rounds, 5);
    assert.equal(gs.inventory[0], '15发9mm子弹');
    const explicit = {
        name: '射手', isActive: true,
        skills: { '射击：冲锋枪': 55 },
        equipment: { weapon: '汤普森冲锋枪', ammo: { count: 20, type: '9mm' } },
        attrs: { DEX: 60 }, derived: { hp: 10, maxHp: 10 }
    };
    const gs2 = { chatHistory: [], inventory: ['9mm子弹×20'], roster: [explicit], combat: { active: true, enemies: [foe], round: 1 } };
    const h2 = combat({ gameState: gs2, Engine: CoCEngine, addJournalEntry() {}, advanceTurn() {} });
    h2.burst_fire({ shooter_name: '射手', enemy_name: '靶', rounds: 3, mode: 'burst' });
    assert.equal(gs2.pendingRuleCheck.rounds, 3);
    assert.equal(gs2.pendingRuleCheck.mode, 'burst');
}

{
    const gs = { chatHistory: [], combat: { active: true, enemies: [] }, roster: [] };
    const fin = applySpellCastResult(gs, CoCEngine, {
        success: true, spellType: 'summon', effect: 'summon_dark_young', description: '召唤'
    }, null, { name: '法师' });
    assert.equal(gs.combat.enemies.length, 1);
    assert.equal(gs.combat.enemies[0].name, '黑山羊幼崽');
    assert.equal(gs.combat.enemies[0].hp, 32);
    const empty = { chatHistory: [], combat: { active: true, enemies: [] }, roster: [] };
    const servant = applySpellCastResult(empty, CoCEngine, {
        success: true, effect: 'summon_glaaki_servant', description: '召唤'
    }, null, { name: '法师' });
    assert.match(servant.desc, /格拉基仆从/);
    assert.equal(empty.combat.enemies.length, 1);
    assert.equal(empty.combat.enemies[0].hp, 16);
    const avatar = { chatHistory: [], combat: { active: true, enemies: [] }, roster: [] };
    applySpellCastResult(avatar, CoCEngine, {
        success: true, effect: 'summon_hastur_avatar', description: '召唤'
    }, null, { name: '法师' });
    assert.equal(avatar.combat.enemies.length, 1);
    assert.equal(avatar.combat.enemies[0].name, '哈斯塔化身');
    assert.equal(avatar.combat.enemies[0].hp, 12);
    assert.notEqual(avatar.combat.enemies[0].creatureId, 'hastur');
}

{
    const corpse = {
        name: '死者', isEnemy: true, isDefeated: true, hp: 0, maxHp: 12,
        derived: { hp: 0, maxHp: 12 }, mov: 8, skills: { '斗殴': 70, '话术': 40 }
    };
    const living = { name: '活人', isEnemy: true, hp: 8, maxHp: 8, derived: { hp: 8, maxHp: 8 } };
    const gs = { chatHistory: [], combat: { active: true, enemies: [corpse, living] }, roster: [] };
    const up = applySpellCastResult(gs, CoCEngine, {
        success: true, effect: 'resurrection', description: '复活'
    }, corpse, { name: '法师' });
    assert.equal(corpse.isDefeated, false);
    assert.equal(corpse.hp, 12);
    assert.equal(corpse.status.controlled.permanent, true);
    assert.equal(corpse.skills['话术'], 40);
    const refused = applySpellCastResult(gs, CoCEngine, {
        success: true, effect: 'resurrection', description: '复活'
    }, living, { name: '法师' });
    assert.match(refused.desc, /尚未倒下/);
    corpse.isDefeated = true;
    corpse.hp = 0;
    applySpellCastResult(gs, CoCEngine, {
        success: true, effect: 'create_zombie', description: '僵尸'
    }, corpse, { name: '法师' });
    assert.equal(corpse.mov, 7);
    assert.equal(corpse.derived.mov, 7);
    assert.equal(corpse.skills['斗殴'], 70);
    assert.equal(corpse.skills['话术'], undefined);
    const held = runEnemyCombatTurn(gs, corpse, '法师');
    assert.equal(held.outcome, 'held');
    assert.equal(corpse.status.controlled.permanent, true);
    assert.ok(up.desc);
}

{
    assert.equal(CoCSpells['黄印印记'].sightSan, '0/1D6');
    const watcher = {
        name: '拜亚基', isEnemy: true, hp: 13, maxHp: 13,
        derived: { hp: 13, maxHp: 13, sanity: 40 }, attrs: { POW: 45 }
    };
    const caster = { name: '法师', derived: { sanity: 60, mp: 20 }, status: {}, attrs: { POW: 80 } };
    const gs = {
        chatHistory: [],
        combat: { active: true, enemies: [watcher] },
        roster: [caster]
    };
    CoCEngine._setTestRolls([10]);
    applySpellCastResult(gs, CoCEngine, {
        success: true, effect: 'yellow_sign', sightSan: '0/1D6', description: '黄印'
    }, null, caster);
    CoCEngine._clearTestRolls();
    assert.equal(caster.status.yellowSign, true);
    assert.equal(watcher.derived.sanity, 40);
    const bearer = { name: '持印', isActive: true, status: { yellowSign: true }, skills: { '闪避': 20 }, derived: { hp: 10 }, attrs: { CON: 50 } };
    const gsHit = {
        chatHistory: [],
        roster: [bearer],
        combat: { active: true, enemies: [watcher], round: 1 },
        npcRegistry: []
    };
    const h = combat({ gameState: gsHit, Engine: CoCEngine, addJournalEntry() {}, advanceTurn() {} });
    const swung = h.enemy_attack({ target_name: '持印', enemy_name: '拜亚基' });
    const penBlob = swung + ((gsHit.pendingRuleCheck && gsHit.pendingRuleCheck.prompt) || '');
    assert.match(penBlob, /惩罚骰/);
}

{
    const mage = {
        name: '法师', isActive: true,
        attrs: { STR: 40, CON: 50, SIZ: 50, DEX: 50, POW: 70 },
        skills: { '侦查': 40 },
        db: '0', build: 0, mov: 8,
        hp: 10, maxHp: 10, derived: { hp: 10, maxHp: 10, mov: 8, db: '0', sanity: 70 }
    };
    const gs = { chatHistory: [], worldClock: { day: 1, hour: 0 }, roster: [mage], combat: { enemies: [] } };
    const none = applySpellCastResult(gs, CoCEngine, {
        success: true, effect: 'transformation', description: '变形'
    }, null, mage);
    assert.match(none.desc, /未指定生物外形/);
    assert.equal(mage.status && mage.status.transformation, undefined);
    applySpellCastResult(gs, CoCEngine, {
        success: true, effect: 'transformation', formName: '食尸鬼', description: '变形'
    }, null, mage);
    assert.equal(mage.name, '法师');
    assert.equal(mage.skills['斗殴'], 50);
    assert.equal(mage.status.transformation.saved.skills['侦查'], 40);
    const sys = system({ gameState: gs, Engine: CoCEngine, addJournalEntry() {}, addClue() {}, updateEnemy() {} });
    sys.advance_time({ hours: 6 });
    assert.equal(mage.skills['侦查'], 40);
    assert.equal(mage.status.transformation, undefined);
    assert.equal(mage.hp, 10);
}

{
    const archer = {
        name: '弓手', isActive: true,
        skills: { '射击：弓箭': 40 },
        equipment: { weapon: '弓箭', ammo: { count: 0, type: '箭' } },
        derived: { hp: 10, maxHp: 10 }
    };
    const foe = { name: '靶', isEnemy: true, hp: 10, maxHp: 10, derived: { hp: 10, maxHp: 10 } };
    const gs = { chatHistory: [], inventory: [], roster: [archer], combat: { active: true, enemies: [foe], round: 1 } };
    const h = combat({ gameState: gs, Engine: CoCEngine, addJournalEntry() {}, advanceTurn() {} });
    assert.match(h.fire_weapon({ shooter_name: '弓手', enemy_name: '靶' }), /弹药/);
    gs.inventory = ['箭×2'];
    h.fire_weapon({ shooter_name: '弓手', enemy_name: '靶' });
    assert.equal(gs.inventory[0], '1发箭');
}

console.log('lossless_reader_smoke: OK');
