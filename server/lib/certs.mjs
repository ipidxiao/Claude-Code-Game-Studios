/**
 * Certificates exist so the game can be played, never to keep anyone out (author's decision).
 * mkcert files in CERT_DIR (tier A) win; otherwise a self-signed pair is generated once with
 * openssl (tier B); without openssl there is no https port and players use plain http (tier C).
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/** openssl on PATH first; on Windows, the copy that ships with Git for Windows. */
const OPENSSL_CANDIDATES = ['openssl',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe', 'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe'];

/** @returns {{tier:'mkcert'|'self-signed', key:Buffer, cert:Buffer}|{tier:'none', reason:string}} */
export function loadCertificates(certDir, { hosts = [] } = {}) {
    const mk = { key: join(certDir, 'mkcert-key.pem'), cert: join(certDir, 'mkcert.pem') };
    if (existsSync(mk.key) && existsSync(mk.cert)) {
        return { tier: 'mkcert', key: readFileSync(mk.key), cert: readFileSync(mk.cert) };
    }
    const self = { key: join(certDir, 'self-key.pem'), cert: join(certDir, 'self.pem') };
    if (!existsSync(self.key) || !existsSync(self.cert)) {
        mkdirSync(certDir, { recursive: true });
        const san = ['DNS:localhost', 'IP:127.0.0.1', ...hosts.map((h) => (/^[\d.]+$/.test(h) ? 'IP:' : 'DNS:') + h)].join(',');
        const args = ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825',
            '-keyout', self.key, '-out', self.cert, '-subj', '/CN=CoC Engine relay', '-addext', 'subjectAltName=' + san];
        let made = false, lastError = null;
        for (const bin of OPENSSL_CANDIDATES) {
            try { execFileSync(bin, args, { stdio: 'ignore' }); made = true; break; } catch (e) { lastError = e; }
        }
        if (!made) {
            return { tier: 'none', reason: '找不到 openssl，未开启 https（玩家仍可用 http 档）。Windows 装 Git for Windows 即自带：'
                + (lastError && lastError.code ? lastError.code : '') };
        }
    }
    return { tier: 'self-signed', key: readFileSync(self.key), cert: readFileSync(self.cert) };
}
