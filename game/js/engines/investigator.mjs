/**
 * Investigator chargen / social-economy helpers (P5).
 * Idea·Know·Luck resolve via getSkillValue aliases; SAN reconnect uses SanityEngine.
 */
import {
    BACKSTORY_FIVE,
    emptyBackstory,
    normalizeBackstory,
    resolveBackstoryKey,
    filledBackstoryKeys,
    summarizeBackstory
} from '../data/backstory.mjs';
import { lookupLifestyle, startingWealthFromCredit, CREDIT_LIFESTYLE_BANDS } from '../data/credit_lifestyle.mjs';

/** Characteristic-style checks that are not ordinary skills. */
export const SPECIAL_CHECK_ALIASES = Object.freeze({
    '灵感': 'INT',
    'Idea': 'INT',
    idea: 'INT',
    '知识': 'EDU',
    'Know': 'EDU',
    know: 'EDU',
    '运气': 'LUCK',
    '幸运': 'LUCK',
    Luck: 'LUCK',
    luck: 'LUCK'
});

export function attachInvestigatorEngine(CoCEngine) {
    CoCEngine.InvestigatorEngine = {
        BACKSTORY_FIVE,
        CREDIT_LIFESTYLE_BANDS,
        SPECIAL_CHECK_ALIASES,
        emptyBackstory,
        normalizeBackstory,
        resolveBackstoryKey,
        filledBackstoryKeys,
        summarizeBackstory,
        lookupLifestyle,
        startingWealthFromCredit,

        /**
         * Map Idea/Know/Luck (and Chinese labels) → attribute code, else null.
         */
        resolveSpecialCheck: function(name) {
            const raw = String(name || '').trim();
            if (!raw) return null;
            if (SPECIAL_CHECK_ALIASES[raw]) return SPECIAL_CHECK_ALIASES[raw];
            const lower = raw.toLowerCase();
            if (SPECIAL_CHECK_ALIASES[lower]) return SPECIAL_CHECK_ALIASES[lower];
            return null;
        },

        creditOf: function(ch) {
            if (!ch) return 0;
            if (typeof CoCEngine.getSkillValue === 'function') {
                return Number(CoCEngine.getSkillValue(ch, '信用评级')) || 0;
            }
            return Number(ch.skills && ch.skills['信用评级']) || 0;
        },

        describeCredit: function(ch) {
            const cr = this.creditOf(ch);
            const life = lookupLifestyle(cr);
            return (ch && ch.name ? ch.name + ' ' : '') +
                '信用评级 ' + cr + '（' + life.label + '），日用 $' + life.spendingLevel +
                '，周开销约 $' + life.weeklyCost +
                '，手头现金约 $' + ((ch && ch.wealth && ch.wealth.cash != null) ? ch.wealth.cash : life.cash);
        },

        /**
         * Ensure wealth object from Credit Rating if missing.
         */
        ensureWealth: function(ch, opts) {
            opts = opts || {};
            if (!ch) return null;
            const cr = this.creditOf(ch);
            const snap = startingWealthFromCredit(cr);
            if (!ch.wealth || opts.reset) {
                ch.wealth = {
                    cash: snap.cash,
                    assets: snap.assets,
                    lifestyleId: snap.lifestyleId,
                    lifestyleLabel: snap.lifestyleLabel,
                    spendingLevel: snap.spendingLevel
                };
            } else {
                if (ch.wealth.cash == null) ch.wealth.cash = snap.cash;
                if (ch.wealth.assets == null) ch.wealth.assets = snap.assets;
                if (!ch.wealth.lifestyleId) ch.wealth.lifestyleId = snap.lifestyleId;
                if (!ch.wealth.lifestyleLabel) ch.wealth.lifestyleLabel = snap.lifestyleLabel;
                if (ch.wealth.spendingLevel == null) ch.wealth.spendingLevel = snap.spendingLevel;
            }
            return ch.wealth;
        },

        /**
         * Pay living costs for days (default 7). On shortfall: hardship + optional -1 Credit.
         */
        spendLifestyle: function(ch, opts) {
            opts = opts || {};
            if (!ch) return { ok: false, desc: '无角色' };
            this.ensureWealth(ch);
            const cr = this.creditOf(ch);
            const life = lookupLifestyle(cr);
            const days = Math.max(1, Math.floor(Number(opts.days) || 7));
            const cost = Math.round(life.spendingLevel * days * 100) / 100;
            const cash = Number(ch.wealth.cash) || 0;
            if (cash >= cost) {
                ch.wealth.cash = Math.round((cash - cost) * 100) / 100;
                ch.wealth.hardship = false;
                return {
                    ok: true,
                    paid: cost,
                    cash: ch.wealth.cash,
                    credit: cr,
                    hardship: false,
                    desc: ch.name + ' 支付 ' + days + ' 日生活费 $' + cost + '（剩余现金 $' + ch.wealth.cash + '）。'
                };
            }
            ch.wealth.hardship = true;
            let newCr = cr;
            let dropped = false;
            if (opts.dropCredit !== false && cr > 0) {
                newCr = cr - 1;
                if (!ch.skills) ch.skills = {};
                ch.skills['信用评级'] = newCr;
                dropped = true;
                const next = lookupLifestyle(newCr);
                ch.wealth.lifestyleId = next.id;
                ch.wealth.lifestyleLabel = next.label;
                ch.wealth.spendingLevel = next.spendingLevel;
            }
            ch.wealth.cash = 0;
            return {
                ok: false,
                paid: cash,
                shortfall: Math.round((cost - cash) * 100) / 100,
                cash: 0,
                credit: newCr,
                hardship: true,
                creditDropped: dropped,
                desc: ch.name + ' 无法维持生活水准（需 $' + cost + '，仅有 $' + cash + '）' +
                    (dropped ? '，信用评级降至 ' + newCr + '。' : '。')
            };
        },

        /**
         * Reconnect with a filled backstory element → SAN via applySanityReward.
         */
        connectBackstory: function(ch, keyOrLabel, opts) {
            opts = opts || {};
            if (!ch) return { ok: false, desc: '无角色' };
            ch.backstory = normalizeBackstory(ch.backstory);
            const key = resolveBackstoryKey(keyOrLabel);
            if (!key) {
                const label = (keyOrLabel == null || String(keyOrLabel).trim() === '') ? '(空)' : String(keyOrLabel);
                return { ok: false, desc: '未知背景项：' + label };
            }
            const text = String(ch.backstory[key] || '').trim();
            if (!text) {
                return { ok: false, desc: ch.name + ' 的「' + key + '」未填写，无法借此锚定理智。' };
            }
            if (!ch.status) ch.status = {};
            if (!ch.status.backstoryConnected) ch.status.backstoryConnected = {};
            if (ch.status.backstoryConnected[key]) {
                return { ok: false, desc: ch.name + ' 本会话已借「' + key + '」锚定理智，不可重复。' };
            }
            const dice = opts.rewardDice || '1D6';
            if (!CoCEngine.SanityEngine || typeof CoCEngine.SanityEngine.applySanityReward !== 'function') {
                return { ok: false, desc: '理智引擎未加载' };
            }
            const reward = CoCEngine.SanityEngine.applySanityReward(ch, dice, 'backstory:' + key);
            ch.status.backstoryConnected[key] = true;
            let cleared = false;
            if (opts.clearIndef && ch.insanity && ch.insanity.indefInsane) {
                ch.insanity.indefInsane = false;
                cleared = true;
            }
            const label = (BACKSTORY_FIVE.find((e) => e.key === key) || { label: key }).label;
            return {
                ok: true,
                key: key,
                label: label,
                text: text,
                recovered: reward.recovered,
                newSan: reward.newSan,
                clearedIndef: cleared,
                desc: ch.name + ' 借由「' + label + '」找回自我：' + (reward.desc || '') +
                    (cleared ? ' 不定疯狂解除。' : '')
            };
        },

        /**
         * Experience check: roll d100 > current skill → +1D10 (capped 99).
         * Marks from improvementTicks or opts.force.
         */
        experienceCheck: function(ch, skillName, opts) {
            opts = opts || {};
            if (!ch || !skillName) return { ok: false, desc: '缺少角色或技能' };
            if (!ch.skills) ch.skills = {};
            const cur = Number(ch.skills[skillName]);
            if (!Number.isFinite(cur)) return { ok: false, desc: '未知技能：' + skillName };
            if (!opts.force) {
                const ticks = (ch.status && ch.status.improvementTicks) || {};
                if (!ticks[skillName]) {
                    return { ok: false, marked: false, desc: ch.name + ' 的「' + skillName + '」未标记成长。' };
                }
            }
            const roll = opts.preRoll != null
                ? Number(opts.preRoll)
                : (CoCEngine._rollD100 ? CoCEngine._rollD100() : (Math.floor(Math.random() * 100) + 1));
            const improved = roll > cur;
            let gain = 0;
            if (improved) {
                gain = opts.preGain != null
                    ? Number(opts.preGain)
                    : (CoCEngine.roll ? CoCEngine.roll(1, 10) : (Math.floor(Math.random() * 10) + 1));
                ch.skills[skillName] = Math.min(99, cur + gain);
            }
            if (ch.status && ch.status.improvementTicks) {
                delete ch.status.improvementTicks[skillName];
            }
            return {
                ok: true,
                skill: skillName,
                roll: roll,
                previous: cur,
                improved: improved,
                gain: gain,
                value: ch.skills[skillName],
                desc: improved
                    ? (ch.name + ' 「' + skillName + '」成长检定成功（' + roll + '>' + cur + '），+' + gain + '→' + ch.skills[skillName] + '。')
                    : (ch.name + ' 「' + skillName + '」成长检定未提升（' + roll + '≤' + cur + '）。')
            };
        },

        markImprovement: function(ch, skillName) {
            if (!ch || !skillName) return { ok: false };
            if (!ch.status) ch.status = {};
            if (!ch.status.improvementTicks) ch.status.improvementTicks = {};
            ch.status.improvementTicks[skillName] = true;
            return { ok: true, skill: skillName };
        }
    };

    CoCEngine.normalizeBackstory = normalizeBackstory;
    CoCEngine.lookupLifestyle = lookupLifestyle;
    CoCEngine.resolveSpecialCheck = CoCEngine.InvestigatorEngine.resolveSpecialCheck.bind(CoCEngine.InvestigatorEngine);
    CoCEngine.experienceCheck = function(ch, skill, opts) {
        return CoCEngine.InvestigatorEngine.experienceCheck(ch, skill, opts);
    };
}
