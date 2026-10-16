// ESM engine module — source for browser build
// Split from js/engines/sanity.js
import { CoCInsanityTables } from '../data/insanity_tables.mjs';
import { ASYLUM_CARE } from '../data/asylum_care.mjs';

export function attachSanityEngine(CoCEngine) {
  CoCEngine._asylumCare = ASYLUM_CARE;
  CoCEngine.SanityEngine = {
    _tables: function() { return CoCInsanityTables || {}; },
    _asylum: function() { return CoCEngine._asylumCare || ASYLUM_CARE; },

    applySanLoss: function(ch, loss, cause, opts) {
        if (!ch || !ch.derived) return { newSan: 0, loss: 0 };
        var a = Math.max(0, Number(loss) || 0);
        if (!a) return { newSan: ch.derived.sanity, loss: 0 };
        var buff = ch.status && ch.status.enchantmentBuff;
        var buffer = buff ? Math.max(0, Number(buff.sanBuffer) || 0) : 0;
        if (buffer > 0) {
            a = Math.max(0, a - buffer);
            if (!a) return { newSan: ch.derived.sanity, loss: 0, buffered: buffer };
        }
        var sanBefore = Number(ch.derived.sanity) || 0;
        ch.derived.sanity = Math.max(0, sanBefore - a);
        ch.sanity = ch.derived.sanity;
        if (!ch.insanity) ch.insanity = { tempInsane: false, indefInsane: false,
            phobias: [], manias: [], dailyLoss: 0, history: [] };
        ch.insanity.dailyLoss = (ch.insanity.dailyLoss || 0) + a;
        ch.insanity.history = ch.insanity.history || [];
        ch.insanity.history.push({ date: new Date().toISOString(), loss: a,
            cause: cause || '???', remainingSan: ch.derived.sanity });
        var r = { newSan: ch.derived.sanity, loss: a, cause: cause || '???',
            tempInsanity: false, indefInsanity: false, permanentInsanity: false,
            bout: null, description: '', needsIntCheck: false };

        // Permanent insanity at SAN 0 (7e)
        var profile = (typeof CoCEngine.getRulesetProfile === 'function')
            ? CoCEngine.getRulesetProfile()
            : { permanentInsanityAtZero: true, indefInsanityBasis: 'current_san' };
        if ((profile.permanentInsanityAtZero !== false) && ch.derived.sanity <= 0) {
            ch.insanity.permanentInsane = true;
            ch.insanity.indefInsane = true;
            r.permanentInsanity = true;
            r.indefInsanity = true;
            r.description += '\n【永久疯狂】' + (ch.name || '调查员') + ' 的理智归零，永久陷入疯狂。';
        }

        if (a >= 5 && !ch.insanity.tempInsane && !ch.insanity.permanentInsane) {
            if (opts && opts.deferInt) {
                r.needsIntCheck = true;
            } else {
                var ir = this.resolveTempInsanityCheck(ch);
                r.tempInsanity = !!ir.tempInsanity;
                r.bout = ir.bout || null;
                r.description = (r.description || '') + (ir.description || '');
                var sfx = (typeof window !== 'undefined' && window.CoCSFX) || null;
                if (!ir.tempInsanity && sfx && typeof sfx.playSanWarning === 'function') {
                    sfx.playSanWarning(1);
                }
            }
        }
        // Indefinite: daily loss >= 1/5 of current Sanity (before this loss), not POW/5
        var indefBasis = sanBefore;
        if (profile.indefInsanityBasis === 'pow') {
            indefBasis = (ch.attrs && ch.attrs.POW) || (ch.derived && ch.derived.maxSan) || sanBefore;
        }
        var indefThreshold = indefBasis / 5;
        if (!ch.insanity.permanentInsane
            && ch.insanity.dailyLoss >= indefThreshold
            && !ch.insanity.indefInsane) {
            r.indefInsanity = true; ch.insanity.indefInsane = true;
            var months = this._rollDuration();
            ch.insanity.indefMonthsLeft = months;
            var af = this._rollRandomAffliction();
            if (af.type === 'phobia') ch.insanity.phobias.push(af.item);
            else ch.insanity.manias.push(af.item);
            r.description += '\n【不定疯狂】' + ch.name + ' 获得了新' + (af.type=='phobia'?'恐惧症':'狂躁症') + ': ' + af.item.name + '（持续 ' + months + ' 个月）。';
        }
        return r;
    },

    rollBoutOfMadness: function(opts) {
        opts = opts || {};
        var tables = this._tables();
        var bt = opts.summary
            ? (tables.BOUT_SUMMARY || tables.BOUT_REAL_TIME || {})
            : (tables.BOUT_REAL_TIME || {});
        var roll = Math.floor(Math.random() * 10) + 1;
        var b = bt[roll] || { name: '???', summary: '陷入了不可名状的疯狂。' };
        b.roll = roll;
        b.mode = opts.summary ? 'summary' : 'realtime';
        return b;
    },

    _rollRandomAffliction: function() {
        var tb = this._tables();
        var t = Math.random() < 0.5 ? 'phobia' : 'mania';
        var lst = t === 'phobia' ? (tb.PHOBIAS || []) : (tb.MANIAS || []);
        return { type: t, item: lst[Math.floor(Math.random() * lst.length)] || { name: '???' } };
    },

    realityCheck: function(ch, mythosName) {
        var mt = (this._tables().MYTHOS_SAN_LOSS || {});
        var e = mt[mythosName] || mt['不可名状之物'] || { sanLoss: '1/1D10' };
        var p = e.sanLoss.split('/');
        var sL = CoCEngine.parseDice(p[0] || '0');
        var fL = CoCEngine.parseDice(p[1] || '1D6');
        var roll = Math.floor(Math.random() * 100) + 1;
        var pass = roll <= ch.derived.sanity;
        var loss = pass ? sL : fL;
        return { passed: pass, roll: roll, sanLoss: loss, entity: mythosName,
            desc: pass ? ch.name + ' 维持了理智(SAN检定' + roll + '/' + ch.derived.sanity + ')，损失' + loss + ' SAN。'
                : ch.name + ' 无法理解眼前的恐怖(SAN检定' + roll + '/' + ch.derived.sanity + '失败)！损失' + loss + ' SAN！' };
    },

    parseSanNotation: function(notationOrEntity) {
        var mt = this._tables().MYTHOS_SAN_LOSS || {};
        var notation = notationOrEntity;
        var entity = 'SAN检定';
        if (typeof notationOrEntity === 'string') {
            if (mt[notationOrEntity]) {
                notation = mt[notationOrEntity].sanLoss;
                entity = notationOrEntity;
            } else if (notationOrEntity && notationOrEntity.indexOf('/') < 0
                && !/^\d*d\d/i.test(notationOrEntity) && !/^\d+$/.test(notationOrEntity.trim())) {
                // Unknown mythos entity name → same fallback as realityCheck
                var fb = mt['不可名状之物'] || { sanLoss: '1/1D10' };
                notation = fb.sanLoss;
                entity = notationOrEntity;
            }
        }
        var successDice = '0';
        var failDice = '1';
        if (typeof notation === 'number') {
            failDice = String(notation);
            successDice = notation >= 5 ? '1' : '0';
        } else {
            var spec = String(notation || '0/1');
            if (spec.indexOf('/') >= 0) {
                var parts = spec.split('/');
                successDice = (parts[0] || '0').trim();
                failDice = (parts[1] || '1').trim();
            } else {
                failDice = spec.trim() || '1';
                var n = parseInt(failDice, 10);
                successDice = (Number.isFinite(n) && n >= 5) ? '1' : '0';
            }
        }
        return { successDice: successDice, failDice: failDice, entity: entity, notation: notation };
    },

    applySanCheckResult: function(ch, passed, notationOrEntity, cause, rollMeta) {
        if (!ch) return { passed: false, roll: 0, sanLoss: 0, newSan: 0, description: '无目标' };
        if (!ch.derived) ch.derived = {};
        if (typeof ch.derived.sanity !== 'number') {
            var pow = Number(ch.attrs && ch.attrs.POW);
            ch.derived.sanity = (typeof ch.sanity === 'number') ? ch.sanity : (Number.isFinite(pow) ? pow : 0);
        }
        var parsed = this.parseSanNotation(notationOrEntity);
        var entity = cause || parsed.entity;
        var sL = CoCEngine.parseDice(parsed.successDice);
        var fL = CoCEngine.parseDice(parsed.failDice);
        var san = (rollMeta && rollMeta.targetValue != null) ? rollMeta.targetValue : ch.derived.sanity;
        var pass;
        var roll;
        if (typeof passed === 'boolean') {
            pass = passed;
            roll = (rollMeta && rollMeta.rolledValue != null) ? rollMeta.rolledValue : 0;
        } else {
            var sk = CoCEngine.checkSkill('SAN', ch, 'normal');
            pass = !!sk.success;
            roll = sk.rolledValue;
            san = sk.targetValue != null ? sk.targetValue : san;
        }
        var loss = pass ? sL : fL;
        var applied = loss > 0 ? this.applySanLoss(ch, loss, entity, { deferInt: !!(rollMeta && rollMeta.deferInt) }) : { newSan: ch.derived.sanity, loss: 0 };
        ch.sanity = applied.newSan;
        ch.derived.sanity = applied.newSan;
        var desc = pass
            ? ch.name + ' SAN检定成功(' + roll + '/' + san + ')' + (loss ? '，损失' + loss + ' SAN。' : '，未失去理智。')
            : ch.name + ' SAN检定失败(' + roll + '/' + san + ')！损失' + loss + ' SAN。';
        if (applied.description) desc += applied.description;
        return {
            passed: pass,
            roll: roll,
            sanLoss: applied.loss || loss,
            newSan: applied.newSan,
            tempInsanity: !!applied.tempInsanity,
            indefInsanity: !!applied.indefInsanity,
            needsIntCheck: !!applied.needsIntCheck,
            description: desc,
            skillCheck: { success: pass, rolledValue: roll, targetValue: san, skillName: 'SAN' }
        };
    },

    checkAndApplySanLoss: function(ch, notationOrEntity, cause) {
        if (!ch) return { passed: false, roll: 0, sanLoss: 0, newSan: 0, description: '无目标' };
        if (!ch.derived) ch.derived = {};
        if (ch.derived.sanity == null) ch.derived.sanity = (typeof ch.sanity === 'number') ? ch.sanity : 0;
        var sk = CoCEngine.checkSkill('SAN', ch, 'normal');
        return this.applySanCheckResult(ch, sk.success, notationOrEntity, cause, {
            rolledValue: sk.rolledValue, targetValue: sk.targetValue, success: sk.success
        });
    },

    applySanityReward: function(ch, rewardDice, reason) {
        if (!ch || !ch.derived) return { recovered: 0 };
        var rec = CoCEngine.parseDice(rewardDice || '1D6');
        var mx = ch.derived.maxSan || 99; var old = ch.derived.sanity;
        ch.derived.sanity = Math.min(mx, old + rec);
        ch.sanity = ch.derived.sanity;
        if (ch.insanity && ch.insanity.tempInsane) {
            ch.insanity.tempInsane = false;
            this.clearBoutEffects(ch);
        }
        return { recovered: rec, oldSan: old, newSan: ch.derived.sanity,
            desc: ch.name + ' 恢复了 ' + rec + ' 点SAN(' + old + '->' + ch.derived.sanity + ')。' };
    },

    canTreat: function(ch, therapistName) {
        if (!ch) return { ok: false, message: '找不到患者。' };
        if (!ch.status) ch.status = {};
        // 7e: one psychoanalysis roll per month per patient.
        if (ch.status.therapyMonthUsed) {
            return { ok: false, message: '本月已经做过精神分析，须等待一个月。' };
        }
        var ended = ch.status.therapyEndedBy || [];
        if (therapistName && ended.indexOf(therapistName) >= 0) {
            return { ok: false, message: therapistName + ' 与患者的治疗关系已破裂，须另请治疗师。' };
        }
        return { ok: true };
    },

    _rollDuration: function() {
        return CoCEngine.roll(1, 10);
    },

    tickMadness: function(ch, span) {
        span = span || {};
        if (!ch || !ch.insanity) return { tempEnded: false, indefEnded: false, boutEnded: false };
        var hours = Math.max(0, Number(span.hours) || 0);
        var months = Math.max(0, Number(span.months) || 0);
        var rounds = Math.max(0, Number(span.rounds) || 0);
        var out = { tempEnded: false, indefEnded: false, boutEnded: false, desc: '' };
        if (rounds && ch.insanity.boutRoundsLeft > 0) {
            ch.insanity.boutRoundsLeft = Math.max(0, ch.insanity.boutRoundsLeft - rounds);
            if (ch.insanity.boutRoundsLeft === 0) out.boutEnded = true;
        }
        if (hours && ch.insanity.tempInsane) {
            var left = Math.max(0, Number(ch.insanity.tempHoursLeft) || 0);
            ch.insanity.tempHoursLeft = Math.max(0, left - hours);
            if (ch.insanity.tempHoursLeft === 0) {
                ch.insanity.tempInsane = false;
                ch.insanity.boutRoundsLeft = 0;
                out.tempEnded = true;
            }
        }
        if (months && ch.insanity.indefInsane) {
            var mLeft = Math.max(0, Number(ch.insanity.indefMonthsLeft) || 0);
            ch.insanity.indefMonthsLeft = Math.max(0, mLeft - months);
            if (ch.insanity.indefMonthsLeft === 0) {
                ch.insanity.indefInsane = false;
                out.indefEnded = true;
            }
        }
        if (out.tempEnded) out.boutEnded = false;
        if (out.boutEnded || out.tempEnded) {
            this.clearBoutEffects(ch, { keepUnconscious: false });
        }
        var bits = [];
        if (out.boutEnded) bits.push((ch.name || '调查员') + ' 的疯狂发作结束，但仍处于临时疯狂。');
        if (out.tempEnded) bits.push((ch.name || '调查员') + ' 从临时疯狂中恢复。');
        if (out.indefEnded) bits.push((ch.name || '调查员') + ' 的不定疯狂结束（恐惧症/狂躁症仍在）。');
        out.desc = bits.join(' ');
        return out;
    },

    /**
     * Clear temporary bout* status flags written by applyBoutEffect.
     */
    clearBoutEffects: function(ch, opts) {
        opts = opts || {};
        if (!ch) return { cleared: false };
        if (!ch.status) ch.status = {};
        var st = ch.status;
        var had = !!(st.boutFaint || st.boutFlee || st.boutViolence || st.boutSense
            || st.boutAmnesia || st.boutHallucination || st.boutHysteria || st.boutAttachment);
        if (st.boutFaint && !opts.keepUnconscious) {
            delete st.isUnconscious;
        }
        delete st.boutFaint;
        delete st.boutFlee;
        delete st.boutViolence;
        delete st.boutSense;
        delete st.boutAmnesia;
        delete st.boutHallucination;
        delete st.boutHysteria;
        delete st.boutAttachment;
        if (ch.insanity) {
            delete ch.insanity.boutEffect;
            delete ch.insanity.boutName;
        }
        return { cleared: had };
    },

    /**
     * Trigger phobia/mania and queue a one-shot penalty for the next checkSkill / resolveSituation.
     */
    applyAfflictionTrigger: function(ch, stimulus) {
        var r = this.triggerPhobiaMania(ch, stimulus);
        if (!r || !r.triggered) return r || { triggered: false };
        if (!ch.status) ch.status = {};
        ch.status.pendingPenalty = {
            penaltyDice: Number(r.penaltyDice) || 1,
            source: stimulus || '',
            from: (r.entry && r.entry.name) || 'affliction'
        };
        r.pendingPenalty = ch.status.pendingPenalty;
        r.desc = (r.desc || '') + ' 下一次相关检定带惩罚骰。';
        return r;
    },

    endWeek: function(ch) {
        if (!ch) return;
        if (!ch.status) ch.status = {};
        this.resetDailyLoss(ch);
    },

    endMonth: function(ch) {
        if (!ch) return;
        if (!ch.status) ch.status = {};
        ch.status.therapyMonthUsed = false;
    },

    endDay: function(ch, hours) {
        this.resetDailyLoss(ch);
        this.tickMadness(ch, { hours: hours == null ? 24 : Math.max(0, Number(hours) || 0) });
    },

    resolveTempInsanityCheck: function(ch, preRolled) {
        if (!ch) return { tempInsanity: false, description: '' };
        if (!ch.insanity) ch.insanity = { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] };
        if (ch.insanity.tempInsane) return { tempInsanity: true, description: '' };
        var sk = (preRolled && typeof preRolled.success === 'boolean')
            ? preRolled
            : CoCEngine.checkSkill('智力', ch, 'normal');
        var roll = sk.rolledValue;
        var target = sk.targetValue != null ? sk.targetValue : ((ch.attrs && ch.attrs.INT) || 50);
        // CoC 7e: INT success → understands the horror → temporary insanity.
        if (sk.success) {
            ch.insanity.tempInsane = true;
            var bout = this.rollBoutOfMadness(ch);
            var boutRounds = this._rollDuration();
            var tempHours = this._rollDuration();
            ch.insanity.boutRoundsLeft = boutRounds;
            ch.insanity.tempHoursLeft = tempHours;
            this.applyBoutEffect(ch, bout);
            return {
                tempInsanity: true, bout: bout, skillCheck: sk,
                boutRounds: boutRounds, tempHours: tempHours,
                description: '【临时疯狂】' + ch.name + ' 理解了冲击！智力检定成功(' + roll + '/' + target + ') -> ' + bout.name + ': ' + bout.summary + ' 发作 ' + boutRounds + ' 轮；临时疯狂仍将持续 ' + tempHours + ' 小时。'
            };
        }
        return {
            tempInsanity: false, skillCheck: sk,
            description: '【理智冲击】' + ch.name + ' 未能理解眼前的恐怖(智力检定' + roll + '/' + target + '失败)，暂时逃过临时疯狂。'
        };
    },

    applyBoutEffect: function(ch, bout) {
        if (!ch || !bout) return;
        if (!ch.status) ch.status = {};
        if (!ch.insanity) ch.insanity = {};
        var effect = bout.effect || '';
        ch.insanity.boutEffect = effect;
        ch.insanity.boutName = bout.name || '';
        if (effect === 'faint') {
            ch.status.isUnconscious = true;
            ch.status.boutFaint = true;
        } else if (effect === 'flee') {
            ch.status.boutFlee = true;
        } else if (effect === 'violence') {
            ch.status.boutViolence = true;
        } else if (effect === 'psychosomatic') {
            var roll = Math.floor(Math.random() * 3) + 1;
            ch.status.boutSense = roll === 1 ? 'blind' : (roll === 2 ? 'deaf' : 'paralyzed');
        } else if (effect === 'amnesia') {
            ch.status.boutAmnesia = true;
        } else if (effect === 'hallucination') {
            ch.status.boutHallucination = true;
        } else if (effect === 'hysteria') {
            ch.status.boutHysteria = true;
        } else if (effect === 'attachment') {
            ch.status.boutAttachment = true;
        }
        return { effect: effect };
    },

    /**
     * Cap SAN loss for the same mythos entity within one scene.
     * gameState.sanCaps[key] tracks remaining allowable fail-loss budget (max of fail dice).
     */
    applyCappedSanLoss: function(gameState, ch, key, notation, passed, rollMeta) {
        if (!gameState) gameState = {};
        if (!gameState.sanCaps) gameState.sanCaps = {};
        var parsed = this.parseSanNotation(notation);
        var capKey = String(key || parsed.entity || 'generic');
        var failMax = typeof CoCEngine.maxDice === 'function'
            ? CoCEngine.maxDice(parsed.failDice)
            : CoCEngine.parseDice(parsed.failDice);
        var remaining = gameState.sanCaps[capKey];
        if (remaining == null) {
            remaining = failMax;
            gameState.sanCaps[capKey] = remaining;
        }
        var result = this.applySanCheckResult(ch, passed, notation, capKey, rollMeta);
        var lost = Number(result.sanLoss) || 0;
        if (lost > remaining) {
            var refund = lost - remaining;
            if (ch.derived && refund > 0) {
                ch.derived.sanity = Math.min(ch.derived.maxSan || 99, (ch.derived.sanity || 0) + refund);
                ch.sanity = ch.derived.sanity;
                result.newSan = ch.derived.sanity;
                // Refunded SAN must not keep counting toward indefinite insanity.
                if (ch.insanity) {
                    ch.insanity.dailyLoss = Math.max(0, (ch.insanity.dailyLoss || 0) - refund);
                    var hist = ch.insanity.history;
                    var lastEntry = hist && hist.length ? hist[hist.length - 1] : null;
                    if (lastEntry) {
                        lastEntry.loss = Math.max(0, (Number(lastEntry.loss) || 0) - refund);
                        lastEntry.remainingSan = ch.derived.sanity;
                    }
                }
            }
            lost = remaining;
            result.sanLoss = lost;
            result.capped = true;
        }
        gameState.sanCaps[capKey] = Math.max(0, remaining - lost);
        result.capRemaining = gameState.sanCaps[capKey];
        return result;
    },

    triggerPhobiaMania: function(ch, stimulus) {
        if (!ch || !ch.insanity) return { triggered: false };
        var stim = String(stimulus || '');
        var list = [].concat(ch.insanity.phobias || [], ch.insanity.manias || []);
        var hit = list.find(function(p) {
            if (!p) return false;
            var name = typeof p === 'string' ? p : (p.name || '');
            var desc = typeof p === 'object' ? (p.desc || '') : '';
            if (!stim) return false;
            return (name && name.indexOf(stim) >= 0)
                || (desc && desc.indexOf(stim) >= 0)
                || (stim.indexOf(name.split(/[\s(（]/)[0]) >= 0);
        });
        if (!hit) return { triggered: false };
        return {
            triggered: true,
            entry: hit,
            penaltyDice: 1,
            desc: (ch.name || '调查员') + ' 的' + (hit.name || hit) + '被触发（检定带1惩罚骰）。'
        };
    },

    _findAffliction: function(ch, name) {
        if (!ch || !ch.insanity) return null;
        var pool = (ch.insanity.phobias || []).concat(ch.insanity.manias || []);
        if (!pool.length) return null;
        var key = String(name || '').trim();
        if (!key || key === 'any' || key === '任意') return pool[0];
        var exact = pool.filter(function(a) { return String(a.name || a) === key; });
        if (exact.length) return exact[0];
        var partial = pool.filter(function(a) { return String(a.name || a).indexOf(key) >= 0; });
        return partial.length === 1 ? partial[0] : null;
    },

    applyTherapy: function(ch, therapist, preRolled, options) {
        if (!ch || !ch.derived) return { recovered: 0 };
        if (!ch.status) ch.status = {};
        var therapistName = (therapist && therapist.name) || '治疗师';
        var cureName = options && (options.cureTarget || options.cure);
        var cureTarget = null;
        if (cureName) {
            cureTarget = this._findAffliction(ch, cureName);
            if (!cureTarget) {
                return { recovered: 0, newSan: ch.derived.sanity, blocked: true,
                    desc: ch.name + ' 身上找不到要治疗的「' + cureName + '」。' };
            }
        }
        var gate = this.canTreat(ch, therapistName);
        if (!gate.ok) return { recovered: 0, newSan: ch.derived.sanity, blocked: true, desc: gate.message };
        ch.status.therapyMonthUsed = true;
        var sk = (preRolled && typeof preRolled.success === 'boolean')
            ? preRolled
            : CoCEngine.checkSkill('精神分析', therapist, 'normal');
        var mx = ch.derived.maxSan || 99; var old = ch.derived.sanity;
        // 7e: a fumbled session costs the patient 1D6 SAN and ends therapy with that analyst.
        if (sk.level === '大失败') {
            var backfire = CoCEngine.roll(1,6);
            ch.derived.sanity = Math.max(0, old - backfire);
            ch.sanity = ch.derived.sanity;
            if (!ch.status.therapyEndedBy) ch.status.therapyEndedBy = [];
            if (ch.status.therapyEndedBy.indexOf(therapistName) < 0) ch.status.therapyEndedBy.push(therapistName);
            return { recovered: 0, worsened: backfire, oldSan: old, newSan: ch.derived.sanity, skillCheck: sk,
                endedBy: therapistName,
                desc: therapistName + ' 的治疗出现严重事故：' + ch.name + ' 失去 ' + backfire + ' 点 SAN，双方的治疗关系就此终结。' };
        }
        if (!sk.success) {
            return { recovered: 0, newSan: ch.derived.sanity, skillCheck: sk,
                desc: therapistName + ' 未能帮助 ' + ch.name + '。' };
        }
        // 7e: curing a phobia / mania needs the patient's own Sanity roll and
        // replaces the Sanity point gain.
        if (cureTarget) {
            return { recovered: 0, needsSanRoll: true, cureTarget: cureTarget, newSan: ch.derived.sanity, skillCheck: sk,
                desc: therapistName + ' 的疏导见效，' + ch.name + ' 还需一次理智检定才能真正摆脱「'
                    + (cureTarget.name || cureTarget) + '」。' };
        }
        var rec = CoCEngine.roll(1,3);
        ch.derived.sanity = Math.min(mx, old + rec);
        ch.sanity = ch.derived.sanity;
        return { recovered: rec, oldSan: old, newSan: ch.derived.sanity, skillCheck: sk,
            desc: therapistName + ' 对 ' + ch.name + ' 进行了心理治疗，恢复了 ' + rec + ' 点 SAN。' };
    },

    resolveTherapyCure: function(ch, cureName, preRolled) {
        if (!ch || !ch.derived) return { cured: null };
        if (!ch.insanity) ch.insanity = { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] };
        var target = this._findAffliction(ch, cureName);
        var name = target ? (target.name || target) : String(cureName || '');
        var sk = (preRolled && typeof preRolled.success === 'boolean')
            ? preRolled
            : CoCEngine.checkSkill('SAN', ch, 'normal');
        if (sk.level === '大失败') {
            var backfire = CoCEngine.roll(1,6);
            ch.derived.sanity = Math.max(0, (ch.derived.sanity || 0) - backfire);
            ch.sanity = ch.derived.sanity;
            return { cured: null, worsened: backfire, skillCheck: sk, newSan: ch.derived.sanity,
                desc: ch.name + ' 在回溯中崩溃，失去 ' + backfire + ' 点 SAN，「' + name + '」纹丝未动。' };
        }
        if (!sk.success || !target) {
            return { cured: null, skillCheck: sk, newSan: ch.derived.sanity,
                desc: ch.name + ' 没能挣脱「' + name + '」，本月治疗无所得。' };
        }
        ch.insanity.phobias = (ch.insanity.phobias || []).filter(function(p) { return p !== target; });
        ch.insanity.manias = (ch.insanity.manias || []).filter(function(m) { return m !== target; });
        if (!ch.insanity.phobias.length && !ch.insanity.manias.length) ch.insanity.indefInsane = false;
        return { cured: target, skillCheck: sk, newSan: ch.derived.sanity,
            desc: ch.name + ' 彻底摆脱了「' + name + '」（本次不恢复 SAN）。' };
    },

    /**
     * Monthly asylum / private care (7e-inspired).
     * care: poor | average | good
     */
    applyAsylumMonth: function(ch, care, preRolled) {
        if (!ch || !ch.derived) return { recovered: 0, desc: '无患者' };
        if (!ch.status) ch.status = {};
        if (!ch.insanity) ch.insanity = { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] };
        var table = this._asylum ? this._asylum() : CoCEngine._asylumCare;
        if (!table) {
            table = ASYLUM_CARE;
        }
        var key = String(care || 'average').toLowerCase();
        if (key === 'private' || key === 'home') key = 'good';
        if (key === 'institution' || key === 'asylum') key = 'average';
        if (key === 'bad' || key === 'harsh') key = 'poor';
        var cfg = table[key] || table.average;
        ch.status.therapyMonthUsed = false;
        // 7e: 1D100 per month, success on the care's range or under the attending
        // doctor's Psychoanalysis; 96-100 always fails and costs 1D6 SAN.
        var threshold = Math.max(Number(cfg.successRange) || 0, Number(cfg.skill) || 0);
        var monthRoll = (preRolled && preRolled.rolledValue != null)
            ? Number(preRolled.rolledValue)
            : CoCEngine.roll(1, 100);
        var bits = [];
        var recovered = 0;
        var worsened = 0;
        var sanRoll = null;
        var old = ch.derived.sanity;
        var mx = ch.derived.maxSan || 99;

        if (monthRoll >= 96) {
            worsened = CoCEngine.parseDice(cfg.failSan || '1D6');
            ch.derived.sanity = Math.max(0, old - worsened);
            ch.sanity = ch.derived.sanity;
            bits.push('治疗出了岔子，失去 ' + worsened + ' 点 SAN');
        } else if (monthRoll <= threshold) {
            recovered = CoCEngine.parseDice(cfg.successSan || '1D3');
            ch.derived.sanity = Math.min(mx, old + recovered);
            ch.sanity = ch.derived.sanity;
            bits.push('治疗见效，恢复 ' + recovered + ' 点 SAN');
            if (ch.insanity.indefInsane || ch.insanity.tempInsane) {
                sanRoll = CoCEngine.checkSkill('SAN', ch, 'normal');
                if (sanRoll.success) {
                    ch.insanity.indefInsane = false;
                    ch.insanity.tempInsane = false;
                    ch.insanity.indefMonthsLeft = 0;
                    bits.push('理智检定成功，疯狂痊愈');
                } else {
                    bits.push('理智检定失败，下月可再试');
                }
            }
        } else {
            bits.push('本月毫无进展');
        }
        ch.status.therapyMonthUsed = true;
        ch.status.asylumCare = key;
        return {
            recovered: recovered,
            worsened: worsened,
            oldSan: old,
            newSan: ch.derived.sanity,
            monthRoll: monthRoll,
            sanRoll: sanRoll,
            care: key,
            cured: null,
            desc: ch.name + ' 在' + cfg.label + '下度过一个月（1D100=' + monthRoll + '）：' + bits.join('；') + '。'
        };
    },

    resetDailyLoss: function(ch) { if (ch && ch.insanity) ch.insanity.dailyLoss = 0; },

    getSanitySummary: function(ch) {
        if (!ch) return '???';
        var s = (ch.derived && typeof ch.derived.sanity === 'number') ? ch.derived.sanity
            : (typeof ch.sanity === 'number' ? ch.sanity : 0);
        var m = (ch.derived && ch.derived.maxSan) || (ch.attrs && ch.attrs.POW) || 99;
        var r = m > 0 ? s / m : 1;
        if (ch.insanity && ch.insanity.indefInsane) return '不定疯狂 SAN' + s + '/' + m;
        if (ch.insanity && ch.insanity.tempInsane) return '临时疯狂 SAN' + s + '/' + m;
        if (r < 0.2) return '濒临崩溃 SAN' + s + '/' + m;
        if (r < 0.4) return '严重动摇 SAN' + s + '/' + m;
        if (r < 0.6) return '心神不宁 SAN' + s + '/' + m;
        if (r < 0.8) return '略有不安 SAN' + s + '/' + m;
        return '心智健全 SAN' + s + '/' + m;
    },

    /** UI narrative hints for SAN loss intensity (ESM track; optional for browser) */
    getSanNarrative: function(sanLoss) {
        var loss = Math.max(0, Number(sanLoss) || 0);
        if (loss <= 0) return { intensity: 'none', text: '', shake: false, shock: false };
        if (loss >= 10) return { intensity: 'terrifying', text: '你的心智在尖叫——你所见之物彻底粉碎了现实与疯狂的边界。', shake: true, shock: true };
        if (loss >= 5)  return { intensity: 'horrifying', text: '一股彻骨的寒意席卷全身，你的手不由自主地颤抖。', shake: true, shock: true };
        if (loss >= 3)  return { intensity: 'shocking', text: '那不可名状的景象灼烧着你的视网膜，胃部一阵翻涌。', shake: true, shock: false };
        if (loss >= 1)  return { intensity: 'unnerving', text: '一阵不安掠过心头，仿佛有什么东西在暗处注视着你。', shake: false, shock: false };
        return { intensity: 'mild', text: '', shake: false, shock: false };
    },

    /** 典籍阅读仪式感叙述 */
    getTomeNarrative: function(tome, stage) {
        var stages = {
            initial: [
                '你颤抖着翻开' + tome.name + '的第一页，墨迹仿佛在纸面上蠕动...',
                tome.name + '的封面触感异常冰冷，打开时一股霉味混合着某种更古老的气息扑面而来。',
                '当你触碰' + tome.name + '的瞬间，一阵细语在脑海深处响起——那是你不懂却莫名熟悉的语言。'
            ],
            reading: [
                '你强迫自己继续阅读，每一个字符都像钉子一样凿入你的意识。',
                '时间失去了意义。你已不知自己在这书页前坐了多久。',
                (tome.author || '作者') + '的文字有种病态的吸引力，你无法移开视线。'
            ],
            complete: [
                '你合上' + tome.name + '，手指上似乎残留着某种黏腻的触感。你的世界观已被永久改写。',
                '阅读完成了——或者说，是它完成了对你的阅读。你感到脑海中多了不该存在的知识。'
            ]
        };
        var pool = stages[stage] || stages.initial;
        return pool[Math.floor(Math.random() * pool.length)];
    }
  };
}
