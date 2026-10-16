/**
 * NPC intent layer for the unified engine.
 * Lexicographic unique winner on existing predicates.
 * Damage formulas stay in the combat engine.
 */

const INFILTRATION_WEIGHT = 0.6;
const HEAT_INFORM = 3;

/** Single source for local ticks and online AI. Do not invent clues, heat, or extra combatants here. */
export const NPC_BEHAVIOR_RULES = Object.freeze({
    infiltrationWeight: INFILTRATION_WEIGHT,
    heatInform: HEAT_INFORM,
    majorWoundRatio: 0.5,
    tools: Object.freeze({
        register: 'register_npc',
        status: 'update_npc_status',
        clue: 'add_clue',
        social: 'social_opposed'
    }),
    lines: Object.freeze([
        '下一步由引擎决定，叙事须与名册意图一致，禁止编造失联、出卖或新线索。',
        '有名字的人用 register_npc，并写清关系；证词用 add_clue 且必须带 npcId。',
        '盟友或线索来源守口时，只标出线索板上已有 npcId 的条目，不新造线索。',
        '已有渗透标记才出卖；权重只决定渗透是否发生。',
        '热度到 3 时，可疑和中立才告密；告密本层不改热度。',
        '生命不超过最大生命一半则脱离先攻；敌对打生命严格最低的人。',
        '非敌对满血先打，受伤才谈判；谈判须调用 social_opposed，失败后才可再攻击。',
        '呼救不加单位。未知关系的人观望。'
    ])
});

export function relationKind(relation) {
    const text = String(relation || '');
    if (/敌对|hostile/i.test(text)) return 'hostile';
    if (/可疑|suspect/i.test(text)) return 'suspect';
    if (/线索/.test(text)) return 'clue';
    if (/盟友|友方|同盟|ally|friend|信任|合作/i.test(text)) return 'ally';
    if (/中立|neutral/i.test(text)) return 'neutral';
    return 'unknown';
}

export function readNpcBehaviorWorld(gameState) {
    const flags = (gameState && gameState.flags) || {};
    return {
        heat: Number(gameState && gameState.mythosHeat) || 0,
        heatMissing: !!flags.heat_missing_contact
    };
}

function isInfiltrated(npc) {
    return !!(npc && npc._kpCompromised);
}

export function canSocialInfiltrate(npc) {
    if (!npc || npc.status !== 'alive' || npc._kpCompromised) return false;
    const kind = relationKind(npc.relation);
    return kind === 'ally' || kind === 'clue';
}

export function isActiveCombatEnemy(enemy) {
    if (!enemy || enemy.isDefeated || enemy._npcFled || enemy._npcStoodDown) return false;
    if (enemy.physicalImmune) return true;
    return enemy.hp == null || Number(enemy.hp) > 0;
}

export function findRosterNpc(registry, enemy) {
    const list = Array.isArray(registry) ? registry : [];
    if (!enemy) return null;
    if (typeof enemy === 'string') return list.find((n) => n && n.name === enemy) || null;
    const keys = [enemy._rosterName, enemy.name].filter(Boolean);
    return list.find((n) => n && keys.indexOf(n.name) >= 0) || null;
}

export function fillCombatEnemyFromRoster(enemy, registry) {
    if (!enemy || typeof enemy !== 'object') return enemy;
    const npc = findRosterNpc(registry, enemy);
    if (!(Number(enemy.maxHp) > 0)) {
        const hp = Number(enemy.hp);
        enemy.maxHp = hp > 0 ? hp : 10;
    }
    if (!enemy.relation && npc && npc.relation) enemy.relation = npc.relation;
    return enemy;
}

function pickSocialIntent(npc, world, opts) {
    const status = npc && npc.status;
    if (status === 'dead') return 'dead';
    if (status === 'missing') return 'absent';
    if (status === 'insane') return 'rave';
    if (status !== 'alive') return 'hold';
    const kind = relationKind(npc && npc.relation);
    if (kind === 'hostile') return 'hold';
    const infiltrated = isInfiltrated(npc);
    if ((kind === 'ally' || kind === 'clue') && infiltrated) return 'turn';
    const blockWithdraw = !!(opts && opts.blockWithdraw);
    if (kind === 'clue' && world && world.heatMissing && !infiltrated && !blockWithdraw) {
        return 'withdraw';
    }
    const heat = Number(world && world.heat) || 0;
    if ((kind === 'suspect' || kind === 'neutral') && heat >= HEAT_INFORM) return 'inform';
    if (kind === 'ally' || kind === 'clue') return 'confide';
    return 'hold';
}

export function scoreNpcIntent(npc, world, opts) {
    const scores = {
        hold: 0, confide: 0, inform: 0, withdraw: 0, turn: 0, dead: 0, absent: 0, rave: 0
    };
    scores[pickSocialIntent(npc, world, opts)] = 10;
    return scores;
}

function lineFor(npc, intent) {
    const name = (npc && npc.name) || '此人';
    if (intent === 'withdraw') return name + '离开了常去的地方。';
    if (intent === 'turn') return name + '仍露面，下一句会把你们的行踪说出去。';
    if (intent === 'inform') return name + '开始把调查员的名字往外说。';
    if (intent === 'confide') return name + '愿意把知道的事说出来。';
    if (intent === 'dead') return name + '已经死亡，不再行动。';
    if (intent === 'absent') return name + '不在现场。';
    if (intent === 'rave') return name + '语无伦次，证词不可靠。';
    if (intent === 'hold' && relationKind(npc && npc.relation) === 'hostile') {
        return name + '保持敌对，等战斗回合再动手。';
    }
    return '';
}

export function decideNpcIntent(npc, world, opts) {
    const intent = pickSocialIntent(npc, world, opts);
    return {
        intent,
        scores: scoreNpcIntent(npc, world, opts),
        relation: relationKind(npc && npc.relation),
        line: lineFor(npc, intent)
    };
}

function exposureOf(npc) {
    return Array.isArray(npc && npc.notes) ? npc.notes.length : 0;
}

function contactTime(npc) {
    const stamp = Date.parse(npc && npc.firstSeenAt);
    if (Number.isFinite(stamp)) return stamp;
    const seen = Number(npc && npc.firstSeen);
    if (Number.isFinite(seen) && seen > 0) return seen;
    return null;
}

function earlierContact(a, b) {
    const fa = contactTime(a);
    const fb = contactTime(b);
    if (fa != null && fb != null && fa !== fb) return fa - fb;
    if ((fa != null) !== (fb != null)) return fa != null ? -1 : 1;
    return String((a && a.name) || '').localeCompare(String((b && b.name) || ''), 'zh');
}

function woundRatio(enemy) {
    const hp = Number(enemy && enemy.hp);
    let maxHp = Number(enemy && enemy.maxHp);
    if (!(maxHp > 0) && enemy && enemy.derived) maxHp = Number(enemy.derived.maxHp);
    if (!Number.isFinite(hp) || !(maxHp > 0)) return null;
    return { hp, maxHp, ratio: hp / maxHp };
}

function canDieToMajorWound(enemy) {
    const wound = woundRatio(enemy);
    return !!(wound && wound.hp > 0 && wound.hp <= wound.maxHp / 2);
}

function isHostileFighter(enemy, world) {
    const kind = relationKind((enemy && enemy.relation) || (world && world.relation));
    return kind === 'hostile' || kind === 'unknown';
}

function combatLine(name, reaction) {
    if (reaction === 'flee') return name + '带伤脱离了战斗。';
    if (reaction === 'switch') return name + '转向更难站住的人。';
    if (reaction === 'negotiate') return name + '停手，要求谈条件。';
    return '';
}

function livingInvestigators(world) {
    return (Array.isArray(world && world.investigators) ? world.investigators : [])
        .filter((c) => c && c.name && Number(c.hp) > 0);
}

function weakestInvestigator(investigators) {
    return investigators.slice().sort((a, b) => {
        const gap = Number(a.hp) - Number(b.hp);
        if (gap) return gap;
        return String(a.name || '').localeCompare(String(b.name || ''), 'zh');
    })[0] || null;
}

export function decideCombatReaction(enemy, world) {
    const w = world || {};
    const name = (enemy && enemy.name) || '敌人';
    const current = w.currentTarget || '';
    if (enemy && (enemy._npcFled || enemy._npcStoodDown)) {
        return { reaction: 'flee', targetName: current, line: '', already: true };
    }
    if (canDieToMajorWound(enemy)) {
        return { reaction: 'flee', targetName: current, line: combatLine(name, 'flee') };
    }
    const wound = woundRatio(enemy);
    const injured = !!(wound && wound.hp > 0 && wound.hp < wound.maxHp);
    if (!isHostileFighter(enemy, w) && injured && !(enemy && enemy._npcNegotiated)) {
        return { reaction: 'negotiate', targetName: current, line: combatLine(name, 'negotiate') };
    }
    const investigators = livingInvestigators(w);
    const weakest = weakestInvestigator(investigators);
    const currentFighter = investigators.find((c) => c.name === current) || null;
    if (weakest && (!currentFighter || Number(weakest.hp) < Number(currentFighter.hp)) && weakest.name !== current) {
        return { reaction: 'switch', targetName: weakest.name, line: combatLine(name, 'switch') };
    }
    return { reaction: 'attack', targetName: current, line: '' };
}

function investigatorHp(c) {
    if (!c) return 0;
    if (c.derived && typeof c.derived.hp === 'number') return c.derived.hp;
    return Number(c.hp) || 0;
}

function enemyTurnKey(gameState, enemy) {
    const combat = gameState && gameState.combat;
    return String(Number(combat && combat.round) || 0)
        + ':' + String(Number(combat && combat.currentTurnIdx) || 0)
        + ':' + ((enemy && enemy.name) || '');
}

/** Unique enemy-turn entry: flee / negotiate / switch / attack. */
export function runEnemyCombatTurn(gameState, enemy, targetName) {
    if (enemy && enemy.status) {
        const controlled = enemy.status.controlled;
        const controlledActive = !!(controlled && (controlled.permanent || Number(controlled.roundsLeft) > 0));
        const held = (enemy.status.stunned && Number(enemy.status.stunned.roundsLeft) > 0) || controlledActive;
        if (held) {
            if (enemy.status.stunned && Number(enemy.status.stunned.roundsLeft) > 0) {
                enemy.status.stunned.roundsLeft -= 1;
                if (enemy.status.stunned.roundsLeft <= 0) delete enemy.status.stunned;
            }
            if (controlled && !controlled.permanent && Number(controlled.roundsLeft) > 0) {
                controlled.roundsLeft -= 1;
                if (controlled.roundsLeft <= 0) delete enemy.status.controlled;
            }
            return {
                outcome: 'held',
                reaction: { line: (enemy.name || '敌人') + ' 本轮无法攻击。' },
                targetName: targetName || ''
            };
        }
    }
    const rosterNpc = findRosterNpc(gameState && gameState.npcRegistry, enemy);
    const investigators = ((gameState && gameState.roster) || [])
        .filter((c) => c && c.isActive && c.name)
        .map((c) => ({ name: c.name, hp: investigatorHp(c) }));
    const reaction = decideCombatReaction(enemy, {
        currentTarget: targetName || '',
        relation: (rosterNpc && rosterNpc.relation) || (enemy && enemy.relation),
        investigators
    });
    applyCombatReaction(gameState, enemy, reaction);
    if (reaction.line && !reaction.already && Array.isArray(gameState && gameState.chatHistory)) {
        gameState.chatHistory.push({
            role: 'system',
            isLocalOnly: true,
            content: '🗣 [NPC] ' + reaction.line
        });
    }
    const key = enemyTurnKey(gameState, enemy);
    if (reaction.already || reaction.reaction === 'flee') {
        if (gameState) gameState._lastEnemyAttackKey = key;
        return { outcome: reaction.already ? 'already' : 'flee', reaction, targetName: targetName || '', key };
    }
    if (reaction.reaction === 'negotiate') {
        return {
            outcome: 'negotiate',
            reaction,
            targetName: targetName || '',
            check: buildNegotiateCheck(enemy, targetName),
            key
        };
    }
    if (gameState) gameState._lastEnemyAttackKey = key;
    return {
        outcome: reaction.reaction === 'switch' ? 'switch' : 'attack',
        reaction,
        targetName: reaction.reaction === 'switch' ? reaction.targetName : (targetName || ''),
        key
    };
}

function rememberLine(npc, line) {
    if (!npc || !line) return;
    if (!Array.isArray(npc.notes)) npc.notes = [];
    npc.notes.push({ text: line });
}

export function applyCombatReaction(gameState, enemy, reaction) {
    if (!enemy || !reaction || reaction.already) return;
    const npc = findRosterNpc(gameState && gameState.npcRegistry, enemy);
    if (reaction.reaction === 'flee') {
        enemy._npcFled = true;
        if (npc && relationKind(npc.relation) === 'hostile' && npc.status === 'alive') {
            npc.status = 'missing';
            rememberLine(npc, reaction.line);
        }
        if (npc) {
            npc.behavior = {
                intent: npc.status === 'missing' ? 'absent' : 'flee',
                line: reaction.line || ''
            };
        }
    } else if (reaction.reaction === 'negotiate') {
        if (reaction.settled) enemy._npcNegotiated = true;
        rememberLine(npc, reaction.line);
    } else if (reaction.reaction === 'switch') {
        enemy._npcSwitchTarget = reaction.targetName;
    }
    enemy.behavior = { intent: reaction.reaction, line: reaction.line || '' };
}

export function buildNegotiateCheck(enemy, targetName) {
    const display = (enemy && enemy.name) || '此人';
    const rosterName = (enemy && (enemy._rosterName || enemy.name)) || display;
    const roller = targetName || '调查员';
    return {
        kind: 'social_opposed',
        fromNegotiate: true,
        skill: '说服',
        socialKind: 'persuade',
        roller,
        target: roller,
        npcName: rosterName,
        enemyName: display,
        targetName: roller,
        prompt: '【谈判】' + roller + ' 请进行【说服】检定（对 ' + rosterName + '）。成功则停手，失败则对方改为敌对并出手。'
    };
}

function writeRelation(npc, enemy, relation) {
    if (npc) npc.relation = relation;
    if (enemy) enemy.relation = relation;
}

export function settleNegotiateFromSocial(gameState, spec, socialResult) {
    const enemyName = (spec && (spec.enemyName || spec.npcName)) || '';
    const targetName = (spec && (spec.targetName || spec.roller)) || '';
    const list = (gameState && gameState.combat && gameState.combat.enemies) || [];
    const matchesName = (e) => e && (e.name === enemyName || e._rosterName === enemyName
        || e.name === (spec && spec.npcName) || e._rosterName === (spec && spec.npcName));
    const enemy = list.find((e) => matchesName(e) && isActiveCombatEnemy(e))
        || list.find(matchesName)
        || null;
    const npc = findRosterNpc(gameState && gameState.npcRegistry, enemy)
        || findRosterNpc(gameState && gameState.npcRegistry, (spec && spec.npcName) || enemyName);
    if (enemy) enemy._npcNegotiated = true;
    const winner = socialResult && socialResult.winner;
    if (winner === 'actor') {
        const kind = relationKind((npc && npc.relation) || (enemy && enemy.relation));
        if (kind === 'suspect' || kind === 'unknown') writeRelation(npc, enemy, '中立');
        if (enemy) enemy._npcStoodDown = true;
        if (npc) npc.behavior = { intent: 'negotiate', line: (npc.name || enemyName) + '被说住，这一击没有打出去。' };
        return { outcome: 'talk', enemyName, targetName };
    }
    if (winner === 'npc') {
        writeRelation(npc, enemy, '敌对');
        if (npc) npc.behavior = { intent: 'hold', line: (npc.name || enemyName) + '谈崩了，改为敌对。' };
        return { outcome: 'attack', enemyName, targetName };
    }
    if (npc) npc.behavior = { intent: 'negotiate', line: (npc.name || enemyName) + '没有松口，也没有立刻动手。' };
    return { outcome: 'hold', enemyName, targetName };
}

export function formatNpcBehaviorRules() {
    return NPC_BEHAVIOR_RULES.lines.join('');
}

export function matchOwnedClues(gameState, npc) {
    const clues = (gameState && gameState.clueBoard && gameState.clueBoard.clues) || [];
    if (!npc) return [];
    return clues.filter((clue) => {
        const id = clue && clue.npcId;
        if (!id) return false;
        return id === npc.id || id === npc.name;
    });
}

export function handConfidedClues(gameState, npc) {
    if (!npc || npc.status !== 'alive') return [];
    const handed = [];
    for (const clue of matchOwnedClues(gameState, npc)) {
        if (!clue || clue.toldBy) continue;
        clue.toldBy = npc.name;
        const mark = '由' + npc.name + '告知';
        clue.note = clue.note ? String(clue.note) : mark;
        if (clue.note.indexOf(mark) < 0) clue.note = clue.note + '；' + mark;
        handed.push({ id: clue.id, title: clue.title, name: npc.name });
    }
    return handed;
}

export function buildNpcRosterPrompt(gameState) {
    const registry = (gameState && gameState.npcRegistry) || [];
    if (!registry.length) return '';
    const rows = registry.filter(Boolean).map((npc) => {
        const intent = (npc.behavior && npc.behavior.intent) || '';
        const line = (npc.behavior && npc.behavior.line) || '';
        return '【' + (npc.name || '未命名') + '】关系:' + (npc.relation || '未知')
            + ' 状态:' + (npc.status || 'alive')
            + (intent ? ' 意图:' + intent : '')
            + (line ? ' ' + line : '');
    });
    return '[【当前名册】\n' + rows.join('\n');
}

function rosterAlreadyWithdrew(registry) {
    return registry.some((npc) => npc && npc._behaviorWithdrew);
}

export function applyNpcBehavior(gameState) {
    if (!gameState || !Array.isArray(gameState.npcRegistry)) return [];
    const world = readNpcBehaviorWorld(gameState);
    const registry = gameState.npcRegistry;
    const changes = [];
    const alreadyWithdrew = rosterAlreadyWithdrew(registry);
    const candidates = alreadyWithdrew ? [] : registry.filter((npc) => {
        return npc && npc.status === 'alive' && decideNpcIntent(npc, world).intent === 'withdraw';
    });
    candidates.sort((a, b) => {
        const gap = exposureOf(b) - exposureOf(a);
        return gap || earlierContact(a, b);
    });
    const withdrawTarget = candidates[0] || null;
    for (const npc of registry) {
        if (!npc) continue;
        const decision = decideNpcIntent(npc, world, { blockWithdraw: npc !== withdrawTarget });
        const prev = npc.behavior && npc.behavior.intent;
        if (npc === withdrawTarget && npc.status === 'alive') {
            npc.status = 'missing';
            npc._behaviorWithdrew = true;
            rememberLine(npc, decision.line);
            changes.push({ name: npc.name, intent: 'withdraw', line: decision.line, status: 'missing' });
        }
        const intent = npc.status === 'missing' && npc._behaviorWithdrew ? 'withdraw' : decision.intent;
        const line = intent === 'withdraw' ? lineFor(npc, 'withdraw') : decision.line;
        if (npc.status === 'alive' && intent === 'turn') npc._kpCompromised = true;
        if (npc.status === 'alive' && intent === 'inform' && !npc._behaviorInformed) {
            npc._behaviorInformed = true;
            rememberLine(npc, line);
        }
        if (npc.status === 'alive' && intent === 'confide') {
            const handed = handConfidedClues(gameState, npc);
            handed.forEach((row) => {
                changes.push({
                    name: npc.name,
                    intent: 'confide',
                    line: npc.name + '说出了已有线索：' + (row.title || row.id)
                });
            });
        }
        npc.behavior = { intent, line, relation: decision.relation };
        if (npc.status === 'alive' && intent !== 'withdraw' && prev !== intent && intent !== 'hold' && line) {
            changes.push({ name: npc.name, intent, line });
        }
        if (npc.status === 'alive' && intent === 'hold' && decision.relation === 'hostile' && prev !== 'hold' && line) {
            changes.push({ name: npc.name, intent: 'hold', line });
        }
    }
    if (changes.length && Array.isArray(gameState.chatHistory)) {
        const text = changes.map((row) => row.line).filter(Boolean).join('');
        if (text) {
            gameState.chatHistory.push({
                role: 'system',
                isLocalOnly: true,
                content: '🗣 [NPC] ' + text
            });
        }
    }
    return changes;
}

export function attachNpcBehaviorEngine(Engine) {
    Engine.NpcBehavior = {
        decideNpcIntent,
        scoreNpcIntent,
        decideCombatReaction,
        runEnemyCombatTurn,
        isActiveCombatEnemy,
        applyCombatReaction,
        applyNpcBehavior,
        readNpcBehaviorWorld,
        relationKind,
        canSocialInfiltrate,
        findRosterNpc,
        fillCombatEnemyFromRoster,
        RULES: NPC_BEHAVIOR_RULES,
        formatNpcBehaviorRules,
        buildNpcRosterPrompt,
        matchOwnedClues,
        handConfidedClues,
        buildNegotiateCheck,
        settleNegotiateFromSocial
    };
}
