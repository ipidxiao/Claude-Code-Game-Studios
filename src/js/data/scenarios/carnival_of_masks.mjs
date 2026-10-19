/**
 * Original mini-scenario — carnival of masks (not Chaosium IP).
 * Prose bank: ./carnival_of_masks/index_prose.mjs (≥100k CJK Han).
 */
import { CARNIVAL_PROSE as P } from './carnival_of_masks/index_prose.mjs';

function side(label, next, extra = {}) {
    return { id: next, label, next, ...extra };
}

function back(label, next) {
    return { id: `back_${next}`, label, next };
}

export const CoCScenarioCarnivalOfMasks = {
    id: 'carnival_of_masks',
    title: '面具嘉年华',
    subtitle: '巡回马戏团的最后一夜',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['嘉年华', '1920s', '马戏团', '面具', '长篇', '追逐', '证据分叉'],
    description:
        '「千面嘉年华」巡回至普罗维登斯郊外。当地少年在帐篷区失踪，马戏团老板邀请你"免费观看压轴戏"——条件是不摘面具。沿入口、游艺区、拖车与主帐篷追查蜡像告密、万面镜与千面归一仪式。',
    era: '1920s',
    estimatedMinutes: 90,
    lorebook: [
        {
            "id": "carnival_of_masks_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "carnival_of_masks"
            ],
            "content": "「面具嘉年华」：保持1920s克苏鲁调查/恐怖基调。「千面嘉年华」巡回至普罗维登斯郊外。当地少年在帐篷区失踪，马戏团老板邀请你\"免费观看压轴戏\"——条件是不摘面具。沿入口、游艺区、拖车与主帐篷追查蜡像告密、万面镜与千面归一仪式。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "carnival_of_masks_start",
            "title": "嘉年华·入口",
            "keys": [
                "嘉年华·入口",
                "嘉年华",
                "面具嘉年华"
            ],
            "locations": [
                "嘉年华"
            ],
            "priority": 12,
            "scenarioIds": [
                "carnival_of_masks"
            ],
            "content": "开场地点「嘉年华·入口」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "carnival_of_masks_room_0",
            "title": "入口",
            "keys": [
                "入口"
            ],
            "locations": [
                "入口"
            ],
            "priority": 8,
            "scenarioIds": [
                "carnival_of_masks"
            ],
            "content": "场景「入口」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "carnival_of_masks_room_1",
            "title": "游艺区",
            "keys": [
                "游艺区"
            ],
            "locations": [
                "游艺区"
            ],
            "priority": 7,
            "scenarioIds": [
                "carnival_of_masks"
            ],
            "content": "场景「游艺区」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "carnival_of_masks_room_2",
            "title": "主帐篷",
            "keys": [
                "主帐篷"
            ],
            "locations": [
                "主帐篷"
            ],
            "priority": 6,
            "scenarioIds": [
                "carnival_of_masks"
            ],
            "content": "场景「主帐篷」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "carnival_of_masks_room_3",
            "title": "老板拖车",
            "keys": [
                "老板拖车"
            ],
            "locations": [
                "老板拖车"
            ],
            "priority": 5,
            "scenarioIds": [
                "carnival_of_masks"
            ],
            "content": "场景「老板拖车」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "carnival_of_masks_room_4",
            "title": "后台",
            "keys": [
                "后台"
            ],
            "locations": [
                "后台"
            ],
            "priority": 5,
            "scenarioIds": [
                "carnival_of_masks"
            ],
            "content": "场景「后台」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "carnival_of_masks_chase",
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
                "carnival_of_masks"
            ],
            "content": "追逐用 start_chase/chase_action；载具注意司机座位与行动数。追上后再允许 melee/fire，勿叙事空跑结算。"
        },
        {
            "id": "carnival_of_masks_invest",
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
                "carnival_of_masks"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        },
        {
            "id": "carnival_of_masks_space",
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
                "carnival_of_masks"
            ],
            "content": "空间压迫感服务悬疑：出口受限、信息不全。战斗/环境伤害须走工具；保持玩家有至少一条可推进的调查口。"
        }
    ],
    startNode: 'gate',
    initialLocation: '嘉年华·入口',
    setup: {
        location: '嘉年华·入口',
        atmosphere: { level: 'calm', note: '彩旗与风琴声' },
        map: {
            title: '千面嘉年华',
            rooms: [
                { id: 'gate', name: '入口', connections: ['midway', 'tent'] },
                { id: 'midway', name: '游艺区', connections: ['gate', 'tent', 'trailer'] },
                { id: 'tent', name: '主帐篷', connections: ['gate', 'midway', 'backstage'] },
                { id: 'trailer', name: '老板拖车', connections: ['midway'] },
                { id: 'backstage', name: '后台', connections: ['tent'] }
            ],
            currentRoomId: 'gate'
        },
        journal: '调查千面嘉年华少年失踪案。'
    },
    nodes: {
        gate: {
            narrative: P.gate,
            effects: {
                clues: [{ id: 'com_bike', title: '少年自行车', content: '失踪者最后出现在嘉年华入口。', type: 'physical' }]
            },
            choices: [
                side('戴上面具进入', 'midway_masked'),
                side('拒绝面具潜入', 'midway_sneak', { skillCheck: { skill: '潜行' } }),
                side('俯身详查少年自行车与撕碎海报', 'gate_bike_examine'),
                side('检查售票亭抽屉与空白面具分发', 'gate_ticket_booth'),
                side('沿栅栏检视彩旗笑脸与旗绳磨损', 'gate_banner_flags'),
                side('驻足细听风琴低音与帐内鼓点', 'gate_organ_music'),
                side('嗅雨后泥腥与蜡屑骨粉混合物', 'gate_rain_smell')
            ]
        },
        gate_bike_examine: {
            narrative: P.gate_bike_examine,
            choices: [
                side('戴上面具进入', 'midway_masked'),
                side('拒绝面具潜入', 'midway_sneak', { skillCheck: { skill: '潜行' } }),
                back('回到嘉年华入口中心', 'gate')
            ]
        },
        gate_ticket_booth: {
            narrative: P.gate_ticket_booth,
            choices: [
                side('戴上面具进入', 'midway_masked'),
                side('拒绝面具潜入', 'midway_sneak', { skillCheck: { skill: '潜行' } }),
                back('回到嘉年华入口中心', 'gate')
            ]
        },
        gate_banner_flags: {
            narrative: P.gate_banner_flags,
            choices: [
                side('戴上面具进入', 'midway_masked'),
                side('拒绝面具潜入', 'midway_sneak', { skillCheck: { skill: '潜行' } }),
                back('回到嘉年华入口中心', 'gate')
            ]
        },
        gate_organ_music: {
            narrative: P.gate_organ_music,
            choices: [
                side('戴上面具进入', 'midway_masked'),
                side('拒绝面具潜入', 'midway_sneak', { skillCheck: { skill: '潜行' } }),
                back('回到嘉年华入口中心', 'gate')
            ]
        },
        gate_rain_smell: {
            narrative: P.gate_rain_smell,
            choices: [
                side('戴上面具进入', 'midway_masked'),
                side('拒绝面具潜入', 'midway_sneak', { skillCheck: { skill: '潜行' } }),
                back('回到嘉年华入口中心', 'gate')
            ]
        },
        midway_sneak: {
            narrative: P.midway_sneak,
            groupOutcome: {
                allSuccess: P.midway_sneak_allSuccess,
                allFailure: P.midway_sneak_allFailure,
                mixed: P.midway_sneak_mixed
            },
            branch: { success: 'midway', failure: 'midway_masked' }
        },
        midway_masked: {
            narrative: P.midway_masked,
            effects: { sanCheck: '0/1D3', atmosphere: { level: 'dread', note: '面具视界' } },
            choices: [
                side('强行摘下面具', 'midway'),
                side('跟随人群进主帐篷', 'tent_approach')
            ]
        },
        tent_approach: {
            narrative: P.tent_approach,
            choices: [
                side('强行摘下面具恢复理智', 'midway'),
                side('进入主帐篷', 'tent'),
                side('贴帐篷帆布嗅闻热胶与缝线走向', 'tent_canvas_smell'),
                side('摸帐侧后台门与蜡封锁孔状态', 'tent_backstage_door')
            ]
        },
        tent_canvas_smell: {
            narrative: P.tent_canvas_smell,
            choices: [
                side('进入主帐篷', 'tent'),
                side('绕到后台', 'backstage', { requiresFlag: 'carnival_intel' }),
                back('退回帐篷门前', 'tent_approach')
            ]
        },
        tent_backstage_door: {
            narrative: P.tent_backstage_door,
            choices: [
                side('进入主帐篷', 'tent'),
                side('绕到后台', 'backstage', { requiresFlag: 'carnival_intel' }),
                back('退回帐篷门前', 'tent_approach')
            ]
        },
        midway: {
            narrative: P.midway,
            effects: { location: '游艺区', mapRoom: 'midway' },
            choices: [
                side('调查老板拖车', 'trailer'),
                side('进入主帐篷', 'tent_approach'),
                side('询问蜡像摊主', 'wax_check', { skillCheck: { skill: '心理学' } }),
                side('绕到蜡像摊侧查暗门与未固定鞋底', 'midway_wax_stall'),
                side('拐进小丑巷，留意鞠躬人影与彩粉', 'midway_clown_alley'),
                side('停驻游戏射击摊查奖券与幕布破洞', 'midway_game_booth'),
                side('查停摆摩天轮舱门与帆布圆影', 'midway_ferris_shadow'),
                side('掀开占卜帐篷水晶球与倒吊牌面', 'midway_fortune_teller'),
                side('查爆米花摊蜡粒糖衣与侧幕轮印', 'midway_popcorn_stand'),
                side('查看旋转木马腹藏蜡块与杆顶旗', 'midway_carousel_halt'),
                side('步入杂耍镜屋走廊，留意尽头无脸', 'midway_sideshow_mirror')
            ]
        },
        midway_wax_stall: {
            narrative: P.midway_wax_stall,
            choices: [
                side('询问蜡像摊主', 'wax_check', { skillCheck: { skill: '心理学' } }),
                back('回到游艺区中心', 'midway')
            ]
        },
        midway_clown_alley: {
            narrative: P.midway_clown_alley,
            choices: [
                side('进入主帐篷', 'tent_approach'),
                side('调查老板拖车', 'trailer'),
                back('回到游艺区中心', 'midway')
            ]
        },
        midway_game_booth: {
            narrative: P.midway_game_booth,
            choices: [
                side('调查老板拖车', 'trailer'),
                side('询问蜡像摊主', 'wax_check', { skillCheck: { skill: '心理学' } }),
                back('回到游艺区中心', 'midway')
            ]
        },
        midway_ferris_shadow: {
            narrative: P.midway_ferris_shadow,
            choices: [
                side('进入主帐篷', 'tent_approach'),
                side('调查老板拖车', 'trailer'),
                back('回到游艺区中心', 'midway')
            ]
        },
        midway_fortune_teller: {
            narrative: P.midway_fortune_teller,
            choices: [
                side('进入主帐篷', 'tent_approach'),
                side('调查老板拖车', 'trailer'),
                back('回到游艺区中心', 'midway')
            ]
        },
        midway_popcorn_stand: {
            narrative: P.midway_popcorn_stand,
            choices: [
                side('进入主帐篷', 'tent_approach'),
                back('回到游艺区中心', 'midway')
            ]
        },
        midway_carousel_halt: {
            narrative: P.midway_carousel_halt,
            choices: [
                side('调查老板拖车', 'trailer'),
                back('回到游艺区中心', 'midway')
            ]
        },
        midway_sideshow_mirror: {
            narrative: P.midway_sideshow_mirror,
            choices: [
                side('进入主帐篷', 'tent_approach'),
                back('回到游艺区中心', 'midway')
            ]
        },
        wax_check: {
            narrative: P.wax_check,
            groupOutcome: {
                allSuccess: P.wax_allSuccess,
                allFailure: P.wax_allFailure,
                mixed: P.wax_mixed
            },
            branch: { success: 'wax_ok', failure: 'wax_fail' }
        },
        wax_fail: {
            narrative: P.wax_fail,
            choices: [
                side('调查老板拖车', 'trailer'),
                side('硬闯主帐篷', 'tent_approach')
            ]
        },
        wax_ok: {
            narrative: P.wax_ok,
            effects: {
                clues: [{ id: 'com_wax', title: '蜡像告密', content: '失踪少年在压轴戏；老板用面具换脸。', type: 'testimony', quality: 'solid' }],
                journal: '压轴戏与失踪者有关。',
                flags: { carnival_intel: true }
            },
            choices: [
                side('潜入后台', 'backstage'),
                side('调查老板拖车', 'trailer')
            ]
        },
        trailer: {
            narrative: P.trailer,
            effects: { location: '老板拖车', mapRoom: 'trailer', sanCheck: '1/1D4' },
            choices: [
                side('对质老板', 'confront'),
                side('偷走面具收藏', 'steal_check', { skillCheck: { skill: '巧手' } }),
                side('贴拖车镜墙观察延迟半拍映像', 'trailer_mirror_wall'),
                side('数面具架少年脸孔与最旧皮质', 'trailer_mask_rack'),
                side('查缝纫工具台弯针与蜡浸线色', 'trailer_sewing_kit'),
                side('翻老板日记查千面台账与剪报', 'trailer_boss_journal')
            ]
        },
        trailer_mirror_wall: {
            narrative: P.trailer_mirror_wall,
            choices: [
                side('对质老板', 'confront'),
                side('偷走面具收藏', 'steal_check', { skillCheck: { skill: '巧手' } }),
                back('回到拖车中心', 'trailer')
            ]
        },
        trailer_mask_rack: {
            narrative: P.trailer_mask_rack,
            choices: [
                side('偷走面具收藏', 'steal_check', { skillCheck: { skill: '巧手' } }),
                side('对质老板', 'confront'),
                back('回到拖车中心', 'trailer')
            ]
        },
        trailer_sewing_kit: {
            narrative: P.trailer_sewing_kit,
            choices: [
                side('对质老板', 'confront'),
                back('回到拖车中心', 'trailer')
            ]
        },
        trailer_boss_journal: {
            narrative: P.trailer_boss_journal,
            effects: {
                clues: [{ id: 'com_journal', title: '老板日记', content: '千面需新血；压轴缺观众；少年已排进节目。', type: 'document', quality: 'solid' }],
                flags: { carnival_intel: true }
            },
            choices: [
                side('对质老板', 'confront'),
                side('偷走面具收藏', 'steal_check', { skillCheck: { skill: '巧手' } }),
                back('回到拖车中心', 'trailer')
            ]
        },
        steal_check: {
            narrative: P.steal_check,
            groupOutcome: {
                allSuccess: P.steal_allSuccess,
                allFailure: P.steal_allFailure,
                mixed: P.steal_mixed
            },
            branch: { success: 'steal_ok', failure: 'confront' }
        },
        steal_ok: {
            narrative: P.steal_ok,
            effects: {
                items: [{ name: '原始面具', qty: 1 }],
                clues: [{ id: 'com_mask', title: '原始面具', content: '老板收藏的未涂漆脸壳；边缘有少年指纹。', type: 'physical', quality: 'solid' }],
                journal: '获得老板原始面具。',
                flags: { carnival_intel: true }
            },
            choices: [
                side('冲向主帐篷', 'tent_approach'),
                side('绕到后台', 'backstage')
            ]
        },
        confront: {
            narrative: P.confront,
            effects: { sanCheck: '0/1D3' },
            choices: [
                side('战斗', 'fight'),
                side('虚与委蛇进帐篷', 'tent_approach'),
                side('细读老板递来的压轴主角邀请卡', 'confront_invitation_card')
            ]
        },
        confront_invitation_card: {
            narrative: P.confront_invitation_card,
            choices: [
                side('战斗', 'fight'),
                side('虚与委蛇进帐篷', 'tent_approach'),
                back('回到对质现场', 'confront')
            ]
        },
        fight: {
            narrative: P.fight,
            effects: {
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'carnival_boss_down',
                    onLose: 'carnival_boss_press'
                },
                chase: { quarry: 'pc', lead: 2, pursuer: '面具马戏团打手', pursuerMov: 8 }
            },
            choices: [
                side('追入后台', 'backstage'),
                side('查看地上盐骨粉散屑与动半秒皮屑', 'fight_scatter_salt')
            ]
        },
        fight_scatter_salt: {
            narrative: P.fight_scatter_salt,
            choices: [
                side('追入后台', 'backstage'),
                side('冲向主帐篷', 'tent_approach')
            ]
        },
        tent: {
            checkpoint: '主帐篷：千面归一压轴戏',
            narrative: P.tent,
            effects: { location: '主帐篷', mapRoom: 'tent', atmosphere: { level: 'ritual', note: '千面仪式' } },
            choices: [
                side('冲上舞台', 'stage_approach'),
                side('绕到后台', 'backstage', { requiresFlag: 'carnival_intel' }),
                side('沿观众席查蜡人节目单与少年发卡', 'tent_seat_rows'),
                side('仰视舞台灯架细线与螺栓同纹', 'tent_stage_lights'),
                side('摸幕布拉绳骨粉滑轮与蜡封发纤维', 'tent_curtain_rope')
            ]
        },
        tent_seat_rows: {
            narrative: P.tent_seat_rows,
            choices: [
                side('冲上舞台', 'stage_approach'),
                side('绕到后台', 'backstage', { requiresFlag: 'carnival_intel' }),
                back('回到帐篷中心', 'tent')
            ]
        },
        tent_stage_lights: {
            narrative: P.tent_stage_lights,
            choices: [
                side('冲上舞台', 'stage_approach'),
                back('回到帐篷中心', 'tent')
            ]
        },
        tent_curtain_rope: {
            narrative: P.tent_curtain_rope,
            choices: [
                side('冲上舞台', 'stage_approach'),
                side('绕到后台', 'backstage', { requiresFlag: 'carnival_intel' }),
                back('回到帐篷中心', 'tent')
            ]
        },
        backstage: {
            checkpoint: '后台：万面镜仪式核心',
            narrative: P.backstage,
            effects: { location: '后台', mapRoom: 'backstage', sanCheck: '0/1D3' },
            choices: [
                side('砸碎万面镜', 'break_check', { skillCheck: { skill: '力量', aggregate: 'all' }, requiresFlag: 'carnival_intel', requiresClueQuality: 'solid' }),
                side('戴上面具参与仪式', 'ending_join'),
                side('撬道具箱查少年衣物与刻归一盖', 'backstage_prop_crate'),
                side('理戏服架小丑袍与改线校服细节', 'backstage_costume_rack'),
                side('近万面镜细察镜背螺栓与骨粉符', 'backstage_mirror_core'),
                side('整理少年衣物堆查车票与老板章', 'backstage_youth_clothes')
            ]
        },
        backstage_prop_crate: {
            narrative: P.backstage_prop_crate,
            choices: [
                side('砸碎万面镜', 'break_check', { skillCheck: { skill: '力量', aggregate: 'all' } }),
                back('回到后台中心', 'backstage')
            ]
        },
        backstage_costume_rack: {
            narrative: P.backstage_costume_rack,
            choices: [
                side('砸碎万面镜', 'break_check', { skillCheck: { skill: '力量', aggregate: 'all' } }),
                back('回到后台中心', 'backstage')
            ]
        },
        backstage_mirror_core: {
            narrative: P.backstage_mirror_core,
            effects: { sanCheck: '0/1' },
            choices: [
                side('砸碎万面镜', 'break_check', { skillCheck: { skill: '力量', aggregate: 'all' } }),
                back('回到后台中心', 'backstage')
            ]
        },
        backstage_youth_clothes: {
            narrative: P.backstage_youth_clothes,
            choices: [
                side('砸碎万面镜', 'break_check', { skillCheck: { skill: '力量', aggregate: 'all' } }),
                side('冲上舞台', 'stage_approach'),
                back('回到后台中心', 'backstage')
            ]
        },
        stage_approach: {
            narrative: P.stage_approach,
            choices: [
                side('冲上舞台', 'stage'),
                side('绕到后台', 'backstage', { requiresFlag: 'carnival_intel' }),
                side('站在聚光灯下感受审视与后台绳颤', 'stage_spotlight'),
                side('扫视蜡观众席票根与椅下积油', 'stage_audience_wax')
            ]
        },
        stage_spotlight: {
            narrative: P.stage_spotlight,
            choices: [
                side('冲上舞台', 'stage'),
                back('退回舞台光暗交界', 'stage_approach')
            ]
        },
        stage_audience_wax: {
            narrative: P.stage_audience_wax,
            choices: [
                side('冲上舞台', 'stage'),
                back('退回舞台光暗交界', 'stage_approach')
            ]
        },
        stage: {
            narrative: P.stage,
            choices: [
                side('砸碎万面镜', 'break_check', {
                    skillCheck: { skill: '力量', aggregate: 'all' },
                    requiresFlag: 'carnival_intel'
                }),
                side('近看台上少年融合缝线与彩带连线', 'stage_missing_youth'),
                side('撤出舞台，回游艺区调查', 'midway')
            ]
        },
        stage_missing_youth: {
            narrative: P.stage_missing_youth,
            choices: [
                side('砸碎万面镜', 'break_check', {
                    skillCheck: { skill: '力量', aggregate: 'all' },
                    requiresFlag: 'carnival_intel'
                }),
                side('撤出舞台，回游艺区调查', 'midway'),
                back('退回舞台中心', 'stage')
            ]
        },
        break_check: {
            narrative: P.break_check,
            groupOutcome: {
                allSuccess: P.break_allSuccess,
                allFailure: P.break_allFailure,
                mixed: P.break_mixed
            },
            branch: { success: 'ending_win', failure: 'ending_partial' }
        },
        ending_win: {
            narrative: P.ending_win,
            effects: { journal: '摧毁万面镜，救出失踪少年。', enchantmentId: 'elder_sign' },
            end: true
        },
        ending_partial: {
            narrative: P.ending_partial,
            effects: { sanCheck: '1/1D6' },
            end: true
        },
        ending_join: {
            narrative: P.ending_join,
            effects: { sanCheck: '1D4/1D10', dispel: true },
            end: true
        }
    }
};
