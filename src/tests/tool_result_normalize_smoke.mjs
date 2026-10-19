/**
 * Smoke: tool result normalization + system handler string returns + therapy skills.
 */
import assert from 'assert';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const { normalizeToolResultContent } = await import(
    pathToFileURL(path.join(ROOT, 'js/ai/tool_result_normalize.mjs')).href + `?t=${Date.now()}`
);

assert.strictEqual(normalizeToolResultContent('ok'), 'ok');
assert.strictEqual(
    normalizeToolResultContent({ description: '检定成功 (40/50)' }),
    '检定成功 (40/50)'
);
assert.strictEqual(
    normalizeToolResultContent({ desc: '治疗完成' }),
    '治疗完成'
);
assert.strictEqual(
    normalizeToolResultContent({ message: '恢复运气' }),
    '恢复运气'
);
assert.ok(
    !String(normalizeToolResultContent({ recovered: 3, months: 1 })).includes('[object Object]'),
    'fallback must not be [object Object]'
);
assert.ok(normalizeToolResultContent({ recovered: 3 }).includes('recovered'));

const gameState = {
    roster: [{
        name: '李医生',
        attrs: { LUCK: 40, INT: 60, POW: 50 },
        derived: { sanity: 50, maxSan: 50, hp: 10, maxHp: 10 },
        skills: { 聆听: 50 },
        insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] },
    }],
    chatHistory: [],
};
const Engine = {
    checkSkill: () => ({ level: '成功', rolledValue: 40, skillValue: 50, targetValue: 50, success: true }),
    recoverLuck: (c, amount) => {
        c.attrs.LUCK += amount;
        return { recovered: amount, currentLuck: c.attrs.LUCK, message: `${c.name} 恢复了 ${amount} 点运气。` };
    },
    SanityEngine: {
        applyTherapy: (c, therapist) => {
            const skill = therapist?.skills?.['精神分析'];
            assert.strictEqual(skill, 75, 'therapist must expose 精神分析 via skills');
            c.derived.sanity = Math.min(c.derived.maxSan, c.derived.sanity + 3);
            return { recovered: 3, newSan: c.derived.sanity };
        },
    },
};

const { system } = await import(
    pathToFileURL(path.join(ROOT, 'js/tools/handlers/system.mjs')).href + `?t=${Date.now()}`
);
const { character } = await import(
    pathToFileURL(path.join(ROOT, 'js/tools/handlers/character.mjs')).href + `?t=${Date.now()}`
);
const handlers = {
    ...system({ gameState, Engine, addJournalEntry: () => {}, dispatch: () => {} }),
    ...character({ gameState, Engine, addJournalEntry: () => {}, dispatch: () => {} }),
};

const bonus = handlers.bonus_penalty_roll({
    target_name: '李医生', skill_name: '聆听', difficulty: 'normal',
});
assert.strictEqual(typeof bonus, 'object');
assert.ok(bonus && bonus.forceCheck && bonus.forceCheck.skill === '聆听');
assert.ok(!String(normalizeToolResultContent(bonus)).includes('[object Object]'));
assert.ok(normalizeToolResultContent(bonus).includes('聆听'));

const luck = handlers.recover_luck({ target_name: '李医生', amount: 2 });
assert.strictEqual(typeof luck, 'string');
assert.ok(luck.includes('运气'));

const therapy = handlers.apply_therapy({ target_name: '李医生', months: 1 });
assert.strictEqual(typeof therapy, 'string');
assert.ok(therapy.includes('治疗'));
assert.ok(therapy.includes('恢复'));
assert.strictEqual(normalizeToolResultContent(bonus), bonus.msg);
assert.strictEqual(normalizeToolResultContent(luck), luck);
assert.strictEqual(normalizeToolResultContent(therapy), therapy);

console.log('tool_result_normalize_smoke: OK');
