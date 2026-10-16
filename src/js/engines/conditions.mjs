/**
 * Persistent status conditions + unified RoundTick.
 * All state lives on character.status.* (char_record contract).
 */
import { registerCoreTickPlugins } from '../rules/builtin_buses.mjs';
import { CoCDiseases, lookupDisease } from '../data/diseases.mjs';
import { CoCDeprivation, stageForDays } from '../data/deprivation.mjs';

const FIRE_TIERS = { minor: '1D3', moderate: '1D6', severe: '2D6', inferno: '3D6' };
const COLD_DMG = { 1: 0, 2: '1D3', 3: '1D6', 4: '1D8' };

function ensureStatus(ch) {
    if (!ch) return null;
    if (!ch.status) ch.status = {};
    return ch.status;
}

function deal(CoCEngine, ch, amount, note) {
    const dmg = Math.max(0, Number(amount) || 0);
    if (!ch || dmg <= 0) return { damage: 0 };
    if (CoCEngine.MajorWoundEngine && typeof CoCEngine.MajorWoundEngine.dealDamage === 'function') {
        const r = CoCEngine.MajorWoundEngine.dealDamage(ch, dmg);
        return Object.assign({ note }, r || { damage: dmg });
    }
    if (typeof CoCEngine.applyDamage === 'function') {
        return Object.assign({ note }, CoCEngine.applyDamage(ch, dmg, { type: 'condition' }) || { damage: dmg });
    }
    if (typeof CoCEngine.syncHp === 'function') CoCEngine.syncHp(ch);
    ch.hp = Math.max(0, (typeof CoCEngine.currentHp === 'function' ? CoCEngine.currentHp(ch) : ch.hp) - dmg);
    if (typeof CoCEngine.syncHp === 'function') CoCEngine.syncHp(ch);
    return { damage: dmg, note };
}

export function attachConditionsEngine(CoCEngine) {
    CoCEngine.ConditionsEngine = {
        apply: function(ch, kind, opts) {
            opts = opts || {};
            const st = ensureStatus(ch);
            if (!st) return { ok: false, desc: '无目标' };
            switch (kind) {
                case 'burning':
                    st.burning = {
                        intensity: opts.intensity || 'moderate',
                        roundsLeft: opts.roundsLeft != null ? Number(opts.roundsLeft) : 3
                    };
                    return { ok: true, desc: (ch.name || '目标') + ' 着火了（' + st.burning.intensity + '）。' };
                case 'drowning':
                case 'suffocating': {
                    const con = (ch.attrs && ch.attrs.CON) || 50;
                    st.drowning = {
                        roundsHeld: Number(opts.roundsHeld) || 0,
                        conHalf: Math.floor(con / 2),
                        kind: kind
                    };
                    return { ok: true, desc: (ch.name || '目标') + ' 正在溺水/窒息。' };
                }
                case 'bleeding':
                    st.bleeding = {
                        perRound: Math.max(1, Number(opts.perRound) || 1),
                        source: opts.source || 'wound'
                    };
                    return { ok: true, desc: (ch.name || '目标') + ' 正在失血。' };
                case 'stunned':
                    st.stunned = { roundsLeft: Math.max(1, Number(opts.roundsLeft) || 1) };
                    return { ok: true, desc: (ch.name || '目标') + ' 眩晕。' };
                case 'cold':
                    st.cold = { stage: Math.min(4, Math.max(1, Number(opts.stage) || 1)) };
                    return { ok: true, desc: (ch.name || '目标') + ' 受寒（阶段' + st.cold.stage + '）。' };
                case 'heat':
                    st.heat = { stage: Math.min(4, Math.max(1, Number(opts.stage) || 1)) };
                    return { ok: true, desc: (ch.name || '目标') + ' 中暑（阶段' + st.heat.stage + '）。' };
                case 'grappled':
                    st.grappled = { by: opts.by || '', build: Number(opts.build) || 0 };
                    return { ok: true, desc: (ch.name || '目标') + ' 被擒抱。' };
                case 'grappling':
                    st.grappling = { target: opts.target || '', build: Number(opts.build) || 0 };
                    return { ok: true, desc: (ch.name || '目标') + ' 正在擒抱。' };
                case 'prone':
                    st.prone = true;
                    return { ok: true, desc: (ch.name || '目标') + ' 倒地。' };
                case 'disease': {
                    const tmpl = lookupDisease(opts.diseaseId || opts.id || opts.name || opts.disease);
                    if (!tmpl) return { ok: false, desc: '未知疾病: ' + (opts.diseaseId || opts.id || opts.name || '') };
                    const days = opts.days != null ? Number(opts.days) : tmpl.days;
                    st.disease = {
                        id: tmpl.id,
                        name: tmpl.name,
                        daysLeft: Math.max(1, days),
                        damagePerDay: opts.damagePerDay || tmpl.damagePerDay,
                        treatSkill: opts.treatSkill || tmpl.treatSkill || '医学'
                    };
                    return { ok: true, desc: (ch.name || '目标') + ' 感染了「' + tmpl.name + '」（约 ' + st.disease.daysLeft + ' 日）。' };
                }
                case 'hunger':
                case 'thirst': {
                    const depKind = kind === 'hunger' ? 'hunger' : 'thirst';
                    const days = Math.max(1, Number(opts.daysWithout) || Number(opts.days) || 1);
                    const stage = stageForDays(depKind, days);
                    st[depKind] = {
                        daysWithout: days,
                        stage: stage.stage,
                        penaltyDice: stage.penaltyDice,
                        damage: stage.damage
                    };
                    return {
                        ok: true,
                        desc: (ch.name || '目标') + ' 进入' + (CoCDeprivation[depKind].label) +
                            '阶段 ' + stage.stage + '（已 ' + days + ' 日）。'
                    };
                }
                default:
                    return { ok: false, desc: '未知状态: ' + kind };
            }
        },

        /** Stand up: clears prone. Caller must spend an action. */
        standUp: function(ch) {
            const st = ensureStatus(ch);
            if (!st) return { ok: false, desc: '无目标' };
            if (!st.prone) return { ok: false, desc: (ch.name || '目标') + ' 并未倒地。' };
            delete st.prone;
            delete st.inCover;
            delete st.cover;
            return { ok: true, desc: (ch.name || '目标') + ' 起身站稳。' };
        },

        /**
         * Dive for cover: go prone + enter soft/hard cover. Caller spends an action.
         * @returns {{ ok, desc, cover }}
         */
        diveForCover: function(ch, coverKind) {
            const st = ensureStatus(ch);
            if (!st) return { ok: false, desc: '无目标' };
            const kind = coverKind === 'hard' ? 'hard' : 'soft';
            const Combat = CoCEngine.CombatEngine;
            const cover = Combat && Combat.normalizeCover
                ? Combat.normalizeCover(kind)
                : (kind === 'hard'
                    ? { kind: 'hard', armor: 5, hp: 15, maxHp: 15 }
                    : { kind: 'soft', armor: 2, hp: 8, maxHp: 8 });
            st.prone = true;
            // Cover soak / situational mods read status.cover (not legacy inCover).
            st.cover = cover;
            delete st.inCover;
            return {
                ok: true,
                cover: cover,
                desc: (ch.name || '目标') + ' 扑向' + (kind === 'hard' ? '硬' : '') + '掩体并卧倒。'
            };
        },

        /**
         * Clear grapple links when either party is dead, unconscious, or missing.
         * @param {object[]} actors roster + enemies
         */
        syncGrapples: function(actors) {
            const list = (actors || []).filter(Boolean);
            const byName = {};
            list.forEach((a) => { if (a && a.name) byName[a.name] = a; });
            const events = [];
            list.forEach((ch) => {
                const st = ensureStatus(ch);
                if (!st) return;
                if (st.grappled) {
                    const by = st.grappled.by;
                    const other = byName[by];
                    const otherDown = !other || (other.status && (other.status.isDead || other.status.isUnconscious
                        || other.status.isDying || other.status.boutFaint));
                    if (otherDown) {
                        delete st.grappled;
                        if (other && other.status && other.status.grappling
                            && other.status.grappling.target === ch.name) {
                            delete other.status.grappling;
                        }
                        events.push({ name: ch.name, kind: 'grapple_cleared', reason: 'partner_down' });
                    }
                }
                if (st.grappling) {
                    const tgt = st.grappling.target;
                    const other = byName[tgt];
                    const otherDown = !other || (other.status && (other.status.isDead || other.status.isUnconscious
                        || other.status.isDying || other.status.boutFaint));
                    if (otherDown) {
                        delete st.grappling;
                        if (other && other.status && other.status.grappled
                            && other.status.grappled.by === ch.name) {
                            delete other.status.grappled;
                        }
                        events.push({ name: ch.name, kind: 'grapple_cleared', reason: 'partner_down' });
                    }
                }
            });
            return events;
        },

        clear: function(ch, kind) {
            const st = ensureStatus(ch);
            if (!st) return { ok: false };
            if (kind === 'drowning' || kind === 'suffocating') delete st.drowning;
            else if (kind === 'all') {
                delete st.burning;
                delete st.drowning;
                delete st.bleeding;
                delete st.stunned;
                delete st.cold;
                delete st.heat;
                delete st.grappled;
                delete st.grappling;
                delete st.disease;
                delete st.hunger;
                delete st.thirst;
            } else {
                delete st[kind];
            }
            return { ok: true };
        },

        lookupDisease: lookupDisease,
        Diseases: CoCDiseases,
        Deprivation: CoCDeprivation,
        stageForDays: stageForDays,

        /**
         * Advance hunger/thirst by days; applies stage damage via Kernel deal path.
         */
        tickDeprivation: function(ch, days) {
            const st = ensureStatus(ch);
            if (!st) return null;
            const n = Math.max(0, Math.floor(Number(days) || 0));
            if (n <= 0) return null;
            const notes = [];
            let total = 0;
            ['hunger', 'thirst'].forEach(function(kind) {
                if (!st[kind]) return;
                st[kind].daysWithout = (Number(st[kind].daysWithout) || 0) + n;
                const stage = stageForDays(kind, st[kind].daysWithout);
                st[kind].stage = stage.stage;
                st[kind].penaltyDice = stage.penaltyDice;
                st[kind].damage = stage.damage;
                if (stage.damage && stage.damage !== '0') {
                    const raw = CoCEngine.parseDice(stage.damage);
                    const r = deal(CoCEngine, ch, raw, CoCDeprivation[kind].label);
                    total += (r && r.damage) || raw;
                    notes.push(CoCDeprivation[kind].label + '阶段' + stage.stage + '伤害' + ((r && r.damage) || raw));
                }
            });
            if (!notes.length) return null;
            return {
                damage: total,
                desc: (ch.name || '目标') + '：' + notes.join('；') + '。'
            };
        },

        /**
         * Advance disease by days (called from advance_time). Damage via Kernel deal path.
         */
        tickDisease: function(ch, days) {
            const st = ensureStatus(ch);
            if (!st || !st.disease) return null;
            const n = Math.max(0, Math.floor(Number(days) || 0));
            if (n <= 0) return null;
            let totalDmg = 0;
            const expr = st.disease.damagePerDay || '1';
            const steps = Math.min(n, Math.max(1, Number(st.disease.daysLeft) || 1));
            for (let i = 0; i < steps; i++) {
                const raw = CoCEngine.parseDice(expr);
                const r = deal(CoCEngine, ch, raw, '疾病·' + (st.disease.name || st.disease.id));
                totalDmg += (r && r.damage) || raw;
            }
            st.disease.daysLeft = Math.max(0, (Number(st.disease.daysLeft) || 0) - n);
            const cleared = st.disease.daysLeft <= 0;
            const name = st.disease.name || st.disease.id;
            if (cleared) delete st.disease;
            return {
                damage: totalDmg,
                cleared: cleared,
                daysLeft: cleared ? 0 : st.disease.daysLeft,
                desc: (ch.name || '目标') + (cleared
                    ? (' 的「' + name + '」已消退（本期伤害 ' + totalDmg + '）。')
                    : (' 「' + name + '」发作，伤害 ' + totalDmg + '（剩余 ' + st.disease.daysLeft + ' 日）。'))
            };
        },

        /**
         * Medicine/first-aid treatment to clear or shorten disease.
         */
        treatDisease: function(ch, preRolled, opts) {
            opts = opts || {};
            const st = ensureStatus(ch);
            if (!st || !st.disease) {
                return { ok: false, desc: (ch && ch.name ? ch.name : '目标') + ' 当前未染病。' };
            }
            const skill = opts.skill || st.disease.treatSkill || '医学';
            const sk = (preRolled && typeof preRolled.success === 'boolean')
                ? preRolled
                : CoCEngine.checkSkill(skill, opts.healer || ch, 'normal');
            if (!sk.success) {
                return {
                    ok: false,
                    skillCheck: sk,
                    desc: (ch.name || '目标') + ' 的「' + st.disease.name + '」治疗失败。'
                };
            }
            const hard = sk.level === '困难成功' || sk.level === '极难成功' || sk.level === '大成功';
            if (hard) {
                const name = st.disease.name;
                delete st.disease;
                return {
                    ok: true,
                    cured: true,
                    skillCheck: sk,
                    desc: (ch.name || '目标') + ' 的「' + name + '」被治愈。'
                };
            }
            st.disease.daysLeft = Math.max(1, Math.ceil((Number(st.disease.daysLeft) || 1) / 2));
            return {
                ok: true,
                cured: false,
                daysLeft: st.disease.daysLeft,
                skillCheck: sk,
                desc: (ch.name || '目标') + ' 的「' + st.disease.name + '」有所缓解（剩余 ' + st.disease.daysLeft + ' 日）。'
            };
        },

        tickBleeding: function(ch) {
            const st = ensureStatus(ch);
            if (!st || !st.bleeding) return null;
            const dmg = Math.max(1, Number(st.bleeding.perRound) || 1);
            return deal(CoCEngine, ch, dmg, '失血');
        },

        tickBurning: function(ch) {
            const st = ensureStatus(ch);
            if (!st || !st.burning) return null;
            const expr = FIRE_TIERS[st.burning.intensity] || '1D6';
            const dmg = CoCEngine.parseDice(expr);
            const r = deal(CoCEngine, ch, dmg, '燃烧');
            st.burning.roundsLeft = Math.max(0, (Number(st.burning.roundsLeft) || 0) - 1);
            if (st.burning.roundsLeft <= 0) delete st.burning;
            return r;
        },

        tickDrowning: function(ch, preRolled) {
            const st = ensureStatus(ch);
            if (!st || !st.drowning) return null;
            st.drowning.roundsHeld = (Number(st.drowning.roundsHeld) || 0) + 1;
            const held = st.drowning.roundsHeld;
            const half = st.drowning.conHalf || Math.floor(((ch.attrs && ch.attrs.CON) || 50) / 2);
            if (held <= half) return { damage: 0, held, half, note: '闭气中' };
            if (!preRolled || typeof preRolled.success !== 'boolean') {
                return { damage: 0, held, half, needsConCheck: true };
            }
            return this.applyDrowningCon(ch, preRolled);
        },

        applyDrowningCon: function(ch, preRolled) {
            if (preRolled && preRolled.success) {
                return { damage: 0, passed: true };
            }
            const dmg = CoCEngine.parseDice('1D6');
            return deal(CoCEngine, ch, dmg, '溺水');
        },

        tickStun: function(ch) {
            const st = ensureStatus(ch);
            if (!st || !st.stunned) return null;
            st.stunned.roundsLeft = Math.max(0, (Number(st.stunned.roundsLeft) || 0) - 1);
            if (st.stunned.roundsLeft <= 0) {
                delete st.stunned;
                return { cleared: true };
            }
            return { roundsLeft: st.stunned.roundsLeft };
        },

        tickColdHeat: function(ch) {
            const st = ensureStatus(ch);
            if (!st) return null;
            const out = [];
            if (st.cold) {
                const expr = COLD_DMG[st.cold.stage];
                if (expr) out.push(deal(CoCEngine, ch, CoCEngine.parseDice(expr), '寒冷'));
            }
            if (st.heat && st.heat.stage >= 3) {
                out.push(deal(CoCEngine, ch, CoCEngine.parseDice('1D3'), '酷热'));
            }
            return out.length ? out : null;
        },

        extinguish: function(ch, preRolled) {
            const st = ensureStatus(ch);
            if (!st || !st.burning) return { ok: false, desc: (ch && ch.name ? ch.name : '目标') + ' 并未着火。' };
            const sk = (preRolled && typeof preRolled.success === 'boolean')
                ? preRolled
                : CoCEngine.checkSkill('急救', ch, 'normal');
            if (!sk.success) {
                return { ok: false, skillCheck: sk, desc: (ch.name || '目标') + ' 灭火失败，火势仍在。' };
            }
            delete st.burning;
            return { ok: true, skillCheck: sk, desc: (ch.name || '目标') + ' 扑灭了身上的火焰。' };
        },

        /**
         * Dying: each round CON check required when isDying.
         * Returns a pending hint; actual dice go through rule_check when wired.
         */
        dyingNeedsCheck: function(ch) {
            const st = ensureStatus(ch);
            return !!(st && st.isDying && !st.isDead);
        }
    };

    CoCEngine.RoundTick = {
        /**
         * Process one combat/scene round of ongoing effects for all roster (+ optional enemies).
         * Plugins registered on TickBus (core.* + future appendix).
         */
        process: function(gameState) {
            const events = [];
            if (!gameState) return { events };
            const round = (gameState.combat && gameState.combat.round) || 1;
            if (CoCEngine.TickBus && typeof CoCEngine.TickBus.run === 'function') {
                CoCEngine.TickBus.run('round', {
                    Engine: CoCEngine,
                    gameState: gameState,
                    round: round,
                    events: events
                });
            }
            return { events: events, round: round };
        }
    };

    registerCoreTickPlugins(CoCEngine);

    CoCEngine.applyCondition = function(ch, kind, opts) {
        return CoCEngine.ConditionsEngine.apply(ch, kind, opts);
    };
    CoCEngine.clearCondition = function(ch, kind) {
        return CoCEngine.ConditionsEngine.clear(ch, kind);
    };
    CoCEngine.standUp = function(ch) {
        return CoCEngine.ConditionsEngine.standUp(ch);
    };
    CoCEngine.diveForCover = function(ch, coverKind) {
        return CoCEngine.ConditionsEngine.diveForCover(ch, coverKind);
    };
    CoCEngine.processRound = function(gameState) {
        return CoCEngine.RoundTick.process(gameState);
    };
}
