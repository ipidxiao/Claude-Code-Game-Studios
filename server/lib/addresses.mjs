/**
 * Addresses players can reach (design/gdd/server-and-room.md §1.5). The keeper page must never
 * hand out its own localhost address (prototype finding 6).
 */
import os from 'node:os';

const isTailscale = (ip) => {
    const [a, b] = ip.split('.').map(Number);
    return a === 100 && b >= 64 && b <= 127;          // CGNAT range Tailscale assigns
};

/** @returns {{lan:string[], tailscale:string[]}} */
export function playerAddresses(interfaces = os.networkInterfaces()) {
    const lan = [], tailscale = [];
    for (const [name, list] of Object.entries(interfaces || {})) {
        for (const a of list || []) {
            if (!a || a.internal || (a.family !== 'IPv4' && a.family !== 4)) continue;
            if (isTailscale(a.address) || /^tailscale/i.test(name)) tailscale.push(a.address);
            else lan.push(a.address);
        }
    }
    return { lan, tailscale };
}
