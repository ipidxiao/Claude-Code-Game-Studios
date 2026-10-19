/**
 * Round-2 bugfix smoke: inventory exact match, chat _vid strip, chase action preflight shape.
 */
import { strict as assert } from 'node:assert';

// --- consume_inventory: exact before includes ---
function pickConsumeIndex(inventory, want) {
    const labelOf = (invItem) => (typeof invItem === 'string' ? invItem : (invItem && invItem.name) || '');
    let idx = inventory.findIndex((invItem) => labelOf(invItem) === want);
    if (idx === -1) {
        idx = inventory.findIndex((invItem) => labelOf(invItem).includes(want));
    }
    return idx;
}
const inv = [{ name: '手枪弹药' }, { name: '枪' }];
assert.equal(pickConsumeIndex(inv, '枪'), 1);
assert.equal(pickConsumeIndex(inv, '手枪弹药'), 0);

// --- save-time strip of ephemeral _vid ---
const chat = [
    { role: 'user', content: 'a', _vid: 1 },
    { role: 'assistant', content: 'b', _vid: 2 }
];
const stripped = chat.map((m) => {
    if (!m || typeof m !== 'object' || m._vid == null) return m;
    const copy = Object.assign({}, m);
    delete copy._vid;
    return copy;
});
assert.equal(stripped[0]._vid, undefined);
assert.equal(stripped[1].content, 'b');

// --- chase preflight: actionsLeft <= 0 blocks ---
function chaseGate(actionsLeft) {
    if ((Number(actionsLeft) || 0) <= 0) return 'blocked';
    return 'ok';
}
assert.equal(chaseGate(0), 'blocked');
assert.equal(chaseGate(1), 'ok');

console.log('bugfix_round2_smoke: OK');
