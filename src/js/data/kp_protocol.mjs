// KP protocol — output order, combat tags, global state (not a scenario).

export const KP_PROTOCOL = {
    SYSTEM_NAME: 'KP_PROTOCOL',

    CORE_RULES: {
        SYSTEM_AUTHORITY: {
            ruleset: 'Call of Cthulhu 7th Edition',
            strict_execution: true,
            no_homebrew_override: false
        },
        ERA_RESTRICTION: {
            enforce_period_accuracy: true,
            forbid_future_technology: true,
            // Block tech/items only when investigators lack in-game knowledge or acquisition record
            knowledge_gated: true
        },
        ITEM_RULES: {
            require_acquisition_record: true,
            forbid_item_creation_without_source: true,
            mythos_items_require_special_check: true
        },
        SANITY_RULE: {
            abnormal_items_trigger_SAN_check: true
        },
        LOGIC_ENFORCEMENT: {
            forbid_result_skipping: true,
            reject_unreasonable_actions: true
        }
    },

    OUTPUT_PROTOCOL: {
        STEP_ORDER: ['DICE_PHASE', 'STORY_PHASE', 'NARRATION_PHASE', 'INTERACTION_PHASE', 'ACTION_ORDER_PHASE'],
        DICE_PHASE: {
            REQUIRE: { show_formula: true, true_random: true, separate_from_story: true },
            FORMAT: ['action_feedback', 'dice_result', 'success_level']
        },
        STORY_PHASE: {
            STYLE: { mode: 'original_text', no_numbers: true, immersive_only: true },
            STRUCTURE: { no_length_limit: true },
            RULES: { no_meta_language: true, no_irrelevant_narration: true }
        },
        NARRATION_PHASE: { visible_info_only: true, no_dice_required: true },
        INTERACTION_PHASE: { include: ['visible_clues', 'interactive_objects', 'hidden_events'] },
        ACTION_ORDER_PHASE: { format: 'A2-B1-C1' }
    },

    ACTION_SYSTEM: {
        TURN_LIMIT: {
            per_character: { max_actions_per_turn: 'defined_by_rules' },
            overflow: { extra_actions_ignored: true }
        },
        VALIDATION: {
            IF_action_skips_process: { reject_action: true },
            IF_action_breaks_logic: { reject_action: true }
        },
        FORCED_CHECK: { environment_trigger: { auto_roll: true } },
        PLAYER_TRIGGERED_CHECK: { REQUIRE: { wait_for_player_input: true } }
    },

    NARRATIVE_CORE: {
        investigation_driven: true,
        progressive_horror: true,
        unknowable_fear: true,
        moral_ambiguity: true,
        no_heroism: true,
        ENFORCEMENT: {
            every_30_minutes: { require_event: { one_of: ['clue', 'danger', 'choice'] } },
            clue_rule: { min_paths: 3 },
            sensory_rule: { max_focus: 1 }
        }
    },

    GLOBAL_STATE: {
        TIME: { date: null, hour: null, environment: { entropy_increment: 0 } },
        PHASE: 'CALM',
        DOOM_CLOCK: 0,
        /** Engine-driven doom escalation (cap 24); mirrored to kpEngine.global.doomClock */
        DOOM_CLOCK_DRIVERS: {
            attention_positive: '+1 per positive ATTENTION delta (updateAttention; skipped when antagonist tick owns doom)',
            time_passage: '+1 when advanceGameTime / KpGameLoop advances clock',
            key_clue: '+1 when mark_clue_status sets status=key',
            mythos_contact: '+2 on mythos antagonist tick (study_tome / cast_spell); not stacked with attention_positive',
            combat_victory: '+1 on combat_win antagonist tick; not stacked with attention_positive',
            antagonist_ambush: '+1 when ambush roll succeeds on investigate',
            cap: 24
        },
        ATTENTION_LEVEL: 0,
        PLAYER_POWER: 0
    },

    SCALING_SYSTEM: {
        PLAYER_EVALUATION: {
            INPUT: ['avg_damage', 'rounds', 'resource_use', 'hp_loss'],
            LOGIC: {
                IF_avg_damage_gt_threshold: { PLAYER_POWER: '+2' },
                IF_rounds_lte_2: { PLAYER_POWER: '+2' },
                IF_resource_use_low: { PLAYER_POWER: '+1' },
                IF_hp_loss_none: { PLAYER_POWER: '+1' }
            }
        },
        ATTENTION_SYSTEM: {
            UPDATE: { combat_win: 1, mythos: 2, key_clue: 1 },
            THRESHOLD: { 4: 'ENEMY_ADAPT', 7: 'ACTIVE_HUNT', 9: 'REALITY_DISTORT' }
        }
    },

    ENEMY_SYSTEM: {
        SCALE: {
            BY_PLAYER_POWER: {
                '>=3': { hp_mult: 1.5 },
                '>=5': { hp_mult: 2, armor: 2 },
                '>=7': { hp_mult: 3, armor: 4, damage_resistance: true }
            },
            BY_ATTENTION: {
                '>=4': { evasion: true },
                '>=6': { regeneration: true },
                '>=8': { phase_shift: true },
                '>=9': { reality_anchor: true }
            }
        },
        ANTI_ONE_SHOT: {
            IF_HP_lte_0: {
                IF_has_reality_anchor: { cancel_death: true },
                ELSE_IF_ATTENTION_gte_6: { trigger_mutation: true }
            }
        }
    },

    ACTIVE_HUNT: {
        TRIGGER: { ATTENTION_gte: 7 },
        SPAWN: {
            hunter: {
                target: 'weakest_player',
                behavior: { ambush: true, track: true },
                escalation: { each_encounter: { speed: 1, damage: 1 } }
            }
        }
    },

    REALITY_DISTORTION: {
        TRIGGER: { ATTENTION_gte: 9 },
        EFFECT: { bullet_fail: 0.4, spatial_error: true, false_death: true }
    },

    COMBAT_SYSTEM: {
        ACTION_TAXONOMY: 'COC_7E_COMBAT_ACTIONS',
        REQUIRE: {
            tactical_diversity: true,
            narrative_acknowledge_options: true,
            // Legacy defensive quartet — still encouraged each encounter
            defensive_one_of: ['survive', 'escape', 'interrupt', 'protect']
        },
        IF_damage_only_strategy: { APPLY: { enemy_immunity: true } }
    },

    NPC_SYSTEM: {
        trust: [-5, 5],
        fear: [0, 5],
        memory_tracking: true,
        hidden_identity: true
    },

    RESOURCE_SYSTEM: {
        inventory_rule: { must_have_record: true },
        hidden_item_limit: { per_player: 1 }
    },

    FORBIDDEN_SYSTEM: {
        usage: {
            grant_power: true,
            cost_required: ['memory_loss', 'sensory_loss', 'emotional_loss']
        }
    },

    SCENE_TEMPLATE: {
        REQUIRE: { clues: 3, weird_points: 2, skill_hooks: true }
    },

    GAME_LOOP: {
        steps: [
            'UPDATE ATTENTION',
            'EVALUATE PLAYER_POWER',
            'FOR scene: APPLY SCENE_TEMPLATE',
            'FOR enemy: SCALE enemy, APPLY ANTI_ONE_SHOT',
            'IF ATTENTION >= 7: ACTIVATE ACTIVE_HUNT',
            'IF ATTENTION >= 9: APPLY REALITY_DISTORTION',
            'RUN COMBAT_SYSTEM',
            'UPDATE DOOM_CLOCK',
            'UPDATE PHASE'
        ]
    }
};

/**
 * CoC 7e combat action taxonomy — global KP protocol (not campaign-specific).
 * Categories mirror the official action palette; tags drive recordCombatAction / anti-damage-only checks.
 *
 * Interaction model (not engine-enforced each round):
 * - Offline: story_combat quick actions are the primary player input path.
 * - Online: free-form dialogue is primary; this taxonomy is optional menu guidance for UI/prompts.
 */
export const COC_7E_COMBAT_ACTIONS = {
    GUIDANCE: {
        narrativeFlex: true,
        antiDamageOnly: true,
        note: 'Optional menu guidance — offline quick actions primary, online free dialogue primary. Pure damage spam still triggers enemy immunity via recordCombatAction.'
    },
    CATEGORIES: [
        {
            id: 'defensive',
            label_zh: '防御与战术应对',
            actions: [
                { id: 'survive', label_zh: '生存', tags: ['survive', '生存', '闪避', 'dodge', 'defense', '防御', '规避', '掩体', 'cover'], desc: 'Dodge, defensive stance, seek cover' },
                { id: 'escape', label_zh: '逃脱', tags: ['escape', '逃脱', 'flee', '撤退', '挣脱', 'break free', '脱离'], desc: 'Flee or break free from grapple/restraint' },
                { id: 'interrupt', label_zh: '打断', tags: ['interrupt', '打断', '延迟', 'delay', '预备', 'prepared', 'hold action'], desc: 'Delay action or prepared interrupt' },
                { id: 'protect', label_zh: '保护', tags: ['protect', '保护', '掩护', 'block', 'guard', 'shield'], desc: 'Cover or block for an ally' }
            ]
        },
        {
            id: 'standard_attack',
            label_zh: '常规攻击与反击',
            actions: [
                { id: 'melee_attack', label_zh: '近战攻击', tags: ['melee', 'melee_attack', '近战', '斗殴', 'brawl', 'attack:melee'], desc: 'Brawl or melee weapon attack' },
                { id: 'firearms_attack', label_zh: '射击', tags: ['firearms', 'fire_weapon', 'shoot', '射击', '开枪', '开火', 'attack:fire', '连射', 'burst', '瞄准', 'aim', '点射', '压制'], desc: 'Firearms; aim for bonus die next round, point-blank, full-auto burst/suppression' },
                { id: 'fight_back', label_zh: '反击', tags: ['fight_back', '反击', 'counter', 'counter-attack'], desc: 'Reaction vs melee — trade dodge for counter-attack' }
            ]
        },
        {
            id: 'maneuvers',
            label_zh: '战技系统',
            actions: [
                { id: 'disarm', label_zh: '缴械', tags: ['disarm', '缴械', '夺武器'], desc: 'Disarm opponent' },
                { id: 'grapple', label_zh: '擒抱', tags: ['grapple', '擒抱', '摔跤', '擒拿'], desc: 'Grapple or wrestling hold' },
                { id: 'shove', label_zh: '推搡', tags: ['shove', '推搡', '推开', 'push'], desc: 'Shove opponent' },
                { id: 'knockdown', label_zh: '击倒', tags: ['knockdown', '击倒', 'trip', '绊倒'], desc: 'Knockdown or trip' }
            ]
        },
        {
            id: 'skills_environment',
            label_zh: '技能运用与环境互动',
            actions: [
                { id: 'use_skill', label_zh: '使用技能', tags: ['use_skill', '技能', 'first aid', '急救', 'repair', '维修', 'locksmith', '锁匠', 'mechanics'], desc: 'First Aid, Repair, Locksmith, etc. in combat' },
                { id: 'social', label_zh: '心理战与交涉', tags: ['social', 'intimidate', '威吓', 'fast talk', '话术', 'persuade', '说服', '交涉', 'psychology'], desc: 'Intimidate, Fast Talk, Persuade in combat' },
                { id: 'use_environment', label_zh: '利用环境', tags: ['environment', '环境', 'furniture', '家具', 'cut power', '断电', 'sand', '石灰', 'blind', '致盲'], desc: 'Cover from furniture, cut power, sand/lime in eyes' }
            ]
        },
        {
            id: 'mythos',
            label_zh: '神秘学行动',
            actions: [
                { id: 'cast_spell', label_zh: '施放法术', tags: ['cast_spell', 'spell', '法术', '施法', 'mythos', '咒文'], desc: 'Multi-round casting; interrupted by damage' }
            ]
        }
    ]
};

/** Flatten action tags, optionally filtered by category ids */
export function flattenCombatActionTags(categoryIds) {
    const cats = categoryIds
        ? COC_7E_COMBAT_ACTIONS.CATEGORIES.filter((c) => categoryIds.includes(c.id))
        : COC_7E_COMBAT_ACTIONS.CATEGORIES;
    const tags = new Set();
    for (const cat of cats) {
        for (const action of cat.actions) {
            for (const t of action.tags) tags.add(String(t).toLowerCase());
        }
    }
    return [...tags];
}

/** Tags that count as tactical diversity (clears damage-only immunity) */
export function getTacticalCombatTags() {
    return flattenCombatActionTags(['defensive', 'maneuvers', 'skills_environment', 'mythos']);
}

/** Tags for fight-back — tactical despite living in standard_attack */
export function getFightBackTags() {
    return ['fight_back', '反击', 'counter', 'counter-attack'];
}

/** What the player reads for each KP phase id (the ids stay the engine's state values). */
export const KP_PHASE_LABELS = Object.freeze({
    CALM: '平静',
    ENEMY_ADAPT: '敌人适应',
    ACTIVE_HUNT: '主动猎杀',
    REALITY_DISTORT: '现实扭曲'
});

/** @returns {string} the phase in words; an unknown id is shown as 平静 rather than as code */
export function kpPhaseLabel(phase) {
    return KP_PHASE_LABELS[phase] || KP_PHASE_LABELS.CALM;
}

/** Tags for pure damage actions (melee/firearms only, excludes fight_back) */
export function getPureDamageCombatTags() {
    const all = flattenCombatActionTags(['standard_attack']);
    const fb = new Set(getFightBackTags().map((t) => t.toLowerCase()));
    return all.filter((t) => !fb.has(t));
}

/** Condensed combat palette for AI prompt injection */
export function buildCombatActionsPromptBlock() {
    const lines = ['【CoC 7e 战斗行动菜单 — 每回合须让调查员知晓可选战术】'];
    for (const cat of COC_7E_COMBAT_ACTIONS.CATEGORIES) {
        // Chinese labels only: the English desc is for developers, and in the prompt it taught the model English.
        const items = cat.actions.map((a) => a.label_zh).join('、');
        lines.push(`· ${cat.label_zh}：${items}`);
    }
    lines.push('叙事原则：CoC 战斗偏叙事；每回合简述可用选项。连续纯伤害碾压（仅近战/射击、无战技/防御/技能/环境/神秘学变化）触发引擎敌人免疫。');
    lines.push('射击：可瞄准（下回合奖励骰）、抵近射击、连射/压制；反击：放弃闪避换取近战反击；施法：多回合，受伤可打断。');
    return lines.join('\n');
}

/** Condensed prompt block for AI system injection */
export function buildKpRulesPromptBlock() {
    return [
        '【KP 协议 — 守秘人准则】',
        '规则集：CoC 7e 严格执行；时代限制：调查员不得拥有/使用超出当前已知信息的事物；物品须有获取记录；神话物品须特殊检定；异常物品触发 SAN。',
        '逻辑：禁止跳过判定结果；拒绝不合理行动。',
        '回复按下方【回复格式】：骰子与数值由引擎掷出并显示，正文不写；叙事纯沉浸、无数字、无元语言。',
        '局势（阶段、末日钟、注意力、调查员战力）由引擎跟踪，叙事须呼应，但不在正文里说出这些词。',
        `注意力阈值：4=敌人适应，7=主动猎杀，9=现实扭曲。`,
        buildCombatActionsPromptBlock(),
        '叙事核心：调查驱动、渐进恐怖、拒绝英雄主义；每场景≥3线索钩子；禁止"某某受到惊吓然后没了"式电报体。'
    ].join('\n');
}

if (typeof window !== 'undefined') {
    window.CoC7eCombatActions = COC_7E_COMBAT_ACTIONS;
    window.CoC7eCombatActionsPrompt = buildCombatActionsPromptBlock;
}
