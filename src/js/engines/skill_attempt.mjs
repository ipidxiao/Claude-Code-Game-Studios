/**
 * CoC 7e: a failed skill roll cannot be repeated in the same situation.
 * The only legal retry is one pushed roll (孤注一掷), if the skill is pushable.
 * Combat attacks, Dodge, SAN, Luck, and Cthulhu Mythos are not free-retried as
 * "the same Listen"; combat is a new attack each round.
 */

const COMBAT_SKILL_RE = /斗殴|格斗|射击|火器|手枪|步枪|霰弹|冲锋|机枪|闪避|Dodge|投掷/;
const UNPUSHABLE_RE = /克苏鲁神话|运气|幸运|Luck|灵感|Idea|知识|Know|闪避|Dodge|SAN|理智|斗殴|格斗|射击|火器|手枪|步枪|霰弹|冲锋|机枪|投掷/;

export function isCombatSkill(skillName) {
    return COMBAT_SKILL_RE.test(String(skillName || ''));
}

export function isPushableSkill(skillName) {
    const s = String(skillName || '').trim();
    if (!s) return false;
    return !UNPUSHABLE_RE.test(s);
}

export function skillAttemptKey(spec) {
    const charName = String(spec?.charName || '').trim();
    const skill = String(spec?.skill || '').trim();
    const situation = String(spec?.situation || '').trim();
    return `${charName}\u001f${skill}\u001f${situation}`;
}

export function situationFromState(gameState, spec = {}) {
    if (spec.situation) return String(spec.situation);
    const r = gameState?.scenarioRunner;
    if (r?.active) {
        const id = spec.choiceId || spec.nextNode || r.pendingBranch?.fromChoice || r.pendingBranch?.nextNode || r.currentNodeId || '';
        return `sc:${r.scenarioId || ''}:${id}`;
    }
    if (gameState?.pendingRuleCheck) {
        const p = gameState.pendingRuleCheck;
        return `rule:${p.kind || 'rule'}:${p.id || p.target || ''}`;
    }
    if (gameState?.combat?.active && isCombatSkill(spec.skill)) {
        return `combat:${gameState.combat.round || 0}:${gameState.combat.currentTurnIdx || 0}:${spec.skill || ''}`;
    }
    const actionKey = onlineActionKey(gameState);
    return `loc:${gameState?.currentLocation || ''}:${spec.skill || ''}:${actionKey}`;
}

function onlineActionKey(gameState) {
    if (gameState && gameState._onlineActionKey) return String(gameState._onlineActionKey);
    const hist = (gameState && gameState.chatHistory) || [];
    for (let i = hist.length - 1; i >= 0; i--) {
        const m = hist[i];
        if (m && m.role === 'user' && m.content) {
            const t = String(m.content).trim().slice(0, 64);
            let h = 0;
            for (let j = 0; j < t.length; j++) h = ((h << 5) - h + t.charCodeAt(j)) | 0;
            return Math.abs(h).toString(36);
        }
    }
    return '';
}

function attemptsOf(gameState) {
    if (!gameState.skillAttempts || typeof gameState.skillAttempts !== 'object') {
        gameState.skillAttempts = {};
    }
    return gameState.skillAttempts;
}

/**
 * @returns {{ ok: boolean, reason?: string }}
 */
export function canAttemptSkill(gameState, spec = {}) {
    const skill = String(spec.skill || '').trim();
    if (isCombatSkill(skill) || spec.exempt) return { ok: true, exempt: true };

    const key = skillAttemptKey({
        charName: spec.charName,
        skill,
        situation: situationFromState(gameState, spec)
    });
    const rec = attemptsOf(gameState)[key];
    if (spec.isPush) {
        if (!rec || rec.success) {
            return { ok: false, reason: `推动只能用于刚刚失败的【${skill}】检定。` };
        }
        if (!isPushableSkill(skill) || rec.level === '大失败') {
            return { ok: false, reason: `【${skill}】不可推动。` };
        }
        if (rec.pushed) {
            return { ok: false, reason: `【${skill}】推动只能一次。失败的检定不能再掷。` };
        }
        // 7e: a pushed roll repeats the original roll — same difficulty, worse consequences —
        // and, being the same roll, the same visibility (ADR-0003 §3).
        return { ok: true, difficulty: rec.difficulty || 'normal', original: { found: true, vis: rec.vis } };
    }
    if (!rec || rec.success) return { ok: true };
    return {
        ok: false,
        reason: `【${skill}】已在同一情境失败。克苏鲁规则：不可重复检定。改变情境，或推动（孤注一掷）一次。`
    };
}

export function recordSkillAttempt(gameState, spec = {}, result = {}) {
    const skill = String(spec.skill || '').trim();
    if (isCombatSkill(skill) || spec.exempt) return;
    const key = skillAttemptKey({
        charName: spec.charName,
        skill,
        situation: situationFromState(gameState, spec)
    });
    const prev = attemptsOf(gameState)[key] || {};
    gameState.skillAttempts[key] = {
        skill,
        success: !!result.success,
        pushed: !!(spec.isPush || prev.pushed),
        level: result.level || prev.level || '',
        difficulty: spec.difficulty || prev.difficulty || 'normal'
    };
    const vis = spec.isPush ? prev.vis : spec.vis;
    if (vis) gameState.skillAttempts[key].vis = vis;
}

export function clearSkillAttempts(gameState) {
    if (gameState) gameState.skillAttempts = {};
}

export function attachSkillAttemptEngine(CoCEngine) {
    Object.assign(CoCEngine, {
        isCombatSkill,
        isPushableSkill,
        skillAttemptKey,
        situationFromState,
        canAttemptSkill,
        recordSkillAttempt,
        clearSkillAttempts
    });
}
