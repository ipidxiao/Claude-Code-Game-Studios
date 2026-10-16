/**
 * Keeper table style → ruleset profile + AI prompt fragment + narrative density.
 */

export const KEEPER_STYLES = Object.freeze({
    strict: Object.freeze({
        id: 'strict',
        label: '严苛',
        ruleset: '7e-full',
        prompt: '【桌规·严苛】禁止跳过检定；有风险动作必须 request_skill_check；少用纯叙事推进。',
        density: Object.freeze({
            sanAftershockThreshold: 3,
            gunfightHints: 'sparse',
            aftermathExtra: true
        })
    }),
    cinematic: Object.freeze({
        id: 'cinematic',
        label: '电影',
        ruleset: '7e-core',
        prompt: '【桌规·电影】可适时 apply_scenario_effects 推进场面；避免重复遭遇；仍禁止口头改 HP/SAN。',
        density: Object.freeze({
            sanAftershockThreshold: 5,
            gunfightHints: 'normal',
            aftermathExtra: true
        })
    }),
    pulp_lite: Object.freeze({
        id: 'pulp_lite',
        label: '轻Pulp',
        ruleset: 'pulp',
        prompt: '【桌规·轻Pulp】可偏英雄行动与 pulp 规则档；仍禁止口头改 HP/SAN。',
        density: Object.freeze({
            sanAftershockThreshold: 8,
            gunfightHints: 'rich',
            aftermathExtra: false
        })
    })
});

/** Accept pulp as alias for pulp_lite (ruleset id vs desk style id). */
export const KEEPER_STYLE_ALIASES = Object.freeze({ pulp: 'pulp_lite' });

export function resolveKeeperStyleId(id) {
    const raw = id == null || id === '' ? 'cinematic' : String(id);
    return KEEPER_STYLE_ALIASES[raw] || raw;
}

export function getKeeperStyle(id) {
    const resolved = resolveKeeperStyleId(id);
    return KEEPER_STYLES[resolved] || KEEPER_STYLES.cinematic;
}

export function applyKeeperStyle(gameState, Engine, styleId) {
    const style = getKeeperStyle(styleId);
    if (gameState) gameState.keeperStyle = style.id;
    if (Engine && typeof Engine.setRulesetProfile === 'function') {
        Engine.setRulesetProfile(style.ruleset);
    }
    return style;
}

export function keeperStylePromptFragment(gameState) {
    const id = (gameState && gameState.keeperStyle) || 'cinematic';
    return getKeeperStyle(id).prompt;
}

/** Filter gunfight beat list by keeper density. */
export function filterGunfightBeats(beats, styleId) {
    const list = Array.isArray(beats) ? beats.slice() : [];
    const style = getKeeperStyle(styleId);
    const mode = (style.density && style.density.gunfightHints) || 'normal';
    if (mode === 'sparse') return list.slice(0, 1);
    if (mode === 'rich') {
        if (list.length >= 3) return list;
        const extra = { round: 99, hint: '建议：保持行动预算，必要时跳车或近战收尾。' };
        return list.concat([extra]);
    }
    return list;
}
