/**
 * Every story action rolls dice (author, 2026-10-18): searching, fighting, fleeing, reading,
 * listening… go through a choice and a skill check, and a failed roll leads to a passage of its
 * own. Pure movement ("回到门厅") does not roll.
 *
 * Each scenario's decisions live in ./action_checks/<id>.mjs as data a person can review:
 * { [nodeId]: { [choiceKey]: { skill, fail } | { roll: false } } } — choiceKey is the choice's id,
 * else its label. applyActionChecks turns each { skill, fail } into a skillCheck on the choice and
 * a failure node that carries the fail text, the success node's location, the success node's
 * options, and only those of its clues and flags a later gate requires (one failed roll never closes
 * the story — CoC's rule; ordinary clues are simply missed).
 */

/** Effects of the success node that still hold after failing there: where you are, not what you found. */
const PLACE_EFFECTS = ['location', 'mapRoom', 'atmosphere', 'advanceClock'];

/** @returns {string} the failure node id for one choice */
export function failNodeId(nodeId, choiceKey) {
    return `${nodeId}__${choiceKey}__fail`;
}

/**
 * Apply one scenario's action-check table in place.
 * @param {Object} scenario built-in scenario (nodes are mutated)
 * @param {Object} table { [nodeId]: { [choiceKey]: { skill, fail } | { roll: false } } }
 * @returns {number} how many choices now roll
 */
export function applyActionChecks(scenario, table) {
    if (!scenario || !scenario.nodes || !table) return 0;
    const gated = new Set();
    const gatedFlags = new Set();
    for (const node of Object.values(scenario.nodes)) {
        for (const c of node.choices || []) {
            if (c && c.requiresClueId) gated.add(c.requiresClueId);
            if (c && c.requiresFlag) gatedFlags.add(c.requiresFlag);
        }
    }
    let applied = 0;
    for (const [nodeId, entries] of Object.entries(table)) {
        const node = scenario.nodes[nodeId];
        if (!node || !Array.isArray(node.choices)) continue;
        for (const choice of node.choices) {
            const key = choice.id || choice.label;
            const e = entries[key];
            if (!e || !e.skill || !e.fail || choice.skillCheck) continue;
            const target = scenario.nodes[choice.next];
            if (!target || target.end || target.branch) continue;
            const id = failNodeId(nodeId, key);
            const effects = {};
            for (const k of PLACE_EFFECTS) if (target.effects && target.effects[k] != null) effects[k] = target.effects[k];
            const keptClues = ((target.effects && target.effects.clues) || []).filter((c) => c && gated.has(c.id));
            if (keptClues.length) effects.clues = keptClues;
            const flags = (target.effects && target.effects.flags) || {};
            const keptFlags = Object.fromEntries(Object.entries(flags).filter(([f]) => gatedFlags.has(f)));
            if (Object.keys(keptFlags).length) effects.flags = keptFlags;
            scenario.nodes[id] = { narrative: e.fail, effects, choices: target.choices || [] };
            choice.skillCheck = { skill: e.skill };
            choice.failNext = id;
            applied++;
        }
    }
    return applied;
}
