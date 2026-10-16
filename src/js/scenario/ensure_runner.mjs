/**
 * Lazy CoCScenarioRunner loader (shell R29.11).
 * Lobby / char_creator must await ensureScenarioRunner() before startScenario,
 * then switchScreen('story'). Does not statically import runner.mjs (keeps boot light).
 */
let _runner = null;
let _loading = null;

/**
 * @returns {Promise<object|null>} CoCScenarioRunner
 */
export async function ensureScenarioRunner() {
    if (_runner && typeof _runner.startScenario === 'function') return _runner;
    if (!_loading) {
        _loading = import('./runner.mjs')
            .then((m) => {
                _runner = m.CoCScenarioRunner || null;
                return _runner;
            })
            .catch((err) => {
                _loading = null;
                if (typeof console !== 'undefined') {
                    console.warn('[CoC] ensureScenarioRunner failed', err);
                }
                return null;
            });
    }
    return _loading;
}

/** Sync peek — null until ensureScenarioRunner() has run. */
export function getScenarioRunner() {
    if (_runner && typeof _runner.startScenario === 'function') return _runner;
    return null;
}

/**
 * Ensure runner then startScenario(id).
 * @returns {Promise<boolean>}
 */
export async function startScenarioById(scenarioId) {
    const id = scenarioId != null ? String(scenarioId) : '';
    if (!id) return false;
    const runner = await ensureScenarioRunner();
    if (!runner || typeof runner.startScenario !== 'function') return false;
    return !!runner.startScenario(id);
}
