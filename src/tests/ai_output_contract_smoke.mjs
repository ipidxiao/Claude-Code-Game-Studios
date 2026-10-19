/**
 * The online keeper's reply reads as a novel, and its options are a list of actions
 * (phone test 2026-10-19: "最后的给的选项，格式有问题，还出现了莫名其妙的英语……AI回复的格式应该按
 * 小说载体来表现，一段不要出现过长的对话。取消段落字数限制").
 *
 * The defects this guards:
 * - the prompt named the reply's sections in English ("DICE → STORY → NARRATION → INTERACTION →
 *   ACTION_ORDER（格式如 A2-B1-C1）") while the display only knew the 【叙事】 headers, so a reply that
 *   copied the English label was shown raw, "ACTION_ORDER：A1 查客厅湿窗帘；A2 …" and all;
 * - the action section was a code string, so the options came out as "(A)(B)(C)" inside the prose
 *   and the action list offered "A1", "A2";
 * - every paragraph had to be at least 100 characters, and a shorter reply was sent back for padding.
 */
import { strict as assert } from 'node:assert';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { formatAssistantDisplay, parseAiActionChoices } = await imp('js/components/chat_format_helpers.mjs');
const { restructureOrReject } = await imp('js/ai/output_protocol.mjs');
const { isDryNarrative, findForeignWords } = await imp('js/data/narrative_prose.mjs');
const { CoCAIPromptConfig } = await imp('js/data/ai_prompt_config.mjs');

// The reply on the phone, 2026-10-19 (the model copied the English section label).
const PHONE_REPLY = [
    '客厅方向传来窗帘被拖拽的声音，湿布刮过护墙板，一长声，慢慢收住。地砖上的那些砂砾、那道撬痕，你再低头看时，只觉得它们排得杂乱，毫无指向。',
    '现在，客厅的帘声与楼梯的脚步声都在等你选择。',
    'ACTION_ORDER：A1 查客厅湿窗帘；A2 侧室书房（需先经客厅）；B1 上楼；B2 直奔阁楼梯口；C1 绕屋外查井口；C2 回门廊检查礼帽与伞柄刻字。'
].join('\n\n');

// 1. A section label the display does not show is never shown raw, English or not.
const shown = formatAssistantDisplay(PHONE_REPLY);
assert.ok(shown.includes('湿布刮过护墙板'), 'the story is shown');
assert.ok(!/ACTION_ORDER|[A-Z]\d/.test(shown), 'no section label or option code in the story: ' + shown);

// 2. Its options become actions a player can read, not codes.
const fromPhone = parseAiActionChoices(PHONE_REPLY).map((c) => c.label);
assert.ok(fromPhone.includes('查客厅湿窗帘') && fromPhone.includes('上楼'), 'options by what they do: ' + fromPhone.join(' / '));
assert.ok(fromPhone.every((l) => !/^[A-Z]\d/.test(l)), 'no code labels: ' + fromPhone.join(' / '));

// 3. The reply the prompt now asks for: 【叙事】 prose, then 【行动】 one action per line.
const ASKED = '【叙事】\n雨声压低了。你把手电往客厅一偏，湿窗帘在光里轻轻晃。\n\n“别过去。”身后有人说。\n\n【行动】\n1. 掀开客厅的湿窗帘\n2. 转身看清说话的人\n3. 上楼';
assert.equal(formatAssistantDisplay(ASKED), '雨声压低了。你把手电往客厅一偏，湿窗帘在光里轻轻晃。\n\n“别过去。”身后有人说。');
assert.deepEqual(parseAiActionChoices(ASKED).map((c) => c.label), ['掀开客厅的湿窗帘', '转身看清说话的人', '上楼']);
const checked = restructureOrReject(ASKED, { autoFix: true });
assert.ok(checked.ok && !checked.restructured, 'that reply passes as written');

// 4. No paragraph length limit: a short line of prose is not "too dry".
assert.equal(isDryNarrative('“别过去。”身后有人说。'), false, 'a short paragraph is not sent back for padding');
assert.equal(isDryNarrative('某人受到惊吓然后没了。'), true, 'a telegraphic summary still is');

// 5. English in the story is noticed (names the scenario gives are not English words).
assert.deepEqual(findForeignWords('你在 solitude 里站了很久。'), ['solitude']);
assert.deepEqual(findForeignWords('H.H. 的落款，SOS 的灯语。'), []);

// 6. The prompt asks for exactly that, in Chinese, with no length floor.
const prompt = CoCAIPromptConfig.buildSystemInjection('（小队）', 'divine_war', { kpEngine: { enabled: true }, kpState: {} });
for (const bad of ['ACTION_ORDER', 'A2-B1', 'DICE →', '不少于一百字', 'PHASE / DOOM_CLOCK']) {
    assert.ok(!prompt.includes(bad), 'the prompt no longer says ' + bad);
}
assert.ok(prompt.includes('【叙事】') && prompt.includes('【行动】'), 'the prompt names the sections the display reads');
assert.ok(/英文/.test(prompt), 'the prompt says the story is written without English');

console.log('ai_output_contract_smoke: OK');
