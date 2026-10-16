// ESM engine module — source for browser build
// Split from js/engines/mythos.js
import { CoCMythosTomes, CoCStudyState } from '../data/mythos_tomes.mjs';
import { CoCSpells } from '../data/spells.mjs';
import { CoCEnchantments, lookupEnchantment } from '../data/enchantments.mjs';

export function attachMythosEngine(CoCEngine) {
  CoCEngine.Enchantments = CoCEnchantments;
  CoCEngine.lookupEnchantment = lookupEnchantment;

  CoCEngine.MythosEngine = {
    _tomes: function() { return CoCMythosTomes || {}; },
    _spells: function() { return CoCSpells || {}; },
    lookupEnchantment: lookupEnchantment,
    Enchantments: CoCEnchantments,

    /**
     * CoC 7e: Maximum SAN = 99 − Cthulhu Mythos. Clamp current SAN to the new cap.
     */
    applySanCap: function(ch) {
        if (!ch) return 99;
        var mythos = 0;
        if (ch.skills && ch.skills['克苏鲁神话'] != null) mythos = Number(ch.skills['克苏鲁神话']) || 0;
        else if (ch.mythos != null) mythos = Number(ch.mythos) || 0;
        var cap = Math.max(0, 99 - mythos);
        if (!ch.derived) ch.derived = {};
        ch.derived.maxSan = cap;
        var cur = ch.derived.sanity != null ? ch.derived.sanity : ch.sanity;
        if (cur != null && cur > cap) {
            ch.derived.sanity = cap;
            ch.sanity = cap;
        }
        return cap;
    },

    _grantMythos: function(ch, amount) {
        if (!ch.skills) ch.skills = {};
        var gain = Math.max(0, Number(amount) || 0);
        ch.skills['克苏鲁神话'] = (ch.skills['克苏鲁神话'] || 0) + gain;
        ch.mythos = Math.max(ch.mythos || 0, ch.skills['克苏鲁神话']);
        this.applySanCap(ch);
        return gain;
    },

    _applyTomeSan: function(ch, notation, cause, preRolled) {
        var fromPanel = preRolled && typeof preRolled.success === 'boolean';
        if (CoCEngine.SanityEngine && typeof CoCEngine.SanityEngine.applySanCheckResult === 'function') {
            return CoCEngine.SanityEngine.applySanCheckResult(
                ch,
                fromPanel ? preRolled.success : undefined,
                notation,
                cause,
                fromPanel ? Object.assign({}, preRolled, { deferInt: true }) : null
            );
        }
        var sk = fromPanel ? preRolled : CoCEngine.checkSkill('SAN', ch, 'normal');
        var parts = String(notation || '0/1').split('/');
        var loss = CoCEngine.parseDice((sk.success ? parts[0] : parts[1]) || '1');
        if (ch.derived) ch.derived.sanity = Math.max(0, (ch.derived.sanity || 0) - loss);
        else ch.sanity = Math.max(0, (ch.sanity || 0) - loss);
        return { passed: !!sk.success, sanLoss: loss, needsIntCheck: false, description: '' };
    },

    wouldCompleteStudy: function(ch, tomeKey, weeksSpent) {
        var tome = this._tomes()[tomeKey];
        if (!tome) return false;
        if (!ch.mythosStudy) return true;
        var progress = CoCStudyState.getProgress(ch, tomeKey);
        if (progress.phase === '已完成') return false;
        var totalWeeks = parseInt(tome.readingTime) || 4;
        return ((progress.weeks || 0) + (Number(weeksSpent) || 1)) >= totalWeeks;
    },

    /**
     * 初次浏览典籍 — 快速翻阅，损失SAN但获得少量神话知识
     */
    initialBrowse: function(ch, tomeKey, preRolled) {
        var tome = this._tomes()[tomeKey];
        if (!tome) return { success: false, description: '未找到该典籍。' };
        if (!ch.mythosStudy) { CoCStudyState.initForChar(ch); }
        var progress = CoCStudyState.getProgress(ch, tomeKey);
        if (progress.phase !== '未阅读') return { success: false, description: '你已经读过这本典籍了。' };
        var sanResult = this._applyTomeSan(ch, tome.sanLossInitial, tome.name, preRolled);
        var sanLoss = sanResult.sanLoss || 0;
        var passed = !!sanResult.passed;
        var mythosGain = this._grantMythos(ch, CoCEngine.parseDice(tome.mythosGainInitial));
        // Parse reading time
        var totalWeeks = parseInt(tome.readingTime) || 4;
        CoCStudyState.updateProgress(ch, tomeKey, '已浏览', 0, totalWeeks);
        return { success: true, sanLoss: sanLoss, mythosGain: mythosGain, passed: passed,
            needsIntCheck: !!sanResult.needsIntCheck,
            description: ch.name + ' 翻阅了' + tome.name + '。' + (passed ? '勉强维持了理智。' : '被其中的内容深深震撼。') + ' 损失 ' + sanLoss + ' SAN，获得 ' + mythosGain + ' 点克苏鲁神话技能。' };
    },

    /**
     * 完整阅读典籍 — 消耗数周，深入掌握，可学习法术
     */
    fullStudy: function(ch, tomeKey, weeksSpent, preRolled) {
        var tome = this._tomes()[tomeKey];
        if (!tome) return { success: false, description: '未找到该典籍。' };
        if (!ch.mythosStudy) { CoCStudyState.initForChar(ch); }
        var progress = CoCStudyState.getProgress(ch, tomeKey);
        // Re-reading a finished tome must not re-grant Mythos/spells or re-roll SAN.
        if (progress.phase === '已完成') {
            return { success: false, completed: true, description: ch.name + ' 已完成' + tome.name + ' 的研读，无需重复。' };
        }
        var totalWeeks = parseInt(tome.readingTime) || 4;
        var actualWeeks = Math.min(Number(weeksSpent) || 1, totalWeeks - (progress.weeks || 0));
        var newWeeks = (progress.weeks || 0) + actualWeeks;
        var completed = newWeeks >= totalWeeks;
        if (completed) {
            var sanResult = this._applyTomeSan(ch, tome.sanLossFull, tome.name, preRolled);
            var sanLoss = sanResult.sanLoss || 0;
            var passed = !!sanResult.passed;
            var mythosGain = this._grantMythos(ch, CoCEngine.parseDice(tome.mythosGainFull));
            CoCStudyState.updateProgress(ch, tomeKey, '已完成', totalWeeks, totalWeeks);
            // Auto-learn spells
            var spellsLearned = [];
            for (var i = 0; i < (tome.spells || []).length; i++) {
                CoCStudyState.learnSpell(ch, tome.spells[i]);
                spellsLearned.push(tome.spells[i]);
            }
            return { success: true, completed: true, sanLoss: sanLoss, mythosGain: mythosGain,
                spellsLearned: spellsLearned, passed: passed, needsIntCheck: !!sanResult.needsIntCheck,
                description: ch.name + ' 完成了' + tome.name + '的研读！损失 ' + sanLoss + ' SAN，获得 ' + mythosGain + ' 点克苏鲁神话技能。学会了 ' + spellsLearned.length + ' 个法术：' + spellsLearned.join('、') + '。' };
        } else {
            CoCStudyState.updateProgress(ch, tomeKey, '研读中', newWeeks, totalWeeks);
            return { success: true, completed: false, weeks: newWeeks, totalWeeks: totalWeeks,
                description: ch.name + ' 继续研读' + tome.name + '（' + newWeeks + '/' + totalWeeks + '周）。还需要 ' + (totalWeeks - newWeeks) + ' 周。' };
        }
    },

    /**
     * Split MP cost across lead caster + assistants (remainder on lead).
     * Does not mutate; returns plan or failure.
     */
    planCoopMp: function(mpCost, lead, assistants) {
        var cost = Math.max(0, Number(mpCost) || 0);
        var helpers = (assistants || []).filter(function(a) { return a && a !== lead; });
        var pool = [lead].concat(helpers);
        var n = pool.length;
        if (n < 1 || !lead) return { ok: false, desc: '无施法者' };
        var base = Math.floor(cost / n);
        var rem = cost - base * n;
        var shares = [];
        for (var i = 0; i < n; i++) {
            var ch = pool[i];
            if (!ch.derived) ch.derived = {};
            var pow = (ch.attrs && ch.attrs.POW) || 50;
            if (ch.derived.mp == null) ch.derived.mp = Math.floor(pow / 5);
            var need = base + (i === 0 ? rem : 0);
            if (need > (ch.derived.mp || 0)) {
                return {
                    ok: false,
                    desc: (ch.name || '协作者') + ' 魔法值不足（需分摊 ' + need + '，当前 ' + (ch.derived.mp || 0) + '）。'
                };
            }
            shares.push({ name: ch.name, ch: ch, mp: need, role: i === 0 ? 'lead' : 'assistant' });
        }
        return { ok: true, shares: shares, total: cost, assistants: helpers.length };
    },

    /**
     * 施放法术 — 消耗 MP/SAN；POW 永久扣除由 ruleset.permanentPowCost 控制（7e-full 开启）。
     * 若 spell.castingRounds > 1 且未完成仪式，请先 startRitual / continueRitual。
     * options.assistants: 协作施法者数组，共同分摊 MP；SAN/永久 POW 仍由主施法者承担；协作者各付 1 SAN。
     */
    castSpell: function(ch, spellName, target, options) {
        options = options || {};
        var spell = this._spells()[spellName];
        if (!spell) return { success: false, description: '未知法术：' + spellName };
        if (!CoCStudyState.knowsSpell(ch, spellName)) {
            return { success: false, description: ch.name + ' 尚未学会此法术。' };
        }
        var ritualRounds = Number(spell.castingRounds) || (spell.type === 'summon' ? 2 : 1);
        if (ritualRounds > 1 && !options.ritualComplete) {
            var prog = ch.status && ch.status.ritual;
            if (!prog || prog.spellName !== spellName || !prog.complete) {
                return {
                    success: false,
                    needsRitual: true,
                    castingRounds: ritualRounds,
                    description: spellName + ' 需要 ' + ritualRounds + ' 轮仪式。请先 start_ritual / continue_ritual。'
                };
            }
        }
        var mythos = ch.skills ? (ch.skills['克苏鲁神话'] || 0) : (ch.mythos || 0);
        if (spell.mythosRequired > mythos) {
            return { success: false, description: '克苏鲁神话技能不足（需要' + spell.mythosRequired + '，当前' + mythos + '）。' };
        }
        var powAttr = (ch.attrs && ch.attrs.POW) || 50;
        if (spell.powCost > powAttr) {
            return { success: false, description: 'POW不足（需要' + spell.powCost + '，当前' + powAttr + '）。' };
        }
        if (!ch.derived) ch.derived = {};
        if (ch.derived.mp == null) ch.derived.mp = Math.floor(powAttr / 5);
        var mpCost = spell.mpCost || 0;
        var assistants = options.assistants || options.helpers || [];
        var mpPlan = this.planCoopMp(mpCost, ch, assistants);
        if (!mpPlan.ok) {
            return { success: false, description: mpPlan.desc, coop: true };
        }
        // Deduct shared MP
        for (var si = 0; si < mpPlan.shares.length; si++) {
            var sh = mpPlan.shares[si];
            sh.ch.derived.mp = Math.max(0, (sh.ch.derived.mp || 0) - sh.mp);
        }
        var powSpent = 0;
        var profile = (typeof CoCEngine.getRulesetProfile === 'function')
            ? CoCEngine.getRulesetProfile()
            : { permanentPowCost: false };
        if (profile.permanentPowCost && spell.powCost > 0) {
            powSpent = Number(spell.powCost) || 0;
            if (!ch.attrs) ch.attrs = {};
            ch.attrs.POW = Math.max(1, powAttr - powSpent);
            if (ch.derived.maxSan != null) {
                var mythosSkill = ch.skills ? (ch.skills['克苏鲁神话'] || 0) : 0;
                ch.derived.maxSan = Math.max(0, 99 - mythosSkill);
            }
            // MP ceiling tracks POW/5 after permanent spend
            var newMpMax = Math.floor((ch.attrs.POW || 1) / 5);
            if (ch.derived.mp > newMpMax) ch.derived.mp = newMpMax;
        }
        if (ch.status && ch.status.ritual && ch.status.ritual.spellName === spellName) {
            delete ch.status.ritual;
        }
        var sanCost = (function () {
            var raw = spell && spell.sanCost != null ? String(spell.sanCost) : '';
            if (raw.indexOf('/') >= 0) return CoCEngine.parseDice(raw.split('/').pop());
            return CoCEngine.parseDice(spell.sanCost);
        })();
        var sanResult = { loss: 0, needsIntCheck: false };
        if (sanCost > 0 && CoCEngine.SanityEngine && typeof CoCEngine.SanityEngine.applySanLoss === 'function') {
            sanResult = CoCEngine.SanityEngine.applySanLoss(ch, sanCost, '施放' + spellName, { deferInt: true });
            sanCost = sanResult.loss || sanCost;
        } else if (sanCost > 0) {
            ch.derived.sanity = Math.max(0, (ch.derived.sanity || ch.sanity || 0) - sanCost);
            ch.sanity = ch.derived.sanity;
        }
        // Assistants: flat 1 SAN each (simplified coop tax; lead pays full spell SAN)
        var assistantSan = [];
        if (mpPlan.assistants > 0 && CoCEngine.SanityEngine && typeof CoCEngine.SanityEngine.applySanLoss === 'function') {
            for (var ai = 0; ai < mpPlan.shares.length; ai++) {
                var ash = mpPlan.shares[ai];
                if (ash.role !== 'assistant') continue;
                var aRes = CoCEngine.SanityEngine.applySanLoss(ash.ch, 1, '协作施法·' + spellName, { deferInt: true });
                assistantSan.push({ name: ash.name, loss: aRes.loss || 1, needsIntCheck: !!aRes.needsIntCheck });
            }
        }
        var powOpposed = null;
        if (this.needsPowOppose(spellName, target)) {
            var casterRes = options.preCasterPow || CoCEngine.checkSkill('意志', ch, 'normal');
            var targetRes = options.preTargetPow || CoCEngine.checkSkill('意志', target, 'normal');
            var cmp = CoCEngine.CombatEngine && CoCEngine.CombatEngine.compareSuccess
                ? CoCEngine.CombatEngine.compareSuccess(casterRes.level, targetRes.level)
                : 0;
            if (cmp > 0) powOpposed = 'caster';
            else if (cmp < 0) powOpposed = 'target';
            else if (casterRes.rolledValue <= targetRes.rolledValue) powOpposed = 'caster';
            else powOpposed = 'target';
        }
        var powNote = powSpent > 0
            ? ('、永久扣除 ' + powSpent + ' POW')
            : '（POW 未永久扣除）';
        var coopNote = '';
        if (mpPlan.assistants > 0) {
            coopNote = ' 协作：' + mpPlan.shares.map(function(s) {
                return s.name + ' 分摊 ' + s.mp + ' MP';
            }).join('；') + '。';
        }
        return {
            success: true, spellName: spellName, spellType: spell.type,
            damage: spell.damage || null, effect: spell.effect || null,
            sightSan: spell.sightSan || null,
            formName: options.formName || null,
            powCost: spell.powCost, powSpent: powSpent, sanCost: sanCost, mpCost: mpCost,
            coop: mpPlan.assistants > 0,
            mpShares: mpPlan.shares.map(function(s) { return { name: s.name, mp: s.mp, role: s.role }; }),
            assistantSan: assistantSan,
            powOpposed: powOpposed, needsIntCheck: !!sanResult.needsIntCheck,
            description: ch.name + ' 施放了 ' + spellName + '！消耗 ' + mpCost + ' MP、' + sanCost + ' SAN' + powNote + '。'
                + spell.description
                + coopNote
                + (powOpposed ? ' POW对抗结果：' + (powOpposed === 'caster' ? '施法者胜' : '目标胜') + '。' : '')
        };
    },

    needsPowOppose: function(spellName, target) {
        var spell = this._spells()[spellName];
        if (!spell || !target || !target.attrs || !target.attrs.POW) return false;
        return !!(spell.type === 'curse' || spell.type === 'summon' || spell.type === 'damage');
    },

    /** Begin a multi-round ritual. MP is not spent until completion. */
    startRitual: function(ch, spellName) {
        if (!ch.status) ch.status = {};
        if (ch.status.ritual && !ch.status.ritual.complete && !ch.status.ritual.interrupted) {
            return {
                ok: false,
                desc: ch.name + ' 已有进行中的仪式「' + (ch.status.ritual.spellName || '') + '」（'
                    + (ch.status.ritual.roundsDone || 0) + '/' + (ch.status.ritual.roundsNeeded || '?')
                    + '），请先 continue_ritual 或中断后再开始。'
            };
        }
        var spell = this._spells()[spellName];
        if (!spell) return { ok: false, desc: '未知法术：' + spellName };
        if (!CoCStudyState.knowsSpell(ch, spellName)) {
            return { ok: false, desc: ch.name + ' 尚未学会此法术。' };
        }
        var need = Number(spell.castingRounds) || (spell.type === 'summon' ? 2 : 1);
        if (need <= 1) {
            return { ok: false, desc: spellName + ' 无需仪式，可直接 cast_spell。' };
        }
        ch.status.ritual = {
            spellName: spellName,
            roundsNeeded: need,
            roundsDone: 1,
            complete: false,
            interrupted: false
        };
        return {
            ok: true,
            complete: false,
            roundsDone: 1,
            roundsNeeded: need,
            desc: ch.name + ' 开始仪式「' + spellName + '」（1/' + need + '）。受伤会打断。'
        };
    },

    continueRitual: function(ch) {
        if (!ch || !ch.status || !ch.status.ritual) {
            return { ok: false, desc: '当前没有进行中的仪式。' };
        }
        var r = ch.status.ritual;
        if (r.interrupted) {
            return { ok: false, desc: '仪式已被打断，须重新 start_ritual。' };
        }
        r.roundsDone = Math.min(r.roundsNeeded, (Number(r.roundsDone) || 0) + 1);
        if (r.roundsDone >= r.roundsNeeded) {
            r.complete = true;
            return {
                ok: true,
                complete: true,
                roundsDone: r.roundsDone,
                roundsNeeded: r.roundsNeeded,
                spellName: r.spellName,
                desc: ch.name + ' 完成了仪式「' + r.spellName + '」，可以 cast_spell 结算。'
            };
        }
        return {
            ok: true,
            complete: false,
            roundsDone: r.roundsDone,
            roundsNeeded: r.roundsNeeded,
            spellName: r.spellName,
            desc: ch.name + ' 继续仪式「' + r.spellName + '」（' + r.roundsDone + '/' + r.roundsNeeded + '）。'
        };
    },

    interruptRitual: function(ch, reason) {
        if (!ch || !ch.status || !ch.status.ritual) return { ok: false, desc: '无仪式可打断。' };
        var name = ch.status.ritual.spellName;
        ch.status.ritual.interrupted = true;
        ch.status.ritual.complete = false;
        var desc = ch.name + ' 的仪式「' + name + '」被打断' + (reason ? '（' + reason + '）' : '') + '。';
        delete ch.status.ritual;
        return { ok: true, desc: desc };
    },

    /**
     * Dispel ongoing magical effects on target (ritual / spellMarks / enchantment buffs).
     * Costs 1 MP by default; optional POW oppose vs caster remnant.
     */
    dispel: function(caster, target, opts) {
        opts = opts || {};
        if (!caster) return { ok: false, desc: '无施法者' };
        var subject = target || caster;
        var mpCost = opts.mpCost != null ? Number(opts.mpCost) : 1;
        if (!caster.derived) caster.derived = {};
        var mp = Number(caster.derived.mp);
        if (!Number.isFinite(mp)) mp = Number(caster.mp) || 0;

        // Preview what would clear — do not spend MP if nothing to dispel.
        var wouldClear = [];
        if (subject.status) {
            if (subject.status.ritual) {
                wouldClear.push('ritual:' + (subject.status.ritual.spellName || ''));
            }
            if (subject.status.spellMarks) wouldClear.push('spellMarks');
            if (subject.status.enchantmentBuff) wouldClear.push('enchantmentBuff');
            if (opts.clearAllMagic) {
                ['cursed', 'blessed', 'mythosMark'].forEach(function(k) {
                    if (subject.status[k]) wouldClear.push(k);
                });
            }
        }
        if (!wouldClear.length) {
            return {
                ok: false,
                mpCost: 0,
                cleared: [],
                desc: (subject.name || '目标') + ' 没有可驱散的魔法效果，未消耗 MP。'
            };
        }
        if (mp < mpCost) return { ok: false, desc: caster.name + ' MP 不足（需 ' + mpCost + '）。' };
        caster.derived.mp = mp - mpCost;
        caster.mp = caster.derived.mp;

        var cleared = [];
        if (subject.status) {
            if (subject.status.ritual) {
                cleared.push('ritual:' + (subject.status.ritual.spellName || ''));
                delete subject.status.ritual;
            }
            if (subject.status.spellMarks) {
                cleared.push('spellMarks');
                delete subject.status.spellMarks;
            }
            if (subject.status.enchantmentBuff) {
                cleared.push('enchantmentBuff');
                delete subject.status.enchantmentBuff;
            }
            if (opts.clearAllMagic) {
                ['cursed', 'blessed', 'mythosMark'].forEach(function(k) {
                    if (subject.status[k]) {
                        cleared.push(k);
                        delete subject.status[k];
                    }
                });
            }
        }
        return {
            ok: true,
            mpCost: mpCost,
            cleared: cleared,
            desc: caster.name + ' 驱散了 ' + (subject.name || '目标') + ' 的魔法效果' +
                '（' + cleared.join('、') + '）' +
                '，消耗 ' + mpCost + ' MP。'
        };
    },

    applyEnchantmentBuff: function(ch, enchantmentId) {
        var row = lookupEnchantment(enchantmentId);
        if (!row) return { ok: false, desc: '未知附魔：' + enchantmentId };
        if (!ch.status) ch.status = {};
        ch.status.enchantmentBuff = {
            id: row.id,
            name: row.name,
            bonusDice: row.bonusDice || 0,
            bonusDiceVs: Array.isArray(row.bonusDiceVs) ? row.bonusDiceVs.slice() : null,
            sanBuffer: row.sanBuffer || 0
        };
        return { ok: true, enchantment: row, desc: (ch.name || '目标') + ' 获得「' + row.name + '」效果。' };
    },

    /**
     * 检查角色的法术列表
     */
    getKnownSpells: function(ch) {
        if (!ch || !ch.mythosStudy) return [];
        return ch.mythosStudy.knownSpells || [];
    },

    /**
     * 获取可读典籍列表
     */
    getAvailableTomes: function(ch) {
        var tomes = this._tomes();
        var result = [];
        for (var key in tomes) {
            result.push({
                key: key,
                name: tomes[key].name,
                author: tomes[key].author,
                rarity: tomes[key].rarity,
                readingTime: tomes[key].readingTime,
                progress: CoCStudyState.getProgress(ch, key)
            });
        }
        return result;
    }
};
}
