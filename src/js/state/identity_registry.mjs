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
    return { version: REGISTRY_VERSION, seq: 0, copies: {}, aliases: {}, splits: {}, distinct: {}, people: {} };
}

function validId(id) { return typeof id === 'string' && id.length > 0; }

/**
 * Rewrite investigator ids everywhere a save stores them: any `invId` field, `formerInvIds`
 * excepted, every `exploredBy` list and every `vis.to` list. Walks the whole object so that
 * fields added later (ADR-0003 step 4 roll records) are covered without a list to maintain.
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
            } else if (key !== 'formerInvIds') {
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

    const storage = () => {
        if (opts.storage !== undefined) return opts.storage;
        try { return globalThis.localStorage || null; } catch (_e) { return null; }
    };
    const read = () => {
        const s = storage();
        if (!s || unsaved) return memory || (memory = emptyData());
        let raw = null;
        try { raw = s.getItem(key); } catch (_e) { return memory || (memory = emptyData()); }
        if (!raw) return memory || (memory = emptyData());
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return (memory = Object.assign(emptyData(), parsed));
        } catch (_e) { /* corrupt: keep a copy before anything overwrites it */ }
        if (!backedUp) {
            backedUp = true;
            try { s.setItem(key + '.bad-' + Date.now(), raw); } catch (_e) { /* no room for the copy */ }
        }
        return memory || (memory = emptyData());
    };
    /** @returns {boolean} true when the state reached storage */
    const write = (data) => {
        memory = data;
        const s = storage();
        if (!s) { unsaved = true; return false; }
        try { s.setItem(key, JSON.stringify(data)); unsaved = false; return true; } catch (_e) { unsaved = true; return false; }
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
            const groups = [d.roster];
            if (d.arcLedger && Array.isArray(d.arcLedger.characterSnapshot)) groups.push(d.arcLedger.characterSnapshot);
            const map = new Map();
            let changedRecords = 0;
            let dirty = false;
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
                    if (target === rec.invId) { setFormer(rec, keep); changedRecords++; continue; }
                    if (taken.has(target)) {
                        // Both people are in this one party: they are not the same person.
                        data.distinct[pairKey(rec.invId, target)] = 'together';
                        dirty = true;
                        continue;
                    }
                    const old = rec.invId;
                    taken.delete(old); taken.add(target);
                    setFormer(rec, reverted ? keep : former.concat([old]));
                    rec.invId = target;
                    if (list === d.roster) map.set(old, target);
                    changedRecords++;
                }
            }
            // Roster records were rewritten above; remap every other reference in the saved fields
            // (not the whole object: live gameState also holds engine instances).
            const others = {};
            for (const f of SAVED_FIELDS) if (d[f] && typeof d[f] === 'object') others[f] = d[f];
            remapInvIds(others, map);
            if (dirty) write(data);
            return changedRecords;
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
            const stamp = source.savedAt || now();
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
                p.sources[label] = stamp;
                // A merged record carries the player's decision with it: a registry that never saw
                // the merge (another device, cleared data) learns it from the save (review F1).
                for (const f of Array.isArray(rec.formerInvIds) ? rec.formerInvIds : []) {
                    if (!validId(f) || f === rec.invId || data.aliases[f] || data.splits[f]) continue;
                    if (resolveIn(data, rec.invId) === f) continue;
                    person(f, rec);
                    data.aliases[f] = rec.invId;
                }
            };
            d.roster.forEach(note);
            if (d.arcLedger && Array.isArray(d.arcLedger.characterSnapshot)) d.arcLedger.characterSnapshot.forEach(note);
            const ids = d.roster.map((r) => r && r.invId).filter(validId);
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    if (ids[i] !== ids[j]) data.distinct[pairKey(ids[i], ids[j])] = 'together';
                }
            }
            if (JSON.stringify(data) !== before) write(data);
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
            data.aliases[merged] = canonical;
            delete data.splits[merged];
            delete data.distinct[pairKey(ra, rb)];
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
            data.distinct[pairKey(ra, rb)] = 'user';
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
            const canonical = resolveIn(data, id);
            delete data.aliases[id];
            data.splits[id] = canonical;
            data.distinct[pairKey(id, canonical)] = 'user';
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
