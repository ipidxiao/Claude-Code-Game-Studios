/**
 * Original mini-scenario — coastal town cult festival (not Chaosium IP).
 * Prose bank: ./coastal_festival/index_prose.mjs (≥100k CJK Han).
 */
import { COASTAL_PROSE as P } from './coastal_festival/index_prose.mjs';

function side(label, next) {
    return { id: next, label, next };
}

function back(label, next) {
    return { id: `back_${next}`, label, next };
}

export const CoCScenarioCoastalFestival = {
    id: 'coastal_festival',
    title: '沿海祭典',
    subtitle: '盐雾中的丰收节',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['小镇', '祭典', '1920s', '邪教', '长篇', '证据分叉'],
    description:
        '每年秋分，盐港镇举行「海父丰收节」。今年游客接连失踪，你以记者身份混入庆典，沿码头、广场、神龛与潮间洞窟追查献祭真相。',
    era: '1920s',
    estimatedMinutes: 90,
    lorebook: [
        {
            "id": "coastal_festival_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "coastal_festival"
            ],
            "content": "「沿海祭典」：保持1920s克苏鲁调查/恐怖基调。每年秋分，盐港镇举行「海父丰收节」。今年游客接连失踪，你以记者身份混入庆典，沿码头、广场、神龛与潮间洞窟追查献祭真相。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "coastal_festival_start",
            "title": "盐港镇·码头",
            "keys": [
                "盐港镇·码头",
                "盐港镇",
                "沿海祭典"
            ],
            "locations": [
                "盐港镇"
            ],
            "priority": 12,
            "scenarioIds": [
                "coastal_festival"
            ],
            "content": "开场地点「盐港镇·码头」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "coastal_festival_room_0",
            "title": "码头",
            "keys": [
                "码头"
            ],
            "locations": [
                "码头"
            ],
            "priority": 8,
            "scenarioIds": [
                "coastal_festival"
            ],
            "content": "场景「码头」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "coastal_festival_room_1",
            "title": "庆典广场",
            "keys": [
                "庆典广场"
            ],
            "locations": [
                "庆典广场"
            ],
            "priority": 7,
            "scenarioIds": [
                "coastal_festival"
            ],
            "content": "场景「庆典广场」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "coastal_festival_room_2",
            "title": "海父神龛",
            "keys": [
                "海父神龛"
            ],
            "locations": [
                "海父神龛"
            ],
            "priority": 6,
            "scenarioIds": [
                "coastal_festival"
            ],
            "content": "场景「海父神龛」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "coastal_festival_room_3",
            "title": "盐雾酒馆",
            "keys": [
                "盐雾酒馆"
            ],
            "locations": [
                "盐雾酒馆"
            ],
            "priority": 5,
            "scenarioIds": [
                "coastal_festival"
            ],
            "content": "场景「盐雾酒馆」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "coastal_festival_room_4",
            "title": "潮间洞窟",
            "keys": [
                "潮间洞窟"
            ],
            "locations": [
                "潮间洞窟"
            ],
            "priority": 5,
            "scenarioIds": [
                "coastal_festival"
            ],
            "content": "场景「潮间洞窟」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "coastal_festival_mythos",
            "title": "神话阴影",
            "keys": [
                "神话",
                "不可名状",
                "仪式",
                "邪神",
                "深潜",
                "古神"
            ],
            "priority": 7,
            "scenarioIds": [
                "coastal_festival"
            ],
            "content": "神话目击/理智损失走 reality_check 等工具；叙事可暗示不可名状，禁止规则外直接改属性。"
        },
        {
            "id": "coastal_festival_invest",
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
                "coastal_festival"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        }
    ],
    startNode: 'pier',
    initialLocation: '盐港镇·码头',
    setup: {
        location: '盐港镇·码头',
        atmosphere: { level: 'calm', note: '节庆灯笼与盐雾' },
        map: {
            title: '盐港镇',
            rooms: [
                { id: 'pier', name: '码头', connections: ['square'] },
                { id: 'square', name: '庆典广场', connections: ['pier', 'shrine', 'tavern'] },
                { id: 'shrine', name: '海父神龛', connections: ['square', 'cave'] },
                { id: 'tavern', name: '盐雾酒馆', connections: ['square'] },
                { id: 'cave', name: '潮间洞窟', connections: ['shrine'] }
            ],
            currentRoomId: 'pier'
        },
        journal: '调查：盐港镇丰收节游客失踪案。'
    },
    nodes: {
        pier: {
            narrative: P.pier,
            effects: {
                clues: [
                    {
                        id: 'cf_shell',
                        title: '触手纹贝壳',
                        content: '码头货箱旁发现；背面警告勿食盐渍鱼。',
                        type: 'physical'
                    }
                ]
            },
            choices: [
                side('先在码头与盯梢的镇民短兵相接', 'pier_fight'),
                side('现在带着已记下的线索离开盐港', 'ending_withdraw'),
                side('下定决心，前往庆典广场，保持警惕', 'square'),
                side('先去盐雾酒馆打听，留意周围动静', 'tavern'),
                side('先检视货箱贝壳与触手纹拓印等', 'pier_shells'),
                side('先驻足听盐雾声与远处鼓点节拍', 'pier_fog'),
                side('先仰观栈桥纸灯笼与鱼骨灯骨结构', 'pier_lanterns'),
                side('先查归港小艇舱内渔网与贝壳绳', 'pier_boats'),
                side('先逐箱清点码头货单与缺号箱位', 'pier_cargo'),
                side('先读码头潮位表与秋分献潮标记', 'tide_chart'),
                side('先站到栈桥尽头，迎着咸风辨合唱来源', 'pier_salt_wind'),
                side('先在码头夜岗处观察归港与雾灯', 'pier_night_watch')
            ]
        },
        pier_shells: {
            narrative: P.pier_shells,
            choices: [
                side('先重读触手贝壳上的别吃盐渍警告', 'shell_warning'),
                side('下定决心，前往庆典广场，保持警惕', 'square'),
                back('先回到码头中心，保持警惕继续行动', 'pier')
            ]
        },
        shell_warning: {
            narrative: P.shell_warning,
            choices: [
                side('先去盐雾酒馆核对海报与红圈字迹', 'tavern'),
                side('下定决心，直接前往海父神龛，保持警惕', 'shrine'),
                back('先回到码头货箱旁，保持警惕继续行动', 'pier_shells')
            ]
        },
        pier_fog: {
            narrative: P.pier_fog,
            effects: {
                clues: [
                    {
                        id: 'cf_square',
                        title: '广场鼓点',
                        content: '远处鼓点来自庆典广场，与浪涌合拍。',
                        type: 'testimony'
                    }
                ]
            },
            choices: [
                side('先前往庆典广场，细听合唱与鼓点', 'square_chorus'),
                side('先去盐雾酒馆，留意镇民低声交谈', 'tavern'),
                back('先回到码头栈桥，保持警惕继续行动', 'pier')
            ]
        },
        pier_lanterns: {
            narrative: P.pier_lanterns,
            choices: [
                side('先沿灯笼巷深入，查看墙绘与供盘', 'lantern_alley'),
                side('下定决心，前往庆典广场观游行', 'square'),
                back('先回到码头中心，保持警惕继续行动', 'pier')
            ]
        },
        pier_boats: {
            narrative: P.pier_boats,
            choices: [
                side('先去盐雾酒馆打听失踪者与洞窟', 'tavern'),
                side('下定决心，前往庆典广场跟踪游行', 'square'),
                back('先回到码头栈桥，保持警惕继续行动', 'pier')
            ]
        },
        pier_cargo: {
            narrative: P.pier_cargo,
            choices: [
                side('先沿湿印方向前往庆典广场处等', 'square'),
                side('先去盐雾酒馆查后室祭典礼袍等', 'tavern_backroom'),
                back('先回到码头货区，保持警惕继续行动', 'pier')
            ]
        },
        pier_salt_wind: {
            narrative: P.pier_salt_wind,
            choices: [
                side('下定决心，前往庆典广场，保持警惕', 'square'),
                side('先去盐雾酒馆，打听老板密告等', 'tavern'),
                back('先回到码头栈桥尽头，保持警惕继续行动', 'pier')
            ]
        },
        pier_night_watch: {
            narrative: P.pier_night_watch,
            effects: {
                clues: [
                    {
                        id: 'cf_tavern',
                        title: '隔雾灯火',
                        content: '夜岗雾灯对面是盐雾酒馆，灯还亮着。',
                        type: 'testimony'
                    }
                ]
            },
            choices: [
                side('先低调潜入盐雾酒馆打听内情等', 'tavern'),
                side('下定决心，前往庆典广场混入人群', 'square'),
                back('先回到码头中心，保持警惕继续行动', 'pier')
            ]
        },
        tide_chart: {
            narrative: P.tide_chart,
            choices: [
                side('下定决心，抢在满潮前前往海父神龛', 'shrine'),
                side('先前往庆典广场观察游行时序等', 'square'),
                back('先回到码头中心，保持警惕继续行动', 'pier')
            ]
        },
        tavern: {
            narrative: P.tavern,
            effects: {
                location: '盐雾酒馆',
                mapRoom: 'tavern',
                clues: [
                    {
                        id: 'cf_tip',
                        title: '老板密告',
                        content: '失踪者在潮间洞窟被献祭。',
                        type: 'testimony'
                    }
                ]
            },
            choices: [
                side('先去广场观察游行，留意周围动静', 'square'),
                side('下定决心，直接前往神龛，保持警惕', 'shrine'),
                side('先扶起醉记者，翻阅其笔记本残页', 'tavern_rum'),
                side('先查墙上公告与撕去的午夜献潮', 'tavern_notice'),
                side('先潜入后室查看庆典酒坛与封蜡', 'tavern_cellar'),
                side('先留意角落镇民低声交谈的关键词', 'tavern_patrons'),
                side('先对照墙上镇长像与祭司眼神等', 'mayor_portrait'),
                side('先细读丰收节海报与共饮小字等', 'festival_poster'),
                side('先听酒馆里那首不合节拍的渔歌', 'tavern_song'),
                side('先在骰局边上看镇民用什么下注', 'tavern_dice_game'),
                side('先按老板的密告，前往潮间洞窟', 'cave_approach'),
                back('先退回码头栈桥，保持警惕继续行动', 'pier'),
                side('现在带着已记下的线索离开盐港', 'ending_withdraw')
            ]
        },
        tavern_rum: {
            narrative: P.tavern_rum,
            effects: {
                clues: [
                    {
                        id: 'cf_journal',
                        title: '记者笔记',
                        content: '鱼腹有人形；镇长夜访神龛；庆典酒勿饮。',
                        type: 'document'
                    }
                ]
            },
            choices: [
                side('先去庆典广场拍摄盐渍鱼模型等', 'photo_ok'),
                side('下定决心，直接前往海父神龛，保持警惕', 'shrine'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        tavern_notice: {
            narrative: P.tavern_notice,
            choices: [
                side('先追问老板关于海父收贡的含义', 'tavern'),
                side('下定决心，前往海父神龛，保持警惕查献祭', 'shrine'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        tavern_cellar: {
            narrative: P.tavern_cellar,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先查后室木架上的祭典礼袍与陶罐', 'tavern_backroom'),
                side('先前往庆典广场，拒绝摊贩试吃', 'square_vendors'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        tavern_patrons: {
            narrative: P.tavern_patrons,
            choices: [
                side('先前往庆典广场跟踪游行队伍等', 'square'),
                side('下定决心，直接前往海父神龛，保持警惕', 'shrine'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        tavern_backroom: {
            narrative: P.tavern_backroom,
            effects: {
                clues: [
                    {
                        id: 'cf_robe',
                        title: '祭典礼袍',
                        content: '后室发现触手纹礼袍与空眼球陶罐。',
                        type: 'physical'
                    }
                ]
            },
            choices: [
                side('先前往庆典广场对照游行道具等', 'square'),
                side('下定决心，直接前往海父神龛，保持警惕对质', 'shrine'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        tavern_song: {
            narrative: P.tavern_song,
            choices: [
                side('先噤声离店，前往庆典广场，保持警惕', 'square'),
                side('下定决心，直接前往海父神龛，保持警惕', 'shrine'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        tavern_dice_game: {
            narrative: P.tavern_dice_game,
            choices: [
                side('先前往庆典广场，远离劝赌镇民', 'square'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        mayor_portrait: {
            narrative: P.mayor_portrait,
            choices: [
                side('下定决心，前往海父神龛，保持警惕当面揭穿', 'shrine'),
                side('先前往庆典广场观察镇长是否现身', 'square'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        festival_poster: {
            narrative: P.festival_poster,
            choices: [
                side('先前往庆典广场，拒绝共饮庆典酒', 'square'),
                side('下定决心，直接前往海父神龛，保持警惕', 'shrine'),
                back('先回到酒馆主厅，保持警惕继续行动', 'tavern')
            ]
        },
        square: {
            narrative: P.square,
            effects: { location: '庆典广场', mapRoom: 'square', sanCheck: '0/1' },
            choices: [
                {
                    id: 'follow',
                    label: '先跟踪游行队伍，留意周围动静',
                    next: 'follow_check',
                    skillCheck: { skill: '潜行' }
                },
                side('先拍摄鱼模型，留意周围动静，保持警惕', 'photo_ok'),
                side('下定决心，前往神龛，保持警惕', 'shrine'),
                side('先近观游行鱼腹鼓与渗盐鼓膜等', 'square_drum'),
                side('先查看摊贩盐渍鱼干与人形鱼干', 'square_vendors'),
                side('先专盯鱼模型眼球的湿润转动等', 'square_salt_eyes'),
                side('先混在合唱边缘听非人尾音节等', 'square_chorus'),
                side('先查看地面盐粉画的游行贡道路线', 'square_parade_route'),
                side('先查广场侧盐仓内人形盐堆空洞', 'salt_warehouse'),
                side('先看镇民朝鱼模型抛出的那枚铜币', 'square_coin_throw'),
                side('先读广场横幅上的丰收献潮字样', 'harvest_banner'),
                side('先循雾中合唱辨它是否来自神龛', 'mist_choir'),
                side('先到鱼市摊位核对缺秤的盐渍鱼', 'fish_market'),
                side('先沿贝壳长廊查看镇民颈挂的圣贝', 'shell_gallery'),
                side('先在广场上与游行护卫短兵相接', 'square_fight'),
                back('先退回码头栈桥，保持警惕继续行动', 'pier'),
                side('现在带着已记下的线索离开盐港', 'ending_withdraw')
            ]
        },
        square_drum: {
            narrative: P.square_drum,
            choices: [
                side('先跟踪游行队伍，留意祭司礼袍', 'follow_check'),
                side('先前往鼓匠铺核对七七四十九拍', 'drum_store'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        square_vendors: {
            narrative: P.square_vendors,
            choices: [
                side('先拍摄盐渍鱼模型留取物证，保持警惕', 'photo_ok'),
                side('下定决心，前往海父神龛，保持警惕', 'shrine'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        square_mask_shop: {
            narrative: P.square_mask_shop,
            choices: [
                side('先跟踪游行队伍，混入末尾，保持警惕', 'follow_check'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        square_salt_eyes: {
            narrative: P.square_salt_eyes,
            choices: [
                side('先急洗底片，确认鱼腹人形轮廓', 'photo_detail'),
                side('下定决心，前往海父神龛，保持警惕', 'shrine'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        square_chorus: {
            narrative: P.square_chorus,
            choices: [
                side('先跟踪游行队伍，摸清神龛路线', 'follow_check'),
                side('先查面具摊与鱼脸木面具内衬等', 'square_mask_shop'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        square_parade_route: {
            narrative: P.square_parade_route,
            choices: [
                side('先沿贡道侧线潜入神龛山道，保持警惕', 'shrine'),
                side('先跟踪游行花车与滴落的黑水等', 'parade_float'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        square_coin_throw: {
            narrative: P.square_coin_throw,
            choices: [
                side('先拍摄鱼模型，留存吞咽声证据', 'photo_ok'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        salt_warehouse: {
            narrative: P.salt_warehouse,
            choices: [
                side('下定决心，前往海父神龛，保持警惕查储货', 'shrine'),
                side('先拍摄游行鱼模型与人形腹腔等', 'photo_ok'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        drum_store: {
            narrative: P.drum_store,
            choices: [
                side('先返回广场，对照鼓点与经文节奏', 'square_drum'),
                side('先跟踪游行队伍，留意鼓点变化', 'follow_check'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        harvest_banner: {
            narrative: P.harvest_banner,
            choices: [
                side('先跟踪游行，前往海父神龛方向', 'follow_check'),
                side('下定决心，直接前往海父神龛，保持警惕', 'shrine'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        lantern_alley: {
            narrative: P.lantern_alley,
            effects: { sanCheck: '0/1' },
            choices: [
                side('下定决心，从巷底前往海父神龛', 'shrine'),
                back('先退回码头栈桥，保持警惕继续行动', 'pier_lanterns')
            ]
        },
        fish_market: {
            narrative: P.fish_market,
            choices: [
                side('下定决心，前往海父神龛，保持警惕', 'shrine'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        shell_gallery: {
            narrative: P.shell_gallery,
            choices: [
                side('先跟踪游行队伍，留意镇民颈挂圣贝', 'follow_check'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        parade_float: {
            narrative: P.parade_float,
            choices: [
                side('先跟踪花车，沿黑水痕前往神龛', 'shrine'),
                side('先混在游行末尾，保持潜行，保持警惕', 'follow_check'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        mist_choir: {
            narrative: P.mist_choir,
            choices: [
                side('先勿追雾声，下定决心前往神龛', 'shrine'),
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        photo_ok: {
            narrative: P.photo_ok,
            effects: {
                clues: [
                    {
                        id: 'cf_photo',
                        title: '游行照片',
                        content: '盐渍鱼模型内有人形。',
                        type: 'physical'
                    }
                ],
                sanCheck: '0/1D3'
            },
            choices: [
                side('先细察底片边缘的蠕动与热感等', 'photo_detail'),
                side('先冲向神龛，留意周围动静，保持警惕', 'shrine')
            ]
        },
        photo_detail: {
            narrative: P.photo_detail,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先带底片证据冲向海父神龛，保持警惕', 'shrine'),
                back('先回到显影角落，保持警惕继续行动', 'photo_ok')
            ]
        },
        follow_check: {
            narrative: P.follow_check,
            groupOutcome: {
                allSuccess: P.follow_allSuccess,
                allFailure: P.follow_allFailure,
                mixed: P.follow_mixed
            },
            branch: { success: 'square', failure: 'caught' }
        },
        caught: {
            narrative: P.caught,
            choices: [
                {
                    id: 'refuse',
                    label: '先拒绝并逃跑，留意周围动静，保持警惕',
                    next: 'shrine',
                    skillCheck: { skill: '敏捷' }
                },
                side('先细察陶碗沿盐霜与液面触须等', 'caught_bowl'),
                side('先假装饮酒，留意周围动静，保持警惕', 'poisoned')
            ]
        },
        caught_bowl: {
            narrative: P.caught_bowl,
            choices: [
                {
                    id: 'refuse2',
                    label: '先打翻陶碗并逃向神龛，保持警惕',
                    next: 'shrine',
                    skillCheck: { skill: '敏捷' }
                },
                side('先假装饮酒，留意周围动静，保持警惕', 'poisoned'),
                back('先退回劝酒镇民前，保持警惕继续行动', 'caught')
            ]
        },
        poisoned: {
            narrative: P.poisoned,
            effects: { sanCheck: '1/1D4' },
            choices: [
                side('先强撑辨视合唱下的鳞片幻视等', 'poison_vision'),
                side('先强撑逃向神龛，留意周围动静', 'shrine')
            ]
        },
        poison_vision: {
            narrative: P.poison_vision,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先咬舌强撑，冲向海父神龛，保持警惕', 'shrine'),
                back('先扶墙稳住呼吸，保持警惕继续行动', 'poisoned')
            ]
        },        shrine: {
            checkpoint: '海父神龛：祭司与人质',
            narrative: P.shrine,
            effects: {
                location: '海父神龛',
                mapRoom: 'shrine',
                sanCheck: '0/1',
                atmosphere: { level: 'ritual', note: '丰收祭' }
            },
            choices: [
                {
                    id: 'rescue',
                    label: '趁乱解救人质，保持警惕继续行动',
                    next: 'rescue_check',
                    skillCheck: { skill: '锁匠' }
                },
                side('下定决心，潜入潮间洞窟，保持警惕，保持警惕', 'cave_approach'),
                side('先大声揭露阴谋，留意周围动静', 'expose'),
                side('先近观海父雕像与献贡计数底座', 'shrine_statue'),
                side('先轻触神龛铜铃，确认勿敲警告', 'shrine_bells'),
                side('先研究祭司礼袍下摆的黑水渍等', 'shrine_ritual_robe'),
                side('先记录神龛盐圈交点供洞窟破阵', 'shrine_salt_circle'),
                side('先掀查供桌盐渍鱼与渗红麦束等', 'shrine_offering'),
                side('先研究石柱贝壳绳结的主结位置', 'shrine_shell_rope'),
                side('先避开铜镜，只从镜缘确认竖瞳', 'shrine_mirror'),
                side('先听祭司点名，数到第几句会停', 'shrine_priest_chant'),
                side('先查看山门上海藻门帘后的潮痕', 'seaweed_gate'),
                side('先核对另一张供桌上的献祭摆位', 'offering_table'),
                side('先在神龛前与祭司护卫短兵相接', 'shrine_fight'),
                back('先退回庆典广场，保持警惕继续行动', 'square'),
                side('现在带着已记下的线索离开盐港', 'ending_withdraw')
            ]
        },
        shrine_statue: {
            narrative: P.shrine_statue,
            choices: [
                side('先趁乱解救人质，保持高度警惕', 'rescue_check'),
                side('先查侧柜丰收登记簿的自愿出海', 'shrine_harvest_record'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        shrine_bells: {
            narrative: P.shrine_bells,
            choices: [
                side('先趁乱解救人质，保持高度警惕', 'rescue_check'),
                side('下定决心，潜入潮间洞窟，保持警惕', 'cave_approach'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        shrine_ritual_robe: {
            narrative: P.shrine_ritual_robe,
            effects: {
                clues: [
                    {
                        id: 'cf_robe_list',
                        title: '礼袍名单',
                        content: '袍袖绣失踪者姓名，第七名留白。',
                        type: 'physical'
                    }
                ]
            },
            choices: [
                side('先大声揭露镇长兼祭司双重身份', 'expose'),
                side('先趁乱解救人质，保持高度警惕', 'rescue_check'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        shrine_salt_circle: {
            narrative: P.shrine_salt_circle,
            choices: [
                side('先记下交点，潜入洞窟破阵，保持警惕', 'cave_approach'),
                side('先趁乱解救人质，保持高度警惕', 'rescue_check'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        shrine_offering: {
            narrative: P.shrine_offering,
            choices: [
                side('先趁乱解救人质，保持高度警惕', 'rescue_check'),
                side('先潜入洞窟，阻止终局仪式，保持警惕', 'cave_approach'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        shrine_shell_rope: {
            narrative: P.shrine_shell_rope,
            choices: [
                side('先趁乱解救人质，保持高度警惕', 'rescue_check'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        shrine_mirror: {
            narrative: P.shrine_mirror,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先趁乱解救人质，避开铜镜，保持警惕', 'rescue_check'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        shrine_priest_chant: {
            narrative: P.shrine_priest_chant,
            choices: [
                side('先趁乱解救人质，打断点名经文', 'rescue_check'),
                side('先潜入洞窟，抢在第七名念完前', 'cave_approach'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        shrine_harvest_record: {
            narrative: P.shrine_harvest_record,
            effects: {
                clues: [
                    {
                        id: 'cf_record',
                        title: '丰收登记簿',
                        content: '失踪者被记为自愿出海。',
                        type: 'document'
                    }
                ]
            },
            choices: [
                side('先趁乱解救人质，保持高度警惕', 'rescue_check'),
                side('先大声揭露，逼镇长露出竖瞳等', 'expose'),
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        seaweed_gate: {
            narrative: P.seaweed_gate,
            choices: [
                side('先趁乱解救人质，保持高度警惕', 'rescue_check'),
                back('先回到神龛山门，保持警惕继续行动', 'shrine')
            ]
        },
        rescue_check: {
            narrative: P.rescue_check,
            groupOutcome: {
                allSuccess: P.rescue_allSuccess,
                allFailure: P.rescue_allFailure,
                mixed: P.rescue_mixed
            },
            branch: { success: 'rescue_ok', failure: 'rescue_fail' }
        },
        rescue_fail: {
            narrative: P.rescue_fail,
            choices: [
                side('下定决心，从侧道潜入洞窟，保持警惕', 'cave_side_tunnel'),
                side('先大声揭露阴谋，留意周围动静', 'expose')
            ]
        },
        rescue_ok: {
            narrative: P.rescue_ok,
            effects: { journal: '镇长是祭司，仪式在洞窟。' },
            choices: [
                side('先听获救者断续述说鱼腹经历等', 'victim_testimony'),
                side('先听人质压低的那句鱼腹里低语', 'rescue_whisper'),
                side('下定决心，进入洞窟阻止仪式，保持警惕', 'cave_approach')
            ]
        },
        victim_testimony: {
            narrative: P.victim_testimony,
            effects: {
                clues: [
                    {
                        id: 'cf_testimony',
                        title: '人质证词',
                        content: '诱饮庆典酒，醒在鱼腹模型，后绑神龛。',
                        type: 'testimony'
                    }
                ]
            },
            choices: [
                side('下定决心，进入洞窟阻止仪式等', 'cave_approach'),
                back('先扶稳人质，保持警惕继续行动', 'rescue_ok')
            ]
        },
        rescue_whisper: {
            narrative: P.rescue_whisper,
            choices: [
                side('下定决心，进入洞窟阻止仪式等', 'cave_approach'),
                back('先回到人质身旁，保持警惕继续行动', 'rescue_ok')
            ]
        },
        expose: {
            narrative: P.expose,
            effects: { sanCheck: '1/1D4' },
            choices: [
                side('先观察竖瞳人群的递碗阵列，保持警惕', 'expose_crowd'),
                side('先逃入洞窟，留意周围动静，保持警惕', 'cave_approach')
            ]
        },
        expose_crowd: {
            narrative: P.expose_crowd,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先逃入洞窟，抢在仪式完成前等', 'cave_approach'),
                back('先退回揭露点，保持警惕继续行动', 'expose')
            ]
        },
        cave_approach: {
            narrative: P.cave_approach,
            choices: [
                side('先估黑水潮隙，穿过窄道入深处', 'cave'),
                side('先查洞壁古代献祭壁画与挖空眼位', 'cave_mural'),
                side('先侧听洞道回声，错拍节拍前进', 'cave_echo'),
                side('先沿侧道潜入，窥视祭坛盐圈等', 'cave_side_tunnel'),
                side('先避视黑水浮起的失踪者面孔等', 'cave_water_face'),
                side('先读洞壁炭笔的别应合唱与已应', 'cave_ink_mark'),
                side('先退到黑水潭边，确认水面是否呼吸', 'cave_black_pool'),
                side('先在入口量潮隙，看窄道何时可过', 'cave_approach_tide')
            ]
        },
        cave_mural: {
            narrative: P.cave_mural,
            effects: { sanCheck: '0/1' },
            choices: [
                side('下定决心，进入洞窟深处祭坛等', 'cave'),
                side('先查洞角历代祭司骨与盐晶，保持警惕', 'cave_ancestor_bones'),
                back('先退回洞窟入口，保持警惕继续行动', 'cave_approach')
            ]
        },
        cave_echo: {
            narrative: P.cave_echo,
            choices: [
                side('先错拍节拍，潜入淹没祭坛，保持警惕', 'cave'),
                back('先退回洞窟入口，保持警惕继续行动', 'cave_approach')
            ]
        },
        cave_side_tunnel: {
            narrative: P.cave_side_tunnel,
            choices: [
                side('先近观盐圈交点，准备神秘学破阵', 'finale_salt_ring'),
                side('下定决心，进入洞窟深处祭坛等', 'cave'),
                back('先退回洞窟主道，保持警惕继续行动', 'cave_approach')
            ]
        },
        cave_water_face: {
            narrative: P.cave_water_face,
            effects: { sanCheck: '0/1D3' },
            choices: [
                side('下定决心，抵淹没祭坛阻止仪式', 'cave'),
                back('先退回洞窟主道，保持警惕继续行动', 'cave_approach')
            ]
        },
        cave_ink_mark: {
            narrative: P.cave_ink_mark,
            choices: [
                side('下定决心，进入洞窟深处破阵等', 'cave'),
                back('先退回洞窟主道，保持警惕继续行动', 'cave_approach')
            ]
        },
        cave_ancestor_bones: {
            narrative: P.cave_ancestor_bones,
            effects: { sanCheck: '0/1' },
            choices: [
                side('下定决心，前往淹没祭坛，保持警惕', 'cave'),
                back('先退回洞壁壁画处，保持警惕继续行动', 'cave_mural')
            ]
        },
        cave_black_pool: {
            narrative: P.cave_black_pool,
            effects: { sanCheck: '0/1' },
            choices: [
                side('下定决心，前往淹没祭坛，保持警惕', 'cave'),
                back('先退回洞窟主道，保持警惕继续行动', 'cave_approach')
            ]
        },
        cave_approach_tide: {
            narrative: P.cave_approach_tide,
            choices: [
                side('下定决心，趁潮隙进入洞窟深处', 'cave'),
                back('先退回洞窟入口，保持警惕继续行动', 'cave_approach')
            ]
        },
        offering_table: {
            narrative: P.offering_table,
            choices: [
                side('下定决心，进入洞窟深处祭坛等', 'cave'),
                back('先退回神龛山门，保持警惕继续行动', 'shrine')
            ]
        },
        cave: {
            checkpoint: '潮间洞窟：秋分献祭终局',
            narrative: P.cave,
            effects: { location: '潮间洞窟', mapRoom: 'cave', sanCheck: '0/1D3' },
            choices: [
                {
                    id: 'disrupt',
                    label: '先破坏祭坛盐圈，留意周围动静',
                    next: 'finale',
                    requiresClueQuality: 'solid',
                    skillCheck: { skill: '神秘学', aggregate: 'all' }
                },
                side('先近观盐圈交点与旋转盐粒，保持警惕', 'finale_salt_ring'),
                side('先评估祭司鳞片，准备近身搏斗', 'fight_scales'),
                side('先与祭司搏斗，留意周围动静，保持警惕', 'fight'),
                back('先退回海父神龛，保持警惕继续行动', 'shrine'),
                side('现在带着已记下的线索离开盐港', 'ending_withdraw')
            ]
        },
        pier_fight: {
            narrative: '栈桥上一个披雨布的人挡住去路。咸风把油布掀开一角，下面是湿亮的刀和没有眨眼的眼睛。鼓点从雾里传来，他先动了。你贴着货箱还手，木刺扎进掌心，血腥混进潮气里。这一轮打完，路还在，人还站在码头上。潮水拍着桩脚，盐粒粘在伤口上。',
            effects: {
                sanCheck: '0/1',
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'cf_pier_held',
                    onLose: 'cf_pier_pressed'
                }
            },
            choices: [
                back('先退回码头栈桥，保持警惕继续行动', 'pier')
            ]
        },
        square_fight: {
            narrative: '游行护卫从鱼模型阴影里挤出来，铜铃撞在你肩上。盐粉扬起，呛进喉咙。人群没有让开，只把鼓点敲得更齐。你用刀格开他的腕，鳞屑粘在袖口，湿冷，不像人的皮。交锋停在广场中央，鼓还在响。灯笼油烟熏得眼睛发酸，脚下的盐粉被踩得发黏。',
            effects: {
                sanCheck: '0/1',
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'cf_square_held',
                    onLose: 'cf_square_pressed'
                }
            },
            choices: [
                back('先回到广场中心，保持警惕继续行动', 'square')
            ]
        },
        shrine_fight: {
            narrative: '神龛台阶上的护卫低头冲来，礼袍下摆扫过盐圈，带起一股腥风。铜铃乱响。你看见他腕上的鳞在烛火里反光，刀锋先碰到你的前臂，血是热的，石阶是冷的。这一轮挡住了，祭司的诵经没有停。海藻门帘还在滴水，石阶上的盐圈被踩开了一道。',
            effects: {
                sanCheck: '0/1',
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'cf_shrine_held',
                    onLose: 'cf_shrine_pressed'
                }
            },
            choices: [
                back('先回到神龛中心，保持警惕继续行动', 'shrine')
            ]
        },
        ending_withdraw: {
            narrative: '你把笔记塞进湿外套，沿还能看清的路离开盐港。雾里的鼓点没有追出来。掌心的盐还在刺，你没有再回头。带走的只有已经写下的那几条。没写下的仍留在潮声和灯火里。外套下摆滴着海水，靴底的沙在夜路上响，远处的合唱已经听不清词。\n【结局：撤离】调查中止。已有线索还在，仪式是否完成，你不再确认。',
            effects: { journal: '带着已有线索离开盐港。' },
            end: true
        },
        finale_salt_ring: {
            narrative: P.finale_salt_ring,
            choices: [
                {
                    id: 'disrupt2',
                    label: '先合力破阵盐圈，留意周围动静',
                    next: 'finale',
                    skillCheck: { skill: '神秘学', aggregate: 'all' }
                },
                side('先与祭司搏斗，打断诵经节奏等', 'fight'),
                back('先退回祭坛边缘，保持警惕继续行动', 'cave')
            ]
        },
        fight_scales: {
            narrative: P.fight_scales,
            choices: [
                side('先与祭司搏斗，将其推入黑水等', 'fight'),
                {
                    id: 'disrupt3',
                    label: '先改以神秘学破阵，留意周围动静',
                    next: 'finale',
                    skillCheck: { skill: '神秘学', aggregate: 'all' }
                },
                back('先退回祭坛边缘，保持警惕继续行动', 'cave')
            ]
        },
        fight: {
            narrative: P.fight,
            effects: {
                sanCheck: '1/1D4',
                combat: {
                    creatureId: 'deepone_hybrid',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'cf_priest_down',
                    onLose: 'cf_priest_press'
                }
            },
            choices: [
                side('先带人质逃离，留意周围动静，保持警惕', 'ending_pyrrhic')
            ]
        },
        finale: {
            narrative: P.finale,
            groupOutcome: {
                allSuccess: P.finale_allSuccess,
                allFailure: P.finale_allFailure,
                mixed: P.finale_mixed
            },
            branch: { success: 'ending_win', failure: 'ending_fail' }
        },
        ending_win: {
            narrative: P.ending_win,
            effects: { journal: '破坏丰收祭，救出部分失踪者。', enchantmentId: 'elder_sign' },
            end: true
        },
        ending_fail: {
            narrative: P.ending_fail,
            effects: { sanCheck: '1D3/1D10', dispel: true },
            end: true
        },
        ending_pyrrhic: {
            narrative: P.ending_pyrrhic,
            effects: { sanCheck: '0/1D3' },
            end: true
        }
    }
};

const SQUARE_EXTRA = new Set([
    'salt_warehouse', 'drum_store', 'harvest_banner', 'fish_market', 'shell_gallery',
    'parade_float', 'mist_choir', 'photo_ok', 'photo_detail', 'follow_check',
    'caught', 'caught_bowl', 'poisoned', 'poison_vision'
]);
const SHRINE_EXTRA = new Set([
    'rescue_check', 'rescue_fail', 'rescue_ok', 'rescue_whisper', 'victim_testimony', 'expose'
]);
const CAVE_EXTRA = new Set(['finale', 'finale_salt_ring', 'fight', 'fight_scales']);

function districtClue(nodeId) {
    const id = String(nodeId || '');
    if (!id) return null;
    if (id === 'square' || id.startsWith('square_') || SQUARE_EXTRA.has(id)) return 'cf_square';
    if (id === 'tavern' || id.startsWith('tavern_')) return 'cf_tavern';
    if (id === 'shrine' || id.startsWith('shrine_') || SHRINE_EXTRA.has(id)) return 'cf_journal';
    if (id === 'cave' || id.startsWith('cave_') || CAVE_EXTRA.has(id)) return 'cf_tip';
    return null;
}

// Next-district buttons stay off the list until that place is named on the clue board.
for (const [id, node] of Object.entries(CoCScenarioCoastalFestival.nodes)) {
    const here = districtClue(id);
    for (const choice of node.choices || []) {
        if (!choice || String(choice.id || '').startsWith('back_')) continue;
        const dest = districtClue(choice.next);
        if (!dest || dest === here) continue;
        choice.requiresClueId = dest;
    }
}
