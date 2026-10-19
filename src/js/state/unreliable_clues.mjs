/**
 * Display-only mythos distortion of clue text (never mutates clue id/quality).
 */

function hashStr(s) {
    let h = 2166136261;
    const str = String(s || '');
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

const GLYPHS = ['…', '█', '潮', '雾', '眼', '盐'];

/**
 * @returns {{ title: string, content: string, distorted: boolean }}
 */
export function distortClueDisplay(clue, opts) {
    const o = opts || {};
    const heat = Number(o.mythosHeat != null ? o.mythosHeat : 0) || 0;
    const title = String((clue && clue.title) || '');
    const content = String((clue && clue.content) || '');
    if (heat < 4) {
        return { title, content, distorted: false };
    }
    const seed = hashStr(String(o.moduleSeed || 0) + '|' + String((clue && clue.id) || title));
    const g = GLYPHS[seed % GLYPHS.length];
    const flip = (seed >>> 8) % 3;
    let dTitle = title;
    let dContent = content;
    if (title.length > 1) {
        const i = seed % title.length;
        dTitle = title.slice(0, i) + g + title.slice(i + 1);
    }
    if (content.length > 4) {
        if (flip === 0) dContent = content.replace(/[。．.]$/, '') + '——笔迹在这里糊成一团。';
        else if (flip === 1) dContent = content.slice(0, Math.max(4, content.length - 6)) + g + g + '…';
        else dContent = '（笔记渗水）' + content;
    } else {
        dContent = content + g;
    }
    if (dTitle === title && dContent === content) {
        dContent = content + g;
    }
    return { title: dTitle, content: dContent, distorted: true };
}

export const CoCUnreliableClues = { distortClueDisplay };
