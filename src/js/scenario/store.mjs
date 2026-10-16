/**
 * Scenario Store — catalog, local library, IndexedDB download persistence.
 * Built-in scenarios ship in js/data/scenarios/*.js; downloadable packs in packages/*.json.
 */
const IDB_NAME = 'coc_engine';
const IDB_STORE = 'scenarios';
const LS_KEY = 'coc_scenarios_downloaded';
const PUBLIC_CATALOG_BASE_KEY = 'coc_public_catalog_base';
const PKG_REL_PATH = 'js/data/scenarios/packages/';
const LS_FALLBACK_MAX_BYTES = 4_000_000;

const BUILTIN_IDS = [
    'tutorial', 'deep_one_shadow', 'abandoned_asylum', 'midnight_museum',
    'coastal_festival', 'university_occult', 'lighthouse_signal', 'missing_child',
    'train_to_nowhere', 'carnival_of_masks'
];

import { BUILTIN_BY_ID } from '../data/scenarios/builtins.mjs';
import { CoCScenarioCatalog, scenarioLengthTier } from '../data/scenarios/catalog.mjs';
import { CoCScenarioRemoteCatalog } from '../data/scenarios/remote_catalog.mjs';
import { CoCScenarioPdfImport } from './pdf_import.mjs';
import { fetchWithTimeout } from '../ai/network.mjs';

const BUILTIN_GETTERS = Object.fromEntries(
    Object.keys(BUILTIN_BY_ID).map((id) => [id, () => BUILTIN_BY_ID[id]])
);

let _downloaded = {};
let _downloadMeta = {};
let _useLocalStorage = false;
let _initPromise = null;
/** In-flight download promises keyed by scenario id (dedupe concurrent clicks). */
const _inflightDownloads = new Map();
const PACKAGE_FETCH_TIMEOUT_MS = 60000;

/** True when url points at bundled packages/*.json (same-origin, offline-capable). */
function isBundledPackageUrl(url) {
    return typeof url === 'string' && url.includes('/scenarios/packages/');
}

/** User-configured public static site base (empty = same-origin only). */
function getPublicCatalogBase() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return '';
    return (localStorage.getItem(PUBLIC_CATALOG_BASE_KEY) || '').trim();
}

/**
 * Validate and persist public catalog base.
 * @returns {{ ok: boolean, value: string, error?: string }}
 */
function setPublicCatalogBase(base) {
    if (typeof localStorage === 'undefined') {
        return { ok: false, value: '', error: 'localStorage 不可用' };
    }
    const trimmed = (base || '').trim();
    if (!trimmed) {
        localStorage.removeItem(PUBLIC_CATALOG_BASE_KEY);
        return { ok: true, value: '' };
    }
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch (_e) {
        return { ok: false, value: getPublicCatalogBase(), error: '基址须为合法 URL（如 https://example.com/）' };
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { ok: false, value: getPublicCatalogBase(), error: '仅允许 http(s) 基址' };
    }
    const host = String(parsed.hostname || '').toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (parsed.protocol === 'http:' && !isLocal) {
        return { ok: false, value: getPublicCatalogBase(), error: '非本机地址须使用 https://' };
    }
    const normalized = trimmed.replace(/\/?$/, '/');
    localStorage.setItem(PUBLIC_CATALOG_BASE_KEY, normalized);
    return { ok: true, value: normalized };
}

/** Build absolute package URL from public catalog base + scenario id. */
function publicPackageUrl(id) {
    const base = getPublicCatalogBase();
    if (!base || !id) return null;
    return base.replace(/\/?$/, '/') + PKG_REL_PATH + id + '.json';
}

/**
 * Download chain: user public base (if set) → catalog mirrorUrls → same-origin bundled fallback.
 * No GitHub or jsDelivr gh mirrors.
 */
function resolveDownloadChain(entry) {
    const fallback = entry.fallbackUrl || entry.packageUrl;
    const mirrors = Array.isArray(entry.mirrorUrls) ? entry.mirrorUrls : [];
    const chain = [];
    const seen = new Set();
    const push = (url, source) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        chain.push({ url, source });
    };
    const pubUrl = publicPackageUrl(entry.id);
    if (pubUrl) push(pubUrl, 'public');
    mirrors.forEach((u) => push(u, 'mirror'));
    push(fallback, 'bundled');
    return chain;
}

async function fetchScenarioPackage(url) {
    const resp = await fetchWithTimeout(url, {}, PACKAGE_FETCH_TIMEOUT_MS);
    if (!resp.ok) throw new Error(`下载失败 (${resp.status})`);
    return resp.json();
}

function getCatalogApi() {
    return CoCScenarioCatalog;
}

function getRemoteCatalog() {
    return CoCScenarioRemoteCatalog;
}

function getBuiltin(id) {
    const fn = BUILTIN_GETTERS[id];
    return fn ? fn() || null : null;
}

function assertLocalStorageWithinQuota(payload) {
    if (!_useLocalStorage) return;
    const size = JSON.stringify(payload).length;
    if (size > LS_FALLBACK_MAX_BYTES) {
        throw new Error(
            '已下载模组总大小超过 localStorage 安全上限（约 4MB）。' +
            '请在大厅「模组库」中移除部分已下载模组以释放空间；' +
            '或使用支持 IndexedDB 的现代浏览器（Chrome / Firefox / Edge）以获得更大容量。'
        );
    }
}

function metaFromScenario(scenario, extra = {}) {
    if (!scenario) return null;
    return {
        id: scenario.id,
        title: scenario.title,
        subtitle: scenario.subtitle || '',
        description: scenario.description || '',
        author: scenario.author || 'Unknown',
        license: scenario.license || 'Unknown',
        tags: Array.isArray(scenario.tags) ? scenario.tags : [],
        era: scenario.era || '1920s',
        estimatedMinutes: scenario.estimatedMinutes || null,
        playTime: scenario.estimatedMinutes || null,
        nodeCount: scenario.nodes ? Object.keys(scenario.nodes).length : 0,
        ...extra
    };
}

function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            _useLocalStorage = true;
            resolve(null);
            return;
        }
        const req = indexedDB.open(IDB_NAME, 1);
        req.onerror = () => {
            _useLocalStorage = true;
            resolve(null);
        };
        req.onupgradeneeded = (ev) => {
            const db = ev.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
    });
}

async function loadFromIDB() {
    _downloaded = {};
    _downloadMeta = {};
    const db = await openDB();
    if (!db) {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) || {};
                _downloaded = parsed.data || parsed;
                _downloadMeta = parsed.meta || {};
            }
        } catch (e) { /* ignore */ }
        return _downloaded;
    }
    return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
            (_downloaded = {});
            (_downloadMeta = {});
            (req.result || []).forEach((row) => {
                if (row && row.id && row.data) {
                    _downloaded[row.id] = row.data;
                    if (row.downloadSource) _downloadMeta[row.id] = { downloadSource: row.downloadSource };
                }
            });
            resolve(_downloaded);
        };
        req.onerror = () => resolve(_downloaded);
    });
}

async function persistDownload(id, scenario, downloadSource) {
    if (downloadSource) {
        _downloadMeta[id] = { downloadSource };
        scenario._downloadSource = downloadSource;
    }
    const db = await openDB();
    if (!db || _useLocalStorage) {
        const payload = { data: _downloaded, meta: _downloadMeta };
        assertLocalStorageWithinQuota(payload);
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(payload));
        } catch (e) {
            throw new Error('存储空间不足，无法保存下载模组');
        }
        return;
    }
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(IDB_STORE).put({ id, data: scenario, downloadSource, savedAt: Date.now() });
    });
}

async function deleteFromIDB(id) {
    delete _downloadMeta[id];
    const db = await openDB();
    if (!db || _useLocalStorage) {
        try { localStorage.setItem(LS_KEY, JSON.stringify({ data: _downloaded, meta: _downloadMeta })); } catch (e) { /* ignore */ }
        return;
    }
    return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
        try {
            tx.objectStore(IDB_STORE).delete(id);
        } catch (_e) {
            resolve();
        }
    });
}

/** True when catalog entry is official link-only (no bundled JSON). */
function isImportOnlyEntry(entry) {
    return !!(entry && (entry.importOnly === true || entry.redistributable === false && entry.officialUrl));
}

/** True when entry supports one-click PDF → scenario conversion. */
function isOfficialPdfEntry(entry) {
    return !!(entry && entry.importType === 'official_pdf' && entry.convertToScenario === true);
}

function getPdfImportApi() {
    return CoCScenarioPdfImport;
}

function resolveStatus(id) {
    if (getBuiltin(id)) return 'builtin';
    if (_downloaded[id]) return 'downloaded';
    const remote = getRemoteCatalog().get(id);
    if (remote && isImportOnlyEntry(remote)) return 'official';
    return 'available';
}

export const CoCScenarioStore = {
    BUILTIN_IDS,

    init() {
        if (!_initPromise) _initPromise = loadFromIDB();
        return _initPromise;
    },

    usesLocalStorageFallback() {
        return _useLocalStorage;
    },

    getPublicCatalogBase() {
        return getPublicCatalogBase();
    },

    setPublicCatalogBase(base) {
        return setPublicCatalogBase(base);
    },

    listCatalog() {
        const catalog = getCatalogApi();
        const builtIn = (catalog ? catalog.list() : BUILTIN_IDS.map((id) => metaFromScenario(getBuiltin(id)))).filter(Boolean);
        const builtInMap = new Map(builtIn.map((m) => [m.id, m]));
        const remote = getRemoteCatalog().entries || [];
        const merged = builtIn.map((m) => ({
            ...m,
            source: 'builtin',
            status: 'builtin',
            downloadable: false
        }));
        remote.forEach((entry) => {
            if (builtInMap.has(entry.id)) return;
            const status = resolveStatus(entry.id);
            const meta = _downloadMeta[entry.id] || {};
            const dlSource = meta.downloadSource || (_downloaded[entry.id] && _downloaded[entry.id]._downloadSource) || null;
            const importOnly = isImportOnlyEntry(entry);
            const pdfConvert = isOfficialPdfEntry(entry);
            merged.push({
                ...entry,
                playTime: entry.playTime || entry.estimatedMinutes || null,
                estimatedMinutes: entry.estimatedMinutes || entry.playTime || null,
                lengthTier: scenarioLengthTier(entry.estimatedMinutes || entry.playTime),
                nodeCount: entry.nodeCount || (_downloaded[entry.id] && _downloaded[entry.id].nodes
                    ? Object.keys(_downloaded[entry.id].nodes).length : 0),
                source: importOnly ? 'official' : 'remote',
                status,
                downloadable: !importOnly && status === 'available',
                importOnly,
                pdfConvert,
                personalUseOnly: !!(_downloaded[entry.id] && _downloaded[entry.id]._personalUseOnly),
                convertedFromPdf: dlSource === 'official_pdf_converted',
                redistributable: entry.redistributable !== false,
                downloadSource: status === 'downloaded' ? dlSource : null
            });
        });
        return merged;
    },

    listLocal() {
        return [...BUILTIN_IDS, ...Object.keys(_downloaded).filter((id) => !BUILTIN_IDS.includes(id))];
    },

    getScenario(id) {
        const builtin = getBuiltin(id);
        if (builtin) return builtin;
        return _downloaded[id] || null;
    },

    async downloadScenario(id) {
        if (getBuiltin(id)) return getBuiltin(id);
        if (_downloaded[id]) return _downloaded[id];
        if (_inflightDownloads.has(id)) return _inflightDownloads.get(id);

        const work = (async () => {
            const remote = getRemoteCatalog().get(id);
            if (!remote) throw new Error(`模组「${id}」不在下载目录中`);
            if (isImportOnlyEntry(remote)) {
                throw new Error('该模组为 Chaosium 官方专有内容，请从官方页面下载后使用「导入本地」');
            }

            const fallback = remote.fallbackUrl || remote.packageUrl;
            if (!fallback) throw new Error(`模组「${id}」不在下载目录中`);

            const chain = resolveDownloadChain(remote);
            let scenario = null;
            let downloadSource = null;
            let lastError = null;

            for (const { url, source } of chain) {
                try {
                    scenario = await fetchScenarioPackage(url);
                    downloadSource = source;
                    break;
                } catch (e) {
                    lastError = e;
                }
            }

            if (!scenario) {
                const detail = lastError && lastError.message ? lastError.message : '网络错误';
                const pdfHint = (remote && (remote.convertToScenario || remote.importType === 'official_pdf'))
                    ? ' 若已获取官方 PDF，可改用「选择 PDF 转换」从本地上传。'
                    : '';
                throw new Error(`所有下载源均不可用（${detail}），请检查网络或稍后重试。${pdfHint}`);
            }

            const catalog = getCatalogApi();
            if (catalog && catalog.validate) {
                const v = catalog.validate(scenario);
                if (!v.ok) throw new Error('模组格式无效: ' + (v.errors || []).join(', '));
            }

            _downloaded[id] = scenario;
            try {
                await persistDownload(id, scenario, downloadSource);
            } catch (e) {
                delete _downloaded[id];
                throw e;
            }
            return scenario;
        })();

        _inflightDownloads.set(id, work);
        try {
            return await work;
        } finally {
            _inflightDownloads.delete(id);
        }
    },

    async removeDownload(id) {
        if (BUILTIN_IDS.includes(id)) return false;
        if (!_downloaded[id]) return false;
        delete _downloaded[id];
        await deleteFromIDB(id);
        return true;
    },

    /**
     * Import user-owned scenario JSON (e.g. self-authored or Chaosium-licensed conversion).
     * @param {File|string|object} input — File, JSON string, or parsed object
     * @param {{ expectedId?: string }} options — optional catalog id to match
     */
    async importScenarioFromFile(input, options = {}) {
        let scenario = null;
        if (input && typeof input === 'object' && typeof input.text === 'function') {
            const text = await input.text();
            scenario = JSON.parse(text);
        } else if (typeof input === 'string') {
            scenario = JSON.parse(input);
        } else if (input && typeof input === 'object') {
            scenario = input;
        } else {
            throw new Error('无效的导入文件');
        }

        const catalog = getCatalogApi();
        if (catalog && catalog.validate) {
            const v = catalog.validate(scenario);
            if (!v.ok) throw new Error('模组格式无效: ' + (v.errors || []).join(', '));
        }

        const expectedId = options.expectedId;
        if (expectedId && scenario.id !== expectedId) {
            throw new Error(`模组 ID 不匹配：文件为「${scenario.id}」，期望「${expectedId}」`);
        }

        const id = scenario.id;
        if (!id) throw new Error('模组缺少 id 字段');

        scenario._downloadSource = 'import';
        _downloaded[id] = scenario;
        try {
            await persistDownload(id, scenario, 'import');
        } catch (e) {
            delete _downloaded[id];
            throw e;
        }
        return scenario;
    },

    /** Import JSON for an official catalog entry (validates expected id). */
    async importOfficialPack(catalogId, file) {
        const entry = getRemoteCatalog().get(catalogId);
        if (!entry || !isImportOnlyEntry(entry)) {
            throw new Error('该条目不是官方链接模组');
        }
        return this.importScenarioFromFile(file, { expectedId: catalogId });
    },

    /**
     * One-click: fetch official PDF, convert client-side, save to IndexedDB.
     * @param {string} catalogId
     * @param {(step: string, detail?: object) => void} [onProgress]
     * @param {{ arrayBuffer?: ArrayBuffer, forceRuleBased?: boolean }} [options]
     */
    async importOfficialOneClick(catalogId, onProgress, options = {}) {
        const entry = getRemoteCatalog().get(catalogId);
        if (!entry || !isOfficialPdfEntry(entry)) {
            throw new Error('该条目不支持 PDF 一键转换');
        }

        const pdfImport = getPdfImportApi();
        if (!pdfImport || !pdfImport.importOfficialPdfOneClick) {
            throw new Error('PDF 转换模块未加载');
        }

        const scenario = await pdfImport.importOfficialPdfOneClick(entry, onProgress, options);

        const catalog = getCatalogApi();
        if (catalog && catalog.validate) {
            const v = catalog.validate(scenario);
            if (!v.ok) throw new Error('转换结果无效: ' + (v.errors || []).join(', '));
        }
        if (!scenario.nodes || Object.keys(scenario.nodes).length < 1) {
            throw new Error('转换结果缺少剧情节点');
        }
        if (scenario.id !== catalogId) scenario.id = catalogId;

        scenario._downloadSource = 'official_pdf_converted';
        scenario._personalUseOnly = true;

        _downloaded[catalogId] = scenario;
        try {
            await persistDownload(catalogId, scenario, 'official_pdf_converted');
        } catch (e) {
            delete _downloaded[catalogId];
            throw e;
        }
        return scenario;
    },

    /** True when user has a PDF-converted official scenario in local storage. */
    isOfficialImported(id) {
        if (!_downloaded[id]) return false;
        const src = _downloadMeta[id]?.downloadSource || _downloaded[id]._downloadSource;
        return src === 'official_pdf_converted';
    },

    isOfficialPdfEntry(entryOrId) {
        if (typeof entryOrId === 'string') {
            const entry = getRemoteCatalog().get(entryOrId);
            return isOfficialPdfEntry(entry);
        }
        return isOfficialPdfEntry(entryOrId);
    },

    isImportOnlyEntry(entryOrId) {
        if (typeof entryOrId === 'string') {
            const entry = getRemoteCatalog().get(entryOrId);
            return isImportOnlyEntry(entry);
        }
        return isImportOnlyEntry(entryOrId);
    },

    isAvailable(id) {
        return !!getBuiltin(id) || !!_downloaded[id];
    },

    getStatus(id) {
        return resolveStatus(id);
    },

    validate: (scenario) => {
        const catalog = getCatalogApi();
        return catalog ? catalog.validate(scenario) : { ok: false, errors: ['catalog unavailable'] };
    }
};

CoCScenarioCatalog.bindDownloadedLookup((id) => CoCScenarioStore.getScenario(id));
