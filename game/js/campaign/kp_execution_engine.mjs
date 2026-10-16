// KP protocol execution engine — ammo, combat tags, attention, output state.

import { KP_PROTOCOL, getTacticalCombatTags, getPureDamageCombatTags, getFightBackTags } from '../data/kp_protocol.mjs';
import { ANTAGONIST_AI_RULES } from '../data/antagonist_rules.mjs';

function defaultKpTime() {
    return { date: '', hour: '0:00', day: 1, environment: { entropy_increment: 0 } };
}

/** Copy the calendar onto KP TIME. Does not advance a second hour counter. */
export function syncKpTimeFromWorldClock(gameState) {
    if (!gameState || (!gameState.kpState && !gameState.kpEngine)) return null;
    ensureKpEngine(gameState);
    if (!gameState.kpState) return null;
    if (!gameState.kpState.TIME || typeof gameState.kpState.TIME !== 'object') {
        gameState.kpState.TIME = defaultKpTime();
    }
    const clock = (gameState.worldClock && typeof gameState.worldClock === 'object')
        ? gameState.worldClock
        : { day: 1, hour: 0 };
    const hour = ((Number(clock.hour) || 0) % 24 + 24) % 24;
    const day = Math.max(1, Number(clock.day) || 1);
    gameState.kpState.TIME.hour = `${String(hour).padStart(2, '0')}:00`;
    gameState.kpState.TIME.day = day;
    return gameState.kpState.TIME;
}
import { run as runLanguageCorrection } from '../data/campaigns/language_self_correction.mjs';
import { applyNpcBehavior, canSocialInfiltrate } from '../engines/npc_behavior.mjs';
import { CoCItemDB } from '../data/items.mjs';
import { CoCEngine } from '../coc.mjs';

const DEFAULT_KP = { ...KP_PROTOCOL.GLOBAL_STATE };
const DEFAULT_ANT = { ...ANTAGONIST_AI_RULES.STATE };

const FUTURE_TECH_PATTERNS = [
    /智能手机|手机APP|互联网|WiFi|蓝牙|GPS定位|无人机|3D打印|激光切割/i,
    /smartphone|internet|wifi|bluetooth|drone|3d.?print/i,
    /电脑|计算机|笔记本|U盘|USB|硬盘/i
];

const ATMOSPHERE_ENTROPY = {
    calm: 0,
    tense: 0.15,
    dread: 0.35,
    fear: 0.45,
    terror: 0.65,
    combat: 0.5,
    ritual: 0.75,
    critical: 0.9
};

const AMMO_TYPE_HINTS = [
    { match: /霰弹|shotgun/i, type: '霰弹' },
    { match: /步枪|rifle|来复/i, type: '步枪' },
    { match: /冲锋|汤普森|tommy|9mm/i, type: '9mm' },
    { match: /左轮|revolver|\.38|\.45|\.32/i, type: '左轮' },
    { match: /枪|pistol|手枪/i, type: '手枪' }
];

const MYTHOS_ITEM_PATTERNS = [
    /神话|克苏鲁|奈亚|犹格|莎布|深潜|旧日|典籍|死灵之书|伊波恩/i,
    /mythos|cthulhu|nyarlathotep|necronomicon/i
];

const SKIP_PROCESS_PATTERNS = [
    /直接成功|跳过检定|不用骰|无视规则|自动通过/i,
    /skip\s*check|auto\s*success|ignore\s*roll/i
];

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

const TRUE_PATH_TYPES = ['skill', 'npc', 'item', 'environment'];
const PATH_TYPE_LABELS = {
    skill: '技能',
    npc: 'NPC',
    item: '物品',
    environment: '环境',
    false: '误导'
};

/** @type {number[]|null} injectable d100 sequence for tests */
let _testRollQueue = null;

export function _setTestRolls(rolls) {
    _testRollQueue = Array.isArray(rolls) ? rolls.slice() : null;
}

export function _clearTestRolls() {
    _testRollQueue = null;
}

function rollD100() {
    if (_testRollQueue && _testRollQueue.length) return _testRollQueue.shift();
    return Math.floor(Math.random() * 100) + 1;
}

/** Unit interval [0,1) — uses injectable queue when present (value/100). */
function rollUnit() {
    if (_testRollQueue && _testRollQueue.length) return rollD100() / 100;
    return Math.random();
}

function rollIndex(max) {
    const n = Math.max(1, Number(max) || 1);
    if (_testRollQueue && _testRollQueue.length) return Math.floor(rollD100() / 100 * n) % n;
    return Math.floor(Math.random() * n);
}

/** Normalize inventory element (string or {id,name,qty,note}) to display label. */
export function inventoryLabel(item) {
    if (item == null) return '';
    if (typeof item === 'string') return item.trim();
    if (typeof item === 'object') {
        if (item.name) return String(item.name).trim();
        if (item.id) return String(item.id).trim();
    }
    return String(item).trim();
}

function inferAmmoType(weaponStr) {
    const w = String(weaponStr || '');
    for (const hint of AMMO_TYPE_HINTS) {
        if (hint.match.test(w)) return hint.type;
    }
    return null;
}

/** Ammo pool follows the resolved weapon category, not a caliber token in the name. */
function ammoTypeForResolvedWeapon(weaponStr) {
    const name = String(weaponStr || '').replace(/\[弹药:\d+\]/g, '').trim();
    const cat = (CoCItemDB && typeof CoCItemDB.resolve === 'function') ? CoCItemDB.resolve(name) : null;
    if (!cat || !(cat.damage || cat.type === 'firearm' || cat.type === 'ranged' || cat.type === 'melee')) {
        return inferAmmoType(weaponStr);
    }
    const nameBlob = String(cat.name || '') + String(cat.category || '');
    const skill = String(cat.skill || '');
    if (/弩/.test(nameBlob + skill) && !/枪/.test(nameBlob)) return '弩箭';
    if (/弓/.test(nameBlob + skill) && !/枪/.test(nameBlob)) return '箭';
    if (/投掷|投矛|投石/.test(nameBlob)) return null;
    if (/霰弹/.test(nameBlob)) return '霰弹';
    if (/冲锋/.test(nameBlob) || /冲锋枪/.test(skill)) return '9mm';
    if (/步枪|来复/.test(nameBlob)) return '步枪';
    if (/左轮/.test(nameBlob)) return '左轮';
    if (/手枪|pistol/i.test(nameBlob) || cat.category === '手枪') return '手枪';
    return inferAmmoType(weaponStr);
}

/** Parse quantity from ammo labels: `12发…`, trailing `×12` / `x12` / `*12`. */
function parseAmmoQtyFromLabel(label) {
    const text = String(label || '');
    const fa = text.match(/(\d+)\s*发/);
    if (fa) return parseInt(fa[1], 10);
    const mul = text.match(/[×xX*]\s*(\d+)\s*$/);
    if (mul) return parseInt(mul[1], 10);
    return null;
}

/** @returns {{ count: number, type: string|null, label: string, raw: * }} */
function parseAmmoEntry(item) {
    const label = inventoryLabel(item);
    const structured = typeof item === 'object' && item && Number.isFinite(item.count) ? item : null;
    let count = 0;
    if (structured) {
        count = Math.max(0, Number(item.count) || 0);
    } else if (typeof item === 'object' && item && Number.isFinite(item.qty)) {
        count = Math.max(0, Number(item.qty) || 0);
    } else {
        const parsed = parseAmmoQtyFromLabel(label);
        if (parsed != null) count = parsed;
        else if (/子弹|弹药|弹匣|弹夹/i.test(label) || looseArrowStack(label)) count = 1;
    }
    const type = (structured && item.type) || inferAmmoTypeFromLabel(label);
    return { count, type, label, raw: item };
}

function inferAmmoTypeFromLabel(label) {
    const text = String(label || '');
    if (!/子弹|弹药|弹匣|弹夹/i.test(text)) return null;
    for (const hint of AMMO_TYPE_HINTS) {
        if (hint.match.test(text)) return hint.type;
    }
    return null;
}

function formatAmmoLabel(count, ammoType) {
    const n = Math.max(0, Number(count) || 0);
    const type = ammoType || '通用';
    if (type === '箭' || type === '弩箭') return `${n}发${type}`;
    return `${n}发${type}子弹`;
}

function writeAmmoEntry(inventory, index, count, ammoType, original) {
    const label = formatAmmoLabel(count, ammoType);
    if (typeof original === 'object' && original !== null) {
        inventory[index] = { ...original, name: label, count, type: ammoType || original.type || null, qty: count };
    } else {
        inventory[index] = label;
    }
}

function looseArrowStack(label) {
    const text = String(label || '');
    if (/弩箭/.test(text)) return '弩箭';
    if (/(^|[^弓])箭/.test(text)) return '箭';
    return null;
}

function ammoLabelMatchesType(label, ammoType) {
    const text = String(label || '');
    const arrow = looseArrowStack(text);
    if (ammoType === '箭') return arrow === '箭';
    if (ammoType === '弩箭') return arrow === '弩箭';
    if (!/子弹|弹药|弹匣|弹夹/i.test(text)) return false;
    if (!ammoType) return true;
    return text.includes(ammoType)
        || (ammoType === '左轮' && /左轮|\.38|\.45|\.32|revolver/i.test(text))
        || (ammoType === '手枪' && /手枪|pistol|9mm|\.45|\.38/i.test(text))
        || (ammoType === '步枪' && /步枪|rifle/i.test(text))
        || (ammoType === '霰弹' && /霰弹|shotgun/i.test(text))
        || (ammoType === '9mm' && /9mm|冲锋|汤普森/i.test(text));
}

export function countBackpackAmmo(gameState, ammoType) {
    const inv = (gameState && gameState.inventory) || [];
    let total = 0;
    for (const item of inv) {
        const entry = parseAmmoEntry(item);
        if (!ammoLabelMatchesType(entry.label, ammoType)) continue;
        total += entry.count;
    }
    return total;
}

export function consumeBackpackAmmo(gameState, ammoType, amount) {
    const need = Math.max(0, Number(amount) || 0);
    if (!need || !gameState || !Array.isArray(gameState.inventory)) return 0;
    let remaining = need;
    for (let i = 0; i < gameState.inventory.length && remaining > 0; i++) {
        const raw = gameState.inventory[i];
        const entry = parseAmmoEntry(raw);
        if (!ammoLabelMatchesType(entry.label, ammoType)) continue;
        const count = entry.count;
        if (count <= 0) continue;
        if (count <= remaining) {
            remaining -= count;
            gameState.inventory.splice(i, 1);
            i--;
        } else {
            const left = count - remaining;
            remaining = 0;
            writeAmmoEntry(gameState.inventory, i, left, ammoType || entry.type, raw);
        }
    }
    return need - remaining;
}

export function computeEnvironmentEntropy(gameState) {
    const atm = gameState?.atmosphere?.level || 'calm';
    const note = String(gameState?.atmosphere?.note || '');
    const location = String(gameState?.currentLocation || '');
    const context = `${note} ${location}`.toLowerCase();
    let inc = ATMOSPHERE_ENTROPY[atm] ?? 0.1;
    if (/雾|fog|mist|暴雪|storm/i.test(context)) inc += 0.2;
    if (/夜|dark|night|午夜|midnight/i.test(context)) inc += 0.1;
    if (/神话|myth|ritual|祭|crypt|地下|tunnel|深渊/i.test(context)) inc += 0.25;
    if (/combat|战斗|恐怖|terror|critical/i.test(atm)) inc += 0.1;
    return Math.min(1, Math.round(inc * 100) / 100);
}

function syncEnvironmentEntropy(gameState) {
    const st = gameState?.kpState;
    if (!st) return 0;
    if (!st.TIME) st.TIME = { date: null, hour: null, environment: { entropy_increment: 0 } };
    if (!st.TIME.environment) st.TIME.environment = { entropy_increment: 0 };
    if (st.TIME.weather && st.TIME.weather.fog_density != null) {
        st.TIME.environment.entropy_increment = Number(st.TIME.weather.fog_density) || 0;
        delete st.TIME.weather;
    }
    st.TIME.environment.entropy_increment = computeEnvironmentEntropy(gameState);
    return st.TIME.environment.entropy_increment;
}

function buildKnowledgePool(gameState) {
    const parts = [];
    if (gameState?.inventory) parts.push(...gameState.inventory.map(inventoryLabel));
    if (gameState?.storage) parts.push(...gameState.storage.map(String));
    if (gameState?.clueBoard?.clues) {
        parts.push(...gameState.clueBoard.clues.map((c) => `${c.title || ''} ${c.content || ''}`));
    }
    if (gameState?.journalLog) {
        parts.push(...gameState.journalLog.map((j) => j.summary || j.content || ''));
    }
    if (gameState?.chatHistory) {
        parts.push(...gameState.chatHistory.slice(-40).map((m) => m.content || ''));
    }
    return parts.join(' ');
}

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Latin tokens use \\b; CJK terms match as contiguous substrings. */
function termInText(haystack, term) {
    const t = String(term || '').trim();
    if (!t) return false;
    const h = String(haystack || '');
    if (/^[\x00-\x7F]+$/.test(t)) {
        return new RegExp(`\\b${escapeRegex(t)}\\b`, 'i').test(h);
    }
    return h.includes(t);
}

const TECH_KNOWN_TERMS = [
    '智能手机', '手机', '电脑', '计算机', '笔记本', '无人机', '互联网', 'WiFi', '蓝牙', 'GPS', '3D打印', 'USB', 'U盘', '硬盘',
    'smartphone', 'internet', 'wifi', 'bluetooth', 'drone'
];

function extractFutureTechTerms(text) {
    const terms = new Set();
    const src = String(text || '');
    for (const pat of FUTURE_TECH_PATTERNS) {
        const m = src.match(pat);
        if (m && m[0] && termInText(src, m[0])) terms.add(m[0]);
    }
    for (const snippet of TECH_KNOWN_TERMS) {
        if (termInText(src, snippet)) terms.add(snippet);
    }
    return [...terms];
}

function textContainsFutureTech(text) {
    return extractFutureTechTerms(text).length > 0;
}

function hasInGameKnowledgeForTech(text, gameState) {
    const pool = buildKnowledgePool(gameState);
    const terms = extractFutureTechTerms(text);
    if (!terms.length) return false;
    return terms.some((t) => termInText(pool, t));
}

function checkEraRestriction(text, context = {}) {
    const rules = context.rules || KP_PROTOCOL;
    const core = rules.CORE_RULES || {};
    if (!core.ERA_RESTRICTION || !core.ERA_RESTRICTION.forbid_future_technology) {
        return { ok: true };
    }
    if (!textContainsFutureTech(text)) return { ok: true };
    const gs = context.gameState;
    const knowledgeGated = core.ERA_RESTRICTION.knowledge_gated !== false;
    if (knowledgeGated && gs && hasInGameKnowledgeForTech(text, gs)) {
        return { ok: true };
    }
    if (knowledgeGated) {
        return {
            ok: false,
            reason: '信息不足：调查员尚无依据拥有或使用该事物',
            code: 'KNOWLEDGE_VIOLATION'
        };
    }
    return { ok: false, reason: '时代限制：该行动超出当前战役认知范围', code: 'ERA_VIOLATION' };
}

function defaultScenePaths() {
    return {
        currentSceneId: '',
        paths: [],
        truePathCount: 0,
        falsePathCount: 0
    };
}

/**
 * Coerce legacy or malformed scenePaths (e.g. array of {from,to,label}) into canonical object shape.
 * @param {*} raw
 * @returns {{ currentSceneId: string, paths: object[], truePathCount: number, falsePathCount: number }}
 */
export function normalizeScenePaths(raw) {
    const def = defaultScenePaths();
    if (raw == null) return { ...def };
    if (Array.isArray(raw)) {
        const paths = raw.map((item, idx) => {
            if (!item || typeof item !== 'object') return null;
            return {
                id: `path_migrated_${idx}`,
                type: 'environment',
                clueId: null,
                verified: true,
                from: item.from,
                to: item.to,
                label: item.label
            };
        }).filter(Boolean);
        return {
            currentSceneId: '',
            paths,
            truePathCount: paths.length,
            falsePathCount: 0
        };
    }
    if (typeof raw !== 'object') return { ...def };
    const paths = Array.isArray(raw.paths) ? raw.paths.filter((p) => p && typeof p === 'object') : [];
    const truePathCount = Number.isFinite(Number(raw.truePathCount))
        ? Math.max(0, Number(raw.truePathCount))
        : paths.filter((p) => p.verified !== false && p.type !== 'false').length;
    const falsePathCount = Number.isFinite(Number(raw.falsePathCount))
        ? Math.max(0, Number(raw.falsePathCount))
        : paths.filter((p) => p.type === 'false' || p.verified === false).length;
    return {
        currentSceneId: String(raw.currentSceneId ?? ''),
        paths,
        truePathCount,
        falsePathCount
    };
}

function _kpDefaultEnabled() {
    // Cannot ESM-import kp_config.mjs here (kp_config → this module). Window shim is intentional.
    const cfg = typeof window !== 'undefined' && window.CoCKpConfig;
    return (cfg && cfg.KP_ENGINE_DEFAULT_ENABLED !== undefined) ? cfg.KP_ENGINE_DEFAULT_ENABLED : true;
}

function defaultKpEngine() {
    return {
        enabled: _kpDefaultEnabled(),
        systemName: 'KP_PROTOCOL',
        global: {
            attention: 0,
            playerPower: 0,
            phase: 'CALM',
            doomClock: 0,
            alertLevel: 0,
            knowledgeLevel: 0
        },
        rules: null,
        sessionStartedAt: null,
        lastEventInjectionAt: null,
        combatStrategyLog: [],
        scenePaths: defaultScenePaths()
    };
}

function syncEngineOntoState(st, kpEngine) {
    if (!st || !kpEngine || !kpEngine.global) return;
    const g = kpEngine.global;
    st.ATTENTION_LEVEL = g.attention;
    st.PLAYER_POWER = g.playerPower;
    st.PHASE = g.phase;
    st.DOOM_CLOCK = g.doomClock;
    if (st.antagonist) {
        st.antagonist.ALERT_LEVEL = g.alertLevel;
        st.antagonist.KNOWLEDGE_LEVEL = g.knowledgeLevel;
    }
}

function syncStateOntoEngine(kpEngine, st) {
    if (!kpEngine || !st) return;
    if (!kpEngine.global) kpEngine.global = {};
    const g = kpEngine.global;
    g.attention = st.ATTENTION_LEVEL ?? g.attention ?? 0;
    g.playerPower = st.PLAYER_POWER ?? g.playerPower ?? 0;
    g.phase = st.PHASE ?? g.phase ?? 'CALM';
    g.doomClock = st.DOOM_CLOCK ?? g.doomClock ?? 0;
    g.alertLevel = (st.antagonist && st.antagonist.ALERT_LEVEL) ?? g.alertLevel ?? 0;
    g.knowledgeLevel = (st.antagonist && st.antagonist.KNOWLEDGE_LEVEL) ?? g.knowledgeLevel ?? 0;
}

/**
 * Ensure kpEngine + kpState exist and stay mirrored.
 * @param {object} gameState
 */
export function ensureKpEngine(gameState) {
    if (!gameState) return null;
    if (!gameState.kpEngine || typeof gameState.kpEngine !== 'object') {
        gameState.kpEngine = defaultKpEngine();
    }
    const kp = gameState.kpEngine;
    if (!kp.global) kp.global = defaultKpEngine().global;
    kp.scenePaths = normalizeScenePaths(kp.scenePaths);
    if (!gameState.kpState && gameState.londonKpState) {
        gameState.kpState = gameState.londonKpState;
    }
    if (gameState.londonKpState) delete gameState.londonKpState;
    if (!gameState.kpState) {
        gameState.kpState = {
            ...DEFAULT_KP,
            TIME: defaultKpTime(),
            antagonist: { ...DEFAULT_ANT },
            hunt: { active: false, encounters: 0 },
            reality: { active: false }
        };
    }
    syncEnvironmentEntropy(gameState);
    if (!gameState.kpState.antagonist) {
        gameState.kpState.antagonist = { ...DEFAULT_ANT };
    }
    syncStateOntoEngine(kp, gameState.kpState);
    syncEngineOntoState(gameState.kpState, kp);
    return kp;
}

export function loadKpRulesPreset(gameState) {
    const kp = ensureKpEngine(gameState);
    kp.rules = KP_PROTOCOL;
    kp.systemName = KP_PROTOCOL.SYSTEM_NAME;
    return kp;
}

export function setKpEngineEnabled(gameState, enabled) {
    const kp = ensureKpEngine(gameState);
    kp.enabled = !!enabled;
    if (kp.enabled && !kp.rules) loadKpRulesPreset(gameState);
    if (kp.enabled && !kp.sessionStartedAt) kp.sessionStartedAt = Date.now();
    return kp.enabled;
}

export const KpExecutionEngine = {
    isEnabled(gameState) {
        return !!(gameState && gameState.kpEngine && gameState.kpEngine.enabled);
    },

    /** @deprecated use isEnabled */
    isActive(gameState) {
        if (!KpExecutionEngine._deprecatedIsActiveWarned) {
            KpExecutionEngine._deprecatedIsActiveWarned = true;
            console.warn('[CoC DEPRECATED] KpExecutionEngine.isActive() — use isEnabled() instead.');
        }
        return this.isEnabled(gameState);
    },
    _deprecatedIsActiveWarned: false,

    ensureKpEngine,
    loadKpRulesPreset,
    setKpEngineEnabled,

    getGlobalState(gameState) {
        ensureKpEngine(gameState);
        return gameState.kpState;
    },

    getRules(gameState) {
        const kp = ensureKpEngine(gameState);
        return kp.rules || KP_PROTOCOL;
    },

    validatePlayerAction(action, context = {}) {
        const text = String(action || '').trim();
        if (!text) return { ok: false, reason: '空行动' };
        const rules = context.rules || KP_PROTOCOL;
        const core = rules.CORE_RULES || {};
        if (core.LOGIC_ENFORCEMENT && core.LOGIC_ENFORCEMENT.reject_unreasonable_actions) {
            for (const pat of SKIP_PROCESS_PATTERNS) {
                if (pat.test(text)) {
                    return { ok: false, reason: '行动试图跳过判定流程', code: 'SKIP_PROCESS' };
                }
            }
        }
        const eraCheck = checkEraRestriction(text, context);
        if (!eraCheck.ok) return eraCheck;
        return { ok: true };
    },

    validateNarrativeLanguage(text, opts = {}) {
        return runLanguageCorrection(text, opts);
    },

    /** Soft era gate for AI narrative — flags or strips future-tech without player knowledge (KP on or off). */
    validateNarrativeEra(text, context = {}) {
        const check = checkEraRestriction(text, context);
        if (check.ok) return { ok: true, text };
        return { ...check, text: this.stripNarrativeEra(text, context) };
    },

    /** True when era strip left too many ellipsis placeholders for readable narrative. */
    isEraStripDegraded(text) {
        const t = String(text || '');
        const ellipsisCount = (t.match(/……/g) || []).length;
        if (ellipsisCount >= 3) return true;
        return t.length > 0 && (ellipsisCount * 2) / t.length > 0.15;
    },

    stripNarrativeEra(text, context = {}) {
        let out = String(text || '');
        const terms = extractFutureTechTerms(out);
        for (const term of terms) {
            const re = /^[\x00-\x7F]+$/.test(term)
                ? new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi')
                : new RegExp(escapeRegex(term), 'g');
            out = out.replace(re, '……');
        }
        return out.replace(/\s{2,}/g, ' ').trim() || '（叙事含时代违禁科技，已替换。）';
    },

    validateFirearmAmmo(gameState, weaponStr) {
        const ammoType = ammoTypeForResolvedWeapon(weaponStr);
        if (!ammoType) return { ok: true, count: 0, ammoType: null };
        const count = countBackpackAmmo(gameState, ammoType);
        if (count <= 0) {
            return {
                ok: false,
                count: 0,
                ammoType,
                reason: `背包中无匹配「${ammoType}」弹药`
            };
        }
        return { ok: true, count, ammoType };
    },

    inferAmmoType,
    inventoryLabel,
    countBackpackAmmo,
    consumeBackpackAmmo,
    computeEnvironmentEntropy,
    syncEnvironmentEntropy,

    validateItemAcquisition(item, source) {
        const name = typeof item === 'string' ? item : (item && (item.name || item.id)) || '';
        if (!String(name).trim()) return { ok: false, reason: '无效物品' };
        const src = source || (typeof item === 'object' && item.source) || null;
        if (!src || String(src).trim() === '') {
            return { ok: false, reason: '物品须有获取来源记录', code: 'NO_SOURCE' };
        }
        return { ok: true, item: name, source: src };
    },

    checkMythosItem(item) {
        const name = typeof item === 'string' ? item : (item && item.name) || '';
        const isMythos = MYTHOS_ITEM_PATTERNS.some((p) => p.test(name));
        if (!isMythos) return { isMythos: false };
        return {
            isMythos: true,
            requiresSanCheck: true,
            sanLoss: '1/1D6',
            cause: `接触神话物品：${name}`
        };
    },

    tickDoomClock(gameState, reason, delta = 1) {
        if (!this.isEnabled(gameState)) return 0;
        const st = this.getGlobalState(gameState);
        const kp = ensureKpEngine(gameState);
        const d = Math.max(0, Number(delta) || 0);
        if (d <= 0) return st.DOOM_CLOCK || 0;
        st.DOOM_CLOCK = clamp((st.DOOM_CLOCK || 0) + d, 0, 24);
        kp.global.doomClock = st.DOOM_CLOCK;
        return st.DOOM_CLOCK;
    },

    advanceGameTime(gameState) {
        if (!this.isEnabled(gameState)) return null;
        return syncKpTimeFromWorldClock(gameState);
    },

    updateAttention(gameState, delta, reason, opts = {}) {
        if (!this.isEnabled(gameState)) return 0;
        const st = this.getGlobalState(gameState);
        const kp = ensureKpEngine(gameState);
        syncEnvironmentEntropy(gameState);
        const envInc = st.TIME?.environment?.entropy_increment || 0;
        const d = Number(delta) || 0;
        const adjusted = d > 0 ? d + envInc : d;
        st.ATTENTION_LEVEL = clamp((st.ATTENTION_LEVEL || 0) + adjusted, 0, 10);
        kp.global.attention = st.ATTENTION_LEVEL;
        if (adjusted > 0 && !opts.skipDoomTick) {
            this.tickDoomClock(gameState, reason || 'attention', 1);
        }
        if (st.ATTENTION_LEVEL >= 7) st.hunt.active = true;
        if (st.ATTENTION_LEVEL >= 9) st.reality.active = true;
        this._syncPhase(st, kp);
        if (reason && gameState.chatHistory) {
            gameState.chatHistory.push({
                role: 'system',
                isLocalOnly: true,
                content: `📡 [KP引擎] 注意力 ${adjusted >= 0 ? '+' : ''}${adjusted}${envInc > 0 && d > 0 ? `（含环境熵+${envInc}）` : ''} → ${st.ATTENTION_LEVEL}${reason ? '（' + reason + '）' : ''}`
            });
        }
        return st.ATTENTION_LEVEL;
    },

    collectCombatPowerStats(gameState) {
        const track = gameState?.combat?._powerTrack;
        if (!track) {
            return { avgDamage: 0, rounds: 1, resourceUse: 'low', hpLoss: 'none' };
        }
        const rounds = Math.max(1, (gameState.combat.round || 1) - (track.startRound || 1) + 1);
        const hits = Math.max(1, track.hitCount || 1);
        const avgDamage = (track.damageDealt || 0) / hits;
        const active = (gameState.roster || []).filter((c) => c && c.isActive);
        const startMap = {};
        (track.startHp || []).forEach((v, i) => {
            if (v && typeof v === 'object' && v.name) startMap[v.name] = v.hp;
            else if (active[i]) startMap[active[i].name] = v;
        });
        const hpLoss = active.some((c) => {
            const start = startMap[c.name];
            if (start == null) return false;
            const hp = (c.derived && typeof c.derived.hp === 'number') ? c.derived.hp : c.hp;
            return hp < start;
        }) ? 'some' : 'none';
        return {
            avgDamage,
            rounds,
            resourceUse: (track.ammoSpent || 0) > 2 ? 'high' : 'low',
            hpLoss
        };
    },

    evaluatePlayerPower(gameState, stats) {
        if (!this.isEnabled(gameState)) return 0;
        const st = this.getGlobalState(gameState);
        const kp = ensureKpEngine(gameState);
        const s = stats || {};
        let gain = 0;
        const threshold = 4;
        if (Number(s.avgDamage) > threshold) gain += 2;
        if (Number(s.rounds) > 0 && Number(s.rounds) <= 2) gain += 2;
        if (s.resourceUse === 'low') gain += 1;
        if (s.hpLoss === 'none' || s.hpLoss === 0) gain += 1;
        st.PLAYER_POWER = clamp((st.PLAYER_POWER || 0) + gain, 0, 10);
        kp.global.playerPower = st.PLAYER_POWER;
        return st.PLAYER_POWER;
    },

    finalizeCombatPower(gameState, reason) {
        if (!this.isEnabled(gameState)) return 0;
        if (gameState.combat?._powerFinalized) {
            return (this.getGlobalState(gameState).PLAYER_POWER) || 0;
        }
        const stats = this.collectCombatPowerStats(gameState);
        const pp = this.evaluatePlayerPower(gameState, stats);
        if (gameState.combat) {
            delete gameState.combat._powerTrack;
            gameState.combat._powerFinalized = true;
        }
        if (reason === 'victory') {
            this.runAntagonistTick(gameState, { type: 'combat_win' });
        }
        return pp;
    },

    scaleEnemyStats(baseEnemy, opts = {}) {
        const enemy = baseEnemy ? { ...baseEnemy } : null;
        if (!enemy) return enemy;
        const pp = Number(opts.playerPower) || 0;
        const att = Number(opts.attention) || 0;
        const baseHp = Number(enemy.maxHp || enemy.hp || 10);
        let mult = 1;
        if (pp >= 7) mult = 3;
        else if (pp >= 5) mult = 2;
        else if (pp >= 3) mult = 1.5;
        enemy.maxHp = Math.ceil(baseHp * mult);
        enemy.hp = enemy.maxHp;
        if (typeof CoCEngine.mirrorCurrentHp === 'function') CoCEngine.mirrorCurrentHp(enemy, enemy.hp, enemy.maxHp);
        let armorBonus = 0;
        if (pp >= 5) armorBonus += 2;
        if (pp >= 7) armorBonus += 2;
        enemy.armor = (Number(enemy.armor) || 0) + armorBonus;
        if (att >= 4) enemy.evasion = true;
        if (att >= 6) enemy.regeneration = true;
        if (att >= 8) enemy.phase_shift = true;
        if (att >= 9) enemy.reality_anchor = true;
        if (pp >= 7) enemy.damage_resistance = true;
        return enemy;
    },

    scaleEnemy(gameState, enemy) {
        if (!this.isEnabled(gameState) || !enemy) return enemy;
        if (enemy._kpScaled) return enemy;
        const st = this.getGlobalState(gameState);
        const scaled = this.scaleEnemyStats(enemy, {
            playerPower: st.PLAYER_POWER || 0,
            attention: st.ATTENTION_LEVEL || 0
        });
        if (scaled) scaled._kpScaled = true;
        return scaled;
    },

    checkAntiOneShot(gameState, enemy) {
        if (!this.isEnabled(gameState) || !enemy) return enemy;
        const st = this.getGlobalState(gameState);
        if (enemy.hp > 0) return enemy;
        if (enemy.reality_anchor) {
            const revived = Math.max(1, Math.ceil((enemy.maxHp || 10) * 0.3));
            if (typeof CoCEngine.mirrorCurrentHp === 'function') CoCEngine.mirrorCurrentHp(enemy, revived);
            else enemy.hp = revived;
            enemy._deathCancelled = true;
            return enemy;
        }
        if ((st.ATTENTION_LEVEL || 0) >= 6) {
            const revived = Math.max(1, Math.ceil((enemy.maxHp || 10) * 0.5));
            if (typeof CoCEngine.mirrorCurrentHp === 'function') CoCEngine.mirrorCurrentHp(enemy, revived);
            else enemy.hp = revived;
            enemy._mutated = true;
            enemy.name = (enemy.name || '敌人') + '（异变）';
        }
        return enemy;
    },

    validateCombatStrategy(actions) {
        const list = Array.isArray(actions) ? actions : [actions].filter(Boolean);
        const tacticalTags = getTacticalCombatTags();
        const fightBackTags = getFightBackTags().map((t) => t.toLowerCase());
        const pureDamageTags = getPureDamageCombatTags();
        const legacyDamageRe = /damage|attack|shoot|fire|hit|射击|攻击|伤害|开火/;
        const isPureDamageAction = (a) => {
            const s = String(a || '').toLowerCase();
            if (s.includes('tactical')) return false;
            const matchesDamage = pureDamageTags.some((t) => s.includes(t)) || legacyDamageRe.test(s);
            const hasTactical = tacticalTags.some((t) => s.includes(t))
                || fightBackTags.some((t) => s.includes(t));
            return matchesDamage && !hasTactical;
        };
        const damageOnly = list.length > 0 && list.every(isPureDamageAction);
        return {
            valid: !damageOnly,
            damageOnly,
            enemyImmunity: damageOnly
        };
    },

    recordCombatAction(gameState, actionLabel) {
        if (!this.isEnabled(gameState)) return null;
        const kp = ensureKpEngine(gameState);
        if (!kp.combatStrategyLog) kp.combatStrategyLog = [];
        kp.combatStrategyLog.push(String(actionLabel || ''));
        if (kp.combatStrategyLog.length > 20) kp.combatStrategyLog.shift();
        const check = this.validateCombatStrategy(kp.combatStrategyLog.slice(-5));
        if (check.enemyImmunity && gameState.combat && gameState.combat.enemies) {
            gameState.combat.enemies.forEach((e) => {
                if (!e.isDefeated && !e._npcFled && !e._npcStoodDown) e._kpImmunity = true;
            });
        }
        return check;
    },

    shouldApplyRealityDistortion(gameState) {
        if (!this.isEnabled(gameState)) return false;
        const st = this.getGlobalState(gameState);
        return (st.ATTENTION_LEVEL || 0) >= 9;
    },

    rollBulletFail() {
        return rollD100() <= 40;
    },

    /**
     * Engine-enforced firearm failure when ATTENTION >= 9.
     * bullet_fail: 40% hard block; spatial_error: 15% on shots that pass bullet_fail.
     */
    handleFirearmAttempt(context = {}) {
        const gameState = context.gameState;
        if (!this.shouldApplyRealityDistortion(gameState)) {
            return { blocked: false };
        }
        const st = this.getGlobalState(gameState);
        st.reality.active = true;
        const bulletRoll = rollD100();
        if (bulletRoll <= 40) {
            return {
                blocked: true,
                reason: 'bullet_fail',
                narrativeHint: '枪口焰正常，但弹道在空气中消散，仿佛从未射出。',
                noDamage: true,
                _realityDistortion: true
            };
        }
        // Optional spatial_error (~15%) on otherwise valid shots at ATTENTION >= 9
        const spatialRoll = rollD100();
        if (spatialRoll <= 15) {
            return {
                blocked: true,
                reason: 'spatial_error',
                narrativeHint: '子弹偏离了本应命中的轨迹，击中了旁边的虚空。',
                noDamage: true,
                _realityDistortion: true
            };
        }
        return { blocked: false };
    },

    applyRealityDistortion(gameState) {
        if (!this.shouldApplyRealityDistortion(gameState)) return null;
        const st = this.getGlobalState(gameState);
        st.reality.active = true;
        return {
            bullet_fail: 0.4,
            spatial_error: 0.15,
            false_death: true,
            rollBulletFail: () => this.rollBulletFail()
        };
    },

    initScenePaths(gameState, sceneId) {
        if (!this.isEnabled(gameState)) return null;
        const kp = ensureKpEngine(gameState);
        const sid = String(sceneId || gameState.currentLocation || 'unknown');
        kp.scenePaths = normalizeScenePaths(kp.scenePaths);
        if (kp.scenePaths.currentSceneId === sid) return kp.scenePaths;
        kp.scenePaths = defaultScenePaths();
        kp.scenePaths.currentSceneId = sid;
        return kp.scenePaths;
    },

    _inferPathType(clue) {
        if (!clue) return 'skill';
        if (clue.path_type && (TRUE_PATH_TYPES.includes(clue.path_type) || clue.path_type === 'false')) {
            return clue.path_type;
        }
        const type = String(clue.type || '').toLowerCase();
        if (type === 'misleading' || clue._kpCorrupted) return 'false';
        if (type === 'testimony' || type === 'person') return 'npc';
        if (type === 'physical' || type === 'document') return 'item';
        if (type === 'location' || type === 'event' || type === 'supernatural') return 'environment';
        return 'skill';
    },

    getScenePathSummary(gameState) {
        const kp = ensureKpEngine(gameState);
        const sp = kp.scenePaths || defaultScenePaths();
        return {
            true: sp.truePathCount || 0,
            false: sp.falsePathCount || 0,
            sceneId: sp.currentSceneId || ''
        };
    },

    canAddClue(clue, context = {}) {
        const gameState = context.gameState;
        if (!this.isEnabled(gameState)) return { allowed: true };
        this.initScenePaths(gameState, gameState.currentLocation);
        const pathType = this._inferPathType(clue);
        const isFalse = pathType === 'false';
        if (isFalse) return { allowed: true, pathType: 'false', isFalse: true };

        const kp = ensureKpEngine(gameState);
        const paths = kp.scenePaths.paths || [];
        const truePaths = paths.filter((p) => p.type !== 'false');
        if (truePaths.some((p) => p.type === pathType)) {
            const label = PATH_TYPE_LABELS[pathType] || pathType;
            return {
                allowed: false,
                reason: `调查路径类型「${label}」已存在，须从不同角度调查（技能/NPC/物品/环境）`,
                pathType,
                isFalse: false
            };
        }
        if (truePaths.length >= 3) {
            return {
                allowed: false,
                reason: '本场景真线索路径已达上限（3条），请先切换地点或推进叙事',
                pathType,
                isFalse: false
            };
        }
        return { allowed: true, pathType, isFalse: false };
    },

    registerPath(gameState, pathType, clueId, isFalse) {
        if (!this.isEnabled(gameState)) return null;
        const kp = ensureKpEngine(gameState);
        kp.scenePaths = normalizeScenePaths(kp.scenePaths);
        if (!kp.scenePaths.currentSceneId) this.initScenePaths(gameState);
        const falsePath = isFalse || pathType === 'false';
        const resolvedType = falsePath ? 'false' : pathType;
        if (!falsePath && !TRUE_PATH_TYPES.includes(resolvedType)) return null;
        const entry = {
            id: `path_${clueId || Date.now()}_${kp.scenePaths.paths.length}`,
            type: resolvedType,
            clueId: clueId || null,
            verified: !falsePath
        };
        kp.scenePaths.paths.push(entry);
        if (falsePath) kp.scenePaths.falsePathCount = (kp.scenePaths.falsePathCount || 0) + 1;
        else kp.scenePaths.truePathCount = (kp.scenePaths.truePathCount || 0) + 1;
        return entry;
    },

    canTriggerKeyClue(gameState) {
        return this.evaluateKeyClueRequest(gameState).allowed;
    },

    /**
     * Key-clue gate with graceful degradation after repeated blocked attempts.
     * @returns {{ allowed: boolean, mode?: string, reason?: string, warning?: string, hint?: string, attemptsLeft?: number, truePathCount?: number }}
     */
    evaluateKeyClueRequest(gameState) {
        if (!this.isEnabled(gameState)) return { allowed: true, mode: 'normal' };
        const kp = ensureKpEngine(gameState);
        const truePathCount = kp.scenePaths?.truePathCount || 0;
        const minRequired = 3;
        if (truePathCount >= minRequired) {
            kp.keyClueBlockedAttempts = 0;
            return { allowed: true, mode: 'normal', truePathCount };
        }
        const maxBlocked = 3;
        const blocked = kp.keyClueBlockedAttempts || 0;
        if (blocked >= maxBlocked) {
            return {
                allowed: true,
                mode: 'degraded',
                truePathCount,
                warning: `真线索路径仅 ${truePathCount}/${minRequired}，已连续 ${blocked} 次受阻后降级放行`,
                hint: '守秘人应通过 add_clue 从不同调查角度补充路径，避免玩家卡关。'
            };
        }
        return {
            allowed: false,
            mode: 'blocked',
            truePathCount,
            reason: `关键线索需要至少 ${minRequired} 条不同调查路径（当前真 ${truePathCount}/${minRequired}）`,
            hint: '建议调用 add_clue 补充技能/NPC/物品/环境等分支线索。',
            attemptsLeft: maxBlocked - blocked
        };
    },

    recordKeyClueBlockedAttempt(gameState) {
        if (!this.isEnabled(gameState)) return 0;
        const kp = ensureKpEngine(gameState);
        kp.keyClueBlockedAttempts = (kp.keyClueBlockedAttempts || 0) + 1;
        return kp.keyClueBlockedAttempts;
    },

    validateSceneTemplate(sceneState) {
        const gs = sceneState && sceneState.kpEngine ? sceneState : null;
        const sp = gs ? gs.kpEngine.scenePaths : sceneState;
        const truePathCount = sp?.truePathCount || 0;
        const minRequired = 3;
        return {
            ok: truePathCount >= minRequired,
            truePathCount,
            minRequired
        };
    },

    applySocialInfiltration(gameState, npcEvent = {}) {
        if (!this.isEnabled(gameState)) return null;
        const strat = this.adaptStrategy(gameState);
        const w = strat?.weights?.socialInfiltration || 0;
        if (w < 0.6) return null;
        const registry = gameState.npcRegistry || [];
        const friendly = registry.filter((n) => canSocialInfiltrate(n));
        if (!friendly.length) return null;
        const chance = 0.25 + w * 0.35;
        if (rollUnit() >= chance) return null;
        const pick = friendly[rollIndex(friendly.length)];
        pick._kpCompromised = true;
        if (gameState.chatHistory) {
            gameState.chatHistory.push({
                role: 'system',
                isLocalOnly: true,
                isHidden: true,
                content: `🕵️ [KP引擎] 社交渗透（${npcEvent.type || 'npc'}）——${pick.name} 已被标记 _kpCompromised。`
            });
        }
        applyNpcBehavior(gameState);
        return { compromised: pick.name, npc: pick, weight: w };
    },

    runAntagonistTick(gameState, event) {
        if (!this.isEnabled(gameState)) return null;
        const st = this.getGlobalState(gameState);
        const kp = ensureKpEngine(gameState);
        const ant = st.antagonist;
        const ev = event || {};
        const strat = this.adaptStrategy(gameState);
        const weights = strat?.weights || {};
        const result = {
            antagonist: { ...ant },
            strategy: strat,
            misinformation: false,
            corruptedClue: null,
            falseEvidence: null,
            ambush: false
        };

        if (ev.type === 'clue') {
            ant.ALERT_LEVEL = clamp(ant.ALERT_LEVEL + 1, 0, 10);
            const baseChance = ant.ALERT_LEVEL >= 5 ? 0.7 : 0.4;
            const corruptChance = Math.min(0.95, baseChance + (weights.misinformation || 0) * 0.15);
            if (rollUnit() < corruptChance) {
                ev.misinformation = true;
                result.misinformation = true;
                result.corruptedClue = {
                    id: 'false_' + Date.now(),
                    title: '可疑线索（可能被篡改）',
                    content: '情报来源不明，细节与先前证词矛盾。',
                    type: 'misleading',
                    _kpCorrupted: true
                };
            }
        }
        if (ev.type === 'investigate') ant.ALERT_LEVEL = clamp(ant.ALERT_LEVEL + 1, 0, 10);
        if (ev.type === 'danger') ant.ALERT_LEVEL = clamp(ant.ALERT_LEVEL + 2, 0, 10);
        if (ev.type === 'observe') ant.KNOWLEDGE_LEVEL = clamp(ant.KNOWLEDGE_LEVEL + 1, 0, 10);
        if (ev.type === 'intel') ant.KNOWLEDGE_LEVEL = clamp(ant.KNOWLEDGE_LEVEL + 2, 0, 10);
        if (ev.type === 'combat_win') {
            const alertBoost = (weights.combatCounter || 0) >= 0.6 ? 1 : 0;
            ant.ALERT_LEVEL = clamp(ant.ALERT_LEVEL + 1 + alertBoost, 0, 10);
            // skipDoomTick: combat_victory driver applies doom once (avoids attention_positive double-tick)
            this.updateAttention(gameState, 1, '战斗胜利', { skipDoomTick: true });
            this.tickDoomClock(gameState, 'combat_victory');
        }
        if (ev.type === 'mythos') {
            this.updateAttention(gameState, 2, '神话接触', { skipDoomTick: true });
            this.tickDoomClock(gameState, 'mythos_contact', 2);
        }

        let ambushChance = 0;
        if (ant.ALERT_LEVEL >= 7 && (ev.type === 'investigate' || ev.type === 'danger')) {
            ambushChance = 0.35 + (weights.ambush || 0) * 0.2;
            if ((weights.combatCounter || 0) >= 0.6) ambushChance += 0.15;
        }
        if (ambushChance > 0) {
            result.ambush = rollUnit() < Math.min(0.85, ambushChance);
            if (result.ambush) this.tickDoomClock(gameState, 'antagonist_ambush');
        }
        if (ant.ALERT_LEVEL >= 5 && ev.misinformation) {
            result.falseEvidence = { type: 'forged_document', note: '敌对组织植入伪造证据' };
        }

        kp.global.alertLevel = ant.ALERT_LEVEL;
        kp.global.knowledgeLevel = ant.KNOWLEDGE_LEVEL;
        this._syncPhase(st, kp);

        if (result.corruptedClue && gameState.clueBoard && gameState.clueBoard.clues) {
            gameState.clueBoard.clues.push(result.corruptedClue);
            this.registerPath(gameState, 'false', result.corruptedClue.id, true);
        }
        if (result.ambush && gameState.chatHistory) {
            gameState.chatHistory.push({
                role: 'system',
                isLocalOnly: true,
                isAlert: true,
                content: '⚠️ [KP引擎] 敌对组织警觉过高——调查可能触发伏击！'
            });
        }

        return result;
    },

    adaptStrategy(gameState) {
        if (!this.isEnabled(gameState)) return null;
        const st = this.getGlobalState(gameState);
        const ant = st.antagonist || {};
        const kp = ensureKpEngine(gameState);
        const log = kp.combatStrategyLog || [];
        const tacticalRe = /attack|fire|shoot|攻击|射击|grapple|擒抱|disarm|缴械|shove|推|skill|技能|social|威吓|spell|法术|environment|环境|survive|生存|escape|逃脱|protect|保护|fight_back|反击/;
        const combatFocus = log.filter((a) => tacticalRe.test(a)).length;
        return {
            alertLevel: ant.ALERT_LEVEL || 0,
            knowledgeLevel: ant.KNOWLEDGE_LEVEL || 0,
            weights: {
                misinformation: (ant.ALERT_LEVEL || 0) >= 4 ? 0.6 : 0.3,
                ambush: (ant.ALERT_LEVEL || 0) >= 7 ? 0.5 : 0.1,
                socialInfiltration: (ant.KNOWLEDGE_LEVEL || 0) >= 6 ? 0.7 : 0.2,
                combatCounter: combatFocus >= 3 ? 0.8 : 0.3
            }
        };
    },

    onCombatStart(gameState, enemies) {
        if (!this.isEnabled(gameState) || !Array.isArray(enemies)) return enemies;
        return enemies.map((e) => this.scaleEnemy(gameState, e));
    },

    onPlayerAction(gameState, actionText) {
        if (!this.isEnabled(gameState)) return { validated: true };
        const validation = this.validatePlayerAction(actionText, {
            era: gameState.roster && gameState.roster[0] && gameState.roster[0].era,
            gameState
        });
        if (!validation.ok) return { validated: false, ...validation };
        const tick = this.runAntagonistTick(gameState, { type: 'observe' });
        return { validated: true, antagonist: tick };
    },

    _syncPhase(st, kp) {
        const att = st.ATTENTION_LEVEL || 0;
        if (att >= 9) st.PHASE = 'REALITY_DISTORT';
        else if (att >= 7) st.PHASE = 'ACTIVE_HUNT';
        else if (att >= 4) st.PHASE = 'ENEMY_ADAPT';
        else st.PHASE = 'CALM';
        if (kp && kp.global) kp.global.phase = st.PHASE;
    }
};

if (typeof window !== 'undefined') {
    window.KpExecutionEngine = KpExecutionEngine;
}
