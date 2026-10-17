// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// ===============================================

/**
 * Per-player visibility (ADR-0003). The single filter between the keeper's authoritative
 * gameState and anything shown to another person. Default-deny at three layers:
 * top-level field, record type, record field. Not used in single-player except applySafety.
 *
 * Nothing here mutates gameState except assignStableIds / markExplored, which are the
 * single writers for msgId / rollId / exploredBy.
 */

/** Fields no viewer ever receives, developer included (local settings, secrets, UI state). */
export const NEVER_PROJECT = Object.freeze([
    'aiSettings', 'ui', 'storageStatus', 'activeModal', 'currentScreen', 'isLoading', 'activeModuleId'
]);

/** Top-level fields a guest view is built from. Anything else is absent. */
export const GUEST_TOP_LEVEL_ALLOWLIST = Object.freeze([
    'roster', 'currentLocation', 'knownLocations', 'chatHistory', 'journalLog', 'clueBoard', 'sceneMap',
    'combat', 'chase', 'diceHistory', 'atmosphere', 'worldClock', 'inventory', 'storage', 'keeperStyle'
]);

/** Keeper-only game data a developer view adds on top of the guest fields. */
export const KEEPER_DATA_FIELDS = Object.freeze([
    'kpState', 'kpEngine', 'arcLedger', 'flags', 'npcRegistry', 'scenarioRunner', 'mythosHeat', 'heatEventsLog',
    'skillAttempts', 'sanCaps', 'pendingAftermath', 'customWeapons', 'activeCampaign', 'moduleSeed',
    'encounterVariant', 'selectedCharIndex'
]);

/** Chat window kept in a projected view (ADR-0002 §2). */
export const CHAT_WINDOW = 200;

const HIDDEN_TEXT = '（此段内容已按你的设置隐藏）';
const DARK_ROLL_TEXT = (label) => `守秘人进行了一次暗骰${label ? '「' + label + '」' : ''}`;

const pick = (src, keys) => {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const k of keys) if (src[k] !== undefined) out[k] = clone(src[k]);
    return out;
};

/** Deep clone that drops `_`-prefixed (runtime / transient) keys. */
function clone(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(clone);
    const out = {};
    for (const [k, val] of Object.entries(v)) {
        if (k.startsWith('_') || typeof val === 'function') continue;
        out[k] = clone(val);
    }
    return out;
}

const newId = (prefix) => {
    const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
    if (c && typeof c.randomUUID === 'function') return prefix + c.randomUUID().replace(/-/g, '').slice(0, 16);
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
};

/** Normalise legacy hide flags to a vis value (ADR-0003 §2). */
function effectiveVis(rec) {
    if (!rec || typeof rec !== 'object') return { to: 'keeper' };
    if (rec.vis) return rec.vis;
    if (rec.isHidden || rec.isLocalOnly) return { to: 'keeper' };
    return undefined;
}

/**
 * @param {{role:string, invIds?:string[]}} viewer
 * @param {undefined|{to:'keeper'|string[]}} vis
 * @returns {boolean}
 */
export function canSee(viewer, vis) {
    if (!viewer) return false;
    if (viewer.role === 'keeper' || viewer.role === 'developer') return true;
    if (vis === undefined) return true;
    if (!vis || typeof vis !== 'object') return false;
    if (vis.to === 'keeper') return false;
    if (Array.isArray(vis.to)) {
        const mine = new Set(viewer.invIds || []);
        return vis.to.some((id) => mine.has(id));
    }
    return false;
}

/**
 * Personal content limits (ADR-0003 §6). Shared by single-player rendering and projection.
 * @param {Object} record chat message or journal entry (not mutated)
 * @param {{lines?:string[], veils?:string[]}} limits
 * @returns {Object} the same record when untouched, else a copy with content/summary replaced
 */
export function applySafety(record, limits) {
    if (!record || !record.safety || !limits) return record;
    const tags = Array.isArray(record.safety.tags) ? record.safety.tags : [];
    const lines = new Set(limits.lines || []);
    const veils = new Set(limits.veils || []);
    let replacement = null;
    if (tags.some((t) => lines.has(t))) replacement = HIDDEN_TEXT;
    else if (tags.some((t) => veils.has(t))) replacement = record.safety.summary || HIDDEN_TEXT;
    if (replacement == null) return record;
    const out = Object.assign({}, record);
    if ('content' in out) out.content = replacement;
    if ('summary' in out) out.summary = replacement;
    return out;
}

/**
 * Single assignment point for msgId (chat) and rollId (dice) — ADR-0003 §6.5.
 * Called before every projection/diff and before every save. Idempotent; mutates in place.
 * @param {Object} gameState
 */
export function assignStableIds(gameState) {
    if (!gameState) return;
    if (Array.isArray(gameState.chatHistory)) {
        for (const m of gameState.chatHistory) {
            if (m && typeof m === 'object' && !m.msgId) m.msgId = newId('m_');
        }
    }
    if (Array.isArray(gameState.diceHistory)) {
        for (const d of gameState.diceHistory) {
            if (d && typeof d === 'object' && !d.rollId) d.rollId = newId('r_');
        }
    }
}

/**
 * Single writer for exploredBy (ADR-0003 §4). Adds the present investigators to a room.
 * @param {Object} gameState
 * @param {string} roomId room id or name
 * @param {string[]} presentInvIds
 * @returns {boolean}
 */
export function markExplored(gameState, roomId, presentInvIds) {
    const rooms = gameState && gameState.sceneMap && gameState.sceneMap.rooms;
    if (!Array.isArray(rooms)) return false;
    const r = rooms.find((rm) => rm && (rm.id === roomId || rm.name === roomId));
    if (!r) return false;
    const set = new Set(Array.isArray(r.exploredBy) ? r.exploredBy : []);
    for (const id of presentInvIds || []) if (id) set.add(id);
    r.exploredBy = [...set];
    return true;
}

/** Investigators present in a scene. Until split parties exist (system 25): the whole roster. */
export function presentInvIds(gameState) {
    return ((gameState && gameState.roster) || []).map((c) => c && c.invId).filter(Boolean);
}

// ── layer 3: record field allowlists ─────────────────────────────────────────

const CHAT_FIELDS = ['msgId', 'role', 'content', 'charName', 'timestamp'];
const ROLL_LINE_FIELDS = ['msgId', 'role', 'kind', 'rollId', 'content'];
const JOURNAL_FIELDS = ['id', 'type', 'summary', 'location', 'charName', 'isSuccess', 'timestamp', 'rollId'];
const DICE_FIELDS = ['rollId', 'rolledBy', 'notation', 'total', 'label', 'level'];
const CLUE_FIELDS = ['id', 'title', 'content', 'type', 'relatedIds', 'location', 'status'];
const ROOM_FIELDS = ['id', 'name', 'status', 'x', 'y'];
const ITEM_FIELDS = ['name', 'type', 'qty', 'desc'];
const INV_PUBLIC_FIELDS = ['invId', 'name', 'jobName'];

function projectChat(viewer, list) {
    const out = [];
    for (const m of list || []) {
        if (!m || typeof m !== 'object') continue;
        if (m.role === 'system' && m.kind === 'roll') {
            if (canSee(viewer, m.vis)) out.push(pick(m, ROLL_LINE_FIELDS));
            else out.push({ msgId: m.msgId, role: 'system', kind: 'roll', rollId: m.rollId, content: DARK_ROLL_TEXT(m.label), hidden: true });
            continue;
        }
        if (m.role !== 'user' && m.role !== 'assistant') continue;
        if (m.isHidden || m.isLocalOnly || m.isLocalError) continue;
        if (!canSee(viewer, m.vis)) continue;
        out.push(pick(applySafety(m, viewer.limits), CHAT_FIELDS));
    }
    return out.slice(-CHAT_WINDOW);
}

function projectJournal(viewer, list) {
    const out = [];
    for (const e of list || []) {
        if (!e || typeof e !== 'object') continue;
        if (canSee(viewer, effectiveVis(e))) { out.push(pick(applySafety(e, viewer.limits), JOURNAL_FIELDS)); continue; }
        if (e.type === 'skill_check' || e.type === 'dice') {
            out.push({ id: e.id, type: e.type, rollId: e.rollId, summary: DARK_ROLL_TEXT(e.label), hidden: true });
        }
    }
    return out;
}

function projectDice(viewer, list) {
    return (list || []).filter((d) => d && typeof d === 'object').map((d) => (
        canSee(viewer, effectiveVis(d)) ? pick(d, DICE_FIELDS) : { rollId: d.rollId, label: d.label, hidden: true }
    ));
}

function projectClueBoard(viewer, board) {
    const clues = ((board && board.clues) || []).filter((c) => c && canSee(viewer, effectiveVis(c)));
    const visible = new Set(clues.map((c) => c.id));
    const links = ((board && board.links) || [])
        .filter((l) => l && visible.has(l.from) && visible.has(l.to))
        .map((l) => ({ from: l.from, to: l.to }));
    return { clues: clues.map((c) => pick(c, CLUE_FIELDS)), links };
}

function projectSceneMap(viewer, map) {
    const mine = new Set(viewer.invIds || []);
    const rooms = ((map && map.rooms) || []).filter((r) => r && Array.isArray(r.exploredBy) && r.exploredBy.some((id) => mine.has(id)));
    const ids = new Set(rooms.map((r) => r.id));
    return {
        title: (map && map.title) || '',
        rooms: rooms.map((r) => Object.assign(pick(r, ROOM_FIELDS), {
            connections: (Array.isArray(r.connections) ? r.connections : []).filter((c) => ids.has(c))
        })),
        currentRoomId: map && ids.has(map.currentRoomId) ? map.currentRoomId : null
    };
}

function projectItems(list) {
    return (list || []).map((it) => (typeof it === 'string' ? it : pick(it, ITEM_FIELDS)));
}

function projectRoster(viewer, roster) {
    const mine = new Set(viewer.invIds || []);
    return (roster || []).filter(Boolean).map((c) => {
        if (mine.has(c.invId)) return clone(c);
        const pub = pick(c, INV_PUBLIC_FIELDS);
        pub.appearance = (c.backstory && c.backstory.description) || '';
        const st = c.status || {};
        pub.visibleWounds = { hasMajorWound: !!st.hasMajorWound, isDying: !!st.isDying, isUnconscious: !!st.isUnconscious, isDead: !!st.isDead };
        return pub;
    });
}

/** Until system 21 defines the shared panel: round and names only, no numbers. */
function projectCombat(combat) {
    const c = combat || {};
    return {
        active: !!c.active,
        round: Number(c.round) || 1,
        currentTurnIdx: Number(c.currentTurnIdx) || 0,
        initiativeOrder: (Array.isArray(c.initiativeOrder) ? c.initiativeOrder : []).map((t) => ({ name: t && t.name }))
    };
}

function projectChase(chase) {
    const c = chase || {};
    return {
        active: !!c.active,
        round: Number(c.round) || 1,
        participants: (Array.isArray(c.participants) ? c.participants : []).map((p) => ({ name: p && p.name }))
    };
}

function guestView(viewer, gs) {
    return {
        roster: projectRoster(viewer, gs.roster),
        currentLocation: gs.currentLocation,
        knownLocations: clone(gs.knownLocations || []),
        chatHistory: projectChat(viewer, gs.chatHistory),
        journalLog: projectJournal(viewer, gs.journalLog),
        clueBoard: projectClueBoard(viewer, gs.clueBoard),
        sceneMap: projectSceneMap(viewer, gs.sceneMap),
        combat: projectCombat(gs.combat),
        chase: projectChase(gs.chase),
        diceHistory: projectDice(viewer, gs.diceHistory),
        atmosphere: { level: (gs.atmosphere && gs.atmosphere.level) || 'calm' },
        worldClock: clone(gs.worldClock || null),
        inventory: projectItems(gs.inventory),
        storage: projectItems(gs.storage),
        keeperStyle: gs.keeperStyle
    };
}

function developerView(viewer, gs) {
    const out = {};
    for (const k of [...GUEST_TOP_LEVEL_ALLOWLIST, ...KEEPER_DATA_FIELDS]) {
        if (NEVER_PROJECT.includes(k)) continue;
        if (gs[k] !== undefined) out[k] = clone(gs[k]);
    }
    if (gs._customWeapons !== undefined) out.customWeapons = clone(gs._customWeapons);
    out.chatHistory = (gs.chatHistory || []).filter(Boolean)
        .map((m) => clone(applySafety(m, viewer.limits))).slice(-CHAT_WINDOW);
    out.journalLog = (gs.journalLog || []).filter(Boolean).map((e) => clone(applySafety(e, viewer.limits)));
    return out;
}

/**
 * The single projection exit (ADR-0003 §5). Returns a new object; never mutates gameState.
 * @param {{memberId?:string, role:'keeper'|'developer'|'guest', invIds?:string[], limits?:Object}} viewer
 * @param {Object} gameState
 * @returns {Object}
 */
export function projectFor(viewer, gameState) {
    const gs = gameState || {};
    const v = Object.assign({ invIds: [], limits: null }, viewer || {});
    if (v.role === 'keeper' || v.role === 'developer') return developerView(v, gs);
    return guestView(v, gs);
}

/**
 * Older chat for history_page replies (ADR-0002 §2). Same layer 2-3 rules as projectFor.
 * @param {Object} viewer
 * @param {Object} gameState
 * @param {string|null} beforeMsgId page ends just before this message (null = latest)
 * @param {number} n page size
 * @returns {Object[]}
 */
export function projectHistoryPage(viewer, gameState, beforeMsgId, n) {
    const list = (gameState && gameState.chatHistory) || [];
    let end = list.length;
    if (beforeMsgId) {
        const i = list.findIndex((m) => m && m.msgId === beforeMsgId);
        if (i >= 0) end = i;
    }
    const size = Math.max(1, Math.min(Number(n) || 50, CHAT_WINDOW));
    const v = Object.assign({ invIds: [], limits: null }, viewer || {});
    const slice = list.slice(0, end);
    if (v.role === 'keeper' || v.role === 'developer') {
        return slice.slice(-size).map((m) => clone(applySafety(m, v.limits)));
    }
    const projected = [];
    for (let i = slice.length - 1; i >= 0 && projected.length < size; i--) {
        const one = projectChat(v, [slice[i]]);
        if (one.length) projected.unshift(one[0]);
    }
    return projected;
}
