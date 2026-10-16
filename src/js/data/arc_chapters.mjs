/**
 * Short-module campaign chapter unlock table (not Masks campaignArchive).
 */

/** Completing `from` unlocks these scenario ids. */
export const ARC_CHAPTER_UNLOCKS = Object.freeze({
    deep_one_shadow: Object.freeze([
        'midnight_museum',
        'alley_to_asphalt',
        'rain_dock_chase',
        'hearing_room',
        'fog_lighthouse_chase',
        'cliff_mist_run'
    ]),
    alley_to_asphalt: Object.freeze(['fog_lighthouse_chase', 'rain_dock_chase', 'cliff_mist_run']),
    midnight_museum: Object.freeze(['hearing_room']),
    rain_dock_chase: Object.freeze(['fog_lighthouse_chase', 'cliff_mist_run']),
    hearing_room: Object.freeze(['newsroom_midnight']),
    newsroom_midnight: Object.freeze(['court_recess']),
    fog_lighthouse_chase: Object.freeze(['cliff_mist_run']),
    cliff_mist_run: Object.freeze(['lighthouse_night_watch']),
    court_recess: Object.freeze([]),
    lighthouse_night_watch: Object.freeze([])
});

/** Explicit complete→unlock edges (derived; single readable transition table). */
export const ARC_CHAPTER_TRANSITIONS = Object.freeze(
    Object.keys(ARC_CHAPTER_UNLOCKS).flatMap((from) =>
        (ARC_CHAPTER_UNLOCKS[from] || []).map((to) =>
            Object.freeze({ from, to, on: 'complete' })
        )
    )
);

export function transitionsFrom(scenarioId) {
    const id = String(scenarioId || '');
    return ARC_CHAPTER_TRANSITIONS.filter((t) => t.from === id);
}

export function transitionsInto(scenarioId) {
    const id = String(scenarioId || '');
    return ARC_CHAPTER_TRANSITIONS.filter((t) => t.to === id);
}

/** Ordered lobby chapter-map nodes (UX). */
export const ARC_CHAPTER_MAP = Object.freeze([
    Object.freeze({ id: 'deep_one_shadow', title: '深潜者之影', starter: true }),
    Object.freeze({ id: 'midnight_museum', title: '午夜博物馆', starter: true }),
    Object.freeze({ id: 'alley_to_asphalt', title: '巷口到柏油路', starter: true }),
    Object.freeze({ id: 'hearing_room', title: '听证室对峙', gated: true }),
    Object.freeze({ id: 'newsroom_midnight', title: '午夜编辑部', gated: true }),
    Object.freeze({ id: 'court_recess', title: '休庭对质', gated: true }),
    Object.freeze({ id: 'rain_dock_chase', title: '雨夜码头', gated: true }),
    Object.freeze({ id: 'fog_lighthouse_chase', title: '雾锁灯塔', gated: true }),
    Object.freeze({ id: 'cliff_mist_run', title: '雾崖险奔', gated: true }),
    Object.freeze({ id: 'lighthouse_night_watch', title: '灯塔夜班', gated: true })
]);

/** Always playable without prior unlock. */
export const ARC_STARTER_IDS = Object.freeze([
    'tutorial',
    'deep_one_shadow',
    'midnight_museum',
    'alley_to_asphalt',
    'abandoned_asylum',
    'coastal_festival',
    'university_occult',
    'lighthouse_signal',
    'missing_child',
    'train_to_nowhere',
    'carnival_of_masks'
]);

export function unlocksForScenario(scenarioId) {
    return (ARC_CHAPTER_UNLOCKS[scenarioId] || []).slice();
}

/** Scenario ids that unlock `scenarioId` when completed. */
export function unlockPrerequisites(scenarioId) {
    const id = String(scenarioId || '');
    const out = [];
    Object.keys(ARC_CHAPTER_UNLOCKS).forEach((from) => {
        if ((ARC_CHAPTER_UNLOCKS[from] || []).includes(id)) out.push(from);
    });
    return out;
}

export function isScenarioUnlocked(scenarioId, ledger) {
    const id = String(scenarioId || '');
    if (!id) return false;
    if (ARC_STARTER_IDS.includes(id)) return true;
    const unlocked = (ledger && ledger.chapters && ledger.chapters.unlocked) || [];
    if (unlocked.includes(id)) return true;
    // Chapter-graph targets stay locked until an unlock edge fires.
    return unlockPrerequisites(id).length === 0;
}

/**
 * Hard gate only when scenario.requiresChapterUnlock === true.
 */
export function isChapterGatedAllowed(scenario, ledger) {
    if (!scenario || !scenario.requiresChapterUnlock) return true;
    return isScenarioUnlocked(scenario.id, ledger);
}

export function mergeChapterUnlocks(ledger, completedScenarioId) {
    const L = ledger && typeof ledger === 'object' ? ledger : emptyChaptersLedger();
    if (!L.chapters) L.chapters = { unlocked: [], completed: [] };
    if (!Array.isArray(L.chapters.unlocked)) L.chapters.unlocked = [];
    if (!Array.isArray(L.chapters.completed)) L.chapters.completed = [];
    const add = unlocksForScenario(completedScenarioId);
    add.forEach((id) => {
        if (!L.chapters.unlocked.includes(id)) L.chapters.unlocked.push(id);
    });
    if (completedScenarioId && !L.chapters.unlocked.includes(completedScenarioId)) {
        L.chapters.unlocked.push(completedScenarioId);
    }
    return L;
}

/** Lobby chapter-map rows with status for current ledger. */
export function chapterMapStatus(ledger, catalogGet) {
    const completed = (ledger && ledger.chapters && ledger.chapters.completed) || [];
    const doneIds = new Set(completed.map((c) => c && c.id).filter(Boolean));
    return ARC_CHAPTER_MAP.map((node) => {
        const full = catalogGet ? catalogGet(node.id) : null;
        const gated = !!(node.gated || (full && full.requiresChapterUnlock));
        const allowed = isScenarioUnlocked(node.id, ledger);
        let status = 'playable';
        if (doneIds.has(node.id)) status = 'done';
        else if (!allowed) status = 'locked';
        const prereq = unlockPrerequisites(node.id);
        return {
            id: node.id,
            title: (full && full.title) || node.title,
            status,
            gated,
            unlockHint: status === 'locked' && prereq.length
                ? ('先完成：' + prereq.map((id) => {
                    const t = catalogGet ? catalogGet(id) : null;
                    return (t && t.title) || id;
                }).join(' / '))
                : ''
        };
    });
}

/**
 * Recommend next playable chapter after latest completion (or starter).
 */
export function recommendNextChapter(ledger, catalogGet) {
    const rows = chapterMapStatus(ledger, catalogGet);
    const completed = (ledger && ledger.chapters && ledger.chapters.completed) || [];
    const last = completed.length ? completed[completed.length - 1] : null;
    if (last && last.id) {
        const unlocks = unlocksForScenario(last.id);
        for (let i = 0; i < unlocks.length; i++) {
            const hit = rows.find((r) => r.id === unlocks[i] && r.status === 'playable');
            if (hit) return hit;
        }
    }
    const starter = rows.find((r) => r.status === 'playable' && (r.id === 'deep_one_shadow' || !r.gated));
    return starter || rows.find((r) => r.status === 'playable') || null;
}

function emptyChaptersLedger() {
    return { chapters: { unlocked: [], completed: [] } };
}

export const CoCArcChapters = {
    ARC_CHAPTER_UNLOCKS,
    ARC_CHAPTER_TRANSITIONS,
    ARC_CHAPTER_MAP,
    ARC_STARTER_IDS,
    unlocksForScenario,
    unlockPrerequisites,
    isScenarioUnlocked,
    isChapterGatedAllowed,
    mergeChapterUnlocks,
    chapterMapStatus,
    recommendNextChapter,
    transitionsFrom,
    transitionsInto
};
