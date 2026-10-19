/**
 * Client-side relay session state (design/gdd/server-and-room.md §Reconnect, ADR-0001).
 *
 * On reconnect a client reports what it last received, so the relay can replay the gap instead
 * of asking the keeper for a snapshot: the relay `boot` it was talking to, the keeper `epoch` of
 * the messages it received, and the last `dseq`. All three are state the relay handed out — a
 * client never makes them up. A player page that sent its own random epoch never matched, so
 * every reconnect fell back to a snapshot and a message sent while the phone slept was lost
 * (phone test 2026-10-18). The state is persisted (GDD: dseq must survive a page reload).
 *
 * Used by public/selftest.html and, later, the game's multiplayer client.
 */

/**
 * @param {{store:{get(k:string):string|null, set(k:string,v:string):void, del(k:string):void}, key:string, ownEpoch?:string}} opts
 *   ownEpoch: the keeper page's own epoch (this page load); players leave it out and learn the
 *   keeper's from the messages they receive.
 */
export function createRelaySession({ store, key, ownEpoch = null }) {
    const load = () => {
        const raw = store.get(key);
        if (!raw) return {};
        try { const v = JSON.parse(raw); if (v && typeof v === 'object') return v; } catch (_e) { /* a bare token (R31 self-test page) */ }
        return { token: raw };
    };
    let s = load();
    const save = () => store.set(key, JSON.stringify(s));

    return {
        /** @returns {boolean} whether this page holds a member token for the room */
        get hasToken() { return typeof s.token === 'string' && s.token.length > 0; },

        /** The join message that resumes this member, or null without a token. */
        resumeRequest() {
            if (!this.hasToken) return null;
            return { op: 'join', token: s.token, boot: s.boot || null, epoch: ownEpoch || s.epoch || null, lastDseq: s.lastDseq || 0 };
        },

        /** Record a `joined` reply. A new relay boot restarts sequence numbers. */
        onJoined(m) {
            if (m.token) s.token = m.token;
            if (m.boot !== s.boot) { s.boot = m.boot; s.lastDseq = 0; }
            save();
        },

        /** Record a delivered envelope: its dseq, and the keeper epoch it carries. */
        onEnvelope(m) {
            if (typeof m.dseq === 'number' && m.dseq > (s.lastDseq || 0)) s.lastDseq = m.dseq;
            if (!ownEpoch && m.epoch) s.epoch = String(m.epoch);
            save();
        },

        /** Forget the membership (removed, room closed). */
        reset() { s = {}; store.del(key); }
    };
}
