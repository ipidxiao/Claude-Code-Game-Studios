// ESM engine module — source for browser build
// Split from js/engines/healing.js

import { getLiveWorldClock } from '../state/live_game_state.mjs';

export function attachHealingEngine(CoCEngine) {
  function currentHp(character) {
    return CoCEngine.currentHp(character);
  }

  function maxHpOf(character) {
    return CoCEngine.maxHp(character);
  }

  function untreatedFirstAid(character) {
    if (!character.status) character.status = {};
    if (character.status.untreatedFirstAid == null) {
        return currentHp(character) < maxHpOf(character) ? 1 : 0;
    }
    return character.status.untreatedFirstAid;
  }

  // 7e: Medicine, like First Aid, is one attempt per instance of damage (not per week).
  function untreatedMedicine(character) {
    if (!character.status) character.status = {};
    if (character.status.untreatedMedicine == null) {
        return currentHp(character) < maxHpOf(character) ? 1 : 0;
    }
    return character.status.untreatedMedicine;
  }

  function readWorldClock(opts) {
    if (opts && opts.clock && Number.isFinite(Number(opts.clock.day))) return opts.clock;
    // Prefer opts.clock; else live Vue gameState (not Accessor — breaks accessor↔coc cycle).
    return getLiveWorldClock();
  }

  CoCEngine.HealingEngine = {
    recordInjury: function(character, opts) {
        if (!character) return 0;
        if (!character.status) character.status = {};
        if (character.status.untreatedFirstAid == null) {
            character.status.untreatedFirstAid = 0;
        }
        if (character.status.untreatedMedicine == null) {
            character.status.untreatedMedicine = 0;
        }
        character.status.untreatedFirstAid += 1;
        character.status.untreatedMedicine += 1;
        // 7e: Medicine is Regular difficulty on the day of the wound, Hard afterwards.
        character.status.woundToday = true;
        const clock = readWorldClock(opts);
        if (clock) character.status.woundDay = Number(clock.day);
        character.status.firstAidPush = null;
        return character.status.untreatedFirstAid;
    },

    endDay: function(character, clock) {
        if (!character) return;
        if (!character.status) character.status = {};
        const day = clock && Number.isFinite(Number(clock.day)) ? Number(clock.day) : null;
        if (day != null && character.status.woundDay != null) {
            character.status.woundToday = Number(character.status.woundDay) === day;
            return;
        }
        character.status.woundToday = false;
    },

    medicineDifficulty: function(character, clock) {
        const day = clock && Number.isFinite(Number(clock.day)) ? Number(clock.day) : null;
        const woundDay = character && character.status ? character.status.woundDay : null;
        if (day != null && woundDay != null) {
            return Number(woundDay) === day ? 'normal' : 'hard';
        }
        return (character && character.status && character.status.woundToday) ? 'normal' : 'hard';
    },

    endWeek: function(character) {
        if (!character) return;
        if (!character.status) character.status = {};
        if (CoCEngine.SanityEngine && typeof CoCEngine.SanityEngine.endWeek === 'function') {
            CoCEngine.SanityEngine.endWeek(character);
        }
    },

    /**
     * CoC 7e natural healing: +1 HP per full day of rest if not dying.
     * Major wound blocks natural healing until cleared or weekly CON recovers it.
     */
    recoverNatural: function(character, days) {
        if (!character) return { healed: 0, desc: '' };
        if (!character.status) character.status = {};
        if (character.status.isDead) return { healed: 0, desc: character.name + ' 已死亡。' };
        if (character.status.isDying) return { healed: 0, desc: character.name + ' 濒死中，无法自然恢复。' };
        const n = Math.max(0, Math.floor(Number(days) || 0));
        if (!n) return { healed: 0, desc: '' };
        if (character.status.hasMajorWound && !character.status.majorWoundRecovering) {
            return { healed: 0, blocked: true, desc: character.name + ' 有重伤，自然恢复暂停（需医学或每周体质恢复检定）。' };
        }
        let healed = 0;
        for (let i = 0; i < n; i++) {
            const before = CoCEngine.currentHp(character);
            const max = CoCEngine.maxHp(character);
            if (before >= max) break;
            if (typeof CoCEngine.applyHealing === 'function') {
                CoCEngine.applyHealing(character, 1, { type: 'natural' });
            } else {
                character.hp = Math.min(max, before + 1);
                CoCEngine.syncHp(character);
            }
            healed += 1;
        }
        if (healed > 0) {
            character.status.isUnconscious = false;
        }
        return {
            healed,
            desc: healed > 0
                ? (character.name + ' 自然恢复 ' + healed + ' 点 HP。')
                : (character.name + ' 生命已满，无需自然恢复。')
        };
    },

    /**
     * Weekly CON check to begin recovering from a major wound (7e rest recovery).
     * Success → majorWoundRecovering; extreme/critical may clear hasMajorWound.
     */
    recoverMajorWoundWeek: function(character, preRolled) {
        if (!character) return { ok: false, desc: '无目标' };
        if (!character.status) character.status = {};
        if (!character.status.hasMajorWound) {
            return { ok: true, cleared: false, desc: character.name + ' 没有重伤。' };
        }
        const sk = (preRolled && typeof preRolled.success === 'boolean')
            ? preRolled
            : CoCEngine.checkSkill('体质', character, 'normal');
        if (!sk.success) {
            return {
                ok: false,
                skillCheck: sk,
                desc: character.name + ' 本周重伤恢复检定失败，伤势未好转。'
            };
        }
        character.status.majorWoundRecovering = true;
        let cleared = false;
        if (sk.level === '大成功' || sk.level === '极难成功') {
            character.status.hasMajorWound = false;
            character.status.majorWoundRecovering = false;
            if (character.status.bleeding && character.status.bleeding.source === 'major_wound') {
                delete character.status.bleeding;
            }
            cleared = true;
        }
        return {
            ok: true,
            cleared,
            skillCheck: sk,
            desc: cleared
                ? character.name + ' 重伤奇迹般愈合！'
                : character.name + ' 开始从重伤中恢复，此后可自然回血。'
        };
    },

    canTreat: function(character, item, opts) {
        if (!character) return { ok: false, message: '找不到伤者。' };
        if (!character.status) character.status = {};
        if (character.status.isDead) return { ok: false, message: character.name + ' 已死亡，无法治疗。' };
        const skill = item && item.skill;
        const isPush = !!(opts && opts.isPush);
        if (skill === '急救') {
            // 7e: one attempt per instance of damage; the only retry is a single pushed roll.
            const push = character.status.firstAidPush;
            const pushable = !!(push && push.available && !push.used);
            if (isPush) {
                if (!pushable) return { ok: false, message: '推动只能用于刚刚失败的急救。' };
            } else if (untreatedFirstAid(character) < 1) {
                return { ok: false, message: '这道伤已经急救过，须改用医学、推动一次，或等待新的伤害。' };
            }
        }
        if (skill === '医学' && untreatedMedicine(character) < 1) {
            return { ok: false, message: '这道伤已经做过医学处置，须等待新的伤害。' };
        }
        return { ok: true };
    },

    applyHealing: function(character, item, healer, preRolled, opts) {
        if (!item || item.type !== 'consumable' || !item.heal || !item.target) {
            return { success: false, healedAmount: 0, message: "不是有效的治疗物品。" };
        }
        if (!character.derived) character.derived = {};
        if (!character.status) character.status = {};
        CoCEngine.syncHp(character);
        const isPush = !!(opts && opts.isPush);
        const gate = this.canTreat(character, item, opts);
        if (!gate.ok) {
            return { success: false, healedAmount: 0, message: gate.message };
        }
        if (item.skill === '急救') {
            if (isPush) {
                character.status.firstAidPush = { available: false, used: true };
            } else {
                if (character.status.untreatedFirstAid == null) {
                    character.status.untreatedFirstAid = untreatedFirstAid(character);
                }
                character.status.untreatedFirstAid = Math.max(0, character.status.untreatedFirstAid - 1);
            }
        }
        if (item.skill === '医学') {
            if (character.status.untreatedMedicine == null) {
                character.status.untreatedMedicine = untreatedMedicine(character);
            }
            character.status.untreatedMedicine = Math.max(0, character.status.untreatedMedicine - 1);
        }
        let healAmount = CoCEngine.parseDice(item.heal);
        let skillCheckResult = null;
        if (item.skill) {
            const difficulty = item.skill === '医学' ? this.medicineDifficulty(character, opts && opts.clock) : 'normal';
            skillCheckResult = (preRolled && typeof preRolled.success === 'boolean')
                ? preRolled
                : CoCEngine.checkSkill(item.skill, healer || character, difficulty);
            if (!skillCheckResult.success) {
                let message = `${(healer || character).name} 的${item.skill}检定失败，未恢复生命。`;
                let died = false;
                if (item.skill === '急救') {
                    if (isPush) {
                        // 7e: failing a pushed First Aid kills a dying patient.
                        if (character.status.isDying) {
                            character.status.isDying = false;
                            character.status.isDead = true;
                            died = true;
                            message += ` ${character.name} 在抢救中断气。`;
                        }
                    } else {
                        character.status.firstAidPush = { available: true, used: false };
                        message += ' 可孤注一掷推动一次（濒死者推动失败即死）。';
                    }
                }
                return {
                    success: false,
                    healedAmount: 0,
                    skillCheckResult,
                    pushed: isPush,
                    died,
                    message
                };
            }
            if (item.skill === '急救') character.status.firstAidPush = null;
            if (skillCheckResult.level === "极难成功" || skillCheckResult.level === "大成功") {
                healAmount *= 2;
            } else if (skillCheckResult.level === "困难成功") {
                healAmount = Math.floor(healAmount * 1.5);
            }
        }
        if (item.target === "HP") {
            if (typeof CoCEngine.applyHealing === 'function') {
                CoCEngine.applyHealing(character, healAmount, {
                    type: item.skill === '医学' ? 'medicine' : 'first_aid'
                });
            } else {
                character.hp = Math.min(CoCEngine.maxHp(character), CoCEngine.currentHp(character) + healAmount);
                CoCEngine.syncHp(character);
            }
            let majorWoundRemoved = false;
            // First Aid stabilizes; only Medicine clears a major wound.
            if (item.skill === '医学' && character.status.hasMajorWound && skillCheckResult && skillCheckResult.success) {
                character.status.hasMajorWound = false;
                majorWoundRemoved = true;
            }
            if (CoCEngine.currentHp(character) > 0) {
                character.status.isDying = false;
                character.status.isUnconscious = false;
            }
            let message = `恢复了 ${healAmount} 点 HP。`;
            if (item.sideEffect === 'con') {
                const con = CoCEngine.checkSkill('体质', character, 'normal', { skipStatusMods: true });
                if (con && con.success) {
                    message += ' 体质检定成功，避开副作用。';
                } else {
                    character.status.pendingPenalty = { penaltyDice: 1, source: '吗啡', from: 'morphine' };
                    message += ' 体质检定失败，下一检定承受1个惩罚骰。';
                }
            }
            return { success: true, healedAmount: healAmount, skillCheckResult, majorWoundRemoved, message };
        }
        return { success: false, healedAmount: 0, message: "暂不支持该类型治疗。" };
    }
};
}
