/**
 * Tool argument contract (R29 tool_alias class): schemas are strict (additionalProperties:false),
 * so a parameter a handler reads but the schema does not declare can never arrive — sending it
 * rejects the WHOLE call. Found in R29.66: cast_spell.creature_name (transformation never
 * transformed online), melee_attack.situation, fire_weapon.rounds, plus 12 dead aliases.
 *
 * 1) Every argument name a handler reads must be declared in that tool's schema.
 * 2) End-to-end: the transformation spell transforms when the AI names the creature.
 * 3) Schema text must not teach the retired "omit enemy → first undefeated enemy" rule (R29.64).
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
const { CoCToolDefinitions: D } = await import('../js/tools/definitions.mjs');
window.CoCToolDefinitions = D;
const { validateToolArguments } = await import('../js/ai/tool_dispatch.mjs');
const { CoCEngine } = await import('../js/coc.mjs');
const { CoCToolHandlers } = await import('../js/tools/handlers/index.mjs');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const handlerDir = join(root, 'js/tools/handlers');

// ---- 1) static: handler reads ⊆ schema properties --------------------------------------------
const bodies = new Map();
for (const f of readdirSync(handlerDir)) {
    if (!f.endsWith('.mjs') || f === 'index.mjs') continue;
    const src = readFileSync(join(handlerDir, f), 'utf8');
    const re = /^ {8}([a-z_][a-z0-9_]*)\s*:\s*(?:async\s*)?\((\w+)[^)]*\)\s*=>\s*\{/gm;
    const starts = [];
    let m;
    while ((m = re.exec(src))) starts.push({ name: m[1], param: m[2], idx: m.index });
    starts.forEach((s, i) => bodies.set(s.name, { ...s, file: f, body: src.slice(s.idx, i + 1 < starts.length ? starts[i + 1].idx : src.length) }));
}

const readsOf = ({ param, body }) => {
    const reads = new Set();
    let m;
    const dot = new RegExp('\\b' + param + '\\.([A-Za-z_][A-Za-z0-9_]*)', 'g');
    while ((m = dot.exec(body))) reads.add(m[1]);
    const idx = new RegExp('\\b' + param + "\\[['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\\]", 'g');
    while ((m = idx.exec(body))) reads.add(m[1]);
    const fromArgs = new RegExp('resolveActorFromArgs\\([^,]+,\\s*' + param + '\\s*,\\s*\\[([^\\]]*)\\]', 'g');
    while ((m = fromArgs.exec(body))) for (const k of m[1].match(/[A-Za-z_]\w*/g) || []) reads.add(k);
    const req = new RegExp("requireField\\(\\s*" + param + "\\s*,\\s*'([A-Za-z_]\\w*)'\\s*(?:,\\s*\\{[^}]*aliases:\\s*\\[([^\\]]*)\\])?", 'g');
    while ((m = req.exec(body))) {
        reads.add(m[1]);
        for (const k of (m[2] || '').match(/[A-Za-z_]\w*/g) || []) reads.add(k);
    }
    return reads;
};

const SPECIAL = new Set(['request_skill_check', 'push_skill_check']); // handled in ai_logic, not handlers/
const problems = [];
let checked = 0;
for (const name of D.getNames()) {
    if (SPECIAL.has(name)) continue;
    const h = bodies.get(name);
    assert.ok(h, `no handler body found for tool ${name}`);
    const props = new Set(Object.keys((D.getSchema(name) || {}).properties || {}));
    for (const k of readsOf(h)) if (!props.has(k)) problems.push(`${name}.${k} (${h.file}) is read by the handler but not declared in the schema`);
    checked++;
}
assert.deepEqual(problems, [], 'undeclared tool arguments:\n' + problems.join('\n'));
assert.ok(checked >= 60, 'expected to check all tool handlers, got ' + checked);

// The arguments found in R29.66 validate now.
for (const [tool, args] of [
    ['cast_spell', { caster_name: 'Ann', spell_name: '变形术', creature_name: '食尸鬼' }],
    ['cast_spell', { caster_name: 'Ann', spell_name: '变形术', form_name: '食尸鬼' }],
    ['melee_attack', { actor_name: 'Ann', enemy_name: '信徒', situation: { darkness: true } }],
    ['fire_weapon', { shooter_name: 'Ann', rounds: 1 }],
    ['add_clue', { id: 'c1', title: '证词', content: 'x', type: 'testimony', npc_id: 'n1', npcId: 'n1' }]
]) {
    const r = validateToolArguments(tool, args);
    assert.equal(r.ok, true, `${tool}: ${r.error}`);
}

// ---- 2) end-to-end transformation --------------------------------------------------------------
{
    const ann = {
        name: 'Ann', isActive: true, hp: 12,
        attrs: { STR: 50, CON: 60, SIZ: 50, DEX: 50, POW: 80, INT: 60, EDU: 60 },
        skills: { '克苏鲁神话': 20 },
        derived: { hp: 12, maxHp: 12, sanity: 60, mp: 16, mov: 8, db: '0' },
        sanity: 60, mp: 16, status: {}, spells: ['变形术'], knownSpells: ['变形术']
    };
    const gs = {
        roster: [ann], inventory: [], chatHistory: [], combat: { active: false, enemies: [], initiativeOrder: [] },
        chase: { active: false, participants: [] }, clueBoard: { clues: [], links: [] }, npcRegistry: [], journalLog: [],
        scenarioRunner: { active: false, flags: {} }, flags: {}, worldClock: { day: 1, hour: 0 }, pendingRuleChecks: []
    };
    const noop = () => {};
    const h = CoCToolHandlers.create({
        gameState: gs, addJournalEntry: noop, addNpc: noop, updateNpcStatus: noop, startCombat: noop, endCombat: noop,
        updateEnemy: noop, advanceTurn: noop, createMap: noop, updateRoom: noop, setPosition: noop, addClue: noop,
        linkClues: noop, markClueStatus: noop, rollCustomDice: noop, groupRoll: () => []
    }, CoCEngine);
    const v = validateToolArguments('cast_spell', { caster_name: 'Ann', spell_name: '变形术', creature_name: '食尸鬼' });
    assert.equal(v.ok, true);
    const out = h.cast_spell(v.args);
    const text = typeof out === 'string' ? out : (out && out.msg) || '';
    assert.ok(text.includes('变为'), 'transformation must happen: ' + text);
    assert.ok(!text.includes('未指定生物外形'), 'creature name must reach the engine');
    assert.ok(ann.status.transformation && ann.status.transformation.saved, 'original form is saved for revert');
}

// ---- 3) no retired default-target wording -----------------------------------------------------
{
    const defs = readFileSync(join(root, 'js/tools/definitions.mjs'), 'utf8');
    assert.ok(!defs.includes('省略时默认第一个未被击败的敌人'), 'schema still teaches the retired default-first-enemy rule');
}

console.log('tool_schema_contract_smoke: OK', { tools: checked });
