// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC AI Tool Definitions Catalog (AUDITFIX8)
 *
 * Single source of truth for:
 *   1) OpenAI-compatible tool definitions sent to the model.
 *   2) Local argument schemas used before dispatching tool handlers.
 *
 * Internal validator-only flags such as `singleAsArray` are stripped from
 * the API-facing schema by buildTools(), but retained for local validation.
 */
const CoCToolDefinitions = (function() {
    /** Hard-required tools vs soft-suggested — reduces model over-triggering on contextual actions. */
    const TOOL_TIERS = Object.freeze({
        required: new Set([
            'spawn_npc', 'update_inventory', 'register_npc', 'start_combat', 'add_clue'
        ]),
        suggested: new Set([
            'burst_fire', 'fire_weapon', 'melee_attack', 'aim_weapon', 'link_clues', 'mark_clue_status', 'update_npc_status',
            'end_combat', 'update_enemy', 'enemy_attack', 'dodge', 'fight_back',
            'disarm', 'grapple', 'shove', 'knockdown', 'break_free', 'stand_up', 'dive_for_cover', 'reload_weapon', 'set_combat_situation',
            'create_map', 'update_room', 'set_position',
            'apply_environmental_damage', 'apply_poison', 'resist_poison', 'apply_healing',
            'reality_check', 'apply_therapy', 'bonus_penalty_roll', 'cast_spell', 'start_ritual', 'continue_ritual', 'advance_time',
            'start_chase', 'chase_action', 'social_opposed', 'extinguish_fire', 'spend_luck', 'trigger_affliction',
            'connect_backstory', 'init_wealth', 'lifestyle_spend', 'apply_disease', 'treat_disease', 'apply_deprivation',
            'apply_enchantment', 'dispel_magic', 'apply_scenario_effects', 'record_engine_log'
        ])
    });

    const stripTierPrefix = (text) => String(text || '').replace(/^【(必须调用|建议调用|铁律)[^】]*】\s*/, '');

    const formatToolDescription = (name, rawDescription) => {
        const body = stripTierPrefix(rawDescription);
        if (TOOL_TIERS.required.has(name)) return `【必须调用】${body}`;
        if (TOOL_TIERS.suggested.has(name)) return `【建议调用】${body}`;
        return rawDescription;
    };

    const getToolTier = (name) => {
        if (TOOL_TIERS.required.has(name)) return 'required';
        if (TOOL_TIERS.suggested.has(name)) return 'suggested';
        return 'neutral';
    };

    const TOOL_CATALOG = {
        spawn_npc: {
            description: '从模板生成NPC/怪物。优先 npc_templates（警察、邪教徒、深潜者等）；亦可 creatures_summary id/中文名（如 security_guard、黑山羊幼崽）。',
            parameters: {
                type: 'object',
                properties: {
                    template: { type: 'string', description: '模板名称（如"警察""邪教徒""深潜者""食尸鬼""米·戈"等）' },
                    name: { type: 'string', description: 'NPC/怪物名称（可选，默认使用模板名）' },
                    hp: { type: 'number', description: '覆写HP（可选）' },
                    armor: { type: 'number', description: '覆写护甲（可选）' },
                    description: { type: 'string', description: '外观/行为描述（可选）' }
                },
                required: ['template']
            }
        },
        push_skill_check: {
            description: '【推动检定】调查员改变做法重掷刚刚失败的技能检定：难度与原检定相同（不额外加难），但失败的后果由 KP 加重且不可再推。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '推动检定的调查员' },
                    skill_name: { type: 'string', description: '推动的技能名称' },
                    pushed_reason: { type: 'string', description: '推动理由（如何以不同方式重试）' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'], description: '可选覆盖；省略则沿用原失败检定的难度' }
                },
                required: ['target_name', 'skill_name']
            }
        },
        request_skill_check: {
            description: '要求特定调查员掷骰。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string' },
                    skill_name: { type: 'string' }
                },
                required: ['target_name', 'skill_name']
            }
        },
        update_character_status: {
            description: '更新特定调查员状态。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string' },
                    hp_change: { type: 'number' },
                    san_change: { type: 'number' },
                    note: { type: 'string', description: '变化原因备注' }
                },
                required: ['target_name']
            }
        },
        update_inventory: {
            description: '当玩家拾取、发现或获得物品时调用。枪械与弹药须分为两个独立物品；开火时从背包匹配弹药。神话物品接触须指定 target_name（谁接触）。',
            parameters: {
                type: 'object',
                properties: {
                    items: { type: 'array', minItems: 1, items: { type: 'string' }, singleAsArray: true },
                    source: { type: 'string', description: '物品获取来源（KP引擎启用时必填）' },
                    acquisition_source: { type: 'string', description: '同 source，获取记录' },
                    target_name: { type: 'string', description: '接触神话物品并做 SAN 的调查员（KP 神话物必填或界面已选中）' },
                    character_name: { type: 'string', description: 'target_name 别名' },
                    actor_name: { type: 'string', description: 'target_name 别名' },
                    char_name: { type: 'string', description: 'target_name 别名' }
                },
                required: ['items']
            }
        },
        consume_inventory_items: {
            description: '消耗物品。',
            parameters: {
                type: 'object',
                properties: {
                    items: { type: 'array', minItems: 1, items: { type: 'string' }, singleAsArray: true }
                },
                required: ['items']
            }
        },
        system_alert: {
            description: '发送红色警告。',
            parameters: {
                type: 'object',
                properties: { message: { type: 'string' } },
                required: ['message']
            }
        },
        burst_fire: {
            description: '【连射/全自动开火】调查员使用自动武器进行三发点射或全自动扫射。多目标时传 enemy_names。消耗对应弹药数。',
            parameters: {
                type: 'object',
                properties: {
                    shooter_name: { type: 'string', description: '开火调查员' },
                    target_name: { type: 'string', description: '旧版兼容：同shooter_name' },
                    enemy_name: { type: 'string', description: '单一目标敌人' },
                    enemy_names: { type: 'array', items: { type: 'string' }, description: '多目标扫射敌人名单（优先于 enemy_name）' },
                    rounds: { type: 'number', description: '发射弹数（3=三发点射，5-30=全自动）' },
                    mode: { type: 'string', enum: ['burst', 'auto'], description: '射击模式' },
                    damage: { type: 'string', description: '武器伤害骰（可选）' },
                    point_blank: { type: 'boolean', description: '抵近射击：射击获得一颗奖励骰' },
                    distance: { type: 'number', description: '目标距离（码），用于射程档与霰弹分段' }
                },
                required: ['shooter_name', 'rounds', 'mode']
            }
        },
        fire_weapon: {
            description: '调查员开火。玩家掷射击技能后，引擎结算故障、闪避、贯穿与伤害。瞄准须先 aim_weapon。抵近射击设 point_blank=true（奖励骰，且可被反击）。可选 situation（cover/targetCover/distance 等）一次传入情境；亦可先 set_combat_situation。禁止用 update_enemy 代替。',
            parameters: {
                type: 'object',
                properties: {
                    rounds: { type: 'number', description: '可选：填正数表示本轮只开一发，不按武器射速自动连射；省略则按射速' },
                    shooter_name: { type: 'string', description: '开火的调查员姓名' },
                    target_name: { type: 'string', description: '旧版兼容字段：开火的调查员姓名，若已提供 shooter_name 可省略' },
                    enemy_name: { type: 'string', description: '目标敌人姓名；省略时仅当场上恰好一个未被击败的敌人才代选，否则须指定' },
                    damage: { type: 'string', description: '伤害骰，如 1D6/1D10+2' },
                    point_blank: { type: 'boolean', description: '抵近射击（约 DEX 英尺内）：射击获得一颗奖励骰' },
                    distance: { type: 'number', description: '目标距离（码），用于射程档与霰弹分段' },
                    situation: {
                        type: 'object',
                        description: '可选情境覆写：cover / targetCover / distance / pointBlank 等（与 SituationalEngine 对齐）',
                        additionalProperties: true
                    }
                },
                required: ['shooter_name']
            }
        },
        aim_weapon: {
            description: '【瞄准】消耗本轮瞄准，下一击获得一颗奖励骰（最多两轮、两颗）。受伤会打断瞄准。瞄准后须再调用 fire_weapon 或 melee_attack。',
            parameters: {
                type: 'object',
                properties: {
                    shooter_name: { type: 'string', description: '瞄准的调查员姓名' },
                    enemy_name: { type: 'string', description: '目标敌人（叙事用，可省略）' }
                },
                required: ['shooter_name']
            }
        },
        melee_attack: {
            description: '调查员近战攻击。玩家掷斗殴后，引擎结算闪避、贯穿与伤害。禁止用 update_enemy 代替。',
            parameters: {
                type: 'object',
                properties: {
                    situation: {
                        type: 'object',
                        description: '可选情境覆写：黑暗、人数优势、掩体等（与 SituationalEngine 对齐）',
                        additionalProperties: true
                    },
                    actor_name: { type: 'string', description: '攻击的调查员姓名' },
                    enemy_name: { type: 'string', description: '目标敌人姓名；省略时仅当场上恰好一个未被击败的敌人才代选，否则须指定' },
                    damage: { type: 'string', description: '仅当装备无法匹配武器库时的后备伤害骰' }
                },
                required: ['actor_name']
            }
        },
        register_npc: {
            description: '剧情中初次出现有名字的NPC时，立即静默调用此工具记录到关系网络。必须写清关系。下一步由引擎决定，勿自行宣布失联或出卖。',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'NPC姓名' },
                    description: { type: 'string', description: '一句话描述' },
                    relation: { type: 'string', description: '与调查员的关系：盟友/中立/敌对/可疑/线索来源/未知' },
                    status: { type: 'string', enum: ['alive', 'dead', 'missing', 'insane', 'unknown'] }
                },
                required: ['name', 'relation']
            }
        },
        update_npc_status: {
            description: 'NPC死亡、失踪、疯狂等状态变化时调用。',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    status: { type: 'string', enum: ['alive', 'dead', 'missing', 'insane', 'unknown'] },
                    note: { type: 'string', description: '状态变化备注' }
                },
                required: ['name', 'status']
            }
        },
        start_combat: {
            description: '当剧情进入激烈战斗时调用，激活回合制战斗界面。叙事须呈现 CoC 7e 完整行动菜单：防御（生存/逃脱/打断/保护）、攻击（近战/射击/反击）、战技（缴械/擒抱/推搡/击倒）、技能与环境、神秘学施法。',
            parameters: {
                type: 'object',
                properties: {
                    enemies: {
                        type: 'array',
                        description: '敌人列表',
                        minItems: 1,
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                hp: { type: 'number' },
                                armor: { type: 'number', description: '护甲减伤' },
                                description: { type: 'string' }
                            },
                            required: ['name', 'hp']
                        }
                    },
                    location: { type: 'string' },
                    notes: { type: 'string', description: '战斗起因备注' }
                },
                required: ['enemies']
            }
        },
        end_combat: {
            description: '战斗结束时调用（胜利/败北/撤退）。',
            parameters: {
                type: 'object',
                properties: {
                    outcome: { type: 'string', enum: ['victory', 'defeat', 'fled', 'other'] },
                    notes: { type: 'string' }
                },
                required: ['outcome']
            }
        },
        update_enemy: {
            description: '非攻击性更新敌人HP（例如 0 或正数）。调查员造成的伤害必须调用 fire_weapon 或 melee_attack，禁止在此填负数。',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: '敌人名称' },
                    enemy_name: { type: 'string', description: '同 name（别名）' },
                    hp: { type: 'number', description: '绝对 HP（非伤害；与 hp_change 二选一）' },
                    hp_change: { type: 'number', description: '负数表示受伤（护甲前的原始伤害）' },
                    note: { type: 'string', description: '攻击描述' },
                    combat_action: { type: 'string', description: '战斗行动标签（默认 attack:melee）' }
                },
                required: ['hp_change']
            }
        },
        enemy_attack: {
            description: '【敌方攻击】敌人攻击调查员。枪械须用 weapon_skill/射击类技能，勿默认斗殴。命中后玩家二选一闪避或反击。可选 situation（cover/distance 等）。',
            parameters: {
                type: 'object',
                properties: {
                    enemy_name: { type: 'string' },
                    target_name: { type: 'string', description: '被攻击的调查员' },
                    damage: { type: 'string', description: '伤害骰或固定数值' },
                    description: { type: 'string', description: '攻击描述（含枪/刀等以推断远程）' },
                    weapon_skill: { type: 'string', description: '攻击技能（远程如射击/手枪，近战斗殴）' },
                    skill_name: { type: 'string', description: '同 weapon_skill' },
                    ranged: { type: 'boolean' },
                    point_blank: { type: 'boolean' },
                    distance: { type: 'number', description: '码数距离' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'] },
                    situation: {
                        type: 'object',
                        description: '可选情境覆写：cover / targetCover / distance 等',
                        additionalProperties: true
                    }
                },
                required: ['target_name']
            }
        },
        dodge: {
            description: '【防御】调查员闪避。若正在被攻击，与反击二选一（改为此次反应）；否则为独立闪避检定。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '同 actor_name（旧版兼容）' },
                    actor_name: { type: 'string', description: '执行闪避的调查员' },
                    enemy_name: { type: 'string', description: '威胁来源（可选）' },
                    skill_name: { type: 'string', description: '检定技能（默认闪避）' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'], description: '检定难度' }
                },
                required: ['actor_name']
            }
        },
        fight_back: {
            description: '【反击】放弃闪避换取近战反击（CoC 7e fight back）。须已有 pending 近战攻击待反应（combat_react）；与闪避二选一。enemy_name 可选（待反应已含敌人上下文）。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string', description: '反击的调查员' },
                    target_name: { type: 'string', description: '旧版兼容：同 actor_name' },
                    enemy_name: { type: 'string', description: '可选；pending 反应已绑定敌人时可省略' },
                    skill_name: { type: 'string', description: '反击技能（默认斗殴）' },
                    damage: { type: 'string', description: '反击伤害骰' }
                },
                required: ['actor_name']
            }
        },
        disarm: {
            description: '【战技】缴械对手。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string' },
                    enemy_name: { type: 'string' },
                    skill_name: { type: 'string' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'] }
                },
                required: ['actor_name', 'enemy_name']
            }
        },
        grapple: {
            description: '【战技】擒抱或摔跤擒拿（对抗斗殴，比较体格）。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string' },
                    enemy_name: { type: 'string' },
                    skill_name: { type: 'string' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'] }
                },
                required: ['actor_name', 'enemy_name']
            }
        },
        shove: {
            description: '【战技】推搡，成功则目标倒地。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string' },
                    enemy_name: { type: 'string' },
                    skill_name: { type: 'string' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'] }
                },
                required: ['actor_name', 'enemy_name']
            }
        },
        knockdown: {
            description: '【战技】击倒，成功则目标 prone。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string' },
                    enemy_name: { type: 'string' },
                    skill_name: { type: 'string' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'] }
                },
                required: ['actor_name', 'enemy_name']
            }
        },
        break_free: {
            description: '【战技】挣脱擒抱。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string' },
                    enemy_name: { type: 'string', description: '擒抱者（可选）' },
                    skill_name: { type: 'string' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'] }
                },
                required: ['actor_name']
            }
        },
        stand_up: {
            description: '【起身】从倒地状态站起，消耗一次行动（战斗中推进回合）。攻击不会自动清除倒地。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string', description: '起身的调查员' }
                }
            }
        },
        dive_for_cover: {
            description: '【扑掩】扑向软/硬掩体并卧倒，消耗一次行动。设置 combat.situation.cover（含装甲与耐久），供后续射击惩罚骰与掩体吸收伤害。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string', description: '扑掩的调查员' },
                    cover: { type: 'string', enum: ['soft', 'hard'], description: '掩体类型，默认 soft' }
                }
            }
        },
        reload_weapon: {
            description: '【换弹/排除故障】消耗一次行动。默认同时清除卡壳并按武器 capacity 从背包装填；clear_jam=false 时仅换弹（若仍卡壳则失败）。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string', description: '换弹的调查员' },
                    shooter_name: { type: 'string', description: '同 actor_name' },
                    clear_jam: { type: 'boolean', description: '是否排除卡壳，默认 true' }
                }
            }
        },
        set_combat_situation: {
            description: '【战斗情境】设置人数优势/突袭/黑暗/掩体/距离，供后续攻击结算读取。掩体可为 soft/hard；可另传 cover_armor / cover_hp。',
            parameters: {
                type: 'object',
                properties: {
                    outnumbered: { type: 'boolean' },
                    surprise: { type: 'boolean' },
                    darkness: { type: 'string', enum: ['partial', 'total'], description: '或省略表示无' },
                    cover: { type: 'string', enum: ['soft', 'hard'] },
                    cover_armor: { type: 'number', description: '掩体装甲值' },
                    cover_hp: { type: 'number', description: '掩体耐久' },
                    distance: { type: 'number', description: '码数' }
                }
            }
        },
        social_opposed: {
            description: '【社交对抗】取悦/话术/恐吓/说服 vs NPC 抵抗（心理学或意志）。调查员先掷骰，再对抗 NPC。同级平局按较高技能值。',
            parameters: {
                type: 'object',
                properties: {
                    character_name: { type: 'string', description: '同 actor_name' },
                    actor_name: { type: 'string' },
                    opponent_name: { type: 'string', description: '同 npc_name' },
                    npc_name: { type: 'string' },
                    kind: { type: 'string', enum: ['charm', 'fast_talk', 'intimidate', 'persuade', '取悦', '话术', '恐吓', '说服'] },
                    skill_name: { type: 'string' },
                    opponent_value: { type: 'number', description: 'NPC 抵抗技能值' },
                    resist_skill: { type: 'string' },
                    pushed: { type: 'boolean' },
                    pushed_reason: { type: 'string' }
                },
                required: ['actor_name', 'npc_name']
            }
        },
        create_map: {
            description: '进入新场景/建筑时，绘制房间布局地图。用坐标(x:0-8, y:0-5)定位房间。',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: '场景名称' },
                    rooms: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', description: '唯一ID，如r1/r2' },
                                name: { type: 'string' },
                                status: { type: 'string', enum: ['unknown', 'explored', 'current', 'dangerous', 'locked'], description: 'unknown=未探索' },
                                x: { type: 'number' },
                                y: { type: 'number' },
                                connections: { type: 'array', items: { type: 'string' }, description: '连接的其他房间id', singleAsArray: true },
                                note: { type: 'string' }
                            },
                            required: ['id', 'name']
                        }
                    }
                },
                required: ['title', 'rooms']
            }
        },
        update_room: {
            description: '调查员探索/发现某房间时，更新其状态。',
            parameters: {
                type: 'object',
                properties: {
                    room_id: { type: 'string', description: '房间ID或名称' },
                    status: { type: 'string', enum: ['unknown', 'explored', 'current', 'dangerous', 'locked'] },
                    note: { type: 'string', description: '新发现的备注' }
                },
                required: ['room_id']
            }
        },
        set_position: {
            description: '调查员移动到某房间时调用，标记当前位置（前一个房间自动变为已探索）。',
            parameters: {
                type: 'object',
                properties: { room_id: { type: 'string' } },
                required: ['room_id']
            }
        },
        add_clue: {
            description: '调查员发现有意义的线索、证据、信息时，立即静默记录到线索板。优先记录已结算检定（request_skill_check）得到的结果；禁止无检定编造关键物证。',
            parameters: {
                type: 'object',
                properties: {
                    npcId: { type: 'string', description: '同 npc_id' },
                    id: { type: 'string', description: '唯一ID，如clue_knife' },
                    title: { type: 'string', description: '线索简称（≤10字）' },
                    content: { type: 'string', description: '详细描述' },
                    type: { type: 'string', enum: ['physical', 'testimony', 'document', 'location', 'event', 'person', 'supernatural'], description: '物证/证词/文件/地点/事件/人物/异常' },
                    related_ids: { type: 'array', items: { type: 'string' }, description: '与已有线索的关联ID', singleAsArray: true },
                    npc_id: { type: 'string', description: '证词来源名册 id 或姓名；守口时引擎只标出对得上的已有线索' }
                },
                required: ['id', 'title', 'content', 'type']
            }
        },
        link_clues: {
            description: '发现两条线索存在直接联系时，建立连接并注明关系。',
            parameters: {
                type: 'object',
                properties: {
                    from_id: { type: 'string' },
                    to_id: { type: 'string' },
                    note: { type: 'string', description: '连接关系说明（如：同一把刀/时间吻合）' }
                },
                required: ['from_id', 'to_id']
            }
        },
        mark_clue_status: {
            description: '线索状态变化时调用：new新发现/investigating调查中/solved已解释/key关键线索。',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: '线索 ID' },
                    clue_id: { type: 'string', description: '线索 ID（id 的别名）' },
                    status: { type: 'string', enum: ['new', 'investigating', 'solved', 'key'] },
                    note: { type: 'string' }
                },
                required: ['status']
            }
        },
        roll_dice: {
            description: '进行自定义骰子检定，支持任意骰子表示法。用于非技能的特殊骰子场合（仪式、运气、伤害、随机事件等）。',
            parameters: {
                type: 'object',
                properties: {
                    notation: { type: 'string', description: '骰子表示法：1d6 / 2d6+3 / 3d10k2（取最高2）/ 1d100 等' },
                    label: { type: 'string', description: '检定描述，如：黑暗中的运气、仪式成功率' },
                    context: { type: 'string', description: '出现此检定的原因' }
                },
                required: ['notation', 'label']
            }
        },
        group_roll: {
            description: '全体或指定调查员进行相同技能检定。每人依次打开骰盘，NPC/对手不走此工具。',
            parameters: {
                type: 'object',
                properties: {
                    skill: { type: 'string', description: '同 skill_name' },
                    investigators: { type: 'array', items: { type: 'string' }, description: '同 char_names', singleAsArray: true },
                    char_names: { type: 'array', items: { type: 'string' }, description: '调查员名称列表，空数组=全体', singleAsArray: true },
                    names: { type: 'array', items: { type: 'string' }, description: 'char_names 别名', singleAsArray: true },
                    character_names: { type: 'array', items: { type: 'string' }, description: 'char_names 别名', singleAsArray: true },
                    targets: { type: 'array', items: { type: 'string' }, description: 'char_names 别名', singleAsArray: true },
                    skill_name: { type: 'string' },
                    context: { type: 'string' }
                },
                required: ['skill_name']
            }
        },
        opposed_roll: {
            description: '调查员对抗检定：先由调查员掷骰，再由引擎结算对手。社交请用 social_opposed。',
            parameters: {
                type: 'object',
                properties: {
                    skill_name: { type: 'string', description: '同 char_skill' },
                    name: { type: 'string', description: '同 char_name（旧版兼容）' },
                    char_name: { type: 'string', description: '调查员名称' },
                    character_name: { type: 'string', description: 'char_name 别名' },
                    char_skill: { type: 'string' },
                    skill: { type: 'string', description: '同 char_skill' },
                    opponent_name: { type: 'string' },
                    opponent_value: { type: 'number', description: '对手的技能值（0-99）' },
                    label: { type: 'string' },
                    difficulty: { type: 'string', enum: ['normal', 'hard', 'extreme'], description: '可选难度覆写' }
                },
                required: ['char_name', 'char_skill', 'opponent_name', 'opponent_value', 'label']
            }
        },
        apply_environmental_damage: {
            description: '【环境伤害】坠落/火焰/溺水/电击/爆炸/寒冷/酷热。火焰默认可点燃持续燃烧；电击可写入眩晕；爆炸用 dice+distance 分参。',
            parameters: {
                type: 'object',
                properties: {
                    character_name: { type: 'string', description: '同 target_name' },
                    kind: { type: 'string', description: '同 type，环境伤害种类别名' },
                    target_name: { type: 'string', description: '目标调查员名称' },
                    type: { type: 'string', enum: ['fall','fire','drowning','electric','explosion','cold','heat'], description: '伤害类型' },
                    value: { type: 'number', description: '坠落英尺/溺水已闭气轮数/寒冷阶段等' },
                    intensity: { type: 'string', description: '火焰或电压强度' },
                    voltage: { type: 'string', description: '电击电压档' },
                    dice: { type: 'string', description: '爆炸威力骰如 4D6' },
                    distance: { type: 'number', description: '爆炸距离英尺' },
                    power: { type: 'number', description: '爆炸骰数简写' },
                    ongoing: { type: 'boolean', description: '火焰是否写入 burning 状态' },
                    rounds: { type: 'number', description: '燃烧持续轮数' }
                },
                required: ['target_name', 'type']
            }
        },
        apply_poison: {
            description: '【毒素】对目标施加毒素效果(每轮持续伤害+CON检定抵抗)。',
            parameters: {
                type: 'object',
                properties: {
                    character_name: { type: 'string', description: '同 target_name' },
                    target_name: { type: 'string', description: '目标名称' },
                    potency: { type: 'string', enum: ['mild','moderate','lethal'], description: '毒性等级' },
                    delay_rounds: { type: 'number', description: '延迟发作回合数(默认0)' }
                },
                required: ['target_name', 'potency']
            }
        },
        resist_poison: {
            description: '【毒素抵抗】立刻进行体质(CON)检定以抵抗已施加的毒素。成功则毒素失效；失败不在此工具结算伤害。战斗中每整轮由 RoundTick 自动结算毒伤；战斗外须调用 process_poison_tick。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '中毒的调查员' },
                    potency: { type: 'string', enum: ['mild','moderate','lethal'], description: '毒性等级（可省略，默认取当前毒素）' }
                },
                required: ['target_name']
            }
        },
        process_poison_tick: {
            description: '【毒素发作】仅在 CON 抵抗失败后调用。对仍处于中毒状态的调查员结算本轮毒素伤害。不可跳过抵抗直接扣血。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '中毒的调查员' },
                    current_round: { type: 'number', description: '当前回合（默认取战斗回合或1）' }
                },
                required: ['target_name']
            }
        },
        apply_disease: {
            description: '【疾病】按疾病表感染目标（fever/flu/wound_infection/plague/food_poisoning）。日伤在 advance_time 结算。disease_id 与 disease 二选一。',
            parameters: {
                type: 'object',
                properties: {
                    disease_name: { type: 'string', description: '疾病名称（同 disease / disease_id）' },
                    target_name: { type: 'string', description: '目标姓名' },
                    disease_id: { type: 'string', description: '疾病 id 或中文名' },
                    disease: { type: 'string', description: '同 disease_id（别名）' },
                    days: { type: 'number', description: '覆盖病程天数' },
                    damage_per_day: { type: 'string', description: '覆盖每日伤害骰' }
                },
                required: ['target_name']
            }
        },
        apply_deprivation: {
            description: '【饥渴】对目标施加饥饿或干渴阶段；日伤/惩罚在 advance_time 结算。kind/type、days_without/days 可互换。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '目标姓名' },
                    kind: { type: 'string', description: '仅 hunger 或 thirst（sleep/疲劳暂不支持，勿静默当饥饿）' },
                    type: { type: 'string', description: '同 kind（别名）' },
                    days_without: { type: 'number', description: '已断粮/断水天数' },
                    days: { type: 'number', description: '同 days_without（别名）' }
                },
                required: ['target_name']
            }
        },
        treat_disease: {
            description: '【治病】医学/急救检定治疗 status.disease。普通成功减半病程，困难及以上治愈。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '患者姓名' },
                    healer_name: { type: 'string', description: '施治者；省略则患者自疗' },
                    skill_name: { type: 'string', description: '默认取疾病表 treatSkill' }
                },
                required: ['target_name']
            }
        },
        apply_healing: {
            description: '【治疗】急救/医学必须先检定再恢复生命。失败不加血。急救与医学各自「每处伤害一次」（失败也占用），两者可用于同一处伤；急救失败后可 push=true 推动一次（濒死者推动失败即死）；医学隔日使用需困难成功，并可处理重伤。不可用 update_character_status 的正 hp_change 代替急救。无药品时按徒手急救（成功恢复1HP）。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '伤者姓名' },
                    healer_name: { type: 'string', description: '施术者姓名（默认伤者自己）' },
                    item_name: { type: 'string', description: '药品/急救包名称（可选）' },
                    skill_name: { type: 'string', enum: ['急救', '医学'], description: '检定技能（默认急救）' },
                    push: { type: 'boolean', description: '推动一次失败的急救（濒死者失败即死）' }
                },
                required: ['target_name']
            }
        },
        reality_check: {
            description: '【目睹神话】必须先做 SAN 检定再结算理智损失。不可用 update_character_status 直接填写 san_change。mythos_name 走对照表；也可给 san_loss 如 1/1D6。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '目睹者姓名' },
                    mythos_name: { type: 'string', description: '神话存在/景象名称（对照 SAN 表；同场再次目睹按最大失败档封顶）' },
                    san_loss: { type: 'string', description: '成功/失败损失，如 0/1D4 或 1/1D6' },
                    cause: { type: 'string', description: '损失原因备注' },
                    cap_key: { type: 'string', description: '可选封顶键（默认用 mythos_name）' }
                },
                required: ['target_name']
            }
        },
        apply_sanity_reward: {
            description: '【理智奖励】仅在成功解决神话威胁/完成模块后发放。这是奖励骰，不是检定替代。日常安抚请用 apply_therapy。借背景锚点恢复请用 connect_backstory。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '调查员姓名' },
                    reward_dice: { type: 'string', description: '奖励骰，如 1D6' },
                    reason: { type: 'string', description: '奖励原因' }
                },
                required: ['target_name']
            }
        },
        connect_backstory: {
            description: '【背景五项】调查员借由已填写的背景锚点（思想信念/重要之人/地点/宝物/特质）恢复 SAN（默认 1D6，走 applySanityReward）。不定疯狂治愈时可设 clear_indef=true。backstory_key 与 key 二选一。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '调查员姓名' },
                    backstory_key: {
                        type: 'string',
                        description: 'ideology|significantPeople|meaningfulLocations|treasuredPossessions|traits 或中文标签'
                    },
                    key: { type: 'string', description: '同 backstory_key（别名）' },
                    reward_dice: { type: 'string', description: '恢复骰，默认 1D6' },
                    clear_indef: { type: 'boolean', description: '同时解除不定疯狂' }
                },
                required: ['target_name']
            }
        },
        init_wealth: {
            description: '【信用评级】按信用评级表写入财富（现金/资产/生活水准）。建卡或开局调用；reset=true 强制按当前信用评级重算。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '调查员姓名' },
                    reset: { type: 'boolean', description: '强制重算财富' }
                },
                required: ['target_name']
            }
        },
        lifestyle_spend: {
            description: '【生活开销】按信用评级对应日用水平扣现金（默认 7 日）。现金不足则 hardship，并默认信用评级 -1。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '调查员姓名' },
                    days: { type: 'number', description: '天数，默认 7' },
                    drop_credit: { type: 'boolean', description: '不足时是否降信用评级，默认 true' }
                },
                required: ['target_name']
            }
        },
        start_chase: {
            description: '进行中不可重复开始（须先 chase_action end）。【追逐】开始追逐。引擎用 MOV 把猎物放在 lead 处（默认 2）。加速用 chase_action push（步行体质 / 载具按表技能如汽车驾驶·骑术）；障碍用 hazard。追上后才可攻击。载具追逐中开火自动带惩罚骰。vehicle_id 查表：bicycle/motorcycle/automobile/truck/horse_cart/horse/rowboat/steamship。',
            parameters: {
                type: 'object',
                properties: {
                    quarry_name: { type: 'string', description: '逃跑者姓名' },
                    pursuer_names: { type: 'array', items: { type: 'string' }, description: '追赶者姓名；省略则全体调查员', singleAsArray: true },
                    lead: { type: 'number', description: '猎物领先处数，默认 2' },
                    vehicle: { type: 'boolean', description: '载具追逐（加速用载具技能，射击带惩罚骰）' },
                    quarry_mov: { type: 'number', description: '猎物不在名单中时的 MOV，默认 8' },
                    vehicle_id: { type: 'string', description: '载具表 id 或中文名；默认 automobile（汽车）' },
                    quarry_vehicle_id: { type: 'string', description: '猎物载具 id（覆盖 vehicle_id）' },
                    pursuer_vehicle_id: { type: 'string', description: '追赶者载具 id（覆盖 vehicle_id）' },
                    vehicle_mov: { type: 'number', description: '覆盖表内 MOV' },
                    vehicle_hp: { type: 'number', description: '覆盖表内 HP' },
                    vehicle_max_hp: { type: 'number', description: '载具最大 HP' },
                    vehicle_armor: { type: 'number', description: '覆盖表内装甲' },
                    pursuer_vehicle_mov: { type: 'number', description: '追赶者载具 MOV 覆盖' },
                    pursuer_vehicle_hp: { type: 'number', description: '追赶者载具 HP 覆盖' },
                    pursuer_vehicle_armor: { type: 'number', description: '追赶者载具装甲覆盖' },
                    vehicle_type: { type: 'string', description: '同 vehicle_id（别名）' },
                    skip_speed_check: { type: 'boolean', description: '跳过开场速度检定' },
                    escape_threshold: { type: 'number', description: '逃脱领先阈值' },
                    escape_rounds: { type: 'number', description: '连续逃脱轮数阈值' },
                    max_actions: { type: 'number', description: '每轮最大行动数覆写' }
                },
                required: ['quarry_name']
            }
        },
        chase_action: {
            description: '【追逐行动】push=加速；hazard=障碍/屏障；tick=进入下一轮刷新行动数；end=结束。调查员走骰盘，NPC 由引擎暗掷。',
            parameters: {
                type: 'object',
                properties: {
                    actor_name: { type: 'string', description: '行动者姓名（tick/end 时可省略）' },
                    action: { type: 'string', enum: ['push', 'hazard', 'tick', 'next_round', 'end', 'set_crew', 'collide', 'lose_control'], description: '加速 / 障碍 / 下一轮 / 结束 / 设乘员 / 碰撞 / 失控' },
                    skill_name: { type: 'string', description: '障碍或驾驶技能' },
                    hazard_kind: { type: 'string', enum: ['obstacle', 'barrier'], description: '障碍或屏障' },
                    kind: { type: 'string', enum: ['obstacle', 'barrier'], description: '同 hazard_kind（别名）' },
                    damage: { type: 'number', description: '屏障/碰撞伤害' },
                    outcome: { type: 'string', description: '结束时的结果备注' },
                    vehicle_owner: { type: 'string', description: '载具主人姓名（乘员行动时）' },
                    crew: { type: 'array', items: { type: 'string' }, description: '乘员姓名列表', singleAsArray: true }
                },
                required: ['action']
            }
        },
        bonus_penalty_roll: {
            description: '【奖励/惩罚骰】打开调查员技能检定骰盘并带上奖励骰或惩罚骰（CoC 7e 核心机制）。',
            parameters: {
                type: 'object',
                properties: {
                    skill: { type: 'string', description: '同 skill_name' },
                    actor_name: { type: 'string', description: '同 target_name' },
                    target_name: { type: 'string', description: '调查员名称' },
                    skill_name: { type: 'string', description: '技能名称' },
                    bonus: { type: 'number', description: '同 bonus_dice' },
                    penalty: { type: 'number', description: '同 penalty_dice' },
                    character_name: { type: 'string', description: '同 target_name' },
                    bonus_dice: { type: 'number', description: '奖励骰数量(优势场景)' },
                    penalty_dice: { type: 'number', description: '惩罚骰数量(劣势场景)' },
                    difficulty: { type: 'string', enum: ['normal','hard','extreme'], description: '难度等级' },
                    situation: {
                        type: 'object',
                        description: '可选情境覆写（传给 SituationalEngine）',
                        additionalProperties: true
                    }
                },
                required: ['target_name', 'skill_name']
            }
        },

        recover_luck: {
            description: '【运气恢复】指定 amount 为守秘人直接奖励。省略 amount 则先做运气检定：失败（掷过当前运气）才恢复 1D10。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '调查员名称' },
                    amount: { type: 'number', description: '恢复运气点数(默认1D10)' }
                },
                required: ['target_name']
            }
        },
        apply_therapy: {
            description: '【精神分析】有施术者时先做精神分析检定：每名患者每月一次，成功恢复 1D3 SAN，大失败失去 1D6 SAN 且该治疗师不能再治疗此人。填 cure_target 则改为治疗某项恐惧症/狂躁症：需精神分析成功 + 患者理智检定成功，治愈但不恢复 SAN。省略 therapist_name 则按精神病院月度治疗：care=poor|average|good，按 months 循环结算（可恶化/新发恐惧症）。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '患者姓名' },
                    therapist_name: { type: 'string', description: '施术者姓名（可省略：走精神病院月度治疗）' },
                    cure_target: { type: 'string', description: '要治愈的恐惧症/狂躁症名称（改为治愈流程，不恢复 SAN）' },
                    months: { type: 'number', description: '精神病院治疗月数(默认1，单次最多24)' },
                    care: { type: 'string', enum: ['poor', 'average', 'good'], description: '看护质量：恶劣/普通/优质' },
                    asylum_care: { type: 'string', enum: ['poor', 'average', 'good'], description: '同 care' }
                },
                required: ['target_name']
            }
        },
        advance_time: {
            description: '【时间推进】推进世界时钟。hours 不足一天则医学仍按受伤当日常规；满一天后医学改困难。days 自然恢复 HP（重伤未恢复前除外）并重置当日 SAN；weeks 对重伤者发起每周 CON 恢复检定；months 刷新精神分析月度名额并结算不定疯狂。',
            parameters: {
                type: 'object',
                properties: {
                    hours: { type: 'number', description: '推进小时（满 24 进一天）' },
                    days: { type: 'number', description: '推进天数（过夜填 1）' },
                    weeks: { type: 'number', description: '推进周数' },
                    months: { type: 'number', description: '推进月数（不定疯狂）' },
                    note: { type: 'string', description: '叙事备注，如天亮、休整' }
                }
            }
        },
        extinguish_fire: {
            description: '【灭火】扑灭目标身上的 burning 状态。默认急救检定。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '着火者' },
                    actor_name: { type: 'string', description: '灭火者（默认目标自己）' },
                    skill_name: { type: 'string', description: '检定技能，默认急救' }
                },
                required: ['target_name']
            }
        },
        trigger_affliction: {
            description: '【恐惧症/狂躁症触发】当刺激匹配调查员的恐惧症或狂躁症时调用；下一次相关检定自动带惩罚骰。stimulus 与 trigger 二选一。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '调查员' },
                    stimulus: { type: 'string', description: '刺激物关键词，如「蜘蛛」「黑暗」「血」' },
                    trigger: { type: 'string', description: '同 stimulus（别名）' }
                },
                required: ['target_name']
            }
        },
                record_engine_log: {
            description: '当系统架构发生重大变化、Bug被修复或新功能实装时，必须调用此工具记录开发者日志。',
            parameters: {
                type: 'object',
                properties: {
                    version: { type: 'string', description: '版本号，如 v11' },
                    title: { type: 'string', description: '更新标题' },
                    changes: { type: 'array', minItems: 1, items: { type: 'string' }, description: '改动要点列表', singleAsArray: true }
                },
                required: ['version', 'title', 'changes']
            }
        },
        study_tome: {
            description: '调查员阅读/研读神话典籍。浏览或读完时先做 SAN 检定再结算损失与神话技能。weeks 为 0 表示初次浏览，>0 表示投入周数。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '研读者的姓名' },
                    tome_name: { type: 'string', description: '典籍名称' },
                    weeks: { type: 'number', description: '研读周数（0=浏览）' }
                },
                required: ['target_name', 'tome_name']
            }
        },
        cast_spell: {
            description: '【调查员施放法术】消耗 MP 与 SAN（经 SanityEngine）。伤害/诅咒/召唤若有目标 POW，施法者先做意志骰盘再对抗（目标由引擎掷）。多回合召唤须先 start_ritual/continue_ritual。POW 永久扣除由规则档控制。assistant_names（或单数 assistant_name）可协作分摊 MP。',
            parameters: {
                type: 'object',
                properties: {
                    creature_name: { type: 'string', description: '变身类法术（如变形术）要变成的生物卡名，例如 食尸鬼；不填则不变形' },
                    form_name: { type: 'string', description: '同 creature_name' },
                    caster_name: { type: 'string', description: '主施法者姓名' },
                    spell: { type: 'string', description: '同 spell_name' },
                    spell_name: { type: 'string', description: '法术名称' },
                    target_name: { type: 'string', description: '目标名称（可选）' },
                    assistant_names: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '协作施法者姓名（分摊 MP）',
                        singleAsArray: true
                    },
                    assistant_name: { type: 'string', description: '单个协作施法者（同 assistant_names 单元素）' },
                    ritual_complete: { type: 'boolean', description: '标记多回合仪式已完成（通常由 status.ritual 推断）' }
                },
                required: ['caster_name', 'spell_name']
            }
        },
        apply_enchantment: {
            description: '【附魔】对目标施加附魔表效果（如 elder_sign / yellow_sign_amulet）。走 MythosEngine，不直接改 HP/SAN。enchantment_id 与 enchantmentId 二选一。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '目标姓名' },
                    enchantment_id: { type: 'string', description: '附魔 id' },
                    enchantmentId: { type: 'string', description: '同 enchantment_id（camelCase 别名）' }
                },
                required: ['target_name']
            }
        },
        dispel_magic: {
            description: '【驱散】清除目标身上的仪式/法术标记/附魔 buff；消耗施法者 MP。',
            parameters: {
                type: 'object',
                properties: {
                    caster_name: { type: 'string', description: '施法者' },
                    target_name: { type: 'string', description: '目标；省略则同施法者' },
                    mp_cost: { type: 'number', description: '默认 1' },
                    clear_all: { type: 'boolean', description: '是否清除 cursed/blessed/mythosMark' }
                },
                required: ['caster_name']
            }
        },
        apply_scenario_effects: {
            description: '【模组契约窄口】一次结算 sanCheck / combat.exchange / chase / enchantmentId / dispel / flags（亦接受 snake_case：san_check / enchantment_id / dispel_mp）。禁止用此工具改 location/items/clues（请用专用工具）。数值经统一 Kernel。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '主要目标调查员' },
                    sanCheck: { type: 'string', description: '如 0/1D6' },
                    san_check: { type: 'string', description: '同 sanCheck（snake_case 别名）' },
                    enchantmentId: { type: 'string', description: '附魔 id' },
                    enchantment_id: { type: 'string', description: '同 enchantmentId（snake_case 别名）' },
                    dispel: { type: 'boolean', description: '是否驱散' },
                    dispelMp: { type: 'number' },
                    dispel_mp: { type: 'number', description: '同 dispelMp（snake_case 别名）' },
                    combat: {
                        type: 'object',
                        description: '脚本化一次交锋 { creatureId, mode, weaponId, attacker, onWin, onLose }'
                    },
                    chase: {
                        type: 'object',
                        description: '启动追逐 { lead, pursuer, vehicle }'
                    },
                    flags: { type: 'object', description: '写入 scenarioRunner.flags' },
                    cause: { type: 'string', description: '目击/效果原因备注（SAN 等）' }
                },
                required: []
            }
        },
        start_ritual: {
            description: '【开始仪式】多回合召唤/高阶法术的第一轮；受伤会打断。完成后需 continue_ritual，再 cast_spell。',
            parameters: {
                type: 'object',
                properties: {
                    caster_name: { type: 'string', description: '施法者姓名' },
                    spell: { type: 'string', description: '同 spell_name' },
                    spell_name: { type: 'string', description: '法术名称' }
                },
                required: ['caster_name', 'spell_name']
            }
        },
        continue_ritual: {
            description: '【继续仪式】推进进行中的多回合施法；完成后可 cast_spell 结算。',
            parameters: {
                type: 'object',
                properties: {
                    caster_name: { type: 'string', description: '施法者姓名' }
                },
                required: ['caster_name']
            }
        },
        spend_luck: {
            description: '消耗运气。可直接扣 amount；或绑定最近一次检定（target_level=成功/困难成功/极难成功/大成功）按 1 运气=1 点降低骰值。',
            parameters: {
                type: 'object',
                properties: {
                    target_name: { type: 'string', description: '使用幸运的调查员姓名' },
                    amount: { type: 'number', description: '直接消耗点数（不绑定检定时用）' },
                    target_level: { type: 'string', description: '绑定检定目标等级：成功|困难成功|极难成功|大成功' },
                    bind_level: { type: 'string', description: '同 target_level（别名）' },
                    rolled_value: { type: 'number', description: '可选：覆盖 lastSkillCheck 的骰值' },
                    skill_value: { type: 'number', description: '可选：技能满值' },
                    skill_name: { type: 'string', description: '可选：技能名' },
                    old_level: { type: 'string', description: '可选：覆盖检定原等级' },
                    target_value: { type: 'number', description: '可选：覆盖检定目标值' }
                },
                required: ['target_name']
            }
        },
    };

    const INTERNAL_SCHEMA_KEYS = new Set(['singleAsArray']);

    const clone = (value) => {
        if (Array.isArray(value)) return value.map(clone);
        if (value && typeof value === 'object') {
            const out = {};
            Object.keys(value).forEach((key) => { out[key] = clone(value[key]); });
            return out;
        }
        return value;
    };

    const stripInternalSchemaKeys = (value) => {
        if (Array.isArray(value)) return value.map(stripInternalSchemaKeys);
        if (value && typeof value === 'object') {
            const out = {};
            Object.keys(value).forEach((key) => {
                if (!INTERNAL_SCHEMA_KEYS.has(key)) out[key] = stripInternalSchemaKeys(value[key]);
            });
            return out;
        }
        return value;
    };

    const addStrictObjectBoundaries = (value) => {
        if (Array.isArray(value)) return value.map(addStrictObjectBoundaries);
        if (value && typeof value === 'object') {
            const out = {};
            Object.keys(value).forEach((key) => { out[key] = addStrictObjectBoundaries(value[key]); });
            if (out.type === 'object' && out.additionalProperties === undefined) out.additionalProperties = false;
            return out;
        }
        return value;
    };

    const getDefinition = (name) => TOOL_CATALOG[name] || null;
    const getSchema = (name) => getDefinition(name)?.parameters || null;
    const getNames = () => Object.keys(TOOL_CATALOG);
    const buildTools = () => getNames().map((name) => {
        const def = TOOL_CATALOG[name];
        return {
            type: 'function',
            function: {
                name,
                description: formatToolDescription(name, def.description),
                parameters: addStrictObjectBoundaries(stripInternalSchemaKeys(def.parameters))
            }
        };
    });

    const argumentSchemas = Object.freeze(getNames().reduce((acc, name) => {
        acc[name] = TOOL_CATALOG[name].parameters;
        return acc;
    }, {}));

    const auditAgainstHandlers = (handlerNames = [], specialNames = ['request_skill_check', 'push_skill_check']) => {
        const handlerSet = new Set(Array.isArray(handlerNames) ? handlerNames : []);
        const specialSet = new Set(Array.isArray(specialNames) ? specialNames : []);
        const catalogNames = getNames();
        const missingHandlers = catalogNames.filter(name => !handlerSet.has(name) && !specialSet.has(name));
        const handlersWithoutCatalog = [...handlerSet].filter(name => !TOOL_CATALOG[name]);
        const duplicateNames = catalogNames.filter((name, idx) => catalogNames.indexOf(name) !== idx);
        const tierNames = [...TOOL_TIERS.required, ...TOOL_TIERS.suggested];
        const tiersWithoutCatalog = tierNames.filter((name) => !TOOL_CATALOG[name]);
        return {
            ok: missingHandlers.length === 0 && handlersWithoutCatalog.length === 0 && duplicateNames.length === 0 && tiersWithoutCatalog.length === 0,
            catalogNames,
            missingHandlers,
            handlersWithoutCatalog,
            duplicateNames,
            tiersWithoutCatalog
        };
    };

    return {
        catalog: TOOL_CATALOG,
        argumentSchemas,
        getDefinition,
        getSchema,
        getNames,
        getToolTier,
        buildTools,
        stripInternalSchemaKeys,
        addStrictObjectBoundaries,
        auditAgainstHandlers,
        clone
    };
})();

export { CoCToolDefinitions };
