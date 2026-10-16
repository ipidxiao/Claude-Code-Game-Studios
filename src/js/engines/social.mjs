/**
 * CoC 7e social opposed checks: charm / fast_talk / intimidate / persuade.
 */
import { resolveInvestigateOutcome, INVESTIGATE_OUTCOMES } from '../data/investigate_outcomes.mjs';

const SOCIAL_MAP = {
    charm: { skill: '取悦', resist: '心理学', duration: 'scene', attitude: 1 },
    '取悦': { skill: '取悦', resist: '心理学', duration: 'scene', attitude: 1 },
    fast_talk: { skill: '话术', resist: '心理学', duration: 'short', attitude: 1 },
    '话术': { skill: '话术', resist: '心理学', duration: 'short', attitude: 1 },
    intimidate: { skill: '恐吓', resist: '意志', duration: 'scene', attitude: -1 },
    '恐吓': { skill: '恐吓', resist: '意志', duration: 'scene', attitude: -1 },
    persuade: { skill: '说服', resist: '心理学', duration: 'long', attitude: 1 },
    '说服': { skill: '说服', resist: '心理学', duration: 'long', attitude: 1 }
};

const LEVEL_RANK = { '大成功': 4, '极难成功': 3, '困难成功': 2, '成功': 1, '失败': 0, '大失败': -1 };

function levelOf(roll, skillValue, Engine) {
    const fumble = Engine.fumbleThreshold ? Engine.fumbleThreshold(skillValue) : (skillValue < 50 ? 100 : 96);
    if (roll === 1) return '大成功';
    if (roll <= Math.floor(skillValue / 5)) return '极难成功';
    if (roll <= Math.floor(skillValue / 2)) return '困难成功';
    if (roll <= skillValue) return '成功';
    if (roll >= fumble) return '大失败';
    return '失败';
}

export function attachSocialEngine(CoCEngine) {
    CoCEngine.SocialEngine = {
        map: SOCIAL_MAP,
        INVESTIGATE_OUTCOMES: INVESTIGATE_OUTCOMES,
        resolveInvestigateOutcome: resolveInvestigateOutcome,

        /**
         * Map a skill-check level to investigation clue quality template.
         */
        resolveInvestigate: function(levelOrResult) {
            const level = (levelOrResult && levelOrResult.level) || levelOrResult;
            return resolveInvestigateOutcome(level);
        },

        resolve: function(actor, npc, kind, opts) {
            opts = opts || {};
            const meta = SOCIAL_MAP[kind] || SOCIAL_MAP[String(kind || '').toLowerCase()];
            if (!meta) return { ok: false, desc: '未知社交行动: ' + kind };
            if (!actor) return { ok: false, desc: '找不到行动者' };

            const actorSkill = meta.skill;
            const resistSkill = opts.resistSkill || meta.resist;
            const actorVal = CoCEngine.getSkillValue(actor, actorSkill);
            let resistVal = Number(opts.opponent_value);
            if (!Number.isFinite(resistVal)) {
                if (npc && typeof CoCEngine.getSkillValue === 'function') {
                    resistVal = CoCEngine.getSkillValue(npc, resistSkill);
                } else {
                    resistVal = 50;
                }
                if (resistSkill === '意志' && !(Number(resistVal) > 0)) resistVal = 50;
            }

            const usePre = (pre, rollFn) => (pre && typeof pre.success === 'boolean') ? pre : rollFn();
            const actorRes = usePre(opts.preRolledActor, () => CoCEngine.checkSkill(actorSkill, actor, opts.difficulty || 'normal', {
                bonusDice: opts.bonusDice || 0,
                penaltyDice: opts.penaltyDice || 0
            }));

            let npcRoll;
            let npcLevel;
            let npcSuccess;
            if (opts.preRolledNpc && typeof opts.preRolledNpc.success === 'boolean') {
                npcSuccess = !!opts.preRolledNpc.success;
                npcLevel = opts.preRolledNpc.level;
                npcRoll = opts.preRolledNpc.rolledValue;
            } else {
                const npcSheet = {
                    name: (npc && npc.name) || '对手',
                    skills: Object.assign({}, (npc && npc.skills) || {}),
                    attrs: npc && npc.attrs,
                    isEnemy: !!(npc && npc.isEnemy)
                };
                if (npcSheet.skills[resistSkill] == null) npcSheet.skills[resistSkill] = resistVal;
                const npcRes = CoCEngine.checkSkill(resistSkill, npcSheet, 'normal', { skipStatusMods: true });
                npcRoll = npcRes.rolledValue;
                npcLevel = npcRes.level;
                npcSuccess = !!npcRes.success;
            }

            let winner = 'tie';
            const aOk = !!actorRes.success;
            if (aOk && !npcSuccess) winner = 'actor';
            else if (!aOk && npcSuccess) winner = 'npc';
            else if (aOk && npcSuccess) {
                const cmp = (LEVEL_RANK[actorRes.level] || 0) - (LEVEL_RANK[npcLevel] || 0);
                if (cmp > 0) winner = 'actor';
                else if (cmp < 0) winner = 'npc';
                else {
                    // 7e: same success level → higher skill value wins
                    if (actorVal > resistVal) winner = 'actor';
                    else if (resistVal > actorVal) winner = 'npc';
                    else winner = 'tie';
                }
            } else {
                winner = 'tie';
            }

            const attitudeDelta = winner === 'actor' ? meta.attitude : (winner === 'npc' ? -meta.attitude : 0);
            const attitude = {
                delta: attitudeDelta,
                duration: meta.duration,
                skill: actorSkill
            };
            if (npc && (winner === 'actor' || winner === 'npc')) {
                if (!npc.social) npc.social = {};
                npc.social.last = {
                    by: actor.name,
                    skill: actorSkill,
                    duration: meta.duration,
                    at: Date.now(),
                    attitude: (Number(npc.social.attitude) || 0) + attitudeDelta
                };
                npc.social.attitude = npc.social.last.attitude;
            }

            const pushedFail = !!(opts.pushed && winner !== 'actor');
            if (pushedFail && actor) {
                if (!actor.status) actor.status = {};
                actor.status.socialBackfire = {
                    skill: actorSkill,
                    reason: opts.pushed_reason || '推动失败',
                    at: Date.now()
                };
            }

            return {
                ok: true,
                winner,
                actorSkill,
                resistSkill,
                actorVal,
                resistVal,
                actorRes,
                npcRoll,
                npcLevel,
                npcSuccess,
                attitude,
                pushedFail,
                desc: winner === 'actor'
                    ? `${actor.name} 的${actorSkill}奏效（对抗${resistSkill}）。`
                    : winner === 'npc'
                        ? `${actor.name} 的${actorSkill}被看穿/顶住。`
                        : `${actor.name} 与对方势均力敌。`
            };
        }
    };

    CoCEngine.resolveSocial = function(actor, npc, kind, opts) {
        return CoCEngine.SocialEngine.resolve(actor, npc, kind, opts);
    };
}
