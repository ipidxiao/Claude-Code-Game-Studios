/**
 * The AI endpoint carries the API key (Authorization: Bearer). Same rule as the public
 * catalog base (robustness pass): https, or plain http only for this machine.
 * A rejected URL must never reach fetch and must not be retried.
 */
import { strict as assert } from 'node:assert';
import { fetchAiCompletionWithRetry, isSafeAiEndpoint } from '../js/ai/network.mjs';

assert.equal(isSafeAiEndpoint('https://api.deepseek.com/chat/completions'), true);
assert.equal(isSafeAiEndpoint('http://127.0.0.1:8080/pw-ai'), true, 'local http (Playwright stub) stays allowed');
assert.equal(isSafeAiEndpoint('http://localhost:11434/v1/chat/completions'), true);
assert.equal(isSafeAiEndpoint('http://[::1]:8080/x'), true);
assert.equal(isSafeAiEndpoint('http://api.deepseek.com/chat/completions'), false, 'remote plain http would leak the key');
assert.equal(isSafeAiEndpoint('http://192.168.1.5/x'), false);
assert.equal(isSafeAiEndpoint('ftp://example.com/x'), false);
assert.equal(isSafeAiEndpoint('javascript:alert(1)'), false);
assert.equal(isSafeAiEndpoint('api.deepseek.com/chat'), false, 'scheme-less URL rejected');
assert.equal(isSafeAiEndpoint(''), false);
assert.equal(isSafeAiEndpoint(null), false);

let fetchCalls = 0;
globalThis.fetch = async () => { fetchCalls++; return { ok: true, status: 200, json: async () => ({}) }; };

await assert.rejects(
    fetchAiCompletionWithRetry('http://api.deepseek.com/chat/completions', {
        method: 'POST', headers: { Authorization: 'Bearer sk-test' }, body: '{}'
    }, 1000, 3),
    (err) => {
        assert.match(err.message, /https/);
        assert.equal(err.retryable, false, 'unsafe endpoint must not be retried');
        return true;
    }
);
assert.equal(fetchCalls, 0, 'the key must never be sent to an unsafe endpoint');

const ok = await fetchAiCompletionWithRetry('https://api.deepseek.com/chat/completions', { method: 'POST', body: '{}' }, 1000, 1);
assert.equal(ok.attempts, 1);
assert.equal(fetchCalls, 1);

console.log('ai_endpoint_guard_smoke: OK');
