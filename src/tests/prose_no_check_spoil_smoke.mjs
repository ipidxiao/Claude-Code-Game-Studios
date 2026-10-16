/**
 * Smoke: keep atmospheric 灌水; strip only check spoilers via judgment gate (not join-strip).
 */
import assert from 'assert';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ROLE_DIVISION_RULES, partitionNarrationByJudgment } = await import(
    pathToFileURL(path.join(ROOT, 'js/data/narrative_prose.mjs')).href + `?t=${Date.now()}`
);
const { CoCProseBridge } = await import(
    pathToFileURL(path.join(ROOT, 'js/scenario/prose_bridge.mjs')).href + `?t=${Date.now()}`
);

assert.ok(ROLE_DIVISION_RULES.includes('旁白'));
assert.ok(ROLE_DIVISION_RULES.includes('截断'));

const dirty = `门轴尖叫着打开，你闪入阁楼。腥咸黑水气味扑面。

若力量检定成功，你们默契潜入；若失败，门撞墙巨响。无论分支，阁楼是教程高潮：检定、理智、线索在此同时结算。

你伸手可触盐罐。

手电柱扫过阁楼井口周边，披鳞人形在潮气里浮起一层薄雾。`;

const part = partitionNarrationByJudgment(dirty);
assert.ok(!/检定/.test(part.before), 'before has no 检定');
assert.ok(part.before.includes('闪入阁楼'));
assert.ok(!/\n\n/.test(part.before) || part.before.split('\n\n').length >= 1, 'before is intact text');
assert.ok(part.after.includes('手电柱扫过'), '灌水 after judgment is deferred');
assert.ok(part.after.includes('盐罐'));

await CoCProseBridge.loadProseBank('tutorial');
const gated = CoCProseBridge.enrichNarrativeGatedSync('短JSON叙事。', ['attic'], 'tutorial');
assert.ok(!/若力量检定成功/.test(gated.visible));
assert.ok(gated.visible.includes('短JSON叙事') || gated.visible.length > 20);
assert.ok(!gated.visible.includes('同时结算'));

console.log('prose_no_check_spoil_smoke: OK', {
    beforeLen: part.before.length,
    afterLen: part.after.length,
    visibleLen: gated.visible.length,
    deferredLen: gated.deferred.length
});
