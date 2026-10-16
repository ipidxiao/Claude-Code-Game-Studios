/**
 * CoC 7th Edition NPC & Monster Templates
 *
 * Rich spawn templates for AI `spawn_npc`. Lookup order (dual-table bridge):
 *   1) Exact CoCNpcTemplates key
 *   2) creatures_summary id/name → template when Chinese names match exactly
 *   3) Fuzzy template match (query length ≥ 2; prefer longest key)
 *   4) creatures_summary-only stub
 * Engine scenario effects still use CombatEngine.spawnCreature directly.
 */
import { CoCCreatures, lookupCreature } from './creatures_summary.mjs';
import { bodyStatsFromAttrs } from '../engines/attributes.mjs';

export const CoCNpcTemplates = {
    // ══════════════════════════════════════════
    // 人类 NPC 原型
    // ══════════════════════════════════════════
    '警察': { type: 'human', attrs: { STR: 65, CON: 60, SIZ: 65, DEX: 55, APP: 50, INT: 55, POW: 55, EDU: 55 }, hp: 13, skills: { '斗殴': 60, '手枪': 50, '侦查': 55, '法律': 40, '汽车驾驶': 50 }, armor: 0, weapons: ['警棍 1D6+DB', '左轮手枪 1D10'] },
    '黑帮分子': { type: 'human', attrs: { STR: 60, CON: 55, SIZ: 60, DEX: 50, APP: 45, INT: 45, POW: 45, EDU: 40 }, hp: 12, skills: { '斗殴': 55, '手枪': 45, '恐吓': 50, '潜行': 40 }, armor: 0, weapons: ['黄铜指虎 1D3+1+DB', '手枪 1D10'] },
    '邪教徒': { type: 'human', attrs: { STR: 45, CON: 50, SIZ: 55, DEX: 50, APP: 45, INT: 55, POW: 60, EDU: 50 }, hp: 11, skills: { '神秘学': 50, '斗殴': 40, '匕首': 45, '潜行': 45 }, armor: 0, weapons: ['匕首 1D4+DB'], san: 45 },
    '邪教首领': { type: 'human', attrs: { STR: 50, CON: 55, SIZ: 55, DEX: 55, APP: 50, INT: 70, POW: 75, EDU: 65 }, hp: 11, skills: { '神秘学': 70, '克苏鲁神话': 20, '话术': 65, '斗殴': 45 }, armor: 0, spells: ['僵尸之眼', '枯萎术'], san: 30 },
    '私家侦探': { type: 'human', attrs: { STR: 55, CON: 55, SIZ: 60, DEX: 55, APP: 50, INT: 65, POW: 55, EDU: 60 }, hp: 12, skills: { '侦查': 70, '图书馆使用': 60, '手枪': 50, '潜行': 50, '话术': 55 }, armor: 0, weapons: ['手枪 1D10'] },
    '图书馆管理员': { type: 'human', attrs: { STR: 40, CON: 45, SIZ: 50, DEX: 50, APP: 55, INT: 70, POW: 55, EDU: 75 }, hp: 10, skills: { '图书馆使用': 85, '历史': 65, '外语': 55, '侦查': 45 }, armor: 0 },
    '医生': { type: 'human', attrs: { STR: 45, CON: 50, SIZ: 55, DEX: 60, APP: 55, INT: 70, POW: 55, EDU: 80 }, hp: 11, skills: { '医学': 75, '急救': 70, '药学': 60, '心理学': 55 }, armor: 0 },
    '记者': { type: 'human', attrs: { STR: 45, CON: 50, SIZ: 55, DEX: 55, APP: 55, INT: 65, POW: 55, EDU: 65 }, hp: 11, skills: { '侦查': 60, '话术': 55, '图书馆使用': 55, '摄影': 50, '心理学': 50 }, armor: 0 },
    '士兵': { type: 'human', attrs: { STR: 70, CON: 65, SIZ: 65, DEX: 60, APP: 50, INT: 50, POW: 50, EDU: 50 }, hp: 13, skills: { '步枪': 60, '斗殴': 60, '闪避': 50, '急救': 45, '潜行': 45 }, armor: 2, weapons: ['步枪 2D6+4', '匕首 1D4+DB'] },

    // ══════════════════════════════════════════
    // 神话怪物 (Mythos Monsters)
    // ══════════════════════════════════════════
    '深潜者': { type: 'monster', attrs: { STR: 70, CON: 65, SIZ: 65, DEX: 50, INT: 55, POW: 55 }, hp: 13, db: '1D4', build: 1, mov: 8, skills: { '斗殴': 55, '游泳': 80, '潜行': 50 }, armor: 1, weapons: ['爪 1D6+DB', '矛 1D8+1'], sanLoss: '0/1D6', description: '半人半鱼的深海生物，崇拜大衮和海德拉。' },
    '食尸鬼': { type: 'monster', attrs: { STR: 80, CON: 65, SIZ: 65, DEX: 65, INT: 45, POW: 45 }, hp: 13, db: '1D4', build: 1, mov: 9, skills: { '斗殴': 50, '潜行': 70, '攀爬': 60, '跳跃': 50 }, armor: 1, weapons: ['爪 1D6+DB', '咬 1D6'], sanLoss: '0/1D6', description: '食腐的类人怪物，有橡胶般的皮肤和犬类面部特征。' },
    '米·戈': { type: 'monster', attrs: { STR: 65, CON: 55, SIZ: 60, DEX: 70, INT: 75, POW: 65 }, hp: 12, db: '0', build: 0, mov: 7, skills: { '科学': 80, '电气维修': 70, '斗殴': 45 }, armor: 0, weapons: ['电击枪 1D3+眩晕', '爪 1D6'], sanLoss: '0/1D6', description: '来自犹格斯的真菌型外星生物，擅长外科手术和大脑移植。' },
    '修格斯': { type: 'monster', attrs: { STR: 110, CON: 85, SIZ: 100, DEX: 35, INT: 45, POW: 65 }, hp: 19, db: '2D6', build: 3, mov: 6, skills: { '斗殴': 70 }, armor: 0, weapons: ['碾压 2D6+DB'], sanLoss: '1D6/1D20', description: '巨大的黑色原生质怪物，不断变换形态，是古老者创造的仆从种族。' },
    '拜亚基': { type: 'monster', attrs: { STR: 85, CON: 55, SIZ: 75, DEX: 70, INT: 40, POW: 45 }, hp: 13, db: '1D4', build: 1, mov: 5, fly: 20, skills: { '斗殴': 55, '侦查': 50 }, armor: 2, weapons: ['爪 1D6+DB', '咬 1D6'], sanLoss: '1/1D6', description: '星际飞行的有翼生物，可作为坐骑穿越太空。' },
    '夜魇': { type: 'monster', attrs: { STR: 70, CON: 60, SIZ: 70, DEX: 60, INT: 35, POW: 45 }, hp: 13, db: '1D4', build: 1, mov: 6, fly: 12, skills: { '斗殴': 50, '潜行': 60 }, armor: 0, weapons: ['爪 1D6+DB'], sanLoss: '0/1D6', description: '没有面孔的漆黑飞行怪物，栖息于梦境之地。' },
    '丧尸': { type: 'undead', attrs: { STR: 80, CON: 80, SIZ: 65, DEX: 35, INT: 5, POW: 5 }, hp: 15, db: '1D4', build: 1, mov: 4, skills: { '斗殴': 40 }, armor: 0, weapons: ['抓 1D6+DB', '咬 1D4'], sanLoss: '0/1D8', description: '被魔法或科学复活的尸体，缓慢但不知疲倦。' },
    '幽灵': { type: 'undead', attrs: { INT: 55, POW: 70 }, hp: 0, mov: 0, skills: { '恐吓': 70 }, armor: 0, sanLoss: '0/1D6', description: '无法安息的亡魂。物理攻击无效，只能通过完成遗愿或驱魔仪式来驱逐。' },
    '克苏鲁的星之眷族': { type: 'monster', attrs: { STR: 140, CON: 100, SIZ: 130, DEX: 40, INT: 70, POW: 80 }, hp: 23, db: '3D6', build: 4, mov: 8, swim: 12, skills: { '斗殴': 70 }, armor: 10, weapons: ['触手 2D6+DB'], sanLoss: '1D10/1D100', description: '克苏鲁的巨型仆从，章鱼头的星间巨人。' },
    '格拉基仆从': { type: 'monster', attrs: { STR: 80, CON: 80, SIZ: 80, DEX: 40, INT: 70, POW: 50 }, hp: 16, db: '1D6', build: 2, mov: 5, skills: { '斗殴': 45 }, armor: 0, weapons: ['爪 1D6+DB'], sanLoss: '0/1D8', description: '格拉基的不死仆从。不是格拉基本体。' },
    '哈斯塔化身': { type: 'monster', attrs: { STR: 60, CON: 60, SIZ: 65, DEX: 70, INT: 80, POW: 100 }, hp: 12, db: '1D4', build: 1, mov: 8, skills: { '斗殴': 50 }, armor: 0, weapons: ['触碰 1D6'], sanLoss: '1/1D10', description: '黄印附身的人形。不是哈斯塔本体。' }
};

const SUMMARY_HUMAN_IDS = new Set(['cultist', 'security_guard', 'asylum_attendant', 'deepone_hybrid']);

/** Min query length for substring fuzzy match (blocks 教/者/深/鬼 single-char mis-hits). */
const MIN_FUZZY_LEN = 2;

/**
 * creatures_summary id → CoCNpcTemplates key when Chinese names match exactly.
 * Built at load; does not use includes() (avoids cthulhu→星之眷族, deepone_hybrid→深潜者).
 */
const SUMMARY_ID_TO_TEMPLATE = Object.create(null);
Object.keys(CoCCreatures).forEach((id) => {
    const row = CoCCreatures[id];
    const name = row && row.name;
    if (name && CoCNpcTemplates[name]) {
        SUMMARY_ID_TO_TEMPLATE[id] = name;
        SUMMARY_ID_TO_TEMPLATE[String(id).toLowerCase()] = name;
    }
});

/**
 * Convert creatures_summary row → spawn_npc-compatible enemy stub.
 * @param {object} row
 * @param {object} [overrides]
 */
export function npcFromCreatureSummary(row, overrides) {
    if (!row) return null;
    const o = overrides || {};
    const hp = o.hp != null ? Number(o.hp) : (Number(row.hp) || 10);
    const type = SUMMARY_HUMAN_IDS.has(row.id) ? 'human' : 'monster';
    const npc = {
        name: o.name || row.name || row.id,
        isEnemy: true,
        type,
        creatureId: row.id,
        sourceTable: 'creatures_summary',
        attrs: {
            STR: o.str != null ? Number(o.str) : (Number(row.str) || 50),
            CON: o.con != null ? Number(o.con) : (Number(row.con) || 50),
            SIZ: o.siz != null ? Number(o.siz) : (Number(row.siz) || 50),
            DEX: o.dex != null ? Number(o.dex) : (Number(row.dex) || 50)
        },
        hp,
        maxHp: hp,
        db: o.db || '0',
        build: 0,
        mov: o.mov != null ? Number(o.mov) : (Number(row.mov) || 8),
        armor: o.armor != null ? Number(o.armor) : (Number(row.armor) || 0),
        skills: {},
        weapons: row.attacks ? [String(row.attacks)] : [],
        attacks: row.attacks || '',
        description: o.description != null ? o.description : '',
        sanLoss: row.san || ''
    };
    if (o.description) npc.description = o.description;
    return stampSpawnDerived(npc, {
        type: type,
        hp: (row.hp != null && row.hp !== '') ? row.hp : undefined,
        db: o.db != null ? o.db : row.db,
        build: o.build != null ? o.build : row.build,
        mov: o.mov != null ? o.mov : row.mov
    });
}

function applyNpcOverrides(npc, overrides) {
    if (!overrides || !npc) return npc;
    if (overrides.name) npc.name = overrides.name;
    if (overrides.hp != null) {
        npc.hp = Number(overrides.hp);
        npc.maxHp = Number(overrides.hp);
    }
    if (overrides.armor != null) npc.armor = Number(overrides.armor);
    if (overrides.description) npc.description = overrides.description;
    return npc;
}

function buildFromTemplateRecord(tmpl, defaultName, overrides) {
    var npc = {
        name: (overrides && overrides.name) || defaultName,
        isEnemy: true,
        type: tmpl.type || 'human',
        sourceTable: 'npc_templates',
        attrs: Object.assign({}, tmpl.attrs || {}),
        hp: tmpl.hp != null && tmpl.hp !== '' ? tmpl.hp : 10,
        maxHp: tmpl.hp != null && tmpl.hp !== '' ? tmpl.hp : 10,
        db: tmpl.db || '0',
        build: tmpl.build || 0,
        mov: tmpl.mov || 7,
        armor: tmpl.armor || 0,
        skills: Object.assign({}, tmpl.skills || {}),
        weapons: (tmpl.weapons || []).slice(),
        description: tmpl.description || '',
        sanLoss: tmpl.sanLoss || ''
    };
    if (tmpl.fly) npc.fly = tmpl.fly;
    if (tmpl.swim) npc.swim = tmpl.swim;
    if (tmpl.spells) npc.spells = tmpl.spells.slice();
    if (tmpl.san) npc.sanity = tmpl.san;
    applyNpcOverrides(npc, overrides);
    return stampSpawnDerived(npc, tmpl);
}

/**
 * Copy written db/build/mov/hp/SAN onto derived.
 * Humans missing db/build/mov use bodyStatsFromAttrs (same bands as calculateDerived).
 * Book numbers stay when hp is written. Missing hp with CON and SIZ uses floor((CON+SIZ)/10).
 */
function stampSpawnDerived(npc, source) {
    if (!npc) return npc;
    const src = source || {};
    const human = src.type === 'human' || npc.type === 'human';
    const wroteDb = src.db != null && src.db !== '';
    const wroteBuild = src.build != null && src.build !== '';
    const wroteMov = src.mov != null && src.mov !== '';
    if (human && npc.attrs && (!wroteDb || !wroteBuild || !wroteMov)) {
        const body = bodyStatsFromAttrs(npc.attrs);
        if (!wroteDb) npc.db = body.db;
        if (!wroteBuild) npc.build = body.build;
        if (!wroteMov) npc.mov = body.mov;
    }
    const immune = /物理攻击无效/.test(String(src.description || npc.description || ''));
    const wroteHp = src.hp != null && src.hp !== '' && Number.isFinite(Number(src.hp));
    if (!wroteHp && !immune && npc.attrs) {
        const con = Number(npc.attrs.CON);
        const siz = Number(npc.attrs.SIZ);
        if (Number.isFinite(con) && Number.isFinite(siz)) {
            const calc = Math.floor((con + siz) / 10);
            npc.hp = calc;
            npc.maxHp = calc;
        }
    }
    const hp = Number(npc.hp);
    const maxHp = Number(npc.maxHp != null ? npc.maxHp : npc.hp);
    const saneHp = Number.isFinite(hp) ? hp : 0;
    const saneMax = Number.isFinite(maxHp) ? maxHp : saneHp;
    npc.derived = Object.assign({}, npc.derived, {
        db: npc.db,
        build: npc.build,
        mov: npc.mov,
        hp: saneHp,
        maxHp: saneMax
    });
    if (/物理攻击无效/.test(String(src.description || npc.description || ''))) {
        npc.physicalImmune = true;
    }
    if (src.san != null && src.san !== '') {
        npc.sanity = src.san;
        npc.derived.sanity = src.san;
    } else if (typeof npc.sanity === 'number') {
        npc.derived.sanity = npc.sanity;
    }
    return npc;
}

/**
 * Labels for spawn_npc error hints (templates + summary-only Chinese/English ids).
 */
export function listSpawnableTemplateLabels() {
    const labels = Object.keys(CoCNpcTemplates);
    const seen = new Set(labels);
    Object.keys(CoCCreatures).forEach((id) => {
        const row = CoCCreatures[id];
        const name = row && row.name;
        if (name && !seen.has(name)) {
            // skip if fuzzy-covered by an existing template key
            let covered = false;
            for (const k of labels) {
                if (k.includes(name) || name.includes(k)) { covered = true; break; }
            }
            if (!covered) {
                seen.add(name);
                labels.push(name);
            }
        }
        if (id && !seen.has(id)) {
            seen.add(id);
            labels.push(id);
        }
    });
    return labels;
}

/**
 * Resolve overlapping summary id/name to a template key (exact Chinese name only).
 * @param {string} key
 * @returns {string|null}
 */
function templateKeyForSummaryAlias(key) {
    if (!key) return null;
    const direct = SUMMARY_ID_TO_TEMPLATE[key] || SUMMARY_ID_TO_TEMPLATE[String(key).toLowerCase()];
    if (direct) return direct;
    const row = lookupCreature(key);
    if (row && row.name && CoCNpcTemplates[row.name]) return row.name;
    if (row && row.id && SUMMARY_ID_TO_TEMPLATE[row.id]) return SUMMARY_ID_TO_TEMPLATE[row.id];
    return null;
}

/**
 * Fuzzy template match: query length ≥ MIN_FUZZY_LEN; prefer longest template key
 * that contains the query (e.g. 深潜→深潜者). Also allow query containing a template
 * key of length ≥ MIN_FUZZY_LEN.
 * @param {string} key
 * @returns {string|null} template key
 */
function fuzzyMatchTemplateKey(key) {
    if (!key || key.length < MIN_FUZZY_LEN) return null;
    let best = null;
    let bestLen = -1;
    for (const k of Object.keys(CoCNpcTemplates)) {
        if (k.includes(key) || (k.length >= MIN_FUZZY_LEN && key.includes(k))) {
            if (k.length > bestLen) {
                best = k;
                bestLen = k.length;
            }
        }
    }
    return best;
}

/**
 * 从模板生成 NPC/怪物对象。
 * Order: exact template → summary alias → exact summary row → fuzzy (≥2 chars) → summary-only.
 */
export function generateNpcFromTemplate(templateName, overrides) {
    if (templateName == null || String(templateName).trim() === '') return null;
    const key = String(templateName).trim();

    if (CoCNpcTemplates[key]) {
        return buildFromTemplateRecord(CoCNpcTemplates[key], key, overrides);
    }

    const aliasKey = templateKeyForSummaryAlias(key);
    if (aliasKey && CoCNpcTemplates[aliasKey]) {
        return buildFromTemplateRecord(CoCNpcTemplates[aliasKey], aliasKey, overrides);
    }

    const exactSummary = lookupCreature(key);
    if (exactSummary) return npcFromCreatureSummary(exactSummary, overrides);

    const fuzzyKey = fuzzyMatchTemplateKey(key);
    if (fuzzyKey) {
        return buildFromTemplateRecord(CoCNpcTemplates[fuzzyKey], fuzzyKey, overrides);
    }
    return null;
}

/** @returns {Readonly<Record<string, string>>} summary id → template key (tests / debug) */
export function getSummaryIdToTemplateMap() {
    return Object.freeze(Object.assign({}, SUMMARY_ID_TO_TEMPLATE));
}


if (typeof window !== 'undefined') {
    window.CoCNpcTemplates = CoCNpcTemplates;
    window.generateNpcFromTemplate = generateNpcFromTemplate;
    window.listSpawnableTemplateLabels = listSpawnableTemplateLabels;
}
