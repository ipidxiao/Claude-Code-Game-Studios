/**
 * room.json persistence (ids and hashes only). A file that cannot be parsed is moved aside,
 * never overwritten, and the relay starts without a room.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function fileStore(dataDir, log = () => {}) {
    const file = join(dataDir, 'room.json');
    return {
        load() {
            if (!existsSync(file)) return null;
            try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) {
                const aside = file + '.bad-' + new Date().toISOString().replace(/[:.]/g, '-');
                renameSync(file, aside);
                log(`room.json 无法读取，已改名为 ${aside}：${e.message}`);
                return null;
            }
        },
        save(obj) {
            mkdirSync(dataDir, { recursive: true });
            const tmp = file + '.tmp';
            writeFileSync(tmp, JSON.stringify(obj, null, 2));
            renameSync(tmp, file);
        },
        remove() { rmSync(file, { force: true }); }
    };
}
