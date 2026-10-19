/**
 * Scenario catalog — lists deployable local scripts (loaded after individual scenario files).
 */
import { BUILTIN_SCENARIOS } from './builtins.mjs';
import { auditScenario } from '../../scenario/scenario_audit.mjs';

/** Set by the scenario store after it finishes loading. Avoids a catalog↔store import cycle. */
let downloadedLookup = null;

/**
 * Cover badge from the scenario's own estimated length.
 * Under 30 minutes is short, 30–89 is mid-length, 90 and above is the full module.
 * @param {number|null|undefined} estimatedMinutes
 * @returns {'简单'|'一般'|'标准'}
 */
export function scenarioLengthTier(estimatedMinutes) {
    const minutes = Number(estimatedMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return '一般';
    if (minutes < 30) return '简单';
    if (minutes < 90) return '一般';
    return '标准';
}

export const CoCScenarioCatalog = {
    _scenarios: [],

    refresh() {
        this._scenarios = BUILTIN_SCENARIOS.slice();
        return this._scenarios;
    },

    list() {
        if (!this._scenarios.length) this.refresh();
        return this._scenarios.map((s) => ({
            id: s.id,
            title: s.title,
            subtitle: s.subtitle || '',
            description: s.description || '',
            author: s.author || 'CoC Engine Team',
            license: s.license || 'Original - CoC Engine',
            tags: Array.isArray(s.tags) ? s.tags : [],
            era: s.era || '1920s',
            estimatedMinutes: s.estimatedMinutes || null,
            playTime: s.estimatedMinutes || null,
            lengthTier: scenarioLengthTier(s.estimatedMinutes),
            nodeCount: s.nodes ? Object.keys(s.nodes).length : 0,
            readsArcLedger: !!s.readsArcLedger,
            requiresChapterUnlock: !!s.requiresChapterUnlock,
            continuesArc: !!(s.readsArcLedger || s.requiresChapterUnlock)
        }));
    },

    get(id) {
        if (!this._scenarios.length) this.refresh();
        const builtin = this._scenarios.find((s) => s.id === id);
        if (builtin) return builtin;
        if (typeof downloadedLookup === 'function') return downloadedLookup(id) || null;
        return null;
    },

    bindDownloadedLookup(fn) {
        downloadedLookup = typeof fn === 'function' ? fn : null;
    },

    validate(scenario) {
        const errors = [];
        if (!scenario || typeof scenario !== 'object') {
            errors.push('scenario missing');
            return { ok: false, errors };
        }
        if (!scenario.id) errors.push('missing id');
        if (!scenario.startNode) errors.push('missing startNode');
        if (!scenario.nodes || typeof scenario.nodes !== 'object') errors.push('missing nodes');
        else if (!scenario.nodes[scenario.startNode]) errors.push('startNode not in nodes');

        const audit = auditScenario(scenario);
        if (!audit.ok) errors.push(...audit.errors);
        return { ok: errors.length === 0, errors, warnings: audit.warnings || [] };
    }
};

try {
    CoCScenarioCatalog.refresh();
} catch (e) { /* browser-only init */ }

if (typeof window !== 'undefined') {
    window.__CocAuditSuite = {
        auditScenario,
        async load() {
            const [cjk, depth, path] = await Promise.all([
                import('../../scenario/scenario_cjk_volume.mjs'),
                import('../../scenario/scenario_depth_audit.mjs'),
                import('../../scenario/scenario_path_audit.mjs')
            ]);
            Object.assign(this, {
                countScenarioCjk: cjk.countScenarioCjk,
                CoCScenarioDepthAudit: depth.CoCScenarioDepthAudit,
                CoCScenarioPathAudit: path.CoCScenarioPathAudit
            });
            return this;
        }
    };
}
