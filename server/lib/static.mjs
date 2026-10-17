/**
 * Static hosting of the game (design/gdd/server-and-room.md §1.4). ES modules need a JavaScript
 * Content-Type or the browser refuses them; paths may not leave the root, follow symlinks out of
 * it, or reach development folders.
 */
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';

export const MIME = Object.freeze({
    '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf'
});
const BLOCKED_SEGMENTS = new Set(['node_modules', 'tests', 'test-results', 'playwright-report']);

/**
 * Resolve a URL path to a file inside root, or null.
 * @param {string} root absolute, already real path
 * @param {string} urlPath
 */
export async function resolveStatic(root, urlPath) {
    let p;
    try { p = decodeURIComponent(String(urlPath).split('?')[0].split('#')[0]); } catch (_e) { return null; }
    if (p.includes('\0')) return null;
    const segments = p.split('/').filter(Boolean);
    if (segments.some((s) => s === '..' || s.startsWith('.') || BLOCKED_SEGMENTS.has(s))) return null;
    let file = join(root, ...segments);
    try {
        let st = await stat(file);
        if (st.isDirectory()) { file = join(file, 'index.html'); st = await stat(file); }
        if (!st.isFile()) return null;
        const real = await realpath(file);
        if (real !== root && !real.startsWith(root + sep)) return null;   // symlink out of the root
        return { file: real, size: st.size, type: MIME[extname(real).toLowerCase()] || 'application/octet-stream' };
    } catch (_e) {
        return null;
    }
}

/** Node http request handler for the game files. */
export function staticHandler(root) {
    return async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
        const hit = await resolveStatic(root, req.url || '/');
        if (!hit) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found'); return; }
        res.writeHead(200, { 'Content-Type': hit.type, 'Content-Length': hit.size, 'Cache-Control': 'no-cache' });
        if (req.method === 'HEAD') { res.end(); return; }
        createReadStream(hit.file).pipe(res);
    };
}
