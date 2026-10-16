/**
 * Local scenario choice menu: skill (L1) → scenario sub-choices (L2).
 * Only choices defined on the current node are shown — no generic skill rolls.
 */

export function getChoiceSkill(choice) {
    if (!choice?.skillCheck) return null;
    return choice.skillCheck.skill || choice.skillCheck.skill_name || null;
}

export function getCharSkillRating(char, skillName, Engine) {
    if (!skillName || !char) return 0;
    if (Engine?.getSkillValue) {
        const v = Number(Engine.getSkillValue(char, skillName));
        return Number.isFinite(v) ? v : 0;
    }
    const direct = char.skills?.[skillName];
    return Number.isFinite(direct) ? direct : 0;
}

export function isScenarioChoiceAvailable(choice, char, opts = {}) {
    const { checkRequires, Engine } = opts;
    if (!choice?.label) return false;
    if (checkRequires && !checkRequires(choice)) return false;
    const skill = getChoiceSkill(choice);
    if (skill && getCharSkillRating(char, skill, Engine) <= 0) return false;
    return true;
}

export function mapScenarioChoice(c) {
    return {
        kind: 'scenario',
        id: c.id,
        label: c.label,
        next: c.next,
        skillCheck: c.skillCheck || null,
        effects: c.effects || null,
        requiresFlag: c.requiresFlag || null,
        requiresClueId: c.requiresClueId || null,
        requiresClueQuality: c.requiresClueQuality || null,
        useSeedClueQuality: !!c.useSeedClueQuality,
        branchByClueQuality: c.branchByClueQuality || null,
        falseLead: !!c.falseLead,
        falseNext: c.falseNext || null
    };
}

/**
 * @returns {{ groups: Array, available: Array, hasMenu: boolean }}
 */
export function buildScenarioChoiceMenu(choices, char, opts = {}) {
    const available = (choices || [])
        .filter((c) => isScenarioChoiceAvailable(c, char, opts))
        .map(mapScenarioChoice);

    const skillGroups = new Map();
    const otherChoices = [];

    for (const choice of available) {
        const skill = getChoiceSkill(choice);
        if (!skill) {
            otherChoices.push(choice);
            continue;
        }
        if (!skillGroups.has(skill)) {
            skillGroups.set(skill, {
                id: `skill:${skill}`,
                kind: 'skill_group',
                skill,
                label: skill,
                rating: getCharSkillRating(char, skill, opts.Engine),
                choices: []
            });
        }
        skillGroups.get(skill).choices.push(choice);
    }

    const groups = [...skillGroups.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh'));
    if (otherChoices.length) {
        groups.push({
            id: '__other',
            kind: 'action_group',
            skill: null,
            label: '其他行动',
            rating: null,
            choices: otherChoices
        });
    }

    return { groups, available, hasMenu: groups.length > 0 };
}

export function getMenuSubOptions(menu, groupId) {
    if (!menu || !groupId) return [];
    const group = menu.groups.find((g) => g.id === groupId);
    return group?.choices || [];
}

export const CoCScenarioChoiceMenu = {
    getChoiceSkill,
    getCharSkillRating,
    isScenarioChoiceAvailable,
    buildScenarioChoiceMenu,
    getMenuSubOptions,
    mapScenarioChoice
};

if (typeof window !== 'undefined') {
    window.CoCScenarioChoiceMenu = CoCScenarioChoiceMenu;
}
