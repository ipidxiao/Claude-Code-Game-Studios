/**
 * Tool schema aliases: keys handlers accept via args.a||args.b must validate.
 */
import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
global.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator
});
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;

const { CoCToolDefinitions } = await import('../js/tools/definitions.mjs');
window.CoCToolDefinitions = CoCToolDefinitions;
const { validateToolArguments } = await import('../js/ai/tool_dispatch.mjs');

function ok(tool, args, label) {
    const r = validateToolArguments(tool, args);
    assert.equal(r.ok, true, `${label || tool}: ${r.error || 'expected ok'}`);
}

ok('apply_disease', { target_name: 'Bob', disease: 'flu' }, 'disease alias');
ok('apply_disease', { target_name: 'Bob', disease_id: 'flu' }, 'disease_id canonical');
ok('apply_deprivation', { target_name: 'Bob', type: 'thirst', days: 3 }, 'type/days aliases');
ok('trigger_affliction', { target_name: 'Bob', trigger: '血' }, 'trigger alias');
ok('connect_backstory', { target_name: 'Bob', key: 'ideology' }, 'key alias');
ok('apply_enchantment', { target_name: 'Bob', enchantmentId: 'elder_sign' }, 'enchantmentId alias');
ok('cast_spell', { caster_name: 'Bob', spell_name: '枯萎术', assistant_name: 'Ann', ritual_complete: true }, 'cast aliases');
ok('spend_luck', { target_name: 'Bob', bind_level: '成功', old_level: '失败', target_value: 40 }, 'spend_luck aliases');
ok('enemy_attack', { target_name: 'Bob', situation: { cover: 'soft' } }, 'enemy_attack.situation');
ok('bonus_penalty_roll', { target_name: 'Bob', skill_name: '侦查', situation: { darkness: true } }, 'bonus_penalty.situation');
ok('opposed_roll', { char_name: 'Bob', char_skill: '力量', opponent_name: 'X', opponent_value: 50, label: '掰腕', difficulty: 'hard' }, 'opposed difficulty');
ok('start_chase', { quarry_name: 'X', vehicle_type: 'automobile', skip_speed_check: true, escape_rounds: 2 }, 'start_chase aliases');
ok('chase_action', { action: 'hazard', kind: 'barrier', vehicle_owner: 'Bob', crew: ['Ann'] }, 'chase_action aliases');
ok('fight_back', { actor_name: 'Bob' }, 'fight_back without enemy_name');
ok('apply_scenario_effects', { san_check: '0/1D4', cause: '目击' }, 'effects cause+snake');
ok('fire_weapon', { shooter_name: 'Bob', situation: { targetCover: { kind: 'hard' } } }, 'fire_weapon.situation still');

console.log('tool_alias_schema_smoke: OK');
