// Antagonist AI engine — organization opposition logic (user YAML → JS)

export const ANTAGONIST_AI_RULES = {
    SYSTEM_NAME: 'ANTAGONIST_AI_ENGINE',

    ORGANIZATION: {
        NAME: '未命名组织',
        STRUCTURE: {
            leader: { role: '核心策划者', exposure: 'low' },
            inner_circle: { count: '3-5', knowledge: 'high' },
            agents: { count: 'variable', knowledge: 'partial' },
            pawns: { count: 'unlimited', expendable: true }
        }
    },

    STATE: {
        ALERT_LEVEL: 0,
        KNOWLEDGE_LEVEL: 0,
        CONTROL_LEVEL: 0
    },

    MISINFORMATION_SYSTEM: {
        TRIGGER: {
            IF_players_get_clue: { chance_to_corrupt: 0.4 },
            IF_ALERT_LEVEL_gte_5: { chance_to_corrupt: 0.7 }
        },
        METHODS: ['false_documents', 'forged_letters', 'fake_witness', 'staged_scene'],
        EFFECT: ['REPLACE true_clue WITH misleading_clue', 'ADD extra_false_path']
    },

    SOCIAL_WARFARE: {
        TRIGGERS: {
            IF_players_contact_npc: { CHECK: 'npc_loyalty' },
            IF_ALERT_LEVEL_gte_4: { infiltrate_social_circle: true }
        },
        ACTIONS: ['bribe_npc', 'threaten_npc', 'impersonate_ally', 'offer_help_with_hidden_cost'],
        ADVANCED: {
            IF_KNOWLEDGE_LEVEL_gte_6: {
                CREATE: { fake_trust_relationship: true },
                EFFECT: { npc_provides_partial_truth: true }
            }
        }
    },

    COUNTER_INVESTIGATION: {
        TRIGGER: { IF_players_investigate_location: { mark_location_exposed: true } },
        RESPONSE: {
            IF_ALERT_LEVEL_gte_3: { remove_evidence: true },
            IF_ALERT_LEVEL_gte_5: { plant_false_evidence: true },
            IF_ALERT_LEVEL_gte_7: { ambush_investigators: true }
        },
        ADVANCED: {
            IF_KNOWLEDGE_LEVEL_gte_7: {
                TRACK: ['favorite_skill', 'investigation_style']
            }
        }
    },

    ANTI_TRACKING: {
        TRIGGERS: { IF_players_follow_clue_chain: { activate_counter_tracking: true } },
        METHODS: ['dead_drop_traps', 'false_meeting_points', 'rotating_agents', 'time_delay_traps'],
        EFFECT: ['players_must_pass_extra_checks', 'redirect_to_wrong_location']
    },

    ACTIVE_OPPOSITION: {
        TRIGGERS: {
            IF_ALERT_LEVEL_gte_6: { START: 'direct_interference' },
            IF_ALERT_LEVEL_gte_8: { START: 'targeted_attack' }
        },
        ACTIONS: ['kidnap_contact', 'destroy_safehouse', 'sabotage_equipment', 'leak_player_identity']
    },

    COGNITIVE_ATTACK: {
        TRIGGER: { IF_KNOWLEDGE_LEVEL_gte_8: true },
        EFFECT: ['false_memory_implant', 'dream_intrusion', 'voice_mimic'],
        RESULT: { player_doubt_reality: true }
    },

    ADAPTIVE_STRATEGY: {
        // Weights from adaptStrategy() drive engine ticks (misinfo/ambush/social infiltration) plus AI prompt hints.
        _note: 'Strategy weights partially drive engine: misinformation corrupt chance, ambush/combat_counter on investigate & combat_win, socialInfiltration marks _kpCompromised on friendly NPCs. Combat immunity / reality distortion remain separate enforcement.',
        INPUT: ['player_success_rate', 'player_combat_focus', 'player_social_behavior'],
        LOGIC: {
            IF_players_win_combat_often: { reduce_direct_combat: true, increase_traps: true },
            IF_players_focus_investigation: { increase_false_clues: true },
            IF_players_trust_npc: { increase_social_infiltration: true }
        }
    },

    KNOWLEDGE_SYSTEM: {
        UPDATE: { observe_player_action: 1, capture_information: 2 },
        EFFECT: {
            IF_KNOWLEDGE_LEVEL_gte_5: { predict_next_move: true },
            IF_KNOWLEDGE_LEVEL_gte_8: { preempt_action: true }
        }
    },

    AI_LOOP: {
        steps: [
            'UPDATE ALERT_LEVEL',
            'UPDATE KNOWLEDGE_LEVEL',
            'RUN MISINFORMATION_SYSTEM',
            'RUN SOCIAL_WARFARE',
            'RUN COUNTER_INVESTIGATION',
            'RUN ANTI_TRACKING',
            'IF ALERT_LEVEL >= 6: RUN ACTIVE_OPPOSITION',
            'IF KNOWLEDGE_LEVEL >= 8: RUN COGNITIVE_ATTACK',
            'RUN ADAPTIVE_STRATEGY'
        ]
    }
};

export function buildAntagonistPromptBlock(antState) {
    const s = antState || ANTAGONIST_AI_RULES.STATE;
    return [
        '【ANTAGONIST_AI_ENGINE — 敌对组织 AI 指引】',
        `组织：${ANTAGONIST_AI_RULES.ORGANIZATION.NAME}；警戒 ${s.ALERT_LEVEL}/10，情报 ${s.KNOWLEDGE_LEVEL}/10，掌控 ${s.CONTROL_LEVEL}/10。`,
        '线索获取时 40%（警戒≥5 则 70%）概率被污染为误导线索。',
        '警戒≥3 销毁证据；≥5 栽赃；≥7 伏击调查员。警戒≥6 主动干扰；≥8 定点打击。',
        '情报≥6 建立假信任关系；≥8 认知攻击（假记忆/梦境入侵/声音模仿）。',
        '自适应：玩家善战→增陷阱减正面战；善调查→增假线索；信 NPC→增社交渗透。',
        '工具调用：发现线索用 add_clue；NPC 接触用 register_npc/update_npc_status；误导线索标记 type 为 misleading。'
    ].join('\n');
}
