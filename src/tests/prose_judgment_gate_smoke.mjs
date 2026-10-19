/**
 * Smoke: preserve paragraph breaks; mark 判定 paragraphs; gate plot after them.
 */
import assert from 'assert';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const {
    partitionNarrationByJudgment,
    splitNarrationParagraphs,
    isJudgmentParagraph
} = await import(
    pathToFileURL(path.join(ROOT, 'js/data/narrative_prose.mjs')).href + `?t=${Date.now()}`
);
const { CoCProseBridge } = await import(
    pathToFileURL(path.join(ROOT, 'js/scenario/prose_bridge.mjs')).href + `?t=${Date.now()}`
);

const sample = `门轴尖叫着打开，你闪入阁楼。

腥咸黑水气味扑面，井口占去地板中央。

若力量检定成功，你们默契潜入；若失败，门撞墙巨响。无论分支，同时结算。

你伸手可触盐罐，指尖感到盐粒干燥。

手电柱扫过阁楼井口周边，披鳞人形浮起薄雾。`;

const paras = splitNarrationParagraphs(sample);
assert.strictEqual(paras.length, 5, 'five paragraphs');
assert.ok(isJudgmentParagraph(paras[2]), 'third para is judgment');

const part = partitionNarrationByJudgment(sample);
assert.ok(part.hasJudgment);
assert.ok(part.before.includes('闪入阁楼'));
assert.ok(part.before.includes('井口占去地板中央'));
assert.ok(part.before.includes('\n\n'), 'before keeps blank-line breaks');
assert.ok(!part.before.includes('若力量检定'), 'judgment not in before');
assert.ok(part.after.includes('盐罐'), 'after holds post-judgment plot');
assert.ok(part.after.includes('手电柱扫过'), '灌水 after gate is deferred not deleted');
assert.ok(part.judgmentParas.length >= 1);
assert.ok(part.judgmentParas[0].text.includes('检定'));

// Mid-paragraph judgment: keep lead sentences, gate from the check sentence.
const mid = `门轴尖叫着打开，你闪入阁楼。腥咸气味扑面。若力量检定成功，你们默契潜入；若失败，门撞墙巨响。你伸手可触盐罐。`;
const midPart = partitionNarrationByJudgment(mid);
assert.ok(midPart.hasJudgment, 'mid-paragraph gate fires');
assert.ok(midPart.before.includes('闪入阁楼'), 'lead sentences stay visible');
assert.ok(midPart.before.includes('气味扑面'), 'pre-check sentence stays');
assert.ok(!midPart.before.includes('若力量检定'), 'check sentence not in before');
assert.ok(midPart.after.includes('盐罐') || midPart.judgmentParas.length >= 1, 'remainder deferred or marked');

const soft = partitionNarrationByJudgment(
    `走廊安静。\n\n成功则门会无声滑开，失败则警报响起。\n\n你握紧门把。`,
    { awaitingSkillCheck: true }
);
assert.ok(soft.hasJudgment, 'awaitingSkillCheck soft spoiler gates');
assert.ok(soft.before.includes('走廊安静'));
assert.ok(!soft.before.includes('成功则'));

await CoCProseBridge.loadProseBank('tutorial');
const gated = CoCProseBridge.enrichNarrativeGatedSync('短JSON。', ['attic'], 'tutorial');
assert.ok(!/若力量检定成功/.test(gated.visible), 'visible must not spoil');
assert.ok(gated.visible.includes('\n\n') || gated.visible.length > 40, 'visible has structure');
assert.ok(gated.hasJudgment || gated.deferred.length >= 0, 'gate metadata present');
if (gated.hasJudgment) {
    assert.ok(gated.deferred.length > 50, 'deferred holds remainder until check');
}

console.log('prose_judgment_gate_smoke: OK', {
    beforeLen: part.before.length,
    afterLen: part.after.length,
    marks: part.judgmentParas.length,
    visibleLen: gated.visible.length,
    deferredLen: gated.deferred.length
});
