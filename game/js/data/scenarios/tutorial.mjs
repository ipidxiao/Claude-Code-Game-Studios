/**
 * Tutorial scenario — novella-scale offline onboarding (Hartley House).
 * Prose bank: ./tutorial/index_prose.mjs (≥100k CJK Han).
 */
import { TUTORIAL_PROSE as P } from './tutorial/index_prose.mjs';

function side(label, next) {
    return { id: next, label, next };
}

function back(label, next) {
    return { id: `back_${next}`, label, next };
}

export const CoCScenarioTutorial = {
    id: 'tutorial',
    title: '引擎教程·暗夜初探',
    subtitle: '长篇本地剧本：哈特利老宅调查',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['教程', '1920s', '老宅', '入门', '长篇'],
    description:
        '雨夜踏入哈特利老宅，在门厅、客厅、楼梯与阁楼之间穿行，追踪盐腥、蜡封与井口低语。完整体验选项、检定、线索、地图与理智，并可深入侧室探索。完全离线可玩。',
    era: '1920s',
    estimatedMinutes: 180,
    lorebook: [
        {
            "id": "tutorial_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "tutorial"
            ],
            "content": "「引擎教程·暗夜初探」：保持1920s克苏鲁调查/恐怖基调。雨夜踏入哈特利老宅，在门厅、客厅、楼梯与阁楼之间穿行，追踪盐腥、蜡封与井口低语。完整体验选项、检定、线索、地图与理智，并可深入侧室探索。完全离线可玩。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "tutorial_start",
            "title": "老宅门厅",
            "keys": [
                "老宅门厅",
                "老宅门厅",
                "引擎教程·暗夜初探"
            ],
            "locations": [
                "老宅门厅"
            ],
            "priority": 12,
            "scenarioIds": [
                "tutorial"
            ],
            "content": "开场地点「老宅门厅」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "tutorial_room_0",
            "title": "门厅",
            "keys": [
                "门厅"
            ],
            "locations": [
                "门厅"
            ],
            "priority": 8,
            "scenarioIds": [
                "tutorial"
            ],
            "content": "场景「门厅」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "tutorial_room_1",
            "title": "客厅",
            "keys": [
                "客厅"
            ],
            "locations": [
                "客厅"
            ],
            "priority": 7,
            "scenarioIds": [
                "tutorial"
            ],
            "content": "场景「客厅」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "tutorial_room_2",
            "title": "楼梯间",
            "keys": [
                "楼梯间"
            ],
            "locations": [
                "楼梯间"
            ],
            "priority": 6,
            "scenarioIds": [
                "tutorial"
            ],
            "content": "场景「楼梯间」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "tutorial_room_3",
            "title": "阁楼",
            "keys": [
                "阁楼"
            ],
            "locations": [
                "阁楼"
            ],
            "priority": 5,
            "scenarioIds": [
                "tutorial"
            ],
            "content": "场景「阁楼」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "tutorial_room_4",
            "title": "厨房",
            "keys": [
                "厨房"
            ],
            "locations": [
                "厨房"
            ],
            "priority": 5,
            "scenarioIds": [
                "tutorial"
            ],
            "content": "场景「厨房」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "tutorial_room_5",
            "title": "储藏间",
            "keys": [
                "储藏间"
            ],
            "locations": [
                "储藏间"
            ],
            "priority": 5,
            "scenarioIds": [
                "tutorial"
            ],
            "content": "场景「储藏间」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        }
    ],
    startNode: 'intro',
    initialLocation: '老宅门厅',
    setup: {
        location: '老宅门厅',
        atmosphere: { level: 'calm', note: '教程模组·长篇' },
        map: {
            title: '哈特利老宅',
            rooms: [
                { id: 'hall', name: '门厅', connections: ['parlor', 'stairs', 'kitchen', 'study'] },
                { id: 'parlor', name: '客厅', connections: ['hall'] },
                { id: 'stairs', name: '楼梯间', connections: ['hall', 'attic', 'servant'] },
                { id: 'attic', name: '阁楼', connections: ['stairs'] },
                { id: 'kitchen', name: '厨房', connections: ['hall', 'pantry', 'cellar'] },
                { id: 'pantry', name: '储藏间', connections: ['kitchen'] },
                { id: 'cellar', name: '地窖口', connections: ['kitchen'] },
                { id: 'study', name: '书房', connections: ['hall', 'garden'] },
                { id: 'garden', name: '后园', connections: ['study'] },
                { id: 'servant', name: '仆人房', connections: ['stairs'] }
            ],
            currentRoomId: 'hall'
        },
        journal: '接受委托：调查哈特利老宅中流传的怪声；雨夜只给你一晚的时间。'
    },
    nodes: {
        intro: {
            narrative: P.intro,
            choices: [
                side('先环顾门厅，留意周围动静，保持警惕', 'hall_look'),
                side('先端详家族肖像，留意周围动静', 'portrait'),
                side('先注意雨打木门的节奏，留意周围动静', 'intro_rain_door'),
                side('下定决心，进入客厅，保持警惕', 'parlor_enter'),
                side('先拐进厨房侧廊，留意周围动静', 'kitchen')
            ]
        },
        intro_rain_door: {
            narrative: P.intro_rain_door,
            choices: [
                back('先回到门厅中心，保持警惕继续行动', 'intro'),
                side('先沿泥印查看地面，留意周围动静', 'hall_look')
            ]
        },
        hall_look: {
            narrative: P.hall_look,
            effects: {
                clues: [
                    {
                        id: 'tut_wax',
                        title: '蜡封碎片',
                        content: '蜡印残留着扭曲的触手纹样，边缘有盐渍。',
                        type: 'physical'
                    }
                ]
            },
            choices: [
                side('先拾起蜡封碎片并检查衣帽架，留意周围动静', 'hall_coat_rack'),
                side('先蹲下检查松动的地板缝，留意周围动静', 'hall_floorboards'),
                side('下定决心，跟随泥印进入客厅，保持警惕', 'parlor_enter'),
                back('先退回门口再观察雨幕，保持警惕继续行动', 'intro')
            ]
        },
        hall_coat_rack: {
            narrative: P.hall_coat_rack,
            choices: [
                side('先核对衣帽架旁的肖像，留意周围动静', 'hall_portrait_night'),
                side('下定决心，进入客厅，保持警惕', 'parlor_enter'),
                back('先回到门厅环顾，保持警惕继续行动', 'hall_look')
            ]
        },
        hall_floorboards: {
            narrative: P.hall_floorboards,
            choices: [
                side('先沿地下潮气去厨房方向，保持警惕', 'kitchen'),
                side('下定决心，进入客厅，保持警惕', 'parlor_enter'),
                back('先抬起身回到门厅，保持警惕继续行动', 'hall_look')
            ]
        },
        hall_portrait_night: {
            narrative: P.hall_portrait_night,
            choices: [
                side('先端详肖像细部，留意周围动静', 'portrait_detail2'),
                side('先去客厅茶几查看，留意周围动静', 'parlor_enter'),
                back('先回到门厅，保持警惕继续行动', 'intro')
            ]
        },
        portrait: {
            narrative: P.portrait,
            effects: {
                clues: [
                    {
                        id: 'tut_inscription',
                        title: '画布背面的字迹',
                        content: '"它们从井里来。"',
                        type: 'document'
                    }
                ],
                san: 0
            },
            choices: [
                side('先记下字迹并再看细部，保持警惕', 'portrait_detail2'),
                side('先去客厅查看日志，留意周围动静', 'parlor_enter'),
                back('先退开肖像回到门厅，保持警惕继续行动', 'intro')
            ]
        },
        portrait_detail2: {
            narrative: P.portrait_detail2,
            choices: [
                side('下定决心，进入客厅，保持警惕', 'parlor_enter'),
                side('先去书房核对家族文书，留意周围动静', 'study'),
                back('先回到门厅，保持警惕继续行动', 'intro')
            ]
        },
        parlor_enter: {
            narrative: P.parlor_enter,
            checkpoint: '进入客厅：怪声与日志线索汇聚',
            effects: { location: '老宅客厅', mapRoom: 'parlor' },
            choices: [
                side('下定决心，阅读日志，保持警惕', 'read_log'),
                side('先查看湿透的窗帘，留意周围动静', 'parlor_curtain'),
                side('先端详中央茶几，留意周围动静', 'parlor_teatable'),
                {
                    id: 'listen',
                    label: '先屏息聆听，留意周围动静，保持警惕',
                    next: 'listen_check',
                    skillCheck: { skill: '聆听' }
                },
                side('先退回门厅，留意周围动静，保持警惕', 'intro')
            ]
        },
        parlor_curtain: {
            narrative: P.parlor_curtain,
            choices: [
                side('先翻开日志阅读，留意周围动静', 'read_log'),
                side('先检查茶几抽屉，留意周围动静', 'search_check'),
                back('先回到客厅中心，保持警惕继续行动', 'parlor_enter')
            ]
        },
        parlor_teatable: {
            narrative: P.parlor_teatable,
            choices: [
                side('下定决心，阅读日志，保持警惕', 'read_log'),
                side('先拉开抽屉搜查，留意周围动静', 'search_check'),
                back('先回到客厅中心，保持警惕继续行动', 'parlor_enter')
            ]
        },
        read_log: {
            narrative: P.read_log,
            effects: {
                clues: [
                    {
                        id: 'tut_log',
                        title: '哈特利日志残页',
                        content: '满月之夜，井口会打开。',
                        type: 'document'
                    }
                ],
                journal: '日志提及满月与井口。'
            },
            choices: [
                side('先翻读更早的字页，留意周围动静', 'read_log_page1'),
                side('先核对后半残页，留意周围动静', 'read_log_page2'),
                side('先上楼查看怪声来源，留意周围动静', 'stairs'),
                {
                    id: 'search',
                    label: '下定决心，继续在客厅搜查，保持警惕',
                    next: 'search_check',
                    skillCheck: { skill: '侦查' }
                }
            ]
        },
        read_log_page1: {
            narrative: P.read_log_page1,
            choices: [
                side('先核对后半残页，留意周围动静', 'read_log_page2'),
                side('先踏上楼梯上楼，保持警惕继续行动', 'stairs'),
                back('先合上日志回到客厅，保持警惕继续行动', 'parlor_enter')
            ]
        },
        read_log_page2: {
            narrative: P.read_log_page2,
            choices: [
                side('先按日志暗示去检查盐迹，保持警惕', 'salt_circle'),
                side('先上楼追踪怪声的来源，保持警惕', 'stairs'),
                back('先回到客厅中心，保持警惕继续行动', 'parlor_enter')
            ]
        },
        listen_check: {
            narrative: P.listen_storm,
            groupOutcome: {
                allSuccess: P.listen_ok,
                allFailure: P.listen_fail,
                mixed: P.listen_attic_drip
            },
            branch: { success: 'listen_ok', failure: 'listen_fail' }
        },
        listen_ok: {
            narrative: P.listen_ok,
            effects: { journal: '怪声来自阁楼。' },
            choices: [side('先轻手轻脚上楼，留意周围动静', 'stairs')]
        },
        listen_fail: {
            narrative: P.listen_fail,
            choices: [
                side('先上楼一探究竟，留意周围动静', 'stairs'),
                back('先退回客厅整理线索，保持警惕继续行动', 'parlor_enter')
            ]
        },
        search_check: {
            narrative: P.search_drawer_top,
            groupOutcome: {
                allSuccess: P.search_ok,
                allFailure: P.search_fail,
                mixed: P.search_drawer_secret
            },
            branch: { success: 'search_ok', failure: 'search_fail' }
        },
        search_ok: {
            narrative: P.search_ok,
            effects: {
                clues: [
                    {
                        id: 'tut_key',
                        title: '波浪齿纹钥匙',
                        content: '可能是阁楼或地下室用的钥匙。',
                        type: 'physical'
                    }
                ],
                items: [{ name: '波浪齿纹钥匙', qty: 1 }]
            },
            choices: [
                side('先拿钥匙上楼，留意周围动静，保持警惕', 'stairs'),
                side('先去书房核对钥匙齿纹，留意周围动静', 'study')
            ]
        },
        search_fail: {
            narrative: P.search_fail,
            choices: [
                side('先上楼，留意周围动静，保持警惕', 'stairs'),
                side('先打开信抽屉再查一次，留意周围动静', 'letter_drawer')
            ]
        },
        letter_drawer: {
            narrative: P.letter_drawer,
            choices: [
                side('先细看蜡封纹样，留意周围动静', 'letter_seal'),
                side('先踏上楼梯上楼，保持警惕继续行动', 'stairs'),
                back('先回到客厅，保持警惕继续行动', 'parlor_enter')
            ]
        },
        letter_seal: {
            narrative: P.letter_seal,
            choices: [
                side('先对照门厅蜡坛痕迹，保持警惕', 'wax_altar'),
                side('先踏上楼梯上楼，保持警惕继续行动', 'stairs'),
                back('先回到客厅，保持警惕继续行动', 'parlor_enter')
            ]
        },
        kitchen: {
            narrative: P.kitchen,
            effects: { location: '老宅厨房', mapRoom: 'kitchen' },
            choices: [
                side('先推开储藏间木门，留意周围动静', 'pantry'),
                side('先查看地窖入口，留意周围动静', 'cellar_door'),
                side('先检查侧廊洗衣间，留意周围动静', 'laundry'),
                back('先退回门厅，保持警惕继续行动', 'intro')
            ]
        },
        pantry: {
            narrative: P.pantry,
            effects: { location: '储藏间', mapRoom: 'pantry' },
            choices: [
                side('先检查盐罐与玻璃瓶，留意周围动静', 'pantry_jar'),
                side('先退回厨房区域，留意周围动静', 'kitchen'),
                back('先退回门厅，保持警惕继续行动', 'intro')
            ]
        },
        pantry_jar: {
            narrative: P.pantry_jar,
            choices: [
                side('先把盐线记入线索并回厨房，保持警惕', 'kitchen'),
                side('下定决心，前往客厅比对日志，保持警惕', 'parlor_enter')
            ]
        },
        cellar_door: {
            narrative: P.cellar_door,
            effects: { location: '地窖口', mapRoom: 'cellar' },
            choices: [
                side('先贴近缝隙分辨气味，留意周围动静', 'cellar_smell'),
                side('先检查地窖煤仓，留意周围动静', 'coal_bin'),
                back('先退回厨房，保持警惕继续行动', 'kitchen')
            ]
        },
        cellar_smell: {
            narrative: P.cellar_smell,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先回厨房寻找盐罐，留意周围动静', 'kitchen'),
                side('先上楼准备直面井口，保持警惕', 'stairs')
            ]
        },
        coal_bin: {
            narrative: P.coal_bin,
            choices: [
                side('先抹开煤灰细看，留意周围动静', 'coal_dust'),
                back('先退回地窖口，保持警惕继续行动', 'cellar_door')
            ]
        },
        coal_dust: {
            narrative: P.coal_dust,
            choices: [
                side('先退回厨房，保持警惕继续行动', 'kitchen'),
                side('先去书房找家族旧账，保持警惕', 'study')
            ]
        },
        laundry: {
            narrative: P.laundry,
            choices: [
                side('先检查洗衣盆盐渍，留意周围动静', 'laundry_tub'),
                back('先退回厨房，保持警惕继续行动', 'kitchen')
            ]
        },
        laundry_tub: {
            narrative: P.laundry_tub,
            choices: [
                side('先退回厨房，保持警惕继续行动', 'kitchen'),
                side('先去客厅比对日志细节，保持警惕', 'parlor_enter')
            ]
        },
        study: {
            narrative: P.study,
            effects: { location: '书房', mapRoom: 'study' },
            choices: [
                side('先拉开书桌抽屉，留意周围动静', 'study_desk'),
                side('先从书房后门去后园，留意周围动静', 'garden_gate'),
                side('先打开旧留声机，留意周围动静', 'phonograph'),
                back('先退回门厅，保持警惕继续行动', 'intro')
            ]
        },
        study_desk: {
            narrative: P.study_desk,
            choices: [
                side('先去后园查看那口废井，保持警惕', 'garden_well'),
                side('先退回门厅，保持警惕继续行动', 'intro'),
                side('先去客厅核对日志字句，保持警惕', 'parlor_enter')
            ]
        },
        phonograph: {
            narrative: P.phonograph,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先检查唱针与盐屑，留意周围动静', 'phonograph_needle'),
                back('先关掉机器回到书桌，保持警惕继续行动', 'study')
            ]
        },
        phonograph_needle: {
            narrative: P.phonograph_needle,
            choices: [
                side('先前往后园废井口察看，保持警惕', 'garden_well'),
                back('先回到书房，保持警惕继续行动', 'study')
            ]
        },
        garden_gate: {
            narrative: P.garden_gate,
            effects: { location: '后园', mapRoom: 'garden' },
            choices: [
                side('先穿雨靠近废井，留意周围动静', 'garden_well'),
                side('先在雨里站定观察，留意周围动静', 'garden_rain'),
                back('先退回书房，保持警惕继续行动', 'study')
            ]
        },
        garden_rain: {
            narrative: P.garden_rain,
            choices: [
                side('下定决心，靠近废井，保持警惕', 'garden_well'),
                back('先退回书房避雨，保持警惕继续行动', 'study')
            ]
        },
        garden_well: {
            narrative: P.garden_well,
            checkpoint: '后园废井：与阁楼井口形成对照',
            effects: { sanCheck: '0/1' },
            choices: [
                side('先回书房整理调查记录，保持警惕', 'study'),
                side('下定决心，上楼直趋阁楼，保持警惕', 'stairs')
            ]
        },
        wax_altar: {
            narrative: P.wax_altar,
            choices: [
                side('先观察蜡液冷却纹理，留意周围动静', 'wax_melt'),
                side('先去盐圈痕迹处，留意周围动静', 'salt_circle'),
                back('先退回门厅，保持警惕继续行动', 'intro')
            ]
        },
        wax_melt: {
            narrative: P.wax_melt,
            choices: [
                side('先前往盐圈痕迹，保持警惕继续行动', 'salt_circle'),
                side('先踏上楼梯上楼，保持警惕继续行动', 'stairs')
            ]
        },
        salt_circle: {
            narrative: P.salt_circle,
            choices: [
                side('先拈起盐粒细看，留意周围动静', 'salt_grain'),
                side('先上楼准备施行封印，保持警惕', 'stairs'),
                back('先退回客厅，保持警惕继续行动', 'parlor_enter')
            ]
        },
        salt_grain: {
            narrative: P.salt_grain,
            choices: [
                side('先踏上楼梯上楼，保持警惕继续行动', 'stairs'),
                back('先回到盐圈旁，保持警惕继续行动', 'salt_circle')
            ]
        },
        clock_hall: {
            narrative: P.clock_hall,
            choices: [
                side('先贴耳听钟壳内回响，留意周围动静', 'clock_tick'),
                back('先回到门厅中心，保持警惕继续行动', 'intro')
            ]
        },
        clock_tick: {
            narrative: P.clock_tick,
            choices: [
                side('先踏上楼梯上楼，保持警惕继续行动', 'stairs'),
                back('先回到门厅，保持警惕继续行动', 'intro')
            ]
        },
        roof_leak: {
            narrative: P.roof_leak,
            choices: [
                side('先沿漏水路径往楼上走，保持警惕', 'stairs'),
                back('先退回楼梯间，保持警惕继续行动', 'stairs')
            ]
        },
        wardrobe: {
            narrative: P.wardrobe,
            choices: [
                side('先翻找大衣口袋，留意周围动静', 'wardrobe_coat'),
                back('先合上柜门回仆人房，保持警惕继续行动', 'servant_room')
            ]
        },
        wardrobe_coat: {
            narrative: P.wardrobe_coat,
            choices: [
                side('先回楼梯间，保持警惕继续行动', 'stairs'),
                side('先去浴室镜前再确认，保持警惕', 'bathroom_mirror')
            ]
        },
        bathroom_mirror: {
            narrative: P.bathroom_mirror,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先擦雾细看镜像，留意周围动静', 'mirror_fog'),
                back('先退回仆人房，保持警惕继续行动', 'servant_room')
            ]
        },
        mirror_fog: {
            narrative: P.mirror_fog,
            choices: [
                side('先回楼梯间准备上阁楼，保持警惕', 'stairs'),
                back('先退开镜子，保持警惕继续行动', 'bathroom_mirror')
            ]
        },
        servant_room: {
            narrative: P.servant_room,
            effects: { location: '仆人房', mapRoom: 'servant' },
            choices: [
                side('先查看床铺下方，留意周围动静', 'servant_bed'),
                side('先打开房间衣柜，留意周围动静', 'wardrobe'),
                side('先去盥洗间镜子，留意周围动静', 'bathroom_mirror'),
                back('先退回楼梯间，保持警惕继续行动', 'stairs')
            ]
        },
        servant_bed: {
            narrative: P.servant_bed,
            choices: [
                side('先打开衣柜检查，留意周围动静', 'wardrobe'),
                back('先回到仆人房门口，保持警惕继续行动', 'servant_room')
            ]
        },
        stairs: {
            narrative: P.stairs,
            effects: { location: '楼梯间', mapRoom: 'stairs' },
            choices: [
                {
                    id: 'open_attic',
                    label: '先推开阁楼门，留意周围动静，保持警惕',
                    next: 'attic',
                    skillCheck: { skill: '力量' }
                },
                side('先从门缝窥探，留意周围动静，保持警惕', 'attic_peek'),
                side('先倾听阶梯回声，留意周围动静', 'stairs_echo'),
                side('先查看漏雨的屋顶缝，留意周围动静', 'roof_leak'),
                side('先拐进侧廊仆人房，留意周围动静', 'servant_room'),
                side('先返回门厅看座钟，留意周围动静', 'clock_hall')
            ]
        },
        stairs_echo: {
            narrative: P.stairs_echo,
            choices: [
                side('先从门缝仔细窥探阁楼，保持警惕', 'attic_peek'),
                side('下定决心，推门进入阁楼，保持警惕', 'attic'),
                back('先稳住呼吸站在楼梯间，保持警惕继续行动', 'stairs')
            ]
        },
        attic_peek: {
            narrative: P.attic_peek,
            checkpoint: '目击阁楼井口：神话威胁浮出水面',
            effects: {
                sanCheck: '0/1',
                atmosphere: { level: 'dread', note: '神话目击' }
            },
            choices: [
                side('先冲进去阻止仪式，留意周围动静', 'finale'),
                side('先贴门再听井底低语，留意周围动静', 'attic_whisper'),
                side('悄悄撤退求援，保持警惕继续行动', 'ending_retreat')
            ]
        },
        attic_whisper: {
            narrative: P.attic_whisper,
            effects: { sanCheck: '0/1' },
            choices: [
                side('下定决心，冲入阁楼，保持警惕', 'attic'),
                side('悄悄撤退求援，保持警惕继续行动', 'ending_retreat')
            ]
        },
        attic: {
            narrative: P.attic,
            groupOutcome: {
                allSuccess: P.attic,
                allFailure: P.attic_fail,
                mixed: P.attic_whisper
            },
            effects: {
                location: '老宅阁楼',
                mapRoom: 'attic',
                sanCheck: '0/1'
            },
            branch: { success: 'finale', failure: 'attic_fail' }
        },
        attic_fail: {
            narrative: P.attic_fail,
            effects: {
                sanCheck: '0/1D3',
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'tut_cultist_down',
                    onLose: 'tut_cultist_press'
                }
            },
            choices: [
                side('先拼死一搏，留意周围动静，保持警惕', 'finale'),
                side('先转身逃跑，留意周围动静，保持警惕', 'ending_retreat')
            ]
        },
        finale: {
            narrative: P.finale,
            effects: {
                journal: '教程模组：封印井口，怪声停止。',
                clues: [
                    {
                        id: 'tut_done',
                        title: '教程通关',
                        content: '成功体验本地剧本核心机制与侧室探索。',
                        type: 'note'
                    }
                ]
            },
            end: true
        },
        ending_retreat: {
            narrative: P.ending_retreat,
            effects: { journal: '教程模组：撤退生还，威胁未除。' },
            end: true
        }
    }
};
