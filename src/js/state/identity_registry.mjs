/**
 * Investigator identity registry (ADR-0003 §1.1).
 *
 * Why it exists: an invId is issued once and written into the save, but a person used to exist
 * only as copies (save slots, replicas, exports, ledger snapshots). Each copy was issued an id
 * on its own, so two copies of the same person could end up with two ids. This registry is the
 * one place on the device that remembers what was issued:
 *
 * - copies:  a legacy copy (no invId) is keyed by its savedAt plus its exact content. Every copy
 *            of that one write (localStorage / IndexedDB replica, export, re-import) has the same
 *            key, so it is given the id issued the first time — proof, not a guess.
 * - aliases: copies that came from different writes cannot be told apart by data (same name is
 *            not the same person; changed stats are not a different person). Only the player
 *            knows, so the registry suggests same-name pairs and the player confirms. A
 *            confirmed merge is an alias; loading a save rewrites the aliased id to the canonical
 *            one and keeps the old id in `formerInvIds`, so a merge can be split again.
 * - distinct: pairs that are known to be different people — declared by the player, or seen in
 *            the same roster (two records in one party are never one person).
 * - log:     every decision the player made (merge, split, "not the same person"), time-stamped.
 *            aliases / splits / distinct are derived by replaying the log in time order, and each
 *            record carries the decisions that concern it (`idDecisions`), so the player's last
 *            word travels with the save — a lost registry relearns all of it, not only merges
 *            (audit 2026-10-18 N1, L3).
 *
 * The registry never derives an id from content: ids stay random (newInvId).
 */
import { ensureInvIds } from './char_record.mjs';

export const IDENTITY_REGISTRY_KEY = 'coc_identity_registry';
const REGISTRY_VERSION = 1;
/** Save-data fields that can hold investigator ids besides roster (ADR-0003 §2, §4). */
const SAVED_FIELDS = ['arcLedger', 'chatHistory', 'journalLog', 'diceHistory', 'clueBoard', 'sceneMap',
    'combat', 'chase', 'npcRegistry', 'scenarioRunner', 'kpState', 'campaignArchive'];

/** 53-bit string hash (cyrb53). Used only to key copies, never as an id. */
function hash53(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function pairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

function emptyData() {
    return { version: REGISTRY_VERSION, seq: 0, copies: {}, aliases: {}, splits: {}, distinct: {}, people: {}, log: [] };
}

function validId(id) { return typeof id === 'string' && id.length > 0; }

const byTime = (x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
/** Older than any real or legacy decision: merges inferred from formerInvIds alone. */
const IMPLICIT_AT = '0000-00-00T00:00:00.000Z#000000';

/** Registries written before the decision log: their state becomes the oldest decisions. */
function ensureLog(data) {
    if (Array.isArray(data.log)) return;
    const log = [];
    let n = 0;
    const at = () => '1970-01-01T00:00:00.000Z#' + String(++n).padStart(6, '0');
    for (const [a, b] of Object.entries(data.aliases || {})) log.push({ id: 'legacy:m:' + a, op: 'merge', a, b, at: at() });
    for (const [a, b] of Object.entries(data.splits || {})) log.push({ id: 'legacy:s:' + a, op: 'split', a, b, at: at() });
    for (const [k, v] of Object.entries(data.distinct || {})) {
        if (v !== 'user') continue;
        const [a, b] = k.split('|');
        log.push({ id: 'legacy:d:' + k, op: 'distinct', a, b, at: at() });
    }
    data.log = log;
}

/**
 * Derive aliases, splits and distinct from the decision log, oldest first; the latest decision
 * about a pair wins. Two people seen in one roster ('together') are never merged.
 */
function replay(data) {
    const together = {};
    for (const [k, v] of Object.entries(data.distinct || {})) if (v === 'together') together[k] = v;
    const aliases = {}, splits = {}, user = {};
    const res = (id) => {
        let cur = id;
        const guard = new Set();
        while (aliases[cur] && !guard.has(cur)) { guard.add(cur); cur = aliases[cur]; }
        return cur;
    };
    const splitOff = (id) => {
        const canonical = res(id);
        delete aliases[id];
        splits[id] = canonical;
        user[pairKey(id, canonical)] = 'user';
    };
    for (const d of [...data.log].sort(byTime)) {
        if (!d || !validId(d.a) || !validId(d.b) || d.a === d.b) continue;
        if (d.op === 'merge') {
            const merged = res(d.a), canonical = res(d.b);
            if (merged === canonical || together[pairKey(merged, canonical)]) continue;
            aliases[merged] = canonical;
            // Re-merging with the partner it was split from ends that split; merging into someone
            // else keeps it, so copies made while merged still find their way back (audit L2).
            if (splits[merged] === canonical) delete splits[merged];
            delete user[pairKey(merged, canonical)];
        } else if (d.op === 'split') {
            if (aliases[d.a]) splitOff(d.a);
            else { splits[d.a] = d.b; user[pairKey(d.a, d.b)] = 'user'; }
        } else if (d.op === 'distinct') {
            if (res(d.a) === res(d.b)) {
                if (aliases[d.a]) splitOff(d.a); else if (aliases[d.b]) splitOff(d.b);
            }
            user[pairKey(d.a, d.b)] = 'user';
        }
    }
    data.aliases = aliases;
    data.splits = splits;
    data.distinct = Object.assign({}, user, together);
}

/**
 * Rewrite investigator ids everywhere a save stores them: any `invId` field (`formerInvIds` and
 * `idDecisions` excepted), every `exploredBy` list and every `vis.to` list, anywhere under the
 * object passed in. canonicalize passes the 12 saved top-level fields; an id stored under another
 * key name is not covered.
 * @param {Object} data save `data` or live gameState
 * @param {Map<string,string>} map old id → new id
 * @returns {number} how many references changed
 */
export function remapInvIds(data, map) {
    if (!map || map.size === 0) return 0;
    let changed = 0;
    const seen = new Set();
    const swapList = (list) => {
        const out = [];
        for (const id of list) {
            const next = map.has(id) ? map.get(id) : id;
            if (next !== id) changed++;
            if (!out.includes(next)) out.push(next);
        }
        return out;
    };
    const walk = (node) => {
        if (!node || typeof node !== 'object' || seen.has(node)) return;
        seen.add(node);
        if (Array.isArray(node)) { node.forEach(walk); return; }
        for (const key of Object.keys(node)) {
            const val = node[key];
            if (key === 'invId' && typeof val === 'string' && map.has(val)) {
                node[key] = map.get(val); changed++;
            } else if (key === 'exploredBy' && Array.isArray(val)) {
                node[key] = swapList(val);
            } else if (key === 'vis' && val && typeof val === 'object' && Array.isArray(val.to)) {
                val.to = swapList(val.to);
            } else if (key !== 'formerInvIds' && key !== 'idDecisions') {
                walk(val);
            }
        }
    };
    walk(data);
    return changed;
}

/**
 * @param {{storage?:{getItem:Function,setItem:Function}|null, key?:string, now?:Function}} [opts]
 *   storage defaults to globalThis.localStorage at call time; without one the registry lives in memory.
 */
export function createIdentityRegistry(opts = {}) {
    const key = opts.key || IDENTITY_REGISTRY_KEY;
    const now = opts.now || (() => new Date().toISOString());
    let memory = null;           // the latest state; authoritative while a write is pending
    let unsaved = false;         // the last write failed (e.g. quota): memory is newer than storage
    let backedUp = false;        // a corrupt stored registry was copied aside once
    let lastRaw = null;          // the stored text this registry last read or wrote
    let batching = 0;            // inside batch(): writes are collected and made once at the end
    let batchDirty = false;

    const storage = () => {
        if (opts.storage !== undefined) return opts.storage;
        try { return globalThis.localStorage || null; } catch (_e) { return null; }
    };
    /** Parse stored text; a corrupt registry is copied aside once. @returns {Object|null} */
    const parse = (s, raw) => {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                const hadLog = Array.isArray(parsed.log);
                const data = Object.assign(emptyData(), parsed);
                if (!hadLog) { delete data.log; ensureLog(data); }
                return data;
            }
        } catch (_e) { /* corrupt: keep a copy before anything overwrites it */ }
        if (!backedUp) {
            backedUp = true;
            try { s.setItem(key + '.bad-' + Date.now(), raw); } catch (_e) { /* no room for the copy */ }
        }
        return null;
    };
    const read = () => {
        const s = storage();
        if (!s || unsaved || batching) return memory || (memory = emptyData());
        let raw = null;
        try { raw = s.getItem(key); } catch (_e) { return memory || (memory = emptyData()); }
        if (!raw) return memory || (memory = emptyData());
        const data = parse(s, raw);
        if (!data) return memory || (memory = emptyData());
        lastRaw = raw;
        return (memory = data);
    };
    /**
     * Another tab may have written since this registry last read. Everything in the registry
     * can be combined, so combine instead of overwriting: copies already stored win (the other
     * tab issued first), decisions and evidence are united, then the log is replayed.
     */
    const mergeStored = (s, data) => {
        let raw = null;
        try { raw = s.getItem(key); } catch (_e) { return data; }
        if (!raw || raw === lastRaw) return data;
        const theirs = parse(s, raw);
        if (!theirs) return data;
        data.copies = Object.assign({}, data.copies, theirs.copies);
        const known = new Set(data.log.map((d) => d.id));
        for (const d of theirs.log || []) if (d && !known.has(d.id)) data.log.push(d);
        for (const [k, v] of Object.entries(theirs.distinct || {})) if (v === 'together') data.distinct[k] = 'together';
        for (const [id, p] of Object.entries(theirs.people || {})) {
            const mine = data.people[id];
            if (!mine) { data.people[id] = p; continue; }
            mine.sources = Object.assign({}, p.sources, mine.sources);
            mine.order = Math.min(Number(mine.order) || Infinity, Number(p.order) || Infinity);
        }
        data.seq = Math.max(data.seq || 0, theirs.seq || 0);
        replay(data);
        return data;
    };
    /** @returns {boolean} true when the state reached storage */
    const write = (data) => {
        memory = data;
        if (batching) { batchDirty = true; return true; }
        const s = storage();
        if (!s) { unsaved = true; return false; }
        try {
            const merged = mergeStored(s, data);
            const text = JSON.stringify(merged);
            s.setItem(key, text);
            memory = merged; lastRaw = text; unsaved = false;
            return true;
        } catch (_e) { unsaved = true; return false; }
    };

    const resolveIn = (data, id) => {
        let cur = id;
        const guard = new Set();
        while (validId(cur) && data.aliases[cur] && !guard.has(cur)) { guard.add(cur); cur = data.aliases[cur]; }
        return cur;
    };

    /** Latest position in formerInvIds whose merge the player split, or -1. */
    const splitIndex = (data, former) => {
        for (let i = former.length - 1; i >= 0; i--) if (data.splits[former[i]]) return i;
        return -1;
    };
    const setFormer = (rec, list) => {
        if (list.length) rec.formerInvIds = list; else delete rec.formerInvIds;
    };

    let seqLocal = 0;
    /** Decision time: ISO time, then a per-registry counter so one device's decisions never tie. */
    const stamp = () => now() + '#' + String(++seqLocal).padStart(6, '0');
    const decide = (data, op, a, b) => {
        data.log.push({ id: 'd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10), op, a, b, at: stamp() });
        replay(data);
    };
    const recordsOf = (d) => {
        const out = Array.isArray(d.roster) ? d.roster.slice() : [];
        if (d.arcLedger && Array.isArray(d.arcLedger.characterSnapshot)) out.push(...d.arcLedger.characterSnapshot);
        return out.filter((r) => r && validId(r.invId));
    };
    /**
     * Take in the decisions a save's records carry; a merge visible only as formerInvIds (saves
     * from before the log) counts as the oldest possible decision. @returns {boolean} changed
     */
    const learnInto = (data, d) => {
        const known = new Set(data.log.map((x) => x.id));
        let changed = false;
        for (const rec of recordsOf(d)) {
            for (const x of Array.isArray(rec.idDecisions) ? rec.idDecisions : []) {
                if (!x || !x.id || known.has(x.id) || !['merge', 'split', 'distinct'].includes(x.op)) continue;
                data.log.push({ id: x.id, op: x.op, a: x.a, b: x.b, at: String(x.at || IMPLICIT_AT) });
                known.add(x.id);
                changed = true;
            }
            for (const f of Array.isArray(rec.formerInvIds) ? rec.formerInvIds : []) {
                if (!validId(f) || f === rec.invId) continue;
                if (data.log.some((x) => x.op === 'merge' && x.a === f)) continue;
                const id = 'implicit:' + f + '>' + rec.invId;
                if (known.has(id)) continue;
                data.log.push({ id, op: 'merge', a: f, b: rec.invId, at: IMPLICIT_AT });
                known.add(id);
                changed = true;
            }
        }
        if (changed) replay(data);
        return changed;
    };
    /** The decisions concerning a record: its own, plus every logged one naming any of its ids. */
    const decisionsFor = (data, rec) => {
        const own = Array.isArray(rec.idDecisions) ? rec.idDecisions : [];
        const ids = new Set([rec.invId, ...(rec.formerInvIds || [])]);
        for (const x of own) { ids.add(x.a); ids.add(x.b); }
        const out = new Map(own.filter((x) => x && x.id).map((x) => [x.id, x]));
        for (const x of data.log) if (ids.has(x.a) || ids.has(x.b)) out.set(x.id, x);
        return [...out.values()].filter((x) => !String(x.id).startsWith('implicit:')).sort(byTime)
            .map((x) => ({ id: x.id, op: x.op, a: x.a, b: x.b, at: x.at }));
    };

    const copyKeys = (records, scope, savedAt) => {
        // Key = savedAt + scope + exact content (+ ordinal among identical records). Records come
        // from the same JSON text in every copy of one write, so the key is the same in each.
        const keys = new Map();
        if (!savedAt) return keys;   // no write stamp: cannot prove two copies share a write
        const count = new Map();
        for (const rec of records) {
            if (!rec || typeof rec !== 'object' || validId(rec.invId)) continue;
            const body = hash53(JSON.stringify(rec));
            const n = (count.get(body) || 0) + 1;
            count.set(body, n);
            keys.set(rec, 'c:' + hash53(String(savedAt) + '|' + scope + '|' + body + '|' + n));
        }
        return keys;
    };

    return {
        /**
         * Issue ids for records that have none: the id this exact copy was issued before, else a
         * donor's (ensureInvIds pairing), else a new random id. Remembers what was issued.
         * @param {Array<Object>} records
         * @param {{savedAt?:string, scope?:string, donors?:Array<Object>}} [ctx]
         * @returns {number} how many records received an id
         */
        issue(records, ctx = {}) {
            if (!Array.isArray(records)) return 0;
            const data = read();
            const keys = copyKeys(records, ctx.scope || 'roster', ctx.savedAt);
            const before = new Map(records.map((r) => [r, r && r.invId]));
            const present = new Set(records.map((r) => r && r.invId).filter(validId));
            for (const [rec, k] of keys) {
                const known = data.copies[k];
                if (validId(known) && !present.has(known)) { rec.invId = known; present.add(known); }
            }
            ensureInvIds(records, { donors: ctx.donors });
            let dirty = false;
            for (const [rec, k] of keys) {
                if (validId(rec.invId) && data.copies[k] !== rec.invId) { data.copies[k] = rec.invId; dirty = true; }
            }
            if (dirty) write(data);
            return records.filter((r) => r && before.get(r) !== r.invId).length;
        },

        /** Follow merges to the canonical id. */
        resolve(id) { return resolveIn(read(), id); },

        /**
         * Apply merges and splits to one save's data: aliased ids become canonical (old id kept in
         * formerInvIds); a record whose merge was split gets its former id back.
         * Never maps two records of one roster to the same id.
         * @param {Object} d save data (roster, arcLedger.characterSnapshot, …)
         * @returns {number} how many records changed id
         */
        canonicalize(d) {
            if (!d || !Array.isArray(d.roster)) return 0;
            const data = read();
            // The save's own decisions first: a split it carries must win over an older merge (N1).
            let dirty = learnInto(data, d);
            const groups = [d.roster];
            if (d.arcLedger && Array.isArray(d.arcLedger.characterSnapshot)) groups.push(d.arcLedger.characterSnapshot);
            const map = new Map();
            const changed = new Set();
            for (const list of groups) {
                const taken = new Set(list.map((r) => r && r.invId).filter(validId));
                for (const rec of list) {
                    if (!rec || !validId(rec.invId)) continue;
                    const former = Array.isArray(rec.formerInvIds) ? rec.formerInvIds : [];
                    // A split is undone only on positive evidence: a split record for one of this
                    // record's former ids. An empty or lost registry changes nothing (review F1).
                    const at = splitIndex(data, former);
                    const keep = at >= 0 ? former.slice(0, at) : former;
                    const target = resolveIn(data, at >= 0 ? former[at] : rec.invId);
                    const reverted = at >= 0;
                    if (target === rec.invId && !reverted) continue;
                    if (target === rec.invId) { setFormer(rec, keep); changed.add(rec); continue; }
                    if (taken.has(target)) {
                        // Both people are in this one party: they are not the same person.
                        data.distinct[pairKey(rec.invId, target)] = 'together';
                        replay(data);           // a merge contradicted by the party no longer applies
                        dirty = true;
                        continue;
                    }
                    const old = rec.invId;
                    taken.delete(old); taken.add(target);
                    setFormer(rec, reverted ? keep : former.concat([old]));
                    rec.invId = target;
                    if (list === d.roster) map.set(old, target);
                    changed.add(rec);
                }
            }
            // Each record carries the decisions about it, so the player's last word travels with the save.
            for (const rec of recordsOf(d)) {
                const list = decisionsFor(data, rec);
                const before = JSON.stringify(rec.idDecisions || []);
                if (JSON.stringify(list) === before) continue;
                if (list.length) rec.idDecisions = list; else delete rec.idDecisions;
                changed.add(rec);
            }
            // Roster records were rewritten above; remap every other reference in the saved fields
            // (not the whole object: live gameState also holds engine instances).
            const others = {};
            for (const f of SAVED_FIELDS) if (d[f] && typeof d[f] === 'object') others[f] = d[f];
            remapInvIds(others, map);
            if (dirty) write(data);
            return changed.size;
        },

        /**
         * Record evidence for the merge panel: who appears in which source, and who appears together.
         * @param {Object} d save data
         * @param {{label?:string, savedAt?:string}} [source]
         */
        observe(d, source = {}) {
            if (!d || !Array.isArray(d.roster)) return;
            const data = read();
            const before = JSON.stringify(data);
            const label = source.label || '未知来源';
            const seenAt = source.savedAt || now();
            learnInto(data, d);
            const person = (id, rec) => data.people[id] || (data.people[id] = {
                order: (data.seq = (data.seq || 0) + 1), firstSeen: now(), sources: {},
                name: rec.name || '', jobName: rec.jobName || '', player: rec.player || ''
            });
            const note = (rec) => {
                if (!rec || !validId(rec.invId)) return;
                const p = person(rec.invId, rec);
                p.name = rec.name || p.name || '';
                p.jobName = rec.jobName || p.jobName || '';
                p.player = rec.player || p.player || '';
                p.sources[label] = seenAt;
                for (const f of Array.isArray(rec.formerInvIds) ? rec.formerInvIds : []) if (validId(f)) person(f, rec);
            };
            d.roster.forEach(note);
            if (d.arcLedger && Array.isArray(d.arcLedger.characterSnapshot)) d.arcLedger.characterSnapshot.forEach(note);
            const ids = d.roster.map((r) => r && r.invId).filter(validId);
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    if (ids[i] !== ids[j]) data.distinct[pairKey(ids[i], ids[j])] = 'together';
                }
            }
            replay(data);
            if (JSON.stringify(data) !== before) write(data);
        },

        /**
         * Run fn with registry writes collected and made once at the end (a lobby scan reads
         * every save of every module; each read may add evidence).
         * @param {() => Promise<any>|any} fn
         */
        async batch(fn) {
            read();
            batching++;
            try { return await fn(); } finally {
                batching--;
                if (!batching && batchDirty) { batchDirty = false; write(memory); }
            }
        },

        /**
         * Forget the save-slot sources before a full scan re-adds them, so deleted or overwritten
         * slots stop appearing as evidence (review F8). People with no source are not suggested.
         * @param {(label:string)=>boolean} isRescanned
         */
        forgetSources(isRescanned) {
            const data = read();
            let dirty = false;
            for (const p of Object.values(data.people)) {
                for (const label of Object.keys(p.sources || {})) {
                    if (isRescanned(label)) { delete p.sources[label]; dirty = true; }
                }
            }
            if (dirty) write(data);
        },

        /**
         * Same-name pairs of different canonical identities not known to be distinct.
         * The registry suggests; only the player decides.
         * @returns {Array<{a:Object, b:Object}>}
         */
        suggestions() {
            const data = read();
            const byName = new Map();
            for (const [id, p] of Object.entries(data.people)) {
                if (data.aliases[id] || !Object.keys(p.sources || {}).length) continue;
                const name = String(p.name || '').trim();
                if (!name) continue;
                if (!byName.has(name)) byName.set(name, []);
                byName.get(name).push(Object.assign({ invId: id }, p));
            }
            const out = [];
            for (const list of byName.values()) {
                for (let i = 0; i < list.length; i++) {
                    for (let j = i + 1; j < list.length; j++) {
                        if (!data.distinct[pairKey(list[i].invId, list[j].invId)]) out.push({ a: list[i], b: list[j] });
                    }
                }
            }
            return out;
        },

        /**
         * The player confirmed a and b are one person. The identity seen first stays canonical.
         * `saved: false` means the decision lives in memory only (storage full or unavailable);
         * saves rewritten before a reload still carry it (formerInvIds).
         * @returns {{ok:boolean, saved?:boolean, reason?:string, canonical?:string, merged?:string}}
         */
        merge(a, b) {
            const data = read();
            const ra = resolveIn(data, a), rb = resolveIn(data, b);
            if (!validId(ra) || !validId(rb)) return { ok: false, reason: 'unknown-id' };
            if (ra === rb) return { ok: true, saved: true, canonical: ra, merged: rb };
            if (data.distinct[pairKey(ra, rb)] === 'together') return { ok: false, reason: 'seen-together' };
            const order = (id) => (data.people[id] && Number(data.people[id].order)) || Infinity;
            const [canonical, merged] = order(rb) < order(ra) ? [rb, ra] : [ra, rb];
            decide(data, 'merge', merged, canonical);
            return { ok: true, saved: write(data), canonical, merged };
        },

        /**
         * The player says a and b are different people: never suggest the pair again.
         * @returns {{ok:boolean, saved?:boolean}}
         */
        markDistinct(a, b) {
            const data = read();
            const ra = resolveIn(data, a), rb = resolveIn(data, b);
            if (!validId(ra) || !validId(rb) || ra === rb) return { ok: false };
            decide(data, 'distinct', ra, rb);
            return { ok: true, saved: write(data) };
        },

        /**
         * Undo a merge. The split is recorded (positive evidence), and each save rewritten by the
         * merge gets this id back on its next load — also inside a chain of merges (review F5).
         * @returns {{ok:boolean, saved?:boolean}}
         */
        split(id) {
            const data = read();
            if (!data.aliases[id]) return { ok: false };
            decide(data, 'split', id, resolveIn(data, id));
            return { ok: true, saved: write(data) };
        },

        /** Confirmed merges, for the panel. */
        merges() {
            const data = read();
            return Object.entries(data.aliases).map(([from, to]) => ({
                merged: Object.assign({ invId: from }, data.people[from] || {}),
                canonical: Object.assign({ invId: resolveIn(data, to) }, data.people[resolveIn(data, to)] || {})
            }));
        },

        /** Read-only copy of the stored registry (tests, diagnostics). */
        snapshot() { return JSON.parse(JSON.stringify(read())); }
    };
}

/** The device-wide registry used by persistence and the lobby panel. */
export const identityRegistry = createIdentityRegistry();
