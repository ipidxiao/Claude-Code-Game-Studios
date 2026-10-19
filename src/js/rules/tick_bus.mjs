/**
 * Tick plugin bus — round/day/week ongoing effects register here
 * instead of growing RoundTick.process indefinitely.
 */
const _plugins = [];

/**
 * @param {string} id
 * @param {object} plugin
 * @param {'actor'|'state'} plugin.scope  actor = per character; state = once per process
 * @param {'round'|'day'|'week'} [plugin.when]
 * @param {number} [plugin.priority]
 * @param {function} plugin.fn
 */
export function registerTickPlugin(id, plugin) {
    if (!id || !plugin || typeof plugin.fn !== 'function') {
        return { ok: false, desc: 'invalid tick plugin' };
    }
    const entry = {
        id: String(id),
        scope: plugin.scope === 'state' ? 'state' : 'actor',
        when: plugin.when || 'round',
        priority: plugin.priority != null ? Number(plugin.priority) : 100,
        fn: plugin.fn
    };
    const existing = _plugins.findIndex((p) => p.id === entry.id);
    if (existing >= 0) _plugins[existing] = entry;
    else _plugins.push(entry);
    _plugins.sort((a, b) => a.priority - b.priority);
    return { ok: true, id: entry.id };
}

export function unregisterTickPlugin(id) {
    const i = _plugins.findIndex((p) => p.id === id);
    if (i < 0) return false;
    _plugins.splice(i, 1);
    return true;
}

export function listTickPlugins() {
    return _plugins.map((p) => ({ id: p.id, scope: p.scope, when: p.when, priority: p.priority }));
}

/**
 * @param {'round'|'day'|'week'} when
 * @param {object} ctx { Engine, gameState, round, events }
 */
export function runTickPlugins(when, ctx) {
    ctx = ctx || {};
    const events = ctx.events || (ctx.events = []);
    const Engine = ctx.Engine;
    const gameState = ctx.gameState;
    if (!gameState) return { events: events };

    const actors = [];
    const roster = gameState.roster || [];
    for (let i = 0; i < roster.length; i++) actors.push(roster[i]);
    const enemies = (gameState.combat && gameState.combat.enemies) || [];
    for (let i = 0; i < enemies.length; i++) actors.push(enemies[i]);

    const matching = _plugins.filter((p) => p.when === when);
    for (let i = 0; i < matching.length; i++) {
        const p = matching[i];
        if (p.scope === 'actor') {
            for (let a = 0; a < actors.length; a++) {
                const ch = actors[a];
                if (!ch || (ch.status && ch.status.isDead)) continue;
                const extra = p.fn({ Engine: Engine, gameState: gameState, round: ctx.round, actor: ch, events: events });
                if (Array.isArray(extra)) {
                    for (let e = 0; e < extra.length; e++) events.push(extra[e]);
                }
            }
        } else {
            const extra = p.fn({ Engine: Engine, gameState: gameState, round: ctx.round, events: events, actors: actors });
            if (Array.isArray(extra)) {
                for (let e = 0; e < extra.length; e++) events.push(extra[e]);
            }
        }
    }
    return { events: events, round: ctx.round };
}

export function _resetTickBusForTests() {
    _plugins.length = 0;
}

export function attachTickBus(CoCEngine) {
    CoCEngine.TickBus = {
        register: registerTickPlugin,
        unregister: unregisterTickPlugin,
        list: listTickPlugins,
        run: runTickPlugins
    };
    CoCEngine.registerTickPlugin = registerTickPlugin;
}
