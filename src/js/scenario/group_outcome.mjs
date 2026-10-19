/**

 * Group skill / action outcome narration for local scenario multi-player.

 */



/**

 * @param {Array<{ success?: boolean, charName?: string, skill?: string, option?: object }>} skillPicks

 * @param {'any'|'all'|'majority'} [aggregate]

 */

export function computeGroupSkillOutcome(skillPicks, aggregate = 'any') {

    const picks = skillPicks || [];

    const successes = picks.filter((p) => p && p.success);

    const failures = picks.filter((p) => p && !p.success);

    const total = picks.length;

    let pass = false;

    if (aggregate === 'all') pass = total > 0 && successes.length === total;

    else if (aggregate === 'majority') pass = successes.length > failures.length;

    else pass = successes.length > 0;



    return {

        total,

        successCount: successes.length,

        failCount: failures.length,

        allSuccess: total > 0 && successes.length === total,

        allFailure: total > 0 && failures.length === total,

        mixed: successes.length > 0 && failures.length > 0,

        pass,

        aggregate,

        successes,

        failures,

    };

}



function nameList(list) {

    return (list || []).map((p) => p.charName).filter(Boolean).join('、') || '调查员';

}



/**

 * Build KP-facing narrative after grouped skill checks.

 */

/** Skip branch-node setup prose when groupOutcome already narrates the check beat. */
export function shouldSkipBranchSetupNarrative(branchNode, opts = {}) {
    return !!(opts.afterGroupNarrative && branchNode?.groupOutcome);
}

export function buildGroupSkillNarrative(skillPicks, branchNode, outcome) {

    if (!skillPicks?.length || !outcome) return '';



    const hints = branchNode?.groupOutcome;

    if (outcome.allSuccess && hints?.allSuccess) return hints.allSuccess;

    if (outcome.allFailure && hints?.allFailure) return hints.allFailure;

    if (outcome.mixed && hints?.mixed) return hints.mixed;



    const skill = skillPicks[0]?.skill || '检定';

    const action = skillPicks[0]?.option?.label || '行动';

    const winNames = nameList(outcome.successes);

    const failNames = nameList(outcome.failures);



    if (outcome.allSuccess) {

        if (outcome.total === 1) {

            return `${winNames}完成「${action}」。【${skill}】检定成功——对方的防线出现一道裂缝，空气里那种压迫感似乎松动了一瞬，但远处仍有某种东西在注视你们，像潮声在黑暗里不肯退去；你们交换眼神，都知道这不过是暴风雨前短暂而脆弱的安静。`;

        }

        return `${winNames}彼此打暗号，协力完成「${action}」。每一次【${skill}】都落在要害：对方的戒心像被撬开的门缝，露出后面更深的阴影——局面明显向你们倾斜，可你们都知道，这不过是暴风雨前的片刻安静。`;

    }

    if (outcome.allFailure) {

        return `${failNames}依次尝试「${action}」，【${skill}】却接连失手。对方的目光冷下来，语气里多了不容置疑的拒绝；房间里的温度仿佛也降了几度，你们听见自己的心跳在耳膜里敲得过于响亮，而退路正在身后一寸寸变窄。`;

    }

    if (outcome.mixed) {

        return `${failNames}的【${skill}】在关键时刻泄了气；但${winNames}接话时抓住了破绽（「${action}」）。局势一度濒临失控，可成功者仍抢在恶化前扳回一线——只是时间并不站在你们这边，暗处的注视也未曾移开。`;

    }

    return '';

}



/**

 * Narrative when investigators picked different non-skill actions.

 */

export function buildGroupSplitActionNarrative(picks) {

    if (!picks || picks.length <= 1) return '';

    const labels = picks.map((p) => `${p.charName}：${p.option?.label || '行动'}`);

    const uniqueNext = new Set(picks.map((p) => p.option?.next).filter(Boolean));

    if (uniqueNext.size <= 1) return '';

    return `小队在这一刻分头行动——${labels.join('；')}。脚步声在各自的方向散开，像被同一阵看不见的潮水分割开；你们仍共享同一片危险，却暂时无法看见彼此，只能凭直觉判断下一声异响会从何处传来。`;

}



/**

 * Resolve aggregate rule from first skill pick's choice config.

 */

export function resolveSkillAggregate(skillPicks) {

    const opt = skillPicks?.[0]?.option;

    const raw = opt?.skillCheck?.aggregate || opt?.skillCheck?.mode;

    if (raw === 'all') return 'all';

    if (raw === 'majority') return 'majority';

    return 'any';

}



/**

 * Map forced-roll session results to skillPick shape.

 */

export function mapForcedResultsToSkillPicks(results, skill, optionLabel) {

    return (results || []).map((r) => ({

        charName: r.charName,

        skill: r.skill || skill,

        success: r.success,

        level: r.level,

        option: { label: optionLabel || `【${skill}】检定` },

    }));

}



export const CoCGroupOutcome = {

    computeGroupSkillOutcome,

    shouldSkipBranchSetupNarrative,

    buildGroupSkillNarrative,

    buildGroupSplitActionNarrative,

    resolveSkillAggregate,

    mapForcedResultsToSkillPicks,

};



if (typeof window !== 'undefined') {

    window.CoCGroupOutcome = CoCGroupOutcome;

}


