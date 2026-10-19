/** Missing child — novella-scale offline investigation. */
import { MISSING_CHILD_PROSE as P } from './missing_child/index_prose.mjs';

export const CoCScenarioMissingChild = {
    id: "missing_child",
    title: "失踪孩童",
    subtitle: "失踪孩童",
    author: "CoC Engine Team",
    license: "Original - CoC Engine",
    tags: ['失踪', '1920s', '郊区', '调查', '长篇', '证据分叉'],
    description: "波士顿郊区橡树街，8岁女孩艾米莉黄昏在自家后院消失。警方搜寻无果，父母雇你继续调查。",
    era: "1920s",
    estimatedMinutes: 180,
    lorebook: [
        {
            "id": "missing_child_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "「失踪孩童」：保持1920s克苏鲁调查/恐怖基调。波士顿郊区橡树街，8岁女孩艾米莉黄昏在自家后院消失。警方搜寻无果，父母雇你继续调查。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "missing_child_start",
            "title": "橡树街·艾米莉家",
            "keys": [
                "橡树街·艾米莉家",
                "橡树街",
                "失踪孩童"
            ],
            "locations": [
                "橡树街"
            ],
            "priority": 12,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "开场地点「橡树街·艾米莉家」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "missing_child_room_0",
            "title": "艾米莉家",
            "keys": [
                "艾米莉家"
            ],
            "locations": [
                "艾米莉家"
            ],
            "priority": 8,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "场景「艾米莉家」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "missing_child_room_1",
            "title": "后院",
            "keys": [
                "后院"
            ],
            "locations": [
                "后院"
            ],
            "priority": 7,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "场景「后院」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "missing_child_room_2",
            "title": "橡树街",
            "keys": [
                "橡树街"
            ],
            "locations": [
                "橡树街"
            ],
            "priority": 6,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "场景「橡树街」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "missing_child_room_3",
            "title": "社区公园",
            "keys": [
                "社区公园"
            ],
            "locations": [
                "社区公园"
            ],
            "priority": 5,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "场景「社区公园」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "missing_child_room_4",
            "title": "边界树林",
            "keys": [
                "边界树林"
            ],
            "locations": [
                "边界树林"
            ],
            "priority": 5,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "场景「边界树林」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "missing_child_room_5",
            "title": "旧井",
            "keys": [
                "旧井"
            ],
            "locations": [
                "旧井"
            ],
            "priority": 5,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "场景「旧井」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "missing_child_invest",
            "title": "调查节奏",
            "keys": [
                "调查",
                "线索",
                "证据",
                "询问",
                "搜索"
            ],
            "priority": 6,
            "scenarioIds": [
                "missing_child"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        }
    ],
    startNode: "house",
    initialLocation: "橡树街·艾米莉家",
    setup: {
        location: "橡树街·艾米莉家",
        atmosphere: {
            level: "calm",
            note: "安静郊区"
        },
        map: {
            title: "橡树街",
            rooms: [
                {
                    id: "house",
                    name: "艾米莉家",
                    connections: [
                        "yard",
                        "street"
                    ]
                },
                {
                    id: "yard",
                    name: "后院",
                    connections: [
                        "house",
                        "woods"
                    ]
                },
                {
                    id: "street",
                    name: "橡树街",
                    connections: [
                        "house",
                        "park",
                        "church"
                    ]
                },
                {
                    id: "park",
                    name: "社区公园",
                    connections: [
                        "street"
                    ]
                },
                {
                    id: "woods",
                    name: "边界树林",
                    connections: [
                        "yard",
                        "well"
                    ]
                },
                {
                    id: "well",
                    name: "旧井",
                    connections: [
                        "woods"
                    ]
                }
            ],
            currentRoomId: "house"
        },
        journal: "委托：寻找失踪女孩艾米莉·哈特。"
    },
    nodes: {
    house: {
        narrative: P.house,
        effects: {
            clues: [
                {
                    id: "mc_drawing",
                    title: "蜡笔画",
                    content: "\"树里的朋友\"——螺旋眼无脸人形。",
                    type: "physical"
                }
            ]
        },
        choices: [
            {
                id: "yard",
                label: "搜查后院",
                next: "yard"
            },
            {
                id: "street",
                label: "沿橡树街走访",
                next: "street"
            },
            {
                id: "room",
                label: "仔细检查房间",
                next: "room_check",
                skillCheck: {
                    skill: "侦查"
                }
            },
            {
                id: "attic_toys",
                label: "去查看阁楼的玩具箱",
                next: "attic_toys"
            },
            {
                id: "basement_jar",
                label: "去查看地下室的盐罐",
                next: "basement_jar"
            },
            {
                id: "neighbor_porch",
                label: "去查看邻居家门廊",
                next: "neighbor_porch"
            },
            {
                id: "school_desk",
                label: "去查看学校课桌",
                next: "school_desk"
            },
            {
                id: "bike_path",
                label: "去查看林边的自行车道",
                next: "bike_path"
            },
            {
                id: "dog_kennel",
                label: "去查看空犬舍",
                next: "dog_kennel"
            },
            {
                id: "oak_hollow",
                label: "去查看老橡树的空洞",
                next: "oak_hollow"
            },
            {
                id: "swing_set",
                label: "去查看秋千架",
                next: "swing_set"
            },
            {
                id: "police_tape",
                label: "去查看警戒线一带",
                next: "police_tape"
            },
            {
                id: "photo_album",
                label: "去查看家里的相册",
                next: "photo_album"
            },
            {
                id: "night_watch",
                label: "去查看守夜人的笔记",
                next: "night_watch"
            },
            {
                id: "rope_shed",
                label: "去查看绳棚",
                next: "rope_shed"
            },
            {
                id: "creek_bridge",
                label: "去查看小溪上的桥",
                next: "creek_bridge"
            },
            {
                id: "scarecrow_field",
                label: "去查看稻草人田",
                next: "scarecrow_field"
            }
        ],
    },
    room_check: {
        narrative: P.room_check,
        branch: {
            success: "diary",
            failure: "yard"
        },
        groupOutcome: {
            allSuccess: P.room_check_allSuccess,
            allFailure: P.room_check_allFailure,
            mixed: P.room_check_mixed
        },
    },
    diary: {
        narrative: P.diary,
        effects: {
            clues: [
                {
                    id: "mc_diary",
                    title: "艾米莉日记",
                    content: "朋友从井来；满月树开门。",
                    type: "document"
                }
            ],
            journal: "线索指向井与树林。",
            flags: {
                mc_intel: true
            }
        },
        choices: [
            {
                id: "y",
                label: "去后院",
                next: "yard"
            },
            {
                id: "w",
                label: "直接去边界树林",
                next: "woods"
            }
        ],
    },
    yard: {
        narrative: P.yard,
        effects: {
            location: "后院",
            mapRoom: "yard",
            sanCheck: "0/1"
        },
        choices: [
            {
                id: "woods",
                label: "跟踪脚印进树林",
                next: "woods"
            },
            {
                id: "neighbor",
                label: "询问邻居",
                next: "street"
            }
        ],
    },
    street: {
        narrative: P.street,
        effects: {
            location: "橡树街",
            mapRoom: "street"
        },
        choices: [
            {
                id: "park",
                label: "去社区公园",
                next: "park"
            },
            {
                id: "church",
                label: "去教堂查洗礼记录",
                next: "church"
            },
            {
                id: "woods2",
                label: "进边界树林",
                next: "woods"
            }
        ],
    },
    park: {
        narrative: P.park,
        effects: {
            location: "社区公园",
            mapRoom: "park",
            clues: [
                {
                    id: "mc_ribbon",
                    title: "艾米莉发带",
                    content: "绑在秋千上；沙坑有爪印通向树林。",
                    type: "physical"
                }
            ]
        },
        choices: [
            {
                id: "w2",
                label: "进入树林",
                next: "woods"
            }
        ],
    },
    church: {
        narrative: P.church,
        effects: {
            location: "圣保罗教堂",
            mapRoom: "church",
            clues: [
                {
                    id: "mc_baptism",
                    title: "教会档案",
                    content: "百年前旧井献祭\"树子\"仪式。",
                    type: "document"
                }
            ],
            flags: {
                mc_intel: true
            }
        },
        choices: [
            {
                id: "well",
                label: "按档案找旧井",
                next: "well_approach"
            }
        ],
    },
    woods: {
        narrative: P.woods,
        checkpoint: "边界橡树：树洞与「朋友」",
        effects: {
            location: "边界树林",
            mapRoom: "woods",
            sanCheck: "0/1D3"
        },
        choices: [
            {
                id: "tree",
                label: "检查树洞",
                next: "tree_check",
                skillCheck: {
                    skill: "聆听"
                }
            },
            {
                id: "well2",
                label: "沿小径找旧井",
                next: "well_approach"
            }
        ],
    },
    well_approach: {
        narrative: P.well_approach,
        choices: [
            {
                id: "in",
                label: "抵达井口",
                next: "well"
            },
            {
                id: "woods",
                label: "查边界橡树",
                next: "woods"
            }
        ],
    },
    tree_check: {
        narrative: P.tree_check,
        branch: {
            success: "tree_ok",
            failure: "tree_fail"
        },
        groupOutcome: {
            allSuccess: P.tree_check_allSuccess,
            allFailure: P.tree_check_allFailure,
            mixed: P.tree_check_mixed
        },
    },
    tree_fail: {
        narrative: P.tree_fail,
        choices: [
            {
                id: "well",
                label: "沿小径找旧井",
                next: "well_approach"
            },
            {
                id: "church",
                label: "回教堂查档案",
                next: "church"
            }
        ],
    },
    tree_ok: {
        narrative: P.tree_ok,
        effects: {
            journal: "艾米莉在树内，有非人存在。"
        },
        choices: [
            {
                id: "enter",
                label: "爬入树洞",
                next: "tree_descent"
            },
            {
                id: "well3",
                label: "去旧井找封印方法",
                next: "well_approach"
            }
        ],
    },
    tree_descent: {
        narrative: P.tree_descent,
        choices: [
            {
                id: "down",
                label: "沿井道深入",
                next: "finale"
            }
        ],
    },
    well: {
        narrative: P.well,
        checkpoint: "旧井封印：教会十字与盐圈",
        effects: {
            location: "旧井",
            mapRoom: "well"
        },
        choices: [
            {
                id: "seal",
                label: "用盐和十字修复封印",
                next: "seal_check",
                skillCheck: {
                    skill: "神秘学",
                    aggregate: "all"
                },
                requiresFlag: "mc_intel"
            },
            {
                id: "rescue",
                label: "下井救人",
                next: "well_descent",
                requiresClueQuality: "solid"
            },
            {
                // Both exits were gated (flag / solid evidence): without either the scenario soft-locked.
                id: "back_path",
                label: "离开井边退回小路，另外寻找可靠的线索",
                next: "well_approach"
            }
        ],
    },
    well_descent: {
        narrative: P.well_descent,
        choices: [
            {
                id: "down",
                label: "沿井道深入",
                next: "finale"
            }
        ],
    },
    seal_check: {
        narrative: P.seal_check,
        branch: {
            success: "ending_win",
            failure: "well_descent"
        },
        groupOutcome: {
            allSuccess: P.seal_check_allSuccess,
            allFailure: P.seal_check_allFailure,
            mixed: P.seal_check_mixed
        },
    },
    finale: {
        narrative: P.finale,
        effects: {
            sanCheck: "1/1D4",
            atmosphere: {
                level: "dread",
                note: "树中生物"
            },
            combat: {
                creatureId: "cultist",
                mode: "exchange",
                pendingRoll: true,
                attacker: "pc",
                weaponId: "knife",
                onWin: "mc_friend_down",
                onLose: "mc_friend_press"
            }
        },
        choices: [
            {
                id: "grab",
                label: "冲过去抢回艾米莉",
                next: "grab_check",
                skillCheck: {
                    skill: "敏捷",
                    aggregate: "all"
                }
            },
            {
                id: "talk",
                label: "与\"朋友\"交涉",
                next: "talk_check",
                skillCheck: {
                    skill: "心理学",
                    aggregate: "all"
                }
            }
        ],
    },
    grab_check: {
        narrative: P.grab_check,
        branch: {
            success: "ending_rescue",
            failure: "ending_lost"
        },
        groupOutcome: {
            allSuccess: P.grab_check_allSuccess,
            allFailure: P.grab_check_allFailure,
            mixed: P.grab_check_mixed
        },
    },
    talk_check: {
        narrative: P.talk_check,
        branch: {
            success: "ending_trade",
            failure: "ending_lost"
        },
        groupOutcome: {
            allSuccess: P.talk_check_allSuccess,
            allFailure: P.talk_check_allFailure,
            mixed: P.talk_check_mixed
        },
    },
    ending_win: {
        narrative: P.ending_win,
        end: true,
        effects: {
            journal: "封印旧井，救出艾米莉。",
            enchantmentId: "elder_sign"
        },
    },
    ending_rescue: {
        narrative: P.ending_rescue,
        end: true,
        effects: {
            journal: "救出艾米莉，树中威胁仍在。",
            sanCheck: "0/1D3"
        },
    },
    ending_trade: {
        narrative: P.ending_trade,
        end: true,
        effects: {
            sanCheck: "1D3/1D10",
            dispel: true
        },
    },
    ending_lost: {
        narrative: P.ending_lost,
        end: true,
    },
    attic_toys: {
        narrative: P.attic_toys,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    basement_jar: {
        narrative: P.basement_jar,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    neighbor_porch: {
        narrative: P.neighbor_porch,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    school_desk: {
        narrative: P.school_desk,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    bike_path: {
        narrative: P.bike_path,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    dog_kennel: {
        narrative: P.dog_kennel,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    oak_hollow: {
        narrative: P.oak_hollow,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    swing_set: {
        narrative: P.swing_set,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    police_tape: {
        narrative: P.police_tape,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    photo_album: {
        narrative: P.photo_album,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    night_watch: {
        narrative: P.night_watch,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    rope_shed: {
        narrative: P.rope_shed,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    creek_bridge: {
        narrative: P.creek_bridge,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    scarecrow_field: {
        narrative: P.scarecrow_field,
        choices: [
            {
                id: "back_house",
                label: "回到艾米莉家中",
                next: "house"
            }
        ],
    },
    }
};
