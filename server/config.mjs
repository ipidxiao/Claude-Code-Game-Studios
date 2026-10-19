/**
 * Relay configuration (design/gdd/server-and-room.md, Tuning Knobs).
 * Every value can be overridden by the environment variable of the same name.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const num = (name, fallback) => {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
};

/** @param {Record<string, any>} [overrides] values that win over env and defaults (tests) */
export function loadConfig(overrides = {}) {
    return Object.assign({
        KEEPER_PORT: num('KEEPER_PORT', 8080),
        HTTP_PORT: num('HTTP_PORT', 8081),
        HTTPS_PORT: num('HTTPS_PORT', 8443),
        REPLAY_LIMIT: num('REPLAY_LIMIT', 200),
        PING_INTERVAL_MS: num('PING_INTERVAL_MS', 20_000),
        PONG_TIMEOUT_MS: num('PONG_TIMEOUT_MS', 20_000),
        MAX_MESSAGE_BYTES: num('MAX_MESSAGE_BYTES', 4 * 1024 * 1024),
        MAX_MEMBERS: num('MAX_MEMBERS', 8),
        // Repository layout: the game is in ../src. Release layout: server/ sits inside the game folder.
        STATIC_ROOT: resolve(process.env.STATIC_ROOT
            || (existsSync(join(here, '..', 'src', 'index.html')) ? join(here, '..', 'src') : join(here, '..'))),
        SERVER_DIR: here,
        DATA_DIR: resolve(process.env.DATA_DIR || join(here, 'data')),
        CERT_DIR: resolve(process.env.CERT_DIR || join(here, '.cert'))
    }, overrides);
}
