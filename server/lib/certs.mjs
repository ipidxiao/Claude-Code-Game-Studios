/**
 * Certificates exist so the game can be played, never to keep anyone out (author's decision).
 * mkcert files in CERT_DIR (tier A) win; otherwise a self-signed pair is generated once with
 * openssl (tier B); without openssl there is no https port and players use plain http (tier C).
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/** @returns {{tier:'mkcert'|'self-signed', key:Buffer, cert:Buffer}|{tier:'none', reason:string}} */
export function loadCertificates(certDir, { hosts = [] } = {}) {
    const mk = { key: join(certDir, 'mkcert-key.pem'), cert: join(certDir, 'mkcert.pem') };
    if (existsSync(mk.key) && existsSync(mk.cert)) {
        return { tier: 'mkcert', key: readFileSync(mk.key), cert: readFileSync(mk.cert) };
    }
    const self = { key: join(certDir, 'self-key.pem'), cert: join(certDir, 'self.pem') };
    if (!existsSync(self.key) || !existsSync(self.cert)) {
        try {
            mkdirSync(certDir, { recursive: true });
            const san = ['DNS:localhost', 'IP:127.0.0.1', ...hosts.map((h) => (/^[\d.]+$/.test(h) ? 'IP:' : 'DNS:') + h)].join(',');
            execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825',
                '-keyout', self.key, '-out', self.cert, '-subj', '/CN=CoC Engine relay', '-addext', 'subjectAltName=' + san],
            { stdio: 'ignore' });
        } catch (e) {
            return { tier: 'none', reason: 'openssl 不可用，未开启 https：' + (e && e.code ? e.code : e.message) };
        }
    }
    return { tier: 'self-signed', key: readFileSync(self.key), cert: readFileSync(self.cert) };
}
