/** Train to nowhere — novella-scale offline horror. */
import { TRAIN_PROSE as P } from './train_to_nowhere/index_prose.mjs';

export const CoCScenarioTrainToNowhere = {
    id: "train_to_nowhere",
    title: "无尽列车",
    subtitle: "无尽列车",
    author: "CoC Engine Team",
    license: "Original - CoC Engine",
    tags: ['列车', '1920s', '封闭空间', '时空', '长篇', '追逐', '证据分叉'],
    description: "你买了一张午夜特快13号的卧铺票。列车驶出波士顿后，窗外景色不再变化——永远是同一片浓雾与枯死的树林。列车员微笑说：\"本趟无终点站。\"",
    era: "1920s",
    estimatedMinutes: 180,
    lorebook: [
        {
            "id": "train_to_nowhere_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "train_to_nowhere"
            ],
            "content": "「无尽列车」：保持1920s克苏鲁调查/恐怖基调。你买了一张午夜特快13号的卧铺票。列车驶出波士顿后，窗外景色不再变化——永远是同一片浓雾与枯死的树林。列车员微笑说：\"本趟无终点站。\"证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "train_to_nowhere_start",
            "title": "13号列车·卧铺",
            "keys": [
                "13号列车·卧铺",
                "13号列车",
                "无尽列车"
            ],
            "locations": [
                "13号列车"
            ],
            "priority": 12,
            "scenarioIds": [
                "train_to_nowhere"
            ],
            "content": "开场地点「13号列车·卧铺」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "train_to_nowhere_room_0",
            "title": "卧铺车厢",
            "keys": [
                "卧铺车厢"
            ],
            "locations": [
                "卧铺车厢"
            ],
            "priority": 8,
            "scenarioIds": [
                "train_to_nowhere"
            ],
            "content": "场景「卧铺车厢」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "train_to_nowhere_room_1",
            "title": "餐车",
            "keys": [
                "餐车"
            ],
            "locations": [
                "餐车"
            ],
            "priority": 7,
            "scenarioIds": [
                "train_to_nowhere"
            ],
            "content": "场景「餐车」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "train_to_nowhere_room_2",
            "title": "行李车",
            "keys": [
                "行李车"
            ],
            "locations": [
                "行李车"
            ],
            "priority": 6,
            "scenarioIds": [
                "train_to_nowhere"
            ],
            "content": "场景「行李车」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "train_to_nowhere_room_3",
            "title": "车头",
            "keys": [
                "车头"
            ],
            "locations": [
                "车头"
            ],
            "priority": 5,
            "scenarioIds": [
                "train_to_nowhere"
            ],
            "content": "场景「车头」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "train_to_nowhere_room_4",
            "title": "守车",
            "keys": [
                "守车"
            ],
            "locations": [
                "守车"
            ],
            "priority": 5,
            "scenarioIds": [
                "train_to_nowhere"
            ],
            "content": "场景「守车」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "train_to_nowhere_chase",
            "title": "追逐要点",
            "keys": [
                "追逐",
                "逃跑",
                "追",
                "载具",
                "开车"
            ],
            "priority": 9,
            "scenarioIds": [
                "train_to_nowhere"
            ],
            "content": "追逐用 start_chase/chase_action；载具注意司机座位与行动数。追上后再允许 melee/fire，勿叙事空跑结算。"
        },
        {
            "id": "train_to_nowhere_invest",
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
                "train_to_nowhere"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        },
        {
            "id": "train_to_nowhere_space",
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
                "train_to_nowhere"
            ],
            "content": "空间压迫感服务悬疑：出口受限、信息不全。战斗/环境伤害须走工具；保持玩家有至少一条可推进的调查口。"
        }
    ],
    startNode: "cabin",
    initialLocation: "13号列车·卧铺",
    setup: {
        location: "13号列车·卧铺",
        atmosphere: {
            level: "calm",
            note: "摇晃的车厢"
        },
        map: {
            title: "午夜特快13号",
            rooms: [
                {
                    id: "cabin",
                    name: "卧铺车厢",
                    connections: [
                        "dining",
                        "baggage"
                    ]
                },
                {
                    id: "dining",
                    name: "餐车",
                    connections: [
                        "cabin",
                        "engine"
                    ]
                },
                {
                    id: "baggage",
                    name: "行李车",
                    connections: [
                        "cabin",
                        "caboose"
                    ]
                },
                {
                    id: "engine",
                    name: "车头",
                    connections: [
                        "dining"
                    ]
                },
                {
                    id: "caboose",
                    name: "守车",
                    connections: [
                        "baggage"
                    ]
                }
            ],
            currentRoomId: "cabin"
        },
        journal: "意外登上午夜特快13号——必须找到下车方法。"
    },
    nodes: {
    cabin: {
        narrative: P.cabin,
        choices: [
            {
                id: "talk",
                label: "与老先生交谈",
                next: "talk_check",
                skillCheck: {
                    skill: "心理学"
                }
            },
            {
                id: "dining",
                label: "去餐车",
                next: "dining"
            },
            {
                id: "window",
                label: "仔细观察窗外",
                next: "window"
            },
            {
                id: "corridor_green",
                label: "去绿皮车厢廊道看看",
                next: "corridor_green"
            },
            {
                id: "sleeper_berth",
                label: "去卧铺车厢看看",
                next: "sleeper_berth"
            },
            {
                id: "conductor_closet",
                label: "去乘务间看看",
                next: "conductor_closet"
            },
            {
                id: "mail_car",
                label: "去邮车看看",
                next: "mail_car"
            },
            {
                id: "dining_galley",
                label: "去餐车后厨看看",
                next: "dining_galley"
            },
            {
                id: "observation_deck",
                label: "去观景车厢看看",
                next: "observation_deck"
            },
            {
                id: "bathroom_water",
                label: "去盥洗室看看",
                next: "bathroom_water"
            },
            {
                id: "freight_latch",
                label: "去货车车厢看看",
                next: "freight_latch"
            },
            {
                id: "radio_booth",
                label: "去无线电间看看",
                next: "radio_booth"
            },
            {
                id: "coal_tender",
                label: "去煤水车看看",
                next: "coal_tender"
            },
            {
                id: "private_suite",
                label: "去一等包厢看看",
                next: "private_suite"
            },
            {
                id: "brakeman_post",
                label: "去制动手位看看",
                next: "brakeman_post"
            },
            {
                id: "tunnel_roar",
                label: "去隧道车段看看",
                next: "tunnel_roar"
            },
            {
                id: "timetable_wall",
                label: "去时刻表墙看看",
                next: "timetable_wall"
            }
        ],
    },
    window: {
        narrative: P.window,
        effects: {
            sanCheck: "0/1D3",
            clues: [
                {
                    id: "tn_faces",
                    title: "窗外面孔",
                    content: "雾中闪过乘客面孔，贴窗向内。",
                    type: "note",
                    quality: "solid"
                }
            ]
        },
        choices: [
            {
                id: "d",
                label: "去餐车打听",
                next: "dining"
            },
            {
                id: "b",
                label: "搜查行李车",
                next: "baggage"
            }
        ],
    },
    talk_check: {
        narrative: P.talk_check,
        branch: {
            success: "talk_ok",
            failure: "talk_fail"
        },
        groupOutcome: {
            allSuccess: P.talk_check_allSuccess,
            allFailure: P.talk_check_allFailure,
            mixed: P.talk_check_mixed
        },
    },
    talk_ok: {
        narrative: P.talk_ok,
        effects: {
            clues: [
                {
                    id: "tn_oldman",
                    title: "老先生证词",
                    content: "车头有\"嘴\"喂煤；守车钥匙需交换。",
                    type: "testimony",
                    quality: "solid"
                }
            ],
            journal: "守车有下车钥匙。",
            flags: {
                tn_intel: true
            }
        },
        choices: [
            {
                id: "caboose",
                label: "前往守车",
                next: "caboose_approach",
                requiresFlag: "tn_intel"
            },
            {
                id: "engine",
                label: "调查车头",
                next: "engine_approach"
            }
        ],
    },
    talk_fail: {
        narrative: P.talk_fail,
        effects: {
            sanCheck: '0/1'
        },
        choices: [
            {
                id: "din",
                label: "去餐车",
                next: "dining"
            }
        ],
    },
    dining: {
        narrative: P.dining,
        effects: {
            location: "餐车",
            mapRoom: "dining"
        },
        choices: [
            {
                id: "ask",
                label: "追问停靠站",
                next: "ask_check",
                skillCheck: {
                    skill: "说服"
                }
            },
            {
                id: "bag",
                label: "去行李车",
                next: "baggage"
            },
            {
                id: "eng",
                label: "去车头",
                next: "engine_approach"
            }
        ],
    },
    ask_check: {
        narrative: P.ask_check,
        branch: {
            success: "ask_ok",
            failure: "ask_fail"
        },
        groupOutcome: {
            allSuccess: P.ask_check_allSuccess,
            allFailure: P.ask_check_allFailure,
            mixed: P.ask_check_mixed
        },
    },
    ask_ok: {
        narrative: P.ask_ok,
        effects: {
            sanCheck: '0/1D3',
            journal: "虚无站与车头「饥饿」有关。"
        },
        choices: [
            {
                id: "e",
                label: "调查车头",
                next: "engine_approach"
            }
        ],
    },
    ask_fail: {
        narrative: P.ask_fail,
        choices: [
            {
                id: "refuse",
                label: "拒绝并离开",
                next: "baggage"
            },
            {
                id: "eat",
                label: "尝一口",
                next: "eat_bad"
            }
        ],
    },
    eat_bad: {
        narrative: P.eat_bad,
        effects: {
            sanCheck: '1D3/1D8'
        },
        choices: [
            {
                id: "flee",
                label: "逃向行李车",
                next: "baggage"
            }
        ],
    },
    baggage: {
        narrative: P.baggage,
        effects: {
            location: "行李车",
            mapRoom: "baggage",
            sanCheck: '0/1D3'
        },
        choices: [
            {
                id: "search",
                label: "搜查其他行李",
                next: "search_check",
                skillCheck: {
                    skill: "侦查"
                }
            },
            {
                id: "cab",
                label: "去守车",
                next: "caboose_approach",
                requiresFlag: "tn_intel"
            }
        ],
    },
    search_check: {
        narrative: P.search_check,
        branch: {
            success: "search_ok",
            failure: "search_fail"
        },
        groupOutcome: {
            allSuccess: P.search_check_allSuccess,
            allFailure: P.search_check_allFailure,
            mixed: P.search_check_mixed
        },
    },
    search_fail: {
        narrative: P.search_fail,
        choices: [
            {
                id: "eng",
                label: "调查车头",
                next: "engine_approach"
            },
            {
                id: "din",
                label: "回餐车打听",
                next: "dining"
            }
        ],
    },
    search_ok: {
        narrative: P.search_ok,
        effects: {
            clues: [
                {
                    id: "tn_diary",
                    title: "永久旅客日记",
                    content: "列车长=第一个上车者；钥匙在车头。",
                    type: "document",
                    quality: "solid"
                }
            ],
            flags: {
                tn_intel: true
            }
        },
        choices: [
            {
                id: "c",
                label: "前往守车",
                next: "caboose_approach"
            }
        ],
    },
    caboose_approach: {
        narrative: P.caboose_approach,
        choices: [
            {
                id: "in",
                label: "进入守车",
                next: "caboose"
            }
        ],
    },
    engine_approach: {
        narrative: P.engine_approach,
        choices: [
            {
                id: "in",
                label: "进入车头",
                next: "engine"
            }
        ],
    },
    engine: {
        narrative: P.engine,
        checkpoint: "车头：无司机与「饥饿之口」",
        effects: {
            location: "车头",
            mapRoom: "engine",
            sanCheck: "1/1D6",
            atmosphere: {
                level: "dread",
                note: "列车之口"
            },
            combat: {
                creatureId: "cultist",
                mode: "exchange",
                pendingRoll: true,
                attacker: "pc",
                weaponId: "knife",
                onWin: "tn_mouth_down",
                onLose: "tn_mouth_press"
            }
        },
        choices: [
            {
                id: "feed",
                label: "用行李中的遗物\"喂\"它",
                next: "feed_ok"
            },
            {
                id: "run",
                label: "逃向守车",
                next: "caboose_approach",
                requiresFlag: "tn_intel",
                requiresClueQuality: "solid"
            }
        ],
    },
    feed_ok: {
        narrative: P.feed_ok,
        effects: {
            journal: "车头暂时满足，虚无站出现。"
        },
        choices: [
            {
                id: "jump",
                label: "跳下列车",
                next: "finale",
                skillCheck: {
                    skill: "敏捷",
                    aggregate: "all"
                }
            }
        ],
    },
    caboose: {
        narrative: P.caboose,
        checkpoint: "守车：记忆交换与下车钥匙",
        effects: {
            location: "守车",
            mapRoom: "caboose",
            sanCheck: "0/1D3",
            chase: { quarry: "pc", lead: 2, pursuer: "列车乘务幽影", pursuerMov: 9 }
        },
        choices: [
            {
                id: "trade",
                label: "交换一段记忆",
                next: "trade_check",
                skillCheck: {
                    skill: "意志",
                    aggregate: "all"
                }
            },
            {
                id: "take",
                label: "强行夺取钥匙",
                next: "take_check",
                skillCheck: {
                    skill: "力量",
                    aggregate: "all"
                }
            }
        ],
    },
    trade_check: {
        narrative: P.trade_check,
        branch: {
            success: "finale",
            failure: "ending_trapped"
        },
        groupOutcome: {
            allSuccess: P.trade_check_allSuccess,
            allFailure: P.trade_check_allFailure,
            mixed: P.trade_check_mixed
        },
    },
    take_check: {
        narrative: P.take_check,
        branch: {
            success: "finale",
            failure: "ending_trapped"
        },
        groupOutcome: {
            allSuccess: P.take_check_allSuccess,
            allFailure: P.take_check_allFailure,
            mixed: P.take_check_mixed
        },
    },
    finale: {
        narrative: P.finale,
        branch: {
            success: "ending_escape",
            failure: "ending_trapped"
        },
        groupOutcome: {
            allSuccess: P.finale_allSuccess,
            allFailure: P.finale_allFailure,
            mixed: P.finale_mixed
        },
    },
    ending_escape: {
        narrative: P.ending_escape,
        end: true,
        effects: {
            journal: "逃离13号列车，但诅咒未完全解除。",
            sanCheck: "0/1D3",
            enchantmentId: "elder_sign"
        },
    },
    ending_trapped: {
        narrative: P.ending_trapped,
        end: true,
        effects: {
            sanCheck: "1D3/1D10",
            dispel: true
        },
    },
    corridor_green: {
        narrative: P.corridor_green,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    sleeper_berth: {
        narrative: P.sleeper_berth,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    conductor_closet: {
        narrative: P.conductor_closet,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    mail_car: {
        narrative: P.mail_car,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    dining_galley: {
        narrative: P.dining_galley,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    observation_deck: {
        narrative: P.observation_deck,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    bathroom_water: {
        narrative: P.bathroom_water,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    freight_latch: {
        narrative: P.freight_latch,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    radio_booth: {
        narrative: P.radio_booth,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    coal_tender: {
        narrative: P.coal_tender,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    private_suite: {
        narrative: P.private_suite,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    brakeman_post: {
        narrative: P.brakeman_post,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    tunnel_roar: {
        narrative: P.tunnel_roar,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    timetable_wall: {
        narrative: P.timetable_wall,
        choices: [
            {
                id: "back_cabin",
                label: "返回包厢整理线索",
                next: "cabin"
            }
        ],
    },
    }
};
