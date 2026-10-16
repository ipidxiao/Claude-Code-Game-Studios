/**
 * CoCStateAccessor surface smoke (no DOM).
 */
import { strict as assert } from 'node:assert';
import { CoCStateAccessor } from '../js/state/accessor.mjs';

assert.equal(typeof CoCStateAccessor.bindVueSetup, 'function');
assert.equal(typeof CoCStateAccessor.rollImprovement, 'function');
assert.equal(typeof CoCStateAccessor.updateNpcStatus, 'function');
assert.equal(typeof CoCStateAccessor.getChase, 'function');
assert.equal(typeof CoCStateAccessor.advanceTurn, 'function');

// Without CoCState loaded, bindVueSetup must not throw — returns stub.
const stub = CoCStateAccessor.bindVueSetup({ foo: 1 });
assert.equal(stub.foo, 1);
assert.ok(stub.gameState);


// Engine / ItemDB resolve via ESM even without window.CoCState
{
    const e = CoCStateAccessor.checkSkill;
    assert.equal(typeof e, 'function');
    // Without state, canAttemptSkill still reaches engine via ESM (ensure throws only on getState paths)
    assert.equal(typeof CoCStateAccessor.getState, 'function');
}

console.log('accessor_bind_smoke: OK');
