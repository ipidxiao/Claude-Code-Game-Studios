/**
 * Player-facing story text stays in the story (phone test 2026-10-18: "剧情过于出戏").
 *
 * The defect this guards: text the player reads as the story talked about the game itself —
 * "引擎已就绪，下方会出现可选行动", "教程教你的不是速度…", "下一步：写进线索板，再决定深入或回主线" —
 * and the same filler sentence came back hundreds of times. Both came from padding modules to a
 * length quota (scenario_cjk_volume, scenario_prose_enrich): when length is the target, filler is
 * the cheapest way to hit it. How to play belongs to the interface, not to the narration.
 *
 * Checks every built-in scenario's player-facing story fields and the opening cards:
 * 1. no game / interface vocabulary, and no internal identifiers (node ids such as listen_check);
 * 2. no prose sentence of 6+ Han characters repeated more than twice in one scenario (choice labels
 *    may recur);
 * 3. no slot-filled template paragraph: one whose 4-character fragments largely recur (Jaccard ≥ 0.35)
 *    in paragraphs of 5 or more other nodes — "你注意到{物}旁的{面}颜色略深，深区呈弧形…";
 * 4. no choice label padded to a length ("，保持警惕", "，留意周围动静", a leading "下定决心，").
 */
import { strict as assert } from 'node:assert';

globalThis.window = globalThis.window || {};
const { BUILTIN_SCENARIOS } = await import('../js/data/scenarios/builtins.mjs');
const { SCENARIO_OPENING_BY_ID } = await import('../js/story_opening.mjs');

/** Words that name the game, its interface or its rules — never part of the fiction. */
const META_TERMS = [
    '教程', '入门委托', '引擎已', '本地剧本', '剧本模式', '剧情节点', '可选行动', '可选行', '输入框', '在界面', '界面下方',
    '按钮', '线索板', '叙事句', '可对照地图', '回主线', '主线', '侧道调查', '感官细节', '检定',
    '玩家', '守秘人', 'KP', 'AI', '技能值', '理智值', '模组', '下一步：',
    '战役账本', '桌规', '下一剧本', '短模', '余波标记', '遭遇门槛', '证据档', '可继承', '同一套规则', '规则同一套',
    '示范', '故事外', '条分支', '失败分支', '游戏结束', '六要素',
    // Interface names in passages of the short modules (writer report 2026-10-19).
    '追逐面板', '面板上', '行动预算', '枪战轮次', '假线索', '已解释', '质量门', '证据门'
];
/** A Latin word of 3+ letters in a built-in's Chinese story text (twin packs copy the built-in; other
 *  downloadable packs still carry English names and are not checked for it yet). */
const LATIN_WORD_RE = /[A-Za-z]{3,}/;
const LATIN_ALLOWED = /\bSOS\b|H\.H\./g;
/** Words added to choice labels only to reach the old 14-character minimum. */
const LABEL_PADDING_RE = /保持(?:高度)?警惕|留意周围动静|^下定决心/;
const META_RE = new RegExp(META_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));

/** Fields a player reads as part of the story. */
const STORY_FIELDS = /^(narrative|allSuccess|allFailure|mixed|content|journal|note|label|title|subtitle)$/;
const SKIP_UNDER = /^(lorebook|tags|id|author|license)$/;

const storyStrings = (scenario) => {
    const out = [];
    const walk = (v, key, path) => {
        if (typeof v === 'string') { if (STORY_FIELDS.test(key) && /[\u4e00-\u9fff]/.test(v)) out.push([path, v, key]); return; }
        if (Array.isArray(v)) { v.forEach((x, i) => walk(x, key, path + '[' + i + ']')); return; }
        if (v && typeof v === 'object') {
            // A failed roll's passage (…__fail) is its own text; its effects and options are the success
            // node's, copied (same place, gated clues kept) — checked there, not counted twice.
            const copied = /__fail$/.test(path) ? /^(effects|choices)$/ : null;
            for (const [k, x] of Object.entries(v)) if (!SKIP_UNDER.test(k) && !(copied && copied.test(k))) walk(x, k, path + '.' + k);
        }
    };
    walk(scenario, '', scenario.id);
    // The scenario's title names the module in the lobby; it is checked like any story title.
    return out;
};
const sentences = (text) => text.split(/(?<=[。！？；…])|\n+/).map((x) => x.trim()).filter(Boolean);
const han = (s) => (s.match(/[一-鿿]/g) || []).length;

const builtins = Array.isArray(BUILTIN_SCENARIOS) ? BUILTIN_SCENARIOS : Object.values(BUILTIN_SCENARIOS);
assert.ok(builtins.length >= 10, 'fixture: the built-in scenarios load');
// Downloadable packs are read by players too (a pack sharing a built-in's id must match it: pack parity).
const { readdirSync, readFileSync } = await import('node:fs');
const packDir = new URL('../js/data/scenarios/packages/', import.meta.url);
const packs = readdirSync(packDir).filter((f) => f.endsWith('.json'))
    .map((f) => Object.assign(JSON.parse(readFileSync(new URL(f, packDir), 'utf8')), { id: 'pack:' + f.replace(/\.json$/, '') }));
assert.ok(packs.length >= 10, 'fixture: the packages load');
const scenarios = [...builtins, ...packs];

const metaHits = [];
const repeats = [];
for (const s of scenarios) {
    const strings = storyStrings(s);
    const opening = SCENARIO_OPENING_BY_ID[s.id];  // built-ins only
    if (opening) for (const k of ['past', 'present', 'future']) strings.push([s.id + '.opening.' + k, opening[k]]);
    const seen = new Map();
    for (const [path, text, key] of strings) {
        for (const sent of sentences(text)) {
            // Internal ids and stray English: node ids (listen_check, boiler, room16) leaked into labels.
            const latin = !s.id.startsWith('pack:') && LATIN_WORD_RE.test(sent.replace(LATIN_ALLOWED, ''));
            if (META_RE.test(sent) || /[a-z]+_[a-z0-9_]+/.test(sent) || latin) {
                metaHits.push(`${path}: ${sent.slice(0, 60)}`);
            }
            if (key === 'label' && LABEL_PADDING_RE.test(sent)) metaHits.push(`${path} (padded label): ${sent}`);
            // Choice labels legitimately recur (the same way back from many rooms); prose does not.
            if (key !== 'label' && han(sent) >= 6) seen.set(sent, (seen.get(sent) || 0) + 1);
        }
    }
    for (const [sent, n] of seen) if (n > 2) repeats.push(`${s.id} ×${n}: ${sent.slice(0, 50)}`);
}
// 3. Slot-filled template paragraphs across nodes.
const grams = (p) => { const h = p.replace(/[^\u4e00-\u9fff]/g, ''); const g = new Set(); for (let i = 0; i + 4 <= h.length; i++) g.add(h.slice(i, i + 4)); return g; };
const templates = [];
for (const s of scenarios) {
    const paras = [];
    for (const [id, n] of Object.entries(s.nodes || {})) {
        for (const p of String(n.narrative || '').split(/\n\s*\n/)) if (han(p) >= 8) paras.push({ id, p, g: grams(p) });
    }
    const index = new Map();
    paras.forEach((x, i) => x.g.forEach((g) => { if (!index.has(g)) index.set(g, []); index.get(g).push(i); }));
    paras.forEach((x, i) => {
        const shared = new Map();
        x.g.forEach((g) => { for (const j of index.get(g)) if (j !== i) shared.set(j, (shared.get(j) || 0) + 1); });
        const nodes = new Set();
        for (const [j, c] of shared) {
            const y = paras[j];
            if (y.id !== x.id && c / (x.g.size + y.g.size - c) >= 0.35) nodes.add(y.id);
        }
        if (nodes.size >= 5) templates.push(`${s.id}.${x.id}: ${x.p.slice(0, 40)}`);
    });
}
assert.equal(templates.length, 0, `template paragraphs repeated across nodes (${templates.length}):\n` + templates.slice(0, 15).join('\n'));
assert.equal(metaHits.length, 0, `story text talks about the game (${metaHits.length}):\n` + metaHits.slice(0, 80).join('\n'));
assert.equal(repeats.length, 0, `filler sentences repeated in a scenario (${repeats.length}):\n` + repeats.slice(0, 15).join('\n'));

console.log('narrative_immersion_smoke: OK');
