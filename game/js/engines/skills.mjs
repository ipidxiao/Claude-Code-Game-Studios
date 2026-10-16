// ESM engine module — source for browser build
// Split from js/engines/skills.js
import { CoCBaseSkills } from '../data/skills.mjs';
import { CoCJobs } from '../data/jobs.mjs';

export function attachSkillsEngine(CoCEngine) {
/**
 * 解析职业点数公式
 * @param {string} formula - 公式字符串 (例如 "EDU×4")
 * @param {Object} attrs - 角色属性对象
 * @returns {number} 计算后的点数
 */
const parsePoints = (formula, attrs = {}) => {
    const map = {
        "力量": "STR", "STR": "STR",
        "体质": "CON", "CON": "CON",
        "体型": "SIZ", "SIZ": "SIZ",
        "敏捷": "DEX", "DEX": "DEX",
        "外貌": "APP", "APP": "APP",
        "智力": "INT", "INT": "INT",
        "意志": "POW", "POW": "POW",
        "教育": "EDU", "EDU": "EDU"
    };
    const normalizedFormula = String(formula || '').replace(/\s+/g, '').replace(/[+]/g, '＋').replace(/[*xX]/g, '×');
    const total = normalizedFormula.split('＋').reduce((sum, part) => {
        const [rawAttr = '', rawMult = '1'] = part.split('×');
        const candidates = rawAttr.split('或').map((key) => Number(attrs[map[key] || key] || 0));
        const maxAttr = Math.max(0, ...candidates.filter(Number.isFinite));
        return sum + (maxAttr * (parseInt(rawMult, 10) || 1));
    }, 0);
    return total || (Number(attrs.EDU) || 0) * 4;
};
  Object.assign(CoCEngine, {
    /**
     * Core skill catalog — sourced from js/data/skills.js (window.CoCBaseSkills).
     * Referenced by getSkillValue(), isVisibleSkillName(), and all skill alias logic.
     */
    BaseSkills: CoCBaseSkills || {},

    Occupations: (CoCJobs || []).map(line => {
        let parts = line.split("|");
        return { name: parts[0], calcPoints: (attrs) => parsePoints(parts[1], attrs), classSkillsString: parts[2] || "" };
    }),

    /**
     * 判断技能名是否为未命名的二级技能占位符。
     * 例如："射击："、"格斗①"、"其他格斗" 均不应在角色创建/角色卡中显示。
     */
    isPlaceholderSecondarySkillName: (skillName) => {
        const name = String(skillName || '').trim();
        if (!name) return true;
        if (/[：:]\s*$/.test(name)) return true;
        const numberedPlaceholder = /[①②③④⑤⑥⑦⑧⑨⑩]\s*$/.test(name) || /(?:^|[：:])\s*\d+\s*$/.test(name);
        if (numberedPlaceholder) return true;
        const colonParts = name.split(/[：:]/).map(part => part.trim()).filter(Boolean);
        if (name.includes('：') || name.includes(':')) {
            const leafName = colonParts[colonParts.length - 1] || '';
            if (!leafName || /^其他/.test(leafName) || /^[①②③④⑤⑥⑦⑧⑨⑩\d]+$/.test(leafName)) return true;
        }
        return /^其他(技艺|格斗|外语|母语|科学|驾驶|射击|学识|生存)$/.test(name);
    },

    /**
     * 判断 BaseSkills 中某个条目是否已经是明确命名的二级技能。
     * 例如："斗殴" 有 alias "格斗：斗殴"，因此即使带 children，也应继续显示。
     */
    isConcreteSecondarySkill: (skillName) => {
        const name = String(skillName || '').trim();
        const def = CoCEngine?.BaseSkills?.[name];
        if (!def) {
            return (name.includes('：') || name.includes(':')) && !CoCEngine.isPlaceholderSecondarySkillName(name);
        }
        if (def.isConcreteSpecialization === true) return true;
        return Array.isArray(def.aliases) && def.aliases.some(alias => {
            const normalized = String(alias || '').trim();
            if (!normalized || CoCEngine.isPlaceholderSecondarySkillName(normalized)) return false;
            const leaf = normalized.split(/[：:]/).map(part => part.trim()).filter(Boolean).pop();
            return leaf === name;
        });
    },

    /**
     * UI 可见技能过滤。带二级分支但未命名的父级/占位技能会隐藏；
     * 明确命名的二级技能，如 "斗殴"、"手枪"、"汽车驾驶"、"射击：步枪" 保留。
     */
    isVisibleSkillName: (skillName) => {
        const name = String(skillName || '').trim();
        if (!name || CoCEngine.isPlaceholderSecondarySkillName(name)) return false;
        const def = CoCEngine.BaseSkills[name];
        if (def && def.requiresSpecialization && !CoCEngine.isConcreteSecondarySkill(name)) return false;
        if (def && def.isParent && !CoCEngine.isConcreteSecondarySkill(name) && def.requiresSpecialization !== false) return false;
        return true;
    },

    getVisibleSkillNames: (extraSkills = []) => {
        const names = [...Object.keys(CoCEngine.BaseSkills || {}), ...(extraSkills || [])];
        const result = [];
        for (const rawName of names) {
            const name = String(rawName || '').trim();
            if (name && !result.includes(name) && CoCEngine.isVisibleSkillName(name)) result.push(name);
        }
        return result;
    },

    isChildOfParentSkill: (skillName, parentName) => {
        const skill = String(skillName || '').trim();
        const parent = String(parentName || '').trim();
        const parentDef = CoCEngine.BaseSkills[parent];
        const skillDef = CoCEngine.BaseSkills[skill];
        if (!skill || !parent || skill === parent) return false;
        const skillAliases = Array.isArray(skillDef?.aliases) ? skillDef.aliases : [];
        const candidates = [skill, ...skillAliases].map(v => String(v || '').trim()).filter(Boolean);
        const aliasParentDef = parentDef || Object.values(CoCEngine.BaseSkills || {}).find(def =>
            Array.isArray(def.aliases) && def.aliases.some(alias => String(alias || '').trim().startsWith(parent + '：') || String(alias || '').trim().startsWith(parent + ':'))
        );
        const parentChildren = Array.isArray(aliasParentDef?.children) ? aliasParentDef.children.map(v => String(v || '').trim()) : [];
        if (candidates.some(candidate => parentChildren.includes(candidate))) return true;
        if (candidates.some(candidate => candidate.startsWith(parent + '：') || candidate.startsWith(parent + ':'))) return true;
        return false;
    },

    isClassSkillName: (skillName, classSkillsString = '') => {
        const skill = String(skillName || '').trim();
        if (!skill) return false;
        const classSkills = String(classSkillsString || '')
            .split(/[，,、;；\s]+/)
            .map(v => v.trim())
            .filter(Boolean);
        if (classSkills.includes(skill)) return true;
        for (const parentName of classSkills) {
            if (CoCEngine.isChildOfParentSkill(skill, parentName)) return true;
        }
        return false;
    },

    /**
     * 获取角色技能值 (核心逻辑，严禁修改匹配顺序)
     */
    getSkillValue: (char, skillName) => {
        const attrMap = {
            "力量": "STR", "智力": "INT", "体质": "CON", "敏捷": "DEX",
            "外貌": "APP", "体型": "SIZ", "意志": "POW", "教育": "EDU",
            "运气": "LUCK", "幸运": "LUCK",
            "灵感": "INT", "Idea": "INT", "idea": "INT",
            "知识": "EDU", "Know": "EDU", "know": "EDU",
            "Luck": "LUCK", "luck": "LUCK"
        };
        const baseSkills = CoCEngine.BaseSkills;
        const pushUnique = (arr, value) => {
            if (value && !arr.includes(value)) arr.push(value);
        };
        const buildSkillCandidates = (name) => {
            const candidates = [];
            pushUnique(candidates, name);
            for (const key in baseSkills) {
                const sDef = baseSkills[key];
                if (sDef.aliases && sDef.aliases.includes(name)) {
                    pushUnique(candidates, key);
                    sDef.aliases.forEach((alias) => pushUnique(candidates, alias));
                }
                if (key === name && Array.isArray(sDef.aliases)) {
                    sDef.aliases.forEach((alias) => pushUnique(candidates, alias));
                }
                if (key === name && sDef.isParent && Array.isArray(sDef.children)) {
                    sDef.children.forEach((child) => {
                        pushUnique(candidates, child);
                        for (const otherKey in baseSkills) {
                            const other = baseSkills[otherKey];
                            if (other && other.aliases && other.aliases.includes(child)) {
                                pushUnique(candidates, otherKey);
                                other.aliases.forEach((alias) => pushUnique(candidates, alias));
                            }
                        }
                    });
                }
                if (sDef.isParent && typeof name === 'string') {
                    if (name.startsWith(key + '：')) {
                        const childSkillPart = name.split('：').slice(1).join('：');
                        pushUnique(candidates, childSkillPart);
                        pushUnique(candidates, key);
                    } else if (sDef.children && sDef.children.includes(name)) {
                        pushUnique(candidates, key);
                    }
                }
            }
            return candidates;
        };
        const getNumericSkillValue = (source, name) => {
            if (!source || source[name] === undefined || source[name] === null) return undefined;
            const raw = source[name];
            if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
            if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
            // draftChar.skillAllocations stores { occ, per } deltas, not a final skill value.
            // Treat it as "not assigned" here so creator getSkillTotal() can add occ/per exactly once.
            if (typeof raw === 'object') {
                for (const key of ['value', 'total', 'final', 'currentValue']) {
                    if (Number.isFinite(Number(raw[key]))) return Number(raw[key]);
                }
            }
            return undefined;
        };
        const getAssignedSkillValue = (name) => {
            const skillValue = getNumericSkillValue(char.skills, name);
            const allocationValue = getNumericSkillValue(char.skillAllocations, name);
            if (skillValue !== undefined && allocationValue !== undefined) return Math.max(skillValue, allocationValue);
            if (skillValue !== undefined) return skillValue;
            if (allocationValue !== undefined) return allocationValue;
            return undefined;
        };
        const getBaseSkillValue = (name) => {
            const def = baseSkills[name];
            if (!def) return undefined;
            if (def.isDynamic && def.dynamicCalc && char.attrs) return def.dynamicCalc(char);
            return def.base;
        };

        const candidates = buildSkillCandidates(skillName);

        if (char.isEnemy) {
            for (const name of candidates) {
                if (char.skills && char.skills[name] !== undefined) return char.skills[name];
            }
        }

        if (skillName === 'SAN' || skillName === '理智' || skillName === '理智值') {
            if (char.derived && typeof char.derived.sanity === 'number') return char.derived.sanity;
            if (typeof char.sanity === 'number') return char.sanity;
            return 0;
        }
        // Idea / Know / Luck and Chinese characteristic labels → attrs
        const attrKey = attrMap[skillName] || (CoCEngine.resolveSpecialCheck
            ? CoCEngine.resolveSpecialCheck(skillName)
            : null);
        if (attrKey && char.attrs && char.attrs[attrKey] != null) {
            const av = Number(char.attrs[attrKey]);
            if (Number.isFinite(av)) return av;
        }
        if (char.attrs && attrMap[skillName] && char.attrs[attrMap[skillName]] != null) {
            return char.attrs[attrMap[skillName]];
        }
        for (const name of candidates) {
            const assigned = getAssignedSkillValue(name);
            if (assigned !== undefined) return assigned;
        }
        if (candidates.includes('闪避') && !(char.skills && char.skills['闪避'] !== undefined)) {
            if (char.dodge) return char.dodge;
            if (char.attrs && char.attrs.DEX != null) {
                const dodge = getBaseSkillValue('闪避');
                if (dodge !== undefined) return dodge;
            }
            if (char.isEnemy) return 25;
        }
        if (char.isEnemy) return 25;
        for (const name of candidates) {
            if (name === '射击' && /冲锋枪|机枪/.test(String(skillName))) continue;
            const base = getBaseSkillValue(name);
            if (base !== undefined) return base;
        }
        return 0;
    }
});
}
