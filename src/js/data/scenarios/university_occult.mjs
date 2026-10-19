/**
 * Original mini-scenario — university occult club (not Chaosium IP).
 * Prose bank: ./university_occult/index_prose.mjs (≥100k CJK Han).
 */
import { UNIVERSITY_PROSE as P } from './university_occult/index_prose.mjs';

function side(label, next) {
    return { id: next, label, next };
}

function back(label, next) {
    return { id: `back_${next}`, label, next };
}

export const CoCScenarioUniversityOccult = {
    id: 'university_occult',
    title: '大学秘社',
    subtitle: '阿卡姆密斯卡托尼克大学',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['大学', '1920s', '秘社', '图书馆', '长篇', '证据分叉'],
    description:
        '密斯卡托尼克大学「星象研究会」成员接连在图书馆闭馆后失踪。校方雇你以客座研究员身份调查，沿校园、宿舍、奥恩图书馆禁书区与地下阅览室追查群星对齐之夜的星门仪式。',
    era: '1920s',
    estimatedMinutes: 90,
    lorebook: [
        {
            "id": "university_occult_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "university_occult"
            ],
            "content": "「大学秘社」：保持1920s克苏鲁调查/恐怖基调。密斯卡托尼克大学「星象研究会」成员接连在图书馆闭馆后失踪。校方雇你以客座研究员身份调查，沿校园、宿舍、奥恩图书馆禁书区与地下阅览室追查群星对齐之夜的星门仪式。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "university_occult_start",
            "title": "密大·校园",
            "keys": [
                "密大·校园",
                "密大",
                "大学秘社"
            ],
            "locations": [
                "密大"
            ],
            "priority": 12,
            "scenarioIds": [
                "university_occult"
            ],
            "content": "开场地点「密大·校园」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "university_occult_room_0",
            "title": "校园",
            "keys": [
                "校园"
            ],
            "locations": [
                "校园"
            ],
            "priority": 8,
            "scenarioIds": [
                "university_occult"
            ],
            "content": "场景「校园」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "university_occult_room_1",
            "title": "奥恩图书馆",
            "keys": [
                "奥恩图书馆"
            ],
            "locations": [
                "奥恩图书馆"
            ],
            "priority": 7,
            "scenarioIds": [
                "university_occult"
            ],
            "content": "场景「奥恩图书馆」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "university_occult_room_2",
            "title": "禁书区",
            "keys": [
                "禁书区"
            ],
            "locations": [
                "禁书区"
            ],
            "priority": 6,
            "scenarioIds": [
                "university_occult"
            ],
            "content": "场景「禁书区」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "university_occult_room_3",
            "title": "研究生宿舍",
            "keys": [
                "研究生宿舍"
            ],
            "locations": [
                "研究生宿舍"
            ],
            "priority": 5,
            "scenarioIds": [
                "university_occult"
            ],
            "content": "场景「研究生宿舍」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "university_occult_room_4",
            "title": "地下阅览室",
            "keys": [
                "地下阅览室"
            ],
            "locations": [
                "地下阅览室"
            ],
            "priority": 5,
            "scenarioIds": [
                "university_occult"
            ],
            "content": "场景「地下阅览室」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "university_occult_mythos",
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
                "university_occult"
            ],
            "content": "神话目击/理智损失走 reality_check 等工具；叙事可暗示不可名状，禁止规则外直接改属性。"
        },
        {
            "id": "university_occult_invest",
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
                "university_occult"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        }
    ],
    startNode: 'campus',
    initialLocation: '密大·校园',
    setup: {
        location: '密大·校园',
        atmosphere: { level: 'calm', note: '秋夜学术氛围' },
        map: {
            title: '密斯卡托尼克大学',
            rooms: [
                { id: 'campus', name: '校园', connections: ['library', 'dorm'] },
                { id: 'library', name: '奥恩图书馆', connections: ['campus', 'stacks', 'basement'] },
                { id: 'stacks', name: '禁书区', connections: ['library'] },
                { id: 'dorm', name: '研究生宿舍', connections: ['campus'] },
                { id: 'basement', name: '地下阅览室', connections: ['library'] }
            ],
            currentRoomId: 'campus'
        },
        journal: '委托：调查星象研究会失踪案，不得惊动媒体。'
    },
    nodes: {
        campus: {
            narrative: P.campus,
            effects: {
                clues: [
                    {
                        id: 'uo_star',
                        title: '手绘星图',
                        content: '非人类星座排列，标注"图书馆B层"。',
                        type: 'document'
                    }
                ]
            },
            choices: [
                side('驻足钟楼广场，细听九响余音与闭馆节拍', 'campus_clock'),
                side('细读布告栏多层通知与研究会招新', 'campus_bulletin'),
                side('展开手绘星图对光，核对B层螺旋标注', 'campus_star_map'),
                side('横穿四方庭院，追踪泥印通向侧门蜡痕', 'campus_quad'),
                side('驻足廊柱秋夜，分辨雨声与地下音节', 'campus_rain'),
                side('查教员廊柱修缮通知与涂抹院长名', 'faculty_row'),
                side('查物理楼天文台小室锁室与同源星图', 'astronomy_lab'),
                side('读小教堂告解室涂鸦与掩盖告示', 'chapel_basement_rumor'),
                side('查学生会布告板与夹缝露骨招新传单', 'student_union_board'),
                side('查校园诊所公告与失眠谵妄传闻', 'sanatorium_rumor'),
                side('前往奥恩图书馆', 'library'),
                side('搜查研究生宿舍', 'dorm')
            ]
        },
        campus_clock: {
            narrative: P.campus_clock,
            choices: [
                side('细读布告栏研究会招新与红笔圈语', 'campus_bulletin'),
                side('展开星图核对钟楼广场拾起的标注', 'campus_star_map'),
                back('回到校园中心', 'campus')
            ]
        },
        campus_bulletin: {
            narrative: P.campus_bulletin,
            choices: [
                side('展开星图，对照布告栏群星呼唤语', 'campus_star_map'),
                side('前往奥恩图书馆', 'library'),
                side('搜查研究生宿舍', 'dorm'),
                back('回到校园中心', 'campus')
            ]
        },
        campus_star_map: {
            narrative: P.campus_star_map,
            choices: [
                side('持星图前往奥恩图书馆', 'library'),
                side('回宿舍，对照密码日记与星图螺旋', 'dorm'),
                back('回到校园中心', 'campus')
            ]
        },
        campus_quad: {
            narrative: P.campus_quad,
            choices: [
                side('经侧门蜡痕，进入奥恩图书馆主厅', 'library'),
                side('查研究生宿舍，寻找密码日记', 'dorm'),
                back('回到校园中心', 'campus')
            ]
        },
        campus_rain: {
            narrative: P.campus_rain,
            choices: [
                side('趁雨幕掩护潜入奥恩图书馆', 'library'),
                side('回宿舍破译日记', 'dorm'),
                back('回到校园中心', 'campus')
            ]
        },
        faculty_row: {
            narrative: P.faculty_row,
            choices: [
                side('前往奥恩图书馆核实修缮通知', 'library'),
                back('回到校园中心', 'campus')
            ]
        },
        astronomy_lab: {
            narrative: P.astronomy_lab,
            choices: [
                side('持星图线索，前往奥恩图书馆主厅', 'library'),
                side('查研究生宿舍，对照桌上同源星图', 'dorm'),
                back('回到校园中心', 'campus')
            ]
        },
        chapel_basement_rumor: {
            narrative: P.chapel_basement_rumor,
            choices: [
                side('赴奥恩图书馆验证地下传闻', 'library'),
                back('回到校园中心', 'campus')
            ]
        },
        student_union_board: {
            narrative: P.student_union_board,
            choices: [
                side('查研究生宿舍，寻找失踪者日记', 'dorm'),
                side('前往奥恩图书馆追查研究会', 'library'),
                back('回到校园中心', 'campus')
            ]
        },
        sanatorium_rumor: {
            narrative: P.sanatorium_rumor,
            effects: { sanCheck: '0/1' },
            choices: [
                side('加速调查，先赴奥恩图书馆闭馆前', 'library'),
                side('查研究生宿舍，破译密码日记', 'dorm'),
                back('回到校园中心', 'campus')
            ]
        },
        dorm: {
            narrative: P.dorm,
            effects: { location: '研究生宿舍', mapRoom: 'dorm' },
            choices: [
                side('审视书桌刻意对齐的墨水瓶与刻痕', 'dorm_desk'),
                side('端详日记封面触手纹与徽章压印', 'dorm_diary_cover'),
                side('贴窗观察奥恩图书馆灯火齐暗一瞬', 'dorm_window'),
                side('俯身查床下空处与墙皮空响回音', 'dorm_bedframe'),
                side('翻开倒扣相框，查看五人合影划脸', 'missing_photo'),
                side('读日记夹页凯撒移位提示与血指印', 'latin_cipher_note'),
                {
                    id: 'decode',
                    label: '破译日记移位密码',
                    next: 'decode_check',
                    skillCheck: { skill: '图书馆使用' }
                },
                side('带星图去图书馆', 'library')
            ]
        },
        dorm_desk: {
            narrative: P.dorm_desk,
            choices: [
                side('破译抽屉深处密码日记', 'decode_check'),
                side('端详日记封面，再决定是否破译', 'dorm_diary_cover'),
                back('回到宿舍门边', 'dorm')
            ]
        },
        dorm_diary_cover: {
            narrative: P.dorm_diary_cover,
            choices: [
                {
                    id: 'decode2',
                    label: '破译日记，对照封面触手纹与蜡渍',
                    next: 'decode_check',
                    skillCheck: { skill: '图书馆使用' }
                },
                back('回到宿舍门边', 'dorm')
            ]
        },
        dorm_window: {
            narrative: P.dorm_window,
            choices: [
                side('趁馆灯异变赴奥恩图书馆', 'library'),
                side('破译日记，抢在闭馆前读出B层警告', 'decode_check'),
                back('回到宿舍门边', 'dorm')
            ]
        },
        dorm_bedframe: {
            narrative: P.dorm_bedframe,
            choices: [
                side('破译密码日记，追查床下圆形擦痕', 'decode_check'),
                back('回到宿舍门边', 'dorm')
            ]
        },
        missing_photo: {
            narrative: P.missing_photo,
            effects: { sanCheck: '0/1' },
            choices: [
                side('破译日记，核对被划三人签名', 'decode_check'),
                side('持照片线索赴奥恩图书馆', 'library'),
                back('回到宿舍门边', 'dorm')
            ]
        },
        latin_cipher_note: {
            narrative: P.latin_cipher_note,
            choices: [
                {
                    id: 'decode3',
                    label: '按夹页提示破译移位密码',
                    next: 'decode_check',
                    skillCheck: { skill: '图书馆使用' }
                },
                back('回到宿舍门边', 'dorm')
            ]
        },
        decode_check: {
            narrative: P.decode_check,
            groupOutcome: {
                allSuccess: P.decode_allSuccess,
                allFailure: P.decode_allFailure,
                mixed: P.decode_mixed
            },
            branch: { success: 'diary_ok', failure: 'diary_fail' }
        },
        diary_ok: {
            narrative: P.diary_ok,
            effects: {
                clues: [
                    {
                        id: 'uo_diary',
                        title: '密码日记',
                        content: 'B层有门；群星对齐夜再开。三人已"划掉"。',
                        type: 'document',
                        quality: 'solid'
                    }
                ],
                journal: 'B层与群星对齐有关。',
                flags: { uo_intel: true }
            },
            choices: [
                side('持日记情报前往图书馆B层', 'library'),
                side('查档案室未寄信与触手蜡封纹', 'archive_letter')
            ]
        },
        diary_fail: {
            narrative: P.diary_fail,
            choices: [
                side('去图书馆', 'library'),
                side('回宿舍重读夹页凯撒移位提示', 'latin_cipher_note')
            ]
        },
        archive_letter: {
            narrative: P.archive_letter,
            effects: { flags: { uo_intel: true } },
            choices: [
                side('持信件线索，前往奥恩图书馆禁书区', 'library'),
                back('合起日记', 'diary_ok')
            ]
        },
        library: {
            checkpoint: '奥恩图书馆：地下室入口与禁书区线索',
            narrative: P.library,
            effects: { location: '奥恩图书馆', mapRoom: 'library' },
            choices: [
                side('近观柜台借阅簿与管理员指节蜡渍', 'library_counter'),
                side('翻卡片目录，查N星门注释撕痕', 'library_catalog'),
                side('查主楼梯肖像眼神与栏缝星尘粉', 'library_stairwell'),
                side('听闭馆铃余音与地下朗诵合拍', 'library_closing_bell'),
                side('查档案室未寄信与研究会通信', 'archive_letter'),
                side('查储物间蜡封模具与触手星门形', 'wax_seal_closet'),
                {
                    id: 'stacks',
                    label: '申请进入禁书区',
                    next: 'stacks',
                    skillCheck: { skill: '说服' }
                },
                {
                    id: 'sneak',
                    label: '闭馆后潜入地下室',
                    next: 'sneak_check',
                    skillCheck: { skill: '潜行' }
                }
            ]
        },
        library_counter: {
            narrative: P.library_counter,
            choices: [
                {
                    id: 'stacks2',
                    label: '以研究员身份说服管理员开放禁书区',
                    next: 'stacks',
                    skillCheck: { skill: '说服' }
                },
                side('翻卡片目录，查N星门注释空白槽', 'library_catalog'),
                back('回到图书馆主厅', 'library')
            ]
        },
        library_catalog: {
            narrative: P.library_catalog,
            choices: [
                {
                    id: 'stacks3',
                    label: '持目录线索，说服管理员进入禁书区',
                    next: 'stacks',
                    skillCheck: { skill: '说服' }
                },
                side('查储物间蜡封模具与门锁同源痕', 'wax_seal_closet'),
                back('回到图书馆主厅', 'library')
            ]
        },
        library_stairwell: {
            narrative: P.library_stairwell,
            choices: [
                {
                    id: 'sneak2',
                    label: '沿楼梯贴影潜行，试探地下室侧锁',
                    next: 'sneak_check',
                    skillCheck: { skill: '潜行' }
                },
                side('听闭馆铃，判断仪式窗口何时打开', 'library_closing_bell'),
                back('回到图书馆主厅', 'library')
            ]
        },
        library_closing_bell: {
            narrative: P.library_closing_bell,
            choices: [
                {
                    id: 'sneak3',
                    label: '闭馆铃后贴影潜入摸向侧锁',
                    next: 'sneak_check',
                    skillCheck: { skill: '潜行' }
                },
                {
                    id: 'stacks4',
                    label: '趁闭馆前说服管理员，进入禁书区',
                    next: 'stacks',
                    skillCheck: { skill: '说服' }
                },
                back('回到图书馆主厅', 'library')
            ]
        },
        wax_seal_closet: {
            narrative: P.wax_seal_closet,
            choices: [
                {
                    id: 'sneak4',
                    label: '持蜡封线索，闭馆后潜行地下室入口',
                    next: 'sneak_check',
                    skillCheck: { skill: '潜行' }
                },
                back('回到图书馆主厅', 'library')
            ]
        },
        sneak_check: {
            narrative: P.sneak_check,
            groupOutcome: {
                allSuccess: P.sneak_allSuccess,
                allFailure: P.sneak_allFailure,
                mixed: P.sneak_mixed
            },
            branch: { success: 'sneak_success', failure: 'sneak_fail' }
        },
        sneak_success: {
            narrative: P.sneak_success,
            choices: [
                {
                    id: 'in',
                    label: '潜入地下阅览室',
                    next: 'basement_approach',
                    requiresFlag: 'uo_intel'
                },
                side('停驻楼梯中段，分辨地下朗诵共鸣', 'basement_echo'),
                side('回宿舍破译日记，拼全B层情报', 'dorm'),
                side('回图书馆申请禁书区', 'library')
            ]
        },
        sneak_fail: {
            narrative: P.sneak_fail,
            choices: [
                side('回宿舍破译日记', 'dorm'),
                side('回图书馆再申请禁书区', 'library'),
                side('查主楼梯肖像，另寻地下入口线索', 'library_stairwell')
            ]
        },
        basement_echo: {
            narrative: P.basement_echo,
            effects: { sanCheck: '0/1' },
            choices: [
                side('强行错开呼吸，继续下行抵阅览室', 'basement_approach'),
                back('退回楼梯上段', 'sneak_success')
            ]
        },
        stacks: {
            narrative: P.stacks,
            groupOutcome: {
                allSuccess: P.stacks_allSuccess,
                allFailure: P.stacks_allFailure,
                mixed: P.stacks_mixed
            },
            branch: { success: 'stacks_ok', failure: 'stacks_ejected' }
        },
        stacks_ejected: {
            narrative: P.stacks_ejected,
            choices: [
                side('去宿舍查失踪者日记', 'dorm'),
                side('沿索引柜细查，再申请进入禁书区', 'stacks_index'),
                {
                    id: 'sneak5',
                    label: '闭馆后再次潜入',
                    next: 'sneak_check',
                    skillCheck: { skill: '潜行' }
                }
            ]
        },
        stacks_ok: {
            narrative: P.stacks_ok,
            effects: {
                location: '禁书区',
                mapRoom: 'stacks',
                clues: [
                    {
                        id: 'uo_index',
                        title: '禁书索引',
                        content: 'N星门注释被星象研究会借走未还。',
                        type: 'document',
                        quality: 'solid'
                    }
                ],
                flags: { uo_intel: true }
            },
            choices: [
                side('沿索引柜细查，核对借出不还书目', 'stacks_index'),
                side('查铁栅深处混架与墙后撬痕通下', 'stacks_restricted'),
                side('读管理员便条与勿下B层警告', 'stacks_librarian_note'),
                side('查禁书内页印章与对齐夜批注', 'occult_society_stamp'),
                side('下地下室', 'basement_approach')
            ]
        },
        stacks_index: {
            narrative: P.stacks_index,
            choices: [
                side('查铁栅深处，寻找通B层撬痕', 'stacks_restricted'),
                side('下地下室，持索引线索接近星阵', 'basement_approach'),
                back('回到禁书区铁门前', 'stacks_ok')
            ]
        },
        stacks_restricted: {
            narrative: P.stacks_restricted,
            choices: [
                side('下地下室，沿撬痕进入地下通道', 'basement_approach'),
                side('读管理员手写便条，核对B层警告', 'stacks_librarian_note'),
                back('回到禁书区通道', 'stacks_ok')
            ]
        },
        stacks_librarian_note: {
            narrative: P.stacks_librarian_note,
            choices: [
                side('持便条警告，潜行或下行地下阅览室', 'basement_approach'),
                side('查禁书内页印章，读对齐夜第三章', 'occult_society_stamp'),
                back('回到禁书区铁门前', 'stacks_ok')
            ]
        },
        occult_society_stamp: {
            narrative: P.occult_society_stamp,
            effects: { flags: { uo_intel: true } },
            choices: [
                side('持注释线索，下地下室接近星门阵', 'basement_approach'),
                back('回到禁书区书架', 'stacks_ok')
            ]
        },
        basement_approach: {
            narrative: P.basement_approach,
            choices: [
                side('查楼梯转角残阵与对齐夜刻字', 'basement_ritual_prep'),
                side('贴通道墙星图涂鸦，核对非已知星座', 'star_chart_wall'),
                side('停驻楼梯听朗诵，避免心跳同步', 'basement_echo'),
                side('进入地下阅览室', 'basement')
            ]
        },
        basement_ritual_prep: {
            narrative: P.basement_ritual_prep,
            choices: [
                side('查墙星图涂鸦，再入地下阅览室', 'star_chart_wall'),
                side('推门进入星阵仪式现场', 'basement'),
                back('退回楼梯上段', 'basement_approach')
            ]
        },
        star_chart_wall: {
            narrative: P.star_chart_wall,
            choices: [
                side('进入地下阅览室星阵现场', 'basement'),
                back('退回地下通道', 'basement_approach')
            ]
        },
        basement: {
            checkpoint: '地下阅览室：星阵与星门仪式现场',
            narrative: P.basement,
            effects: {
                location: '地下阅览室',
                mapRoom: 'basement',
                sanCheck: '1/1D4',
                atmosphere: { level: 'ritual', note: '星门' },
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'uo_cultist_down',
                    onLose: 'uo_cultist_press'
                }
            },
            choices: [
                side('贴近阵心门缝，观察液态金属星光', 'basement_star_door'),
                side('数四角蜡烛方位符，推演熄灭顺序', 'basement_candles'),
                side('查备用粉笔盒与地上辅助蜡粉阵', 'basement_chalk'),
                side('打断朗诵', 'interrupt'),
                {
                    id: 'study',
                    label: '研究星阵弱点',
                    next: 'study_check',
                    skillCheck: { skill: '神秘学', aggregate: 'all' },
                    requiresFlag: 'uo_intel',
                    requiresClueQuality: 'solid'
                }
            ]
        },
        basement_star_door: {
            narrative: P.basement_star_door,
            effects: { sanCheck: '0/1' },
            choices: [
                side('打断朗诵，冲入星阵阻止门再开', 'interrupt'),
                {
                    id: 'study2',
                    label: '研究星阵符文，推导熄灭蜡烛顺序',
                    next: 'study_check',
                    skillCheck: { skill: '神秘学', aggregate: 'all' }
                },
                back('退回阵缘', 'basement')
            ]
        },
        basement_candles: {
            narrative: P.basement_candles,
            choices: [
                {
                    id: 'study3',
                    label: '按方位符推演蜡烛的熄灭顺序（神秘学）',
                    next: 'study_check',
                    skillCheck: { skill: '神秘学', aggregate: 'all' }
                },
                side('打断朗诵，以肉身干扰仪式节拍', 'interrupt'),
                back('退回阵缘', 'basement')
            ]
        },
        basement_chalk: {
            narrative: P.basement_chalk,
            choices: [
                {
                    id: 'study4',
                    label: '对照辅助阵的粉线找出弱点（神秘学）',
                    next: 'study_check',
                    skillCheck: { skill: '神秘学', aggregate: 'all' }
                },
                back('退回阵缘', 'basement')
            ]
        },
        interrupt: {
            narrative: P.interrupt,
            effects: { sanCheck: '0/1D3' },
            choices: [
                {
                    id: 's',
                    label: '强行研究星阵',
                    next: 'study_check',
                    skillCheck: { skill: '神秘学', aggregate: 'all' }
                }
            ]
        },
        study_check: {
            narrative: P.study_check,
            groupOutcome: {
                allSuccess: P.study_allSuccess,
                allFailure: P.study_allFailure,
                mixed: P.study_mixed
            },
            branch: { success: 'ending_win', failure: 'ending_taken' }
        },
        ending_win: {
            narrative: P.ending_win,
            effects: { journal: '关闭星门，救出失踪学生。', enchantmentId: 'elder_sign' },
            end: true
        },
        ending_taken: {
            narrative: P.ending_taken,
            effects: { sanCheck: '1D4/1D10', dispel: true },
            end: true
        }
    }
};
