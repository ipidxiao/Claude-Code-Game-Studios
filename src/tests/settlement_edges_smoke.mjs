/**
 * Calendar sync, unnamed oppose, unique-target attacks, missing monster HP, summon cards.
 * Deterministic rolls only.
 */
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CoCEngine } from '../js/coc.mjs';
import { CoCNpcTemplates, generateNpcFromTemplate } from '../js/data/npc_templates.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { dice } from '../js/tools/handlers/dice.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { resolvePendingRuleCheck, applySpellCastResult } from '../js/state/rule_check.mjs';
import { KpGameLoop } from '../js/campaign/kp_game_loop.mjs';

function walkJs(dir, hits) {
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules') continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walkJs(path, hits);
        else if (name.endsWith('.mjs') && readFileSync(path, 'utf8').includes('mp: 10')) hits.push(path);
    }
}

const mpHits = [];
walkJs(fileURLToPath(new URL('../js/', import.meta.url)), mpHits);
assert.deepEqual(mpHits, []);
const derived = CoCEngine.calculateDerived({
    STR: 50, CON: 50, SIZ: 60, DEX: 50, APP: 50, INT: 50, POW: 60, EDU: 50
});
assert.equal(derived.mp, 12);

{
    const gs = {
        chatHistory: [],
        roster: [],
        worldClock: { day: 2, hour: 0 },
        kpEngine: { enabled: true, global: { doomClock: 0, attention: 0, playerPower: 0, phase: 'CALM', alertLevel: 0, knowledgeLevel: 0 } },
        kpState: { TIME: { hour: '00:00', day: 2 }, DOOM_CLOCK: 0, antagonist: { ALERT_LEVEL: 0, KNOWLEDGE_LEVEL: 0, CONTROL_LEVEL: 0 } }
    };
    const h = system({ gameState: gs, Engine: CoCEngine, addJournalEntry() {} });
    h.advance_time({ hours: 5 });
    assert.equal(gs.worldClock.hour, 5);
    assert.equal(gs.worldClock.day, 2);
    assert.equal(Number(String(gs.kpState.TIME.hour).split(':')[0]), 5);
    assert.equal(gs.kpState.TIME.day, 2);
    const beforeHour = gs.worldClock.hour;
    const beforeDoom = gs.kpState.DOOM_CLOCK || 0;
    KpGameLoop.injectTimedEvent(gs);
    assert.equal(gs.worldClock.hour, beforeHour);
    assert.equal(Number(String(gs.kpState.TIME.hour).split(':')[0]), beforeHour);
    assert.equal(gs.kpState.DOOM_CLOCK, beforeDoom + 1);
    assert.equal(gs.kpEngine.global.doomClock, beforeDoom + 1);
}

{
    const hero = { name: '调查员', isActive: true, skills: { '意志': 40 }, attrs: { POW: 40 } };
    const many = {
        roster: [hero],
        chatHistory: [],
        combat: {
            enemies: [
                { name: '甲', isEnemy: true, hp: 10, attrs: { POW: 50 }, skills: {} },
                { name: '乙', isEnemy: true, hp: 10, attrs: { POW: 50 }, skills: {} }
            ]
        },
        npcRegistry: []
    };
    const blocked = dice({ gameState: many }).opposed_roll({ char_name: '调查员', char_skill: '意志' });
    assert.equal(blocked, '须指定对手');
    assert.equal(many.pendingRuleCheck, undefined);

    const one = {
        roster: [hero],
        chatHistory: [],
        combat: { enemies: [{ name: '深潜者', isEnemy: true, hp: 13, attrs: { POW: 80 }, skills: {} }] },
        npcRegistry: []
    };
    dice({ gameState: one }).opposed_roll({ char_name: '调查员', char_skill: '意志' });
    assert.equal(one.pendingRuleCheck.opponentName, '深潜者');
    CoCEngine._setTestRolls([60]);
    const out = resolvePendingRuleCheck(one, {
        skill: '意志', charName: '调查员', success: false, level: '失败',
        rolledValue: 90, targetValue: 40, skillValue: 40
    }, CoCEngine);
    assert.match(String(out), /胜出/);
    assert.match(one.chatHistory.map((m) => m.content).join('\n'), /60\/80/);
    CoCEngine._clearTestRolls();

    const zeroed = {
        roster: [hero],
        chatHistory: [],
        pendingRuleCheck: {
            kind: 'opposed_roll', skill: '意志', roller: '调查员', target: '调查员',
            opponentName: '深潜者', opponentValue: 0
        },
        combat: { enemies: [] },
        npcRegistry: []
    };
    CoCEngine._setTestRolls([60]);
    resolvePendingRuleCheck(zeroed, {
        skill: '意志', charName: '调查员', success: true, level: '成功',
        rolledValue: 20, targetValue: 40, skillValue: 40
    }, CoCEngine);
    assert.match(zeroed.chatHistory.map((m) => m.content).join('\n'), /60\/0/);
    CoCEngine._clearTestRolls();
}

{
    const hero = {
        name: '打手', isActive: true, skills: { '斗殴': 50 },
        attrs: { STR: 50, DEX: 50 }, derived: { hp: 10, maxHp: 10, db: '0' }, status: {}
    };
    const cover = { kind: 'hard', armor: 5, hp: 15 };
    const a = { name: '甲', isEnemy: true, hp: 10, maxHp: 10, status: {} };
    const b = { name: '乙', isEnemy: true, hp: 10, maxHp: 10, status: {} };
    const gs = {
        chatHistory: [],
        roster: [hero],
        combat: { active: true, enemies: [a, b], situation: { cover }, round: 1 }
    };
    const h = combat({ gameState: gs, Engine: CoCEngine, addJournalEntry() {}, advanceTurn() {} });
    const refused = h.melee_attack({ actor_name: '打手' });
    assert.match(String(refused), /须指定敌人/);
    assert.equal(a.hp, 10);
    assert.equal(b.hp, 10);
    assert.equal(gs.combat.situation.cover, cover);

    b.isDefeated = true;
    b.hp = 0;
    const swung = h.melee_attack({ actor_name: '打手' });
    assert.equal(gs.pendingRuleCheck && gs.pendingRuleCheck.enemyName, '甲', String(swung));
    assert.equal(gs.combat.situation.cover, cover);
    assert.equal(a.hp, 10);
}

{
    assert.equal(generateNpcFromTemplate('拜亚基').hp, 13);
    assert.equal(generateNpcFromTemplate('修格斯').hp, 19);
    assert.equal(generateNpcFromTemplate('幽灵').hp, 0);
    const key = '测试无生命';
    CoCNpcTemplates[key] = { type: 'monster', attrs: { STR: 50, CON: 80, SIZ: 80, DEX: 40, INT: 40, POW: 40 }, skills: {} };
    try {
        const made = generateNpcFromTemplate(key);
        assert.equal(made.hp, 16);
        assert.equal(made.derived.maxHp, 16);
    } finally {
        delete CoCNpcTemplates[key];
    }
}

{
    const servant = generateNpcFromTemplate('格拉基仆从');
    assert.equal(servant.hp, 16);
    const avatar = generateNpcFromTemplate('哈斯塔化身');
    assert.equal(avatar.hp, 12);
    assert.match(avatar.description, /不是哈斯塔本体/);
    const god = generateNpcFromTemplate('哈斯塔');
    assert.equal(god.hp, 120);
    assert.equal(god.creatureId, 'hastur');

    const gs = { chatHistory: [], combat: { active: true, enemies: [] }, roster: [] };
    const cast = applySpellCastResult(gs, CoCEngine, {
        success: true, description: '召唤', effect: 'summon_hastur_avatar'
    }, null, { name: '法师' });
    assert.match(cast.desc, /哈斯塔化身/);
    assert.equal(gs.combat.enemies.length, 1);
    assert.equal(gs.combat.enemies[0].name, '哈斯塔化身');
    assert.equal(gs.combat.enemies[0].hp, 12);
    const gl = { chatHistory: [], combat: { active: true, enemies: [] }, roster: [] };
    applySpellCastResult(gl, CoCEngine, {
        success: true, description: '召唤', effect: 'summon_glaaki_servant'
    }, null, { name: '法师' });
    assert.equal(gl.combat.enemies[0].name, '格拉基仆从');
    assert.equal(gl.combat.enemies[0].hp, 16);
}

console.log('settlement_edges_smoke: OK');
