/** Abandoned asylum — novella-scale offline investigation. */
import { ASYLUM_PROSE as P } from './abandoned_asylum/index_prose.mjs';

export const CoCScenarioAbandonedAsylum = {
    id: "abandoned_asylum",
    title: "废弃疗养院",
    subtitle: "石岭疗养院",
    author: "CoC Engine Team",
    license: "Original - CoC Engine",
    tags: ['精神病院', '1920s', '封闭空间', '调查', '长篇', '证据分叉'],
    description: "1924年，石岭疗养院在一场不明火灾后永久关闭。你受雇清点遗留档案，却在空荡走廊里听见轮椅的吱呀声。",
    era: "1920s",
    estimatedMinutes: 180,
    lorebook: [
        {
            "id": "abandoned_asylum_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "abandoned_asylum"
            ],
            "content": "「废弃疗养院」：保持1920s克苏鲁调查/恐怖基调。1924年，石岭疗养院在一场不明火灾后永久关闭。你受雇清点遗留档案，却在空荡走廊里听见轮椅的吱呀声。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "abandoned_asylum_start",
            "title": "石岭疗养院·铁门",
            "keys": [
                "石岭疗养院·铁门",
                "石岭疗养院",
                "废弃疗养院"
            ],
            "locations": [
                "石岭疗养院"
            ],
            "priority": 12,
            "scenarioIds": [
                "abandoned_asylum"
            ],
            "content": "开场地点「石岭疗养院·铁门」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "abandoned_asylum_room_0",
            "title": "铁门",
            "keys": [
                "铁门"
            ],
            "locations": [
                "铁门"
            ],
            "priority": 8,
            "scenarioIds": [
                "abandoned_asylum"
            ],
            "content": "场景「铁门」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "abandoned_asylum_room_1",
            "title": "大厅",
            "keys": [
                "大厅"
            ],
            "locations": [
                "大厅"
            ],
            "priority": 7,
            "scenarioIds": [
                "abandoned_asylum"
            ],
            "content": "场景「大厅」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "abandoned_asylum_room_2",
            "title": "病房区",
            "keys": [
                "病房区"
            ],
            "locations": [
                "病房区"
            ],
            "priority": 6,
            "scenarioIds": [
                "abandoned_asylum"
            ],
            "content": "场景「病房区」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "abandoned_asylum_room_3",
            "title": "院长办公室",
            "keys": [
                "院长办公室"
            ],
            "locations": [
                "院长办公室"
            ],
            "priority": 5,
            "scenarioIds": [
                "abandoned_asylum"
            ],
            "content": "场景「院长办公室」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "abandoned_asylum_room_4",
            "title": "地下档案室",
            "keys": [
                "地下档案室"
            ],
            "locations": [
                "地下档案室"
            ],
            "priority": 5,
            "scenarioIds": [
                "abandoned_asylum"
            ],
            "content": "场景「地下档案室」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "abandoned_asylum_invest",
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
                "abandoned_asylum"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        },
        {
            "id": "abandoned_asylum_space",
            "title": "封闭/孤立空间",
            "keys": [
                "逃不出去",
                "锁",
                "封闭",
                "孤立",
                "困"
            ],
            "priority": 5,
            "scenarioIds": [
                "abandoned_asylum"
            ],
            "content": "空间压迫感服务悬疑：出口受限、信息不全。战斗/环境伤害须走工具；保持玩家有至少一条可推进的调查口。"
        }
    ],
    startNode: "gate",
    initialLocation: "石岭疗养院·铁门",
    setup: {
        location: "石岭疗养院·铁门",
        atmosphere: {
            level: "calm",
            note: "秋雾笼罩的山腰"
        },
        map: {
            title: "石岭疗养院",
            rooms: [
                {
                    id: "gate",
                    name: "铁门",
                    connections: [
                        "lobby"
                    ]
                },
                {
                    id: "lobby",
                    name: "大厅",
                    connections: [
                        "gate",
                        "ward",
                        "basement"
                    ]
                },
                {
                    id: "ward",
                    name: "病房区",
                    connections: [
                        "lobby",
                        "office"
                    ]
                },
                {
                    id: "office",
                    name: "院长办公室",
                    connections: [
                        "ward"
                    ]
                },
                {
                    id: "basement",
                    name: "地下档案室",
                    connections: [
                        "lobby"
                    ]
                }
            ],
            currentRoomId: "gate"
        },
        journal: "委托：清点石岭疗养院关闭前的病人档案与财物。"
    },
    nodes: {
    gate: {
        narrative: P.gate,
        choices: [
            {
                id: "enter",
                label: "进入大厅",
                next: "lobby_approach"
            },
            {
                id: "perimeter",
                label: "沿外墙搜索",
                next: "perimeter_check",
                skillCheck: {
                    skill: "侦查"
                }
            }
        ],
    },
    lobby_approach: {
        narrative: P.lobby_approach,
        choices: [
            {
                id: "in",
                label: "踏入大厅",
                next: "lobby"
            }
        ],
    },
    perimeter_check: {
        narrative: P.perimeter_check,
        branch: {
            success: "side_door",
            failure: "lobby_approach"
        },
        groupOutcome: {
            allSuccess: P.perimeter_check_allSuccess,
            allFailure: P.perimeter_check_allFailure,
            mixed: P.perimeter_check_mixed
        },
    },
    side_door: {
        narrative: P.side_door,
        effects: {
            clues: [
                {
                    id: "asylum_scratches",
                    title: "墙上抓痕",
                    content: "五道平行抓痕，指甲断裂残留。",
                    type: "physical"
                }
            ],
            flags: {
                asylum_clue: true
            }
        },
        choices: [
            {
                id: "in",
                label: "进入大厅",
                next: "lobby_approach"
            }
        ],
    },
    lobby: {
        narrative: P.lobby,
        effects: {
            location: "疗养院大厅",
            mapRoom: "lobby",
            clues: [
                {
                    id: "asylum_log",
                    title: "值班日志",
                    content: "\"第17号病人从未离开——他一直在墙里。\"",
                    type: "document"
                }
            ]
        },
        choices: [
            {
                id: "ward",
                label: "前往病房区",
                next: "ward_approach"
            },
            {
                id: "basement",
                label: "下地下档案室",
                next: "basement_stairs",
                requiresFlag: "asylum_clue"
            },
            {
                id: "listen",
                label: "静听楼内动静",
                next: "listen_check",
                skillCheck: {
                    skill: "聆听"
                }
            },
            {
                id: "courtyard",
                label: "去院落看看",
                next: "courtyard"
            },
            {
                id: "laundry_room",
                label: "去洗衣房看看",
                next: "laundry_room"
            },
            {
                id: "pharmacy",
                label: "去药房看看",
                next: "pharmacy"
            },
            {
                id: "nurse_station",
                label: "去护士站看看",
                next: "nurse_station"
            },
            {
                id: "chapel",
                label: "去小礼拜堂看看",
                next: "chapel"
            },
            {
                id: "boiler",
                label: "去锅炉房看看",
                next: "boiler"
            },
            {
                id: "east_wing",
                label: "去东翼封锁门看看",
                next: "east_wing"
            },
            {
                id: "west_wing",
                label: "去西翼走廊看看",
                next: "west_wing"
            },
            {
                id: "room16",
                label: "去16号病房看看",
                next: "room16"
            },
            {
                id: "room18",
                label: "去18号病房看看",
                next: "room18"
            },
            {
                id: "morgue",
                label: "去停尸间看看",
                next: "morgue"
            },
            {
                id: "generator",
                label: "去发电机房看看",
                next: "generator"
            },
            {
                id: "staff_quarters",
                label: "去职工宿舍看看",
                next: "staff_quarters"
            },
            {
                id: "rain_pavilion",
                label: "去雨廊看看",
                next: "rain_pavilion"
            }
        ],
    },
    listen_check: {
        narrative: P.listen_check,
        branch: {
            success: "listen_ok",
            failure: "listen_fail"
        },
        groupOutcome: {
            allSuccess: P.listen_check_allSuccess,
            allFailure: P.listen_check_allFailure,
            mixed: P.listen_check_mixed
        },
    },
    listen_ok: {
        narrative: P.listen_ok,
        effects: {
            journal: "轮椅声与摇篮曲来自病房区。",
            flags: {
                asylum_clue: true
            }
        },
        choices: [
            {
                id: "w",
                label: "前往病房区",
                next: "ward_approach"
            }
        ],
    },
    listen_fail: {
        narrative: P.listen_fail,
        choices: [
            {
                id: "w2",
                label: "循声前往病房区",
                next: "ward_approach"
            },
            {
                id: "off",
                label: "去院长办公室查档案",
                next: "office"
            }
        ],
    },
    basement_stairs: {
        narrative: P.basement_stairs,
        effects: {
            journal: "地下室拖痕与墙中低语呼应。"
        },
        choices: [
            {
                id: "down",
                label: "进入地下档案室",
                next: "basement"
            }
        ],
    },
    ward_approach: {
        narrative: P.ward_approach,
        choices: [
            {
                id: "in",
                label: "进入病房区",
                next: "ward"
            }
        ],
    },
    ward: {
        narrative: P.ward,
        checkpoint: "17号病房：镜中瘦影与墙中秘密",
        effects: {
            location: "病房区",
            mapRoom: "ward",
            sanCheck: "0/1"
        },
        choices: [
            {
                id: "door17",
                label: "检查17号病房",
                next: "room17",
                skillCheck: {
                    skill: "力量"
                }
            },
            {
                id: "office",
                label: "去院长办公室",
                next: "office"
            }
        ],
    },
    room17: {
        narrative: P.room17,
        branch: {
            success: "mirror_ok",
            failure: "mirror_fail"
        },
        groupOutcome: {
            allSuccess: P.room17_allSuccess,
            allFailure: P.room17_allFailure,
            mixed: P.room17_mixed
        },
    },
    mirror_ok: {
        narrative: P.mirror_ok,
        effects: {
            clues: [
                {
                    id: "asylum_records",
                    title: "17号病历",
                    content: "反复记录\"患者声称墙壁在呼吸\"。",
                    type: "document"
                }
            ],
            journal: "17号病人与\"墙中\"有关。",
            flags: {
                asylum_clue: true
            }
        },
        choices: [
            {
                id: "off",
                label: "带病历去院长办公室",
                next: "office"
            }
        ],
    },
    mirror_fail: {
        narrative: P.mirror_fail,
        effects: {
            sanCheck: "0/1D3",
            combat: {
                creatureId: "asylum_attendant",
                mode: "exchange",
                pendingRoll: true,
                attacker: "pc",
                weaponId: "knife",
                onWin: "asylum_shadow_down",
                onLose: "asylum_shadow_press"
            }
        },
        choices: [
            {
                id: "run",
                label: "逃向院长办公室",
                next: "office"
            }
        ],
    },
    office: {
        narrative: P.office,
        effects: {
            location: "院长办公室",
            mapRoom: "office"
        },
        choices: [
            {
                id: "read",
                label: "阅读院长日记",
                next: "diary"
            },
            {
                id: "base",
                label: "按图前往地下档案室",
                next: "basement_stairs",
                requiresFlag: "asylum_clue"
            }
        ],
    },
    diary: {
        narrative: P.diary,
        effects: {
            clues: [
                {
                    id: "asylum_diary",
                    title: "院长日记",
                    content: "17号能穿墙；大火因实验引发。",
                    type: "document"
                }
            ],
            sanCheck: "0/1",
            flags: {
                asylum_clue: true
            }
        },
        choices: [
            {
                id: "down",
                label: "前往地下隔离区",
                next: "basement_stairs",
                requiresClueQuality: "solid"
            },
            {
                // Only exit was gated on solid evidence: without it the investigation soft-locked here.
                id: "back_office",
                label: "合上日记退回办公室，继续搜寻更扎实的证据",
                next: "office"
            }
        ],
    },
    basement: {
        narrative: P.basement,
        checkpoint: "地下凹痕：墙中空间最终抉择",
        effects: {
            location: "地下档案室",
            mapRoom: "basement",
            atmosphere: {
                level: "dread",
                note: "墙中空间"
            }
        },
        choices: [
            {
                id: "enter_wall",
                label: "进入凹痕空间",
                next: "finale",
                skillCheck: {
                    skill: "意志",
                    aggregate: "all"
                }
            },
            {
                id: "retreat",
                label: "撤回大厅重整",
                next: "lobby"
            },
            {
                id: "seal_entrance",
                label: "把档案柜推回去，堵住凹痕入口",
                next: "ending_seal"
            }
        ],
    },
    finale: {
        narrative: P.finale,
        branch: {
            success: "ending_win",
            failure: "ending_taken"
        },
        groupOutcome: {
            allSuccess: P.finale_allSuccess,
            allFailure: P.finale_allFailure,
            mixed: P.finale_mixed
        },
    },
    ending_win: {
        narrative: P.ending_win,
        end: true,
        effects: {
            journal: "封印墙中空间，疗养院威胁解除。",
            enchantmentId: "elder_sign"
        },
    },
    ending_taken: {
        narrative: P.ending_taken,
        end: true,
        effects: {
            sanCheck: "1D3/1D10",
            dispel: true
        },
    },
    ending_seal: {
        narrative: P.ending_seal,
        end: true,
        effects: {
            journal: "封死入口但未彻底消灭威胁。",
            sanCheck: "0/1D3"
        },
    },
    courtyard: {
        narrative: P.courtyard,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    laundry_room: {
        narrative: P.laundry_room,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    pharmacy: {
        narrative: P.pharmacy,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    nurse_station: {
        narrative: P.nurse_station,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    chapel: {
        narrative: P.chapel,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    boiler: {
        narrative: P.boiler,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    east_wing: {
        narrative: P.east_wing,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    west_wing: {
        narrative: P.west_wing,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    room16: {
        narrative: P.room16,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    room18: {
        narrative: P.room18,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    morgue: {
        narrative: P.morgue,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    generator: {
        narrative: P.generator,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    staff_quarters: {
        narrative: P.staff_quarters,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    rain_pavilion: {
        narrative: P.rain_pavilion,
        choices: [
            {
                id: "back_lobby",
                label: "回到大厅继续调查",
                next: "lobby"
            }
        ],
    },
    }
};
