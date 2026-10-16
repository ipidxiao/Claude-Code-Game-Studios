/**
 * Original mini-scenario — lighthouse mystery (not Chaosium IP).
 * Prose bank: ./lighthouse_signal/index_prose.mjs (≥100k CJK Han).
 */
import { LIGHTHOUSE_PROSE as P } from './lighthouse_signal/index_prose.mjs';

function side(label, next) {
    return { id: next, label, next };
}

function back(label, next) {
    return { id: `back_${next}`, label, next };
}

export const CoCScenarioLighthouseSignal = {
    id: 'lighthouse_signal',
    title: '灯塔信号',
    subtitle: '风暴角的三长两短',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['灯塔', '1920s', '海洋', '孤立', '长篇', '证据分叉'],
    description:
        '风暴角灯塔三周未回应海岸警卫队呼叫。最后一封电报只有摩尔斯码：三长两短，重复七次。你乘补给船登岛调查，沿崖径、守塔小屋与螺旋灯室追查深海信号。',
    era: '1920s',
    estimatedMinutes: 90,
    lorebook: [
        {
            "id": "lighthouse_signal_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "lighthouse_signal"
            ],
            "content": "「灯塔信号」：保持1920s克苏鲁调查/恐怖基调。风暴角灯塔三周未回应海岸警卫队呼叫。最后一封电报只有摩尔斯码：三长两短，重复七次。你乘补给船登岛调查，沿崖径、守塔小屋与螺旋灯室追查深海信号。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "lighthouse_signal_start",
            "title": "风暴角·登陆点",
            "keys": [
                "风暴角·登陆点",
                "风暴角",
                "灯塔信号"
            ],
            "locations": [
                "风暴角"
            ],
            "priority": 12,
            "scenarioIds": [
                "lighthouse_signal"
            ],
            "content": "开场地点「风暴角·登陆点」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "lighthouse_signal_room_0",
            "title": "登陆点",
            "keys": [
                "登陆点"
            ],
            "locations": [
                "登陆点"
            ],
            "priority": 8,
            "scenarioIds": [
                "lighthouse_signal"
            ],
            "content": "场景「登陆点」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "lighthouse_signal_room_1",
            "title": "背风海滩",
            "keys": [
                "背风海滩"
            ],
            "locations": [
                "背风海滩"
            ],
            "priority": 7,
            "scenarioIds": [
                "lighthouse_signal"
            ],
            "content": "场景「背风海滩」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "lighthouse_signal_room_2",
            "title": "崖顶小径",
            "keys": [
                "崖顶小径"
            ],
            "locations": [
                "崖顶小径"
            ],
            "priority": 6,
            "scenarioIds": [
                "lighthouse_signal"
            ],
            "content": "场景「崖顶小径」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "lighthouse_signal_room_3",
            "title": "崖壁外侧",
            "keys": [
                "崖壁外侧"
            ],
            "locations": [
                "崖壁外侧"
            ],
            "priority": 5,
            "scenarioIds": [
                "lighthouse_signal"
            ],
            "content": "场景「崖壁外侧」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "lighthouse_signal_room_4",
            "title": "守塔人小屋",
            "keys": [
                "守塔人小屋"
            ],
            "locations": [
                "守塔人小屋"
            ],
            "priority": 5,
            "scenarioIds": [
                "lighthouse_signal"
            ],
            "content": "场景「守塔人小屋」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "lighthouse_signal_room_5",
            "title": "灯塔底部",
            "keys": [
                "灯塔底部"
            ],
            "locations": [
                "灯塔底部"
            ],
            "priority": 5,
            "scenarioIds": [
                "lighthouse_signal"
            ],
            "content": "场景「灯塔底部」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "lighthouse_signal_mythos",
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
                "lighthouse_signal"
            ],
            "content": "神话目击/理智损失走 reality_check 等工具；叙事可暗示不可名状，禁止规则外直接改属性。"
        },
        {
            "id": "lighthouse_signal_invest",
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
                "lighthouse_signal"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        },
        {
            "id": "lighthouse_signal_space",
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
                "lighthouse_signal"
            ],
            "content": "空间压迫感服务悬疑：出口受限、信息不全。战斗/环境伤害须走工具；保持玩家有至少一条可推进的调查口。"
        }
    ],
    startNode: 'landing',
    initialLocation: '风暴角·登陆点',
    setup: {
        location: '风暴角·登陆点',
        atmosphere: { level: 'calm', note: '咸风与浪涌' },
        map: {
            title: '风暴角灯塔',
            rooms: [
                { id: 'landing', name: '登陆点', connections: ['path', 'beach'] },
                { id: 'beach', name: '背风海滩', connections: ['landing'] },
                { id: 'path', name: '崖顶小径', connections: ['landing', 'lighthouse', 'cottage', 'cliffs'] },
                { id: 'cliffs', name: '崖壁外侧', connections: ['path'] },
                { id: 'cottage', name: '守塔人小屋', connections: ['path'] },
                { id: 'lighthouse', name: '灯塔底部', connections: ['path', 'top'] },
                { id: 'top', name: '灯室', connections: ['lighthouse'] }
            ],
            currentRoomId: 'landing'
        },
        journal: '调查风暴角灯塔失联与异常摩尔斯信号。'
    },
    nodes: {
        landing: {
            narrative: P.landing,
            choices: [
                side('先沿湿滑崖顶小径上行，直奔灯塔底部', 'path_approach'),
                side('先查守塔人小屋，寻找日志与制服线索', 'cottage'),
                side('先检查背风海滩漂物与退潮痕迹', 'beach'),
                side('先逐箱清点登陆点补给箱与封条状态', 'supply_crates'),
                side('先查雾号棚与剪断电源线及警示说明', 'foghorn_shed'),
                side('先驻足听登陆点雨声与箱面回响', 'landing_rain')
            ]
        },
        landing_rain: {
            narrative: P.landing_rain,
            choices: [
                side('先沿崖顶小径上行，留意塔顶机械声', 'path_approach'),
                side('先查守塔人小屋，寻找墙上摩尔斯注释', 'cottage'),
                back('先回到登陆礁盘中心，保持警惕继续行动', 'landing')
            ]
        },
        beach: {
            narrative: P.beach,
            effects: { location: '背风海滩', mapRoom: 'beach' },
            choices: [
                side('先查崖下船屋空架、断缆与磷绿灯', 'boat_house'),
                side('先沿崖径返回登陆点，保持警惕', 'landing'),
                side('先沿湿滑崖顶小径上行，直奔灯塔底部', 'path_approach')
            ]
        },
        supply_crates: {
            narrative: P.supply_crates,
            choices: [
                side('先沿湿印方向追踪至崖顶盐壳小径', 'path_approach'),
                side('先查守塔人小屋，核对失踪记录', 'cottage'),
                back('先回到登陆点中心，保持警惕继续行动', 'landing')
            ]
        },
        foghorn_shed: {
            narrative: P.foghorn_shed,
            choices: [
                side('先沿崖顶小径上行，留意周围动静', 'path_approach'),
                side('先查守塔人小屋，细读摩尔斯注释', 'cottage'),
                back('先退回登陆点，保持警惕继续行动', 'landing')
            ]
        },
        boat_house: {
            narrative: P.boat_house,
            choices: [
                side('先查救生艇登记与海岸警卫记录', 'rescue_boat'),
                side('先沿崖顶盐径上行，进入灯塔铁门区域', 'path_approach'),
                back('先回到背风海滩，保持警惕继续行动', 'beach')
            ]
        },
        rescue_boat: {
            narrative: P.rescue_boat,
            choices: [
                side('先沿崖顶小径上行，决心进入灯塔', 'path_approach'),
                back('先退回船屋，保持警惕继续行动', 'boat_house')
            ]
        },
        path_approach: {
            narrative: P.path_approach,
            effects: { location: '崖顶小径', mapRoom: 'path' },
            choices: [
                side('先继续沿小径上行，进入灯塔铁门', 'path'),
                side('先折返小屋，细读墙上摩尔斯注释', 'cottage'),
                side('先贴崖壁外侧查看凿痕、暗洞与垂海链', 'cliffs'),
                side('先停驻高台观察海象与涌浪异常', 'storm_watch'),
                side('先穿行浓雾段，留意塔影与磷光', 'path_fog')
            ]
        },
        storm_watch: {
            narrative: P.storm_watch,
            choices: [
                side('先沿盐壳小径进入灯塔铁门岔口处', 'path'),
                side('先折返守塔人小屋，查阅守塔日志', 'cottage'),
                back('先退回小径起点，保持警惕继续行动', 'path_approach')
            ]
        },
        path_fog: {
            narrative: P.path_fog,
            choices: [
                side('先速入灯塔铁门，避免在雾中久留', 'path'),
                back('先退回小径较清晰段，保持警惕继续继续', 'path_approach')
            ]
        },
        cliffs: {
            narrative: P.cliffs,
            effects: { location: '崖壁外侧', mapRoom: 'cliffs' },
            choices: [
                side('先停驻风口，分辨风敲与摩尔斯节拍', 'cliff_wind'),
                side('先下看潮池中的齿轮残片与盐晶', 'cliff_tide_pool'),
                back('先退回崖顶小径，保持警惕继续行动', 'path_approach')
            ]
        },
        cliff_wind: {
            narrative: P.cliff_wind,
            choices: [
                side('先沿盐壳小径进入灯塔铁门区域', 'path'),
                side('先下崖查船屋断缆、空架与磷绿灯', 'boat_house'),
                back('先退回崖壁外侧，保持警惕继续行动', 'cliffs')
            ]
        },
        cliff_tide_pool: {
            narrative: P.cliff_tide_pool,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先沿盐壳小径上行，进入灯塔底部大厅', 'path'),
                back('先退回崖壁，保持警惕继续行动', 'cliffs')
            ]
        },
        cottage: {
            narrative: P.cottage,
            effects: {
                location: '守塔人小屋',
                mapRoom: 'cottage',
                clues: [
                    {
                        id: 'lh_morse',
                        title: '摩尔斯注释',
                        content: '"三长两短"不要应答——被圈红。',
                        type: 'document'
                    }
                ]
            },
            choices: [
                side('先翻开桌上守塔日志，核对失踪记录', 'keeper_log'),
                side('先专读墙上摩尔斯注释与红圈组合', 'morse_wall'),
                side('先查书架上的海岸日志与气象簿', 'logbook_shelf'),
                side('先进入里间卧室，查看盐渍与绳结', 'keeper_bedroom'),
                side('先查看墙钉合影、空白相框与盐雾', 'keeper_photo'),
                side('先查衣柜制服空位、抓痕与袖口盐晶', 'keeper_uniform_closet'),
                side('先查厨房灶膛、盐蜡混合物与深刀痕', 'cottage_kitchen'),
                side('先收好线索后沿盐壳小径前往灯塔底部', 'path_approach')
            ]
        },
        morse_wall: {
            narrative: P.morse_wall,
            choices: [
                side('先翻开守塔日志，核对短音警告', 'keeper_log'),
                side('先沿盐壳小径上行，进入灯塔底部大厅', 'path_approach'),
                back('先回到小屋主室，保持警惕继续行动', 'cottage')
            ]
        },
        logbook_shelf: {
            narrative: P.logbook_shelf,
            choices: [
                side('先翻开守塔日志，核对灯油消耗异常', 'keeper_log'),
                side('先专读日志中段「邀请非求救」一页', 'keeper_log_page2'),
                back('先回到小屋主室，保持警惕继续行动', 'cottage')
            ]
        },
        keeper_bedroom: {
            narrative: P.keeper_bedroom,
            choices: [
                side('先查衣柜制服、第三空位抓痕与盐晶', 'keeper_uniform_closet'),
                side('先回主室翻阅桌上守塔日志与线索', 'keeper_log'),
                back('先回到小屋主室，保持警惕继续行动', 'cottage')
            ]
        },
        keeper_photo: {
            narrative: P.keeper_photo,
            choices: [
                side('先翻开守塔日志，核对第三守塔人', 'keeper_log'),
                side('先沿盐壳小径上行，进入灯塔底部大厅', 'path_approach'),
                back('先回到小屋主室，保持警惕继续行动', 'cottage')
            ]
        },
        keeper_uniform_closet: {
            narrative: P.keeper_uniform_closet,
            choices: [
                side('先沿小径上行，搜查储油室拖拽痕', 'path'),
                side('先回主室翻阅桌上守塔日志与线索', 'keeper_log'),
                back('先回到小屋主室，保持警惕继续行动', 'cottage')
            ]
        },
        cottage_kitchen: {
            narrative: P.cottage_kitchen,
            choices: [
                side('先回主室翻阅桌上守塔日志与线索', 'keeper_log'),
                side('先沿盐壳小径上行，进入灯塔底部大厅', 'path_approach'),
                back('先回到小屋主室，保持警惕继续行动', 'cottage')
            ]
        },
        keeper_log: {
            checkpoint: '守塔日志：灯室「应答」与失踪守塔人',
            narrative: P.keeper_log,
            effects: {
                clues: [
                    {
                        id: 'lh_log',
                        title: '守塔日志',
                        content: '灯室有"应答"；两名守塔人失踪。',
                        type: 'document',
                        quality: 'solid'
                    }
                ],
                sanCheck: '0/1',
                journal: '灯室存在某种"应答"。',
                flags: { lh_intel: true }
            },
            choices: [
                side('先专读日志中段第二人发报一页', 'keeper_log_page2'),
                side('先带上日志线索，沿小径进入灯塔', 'path'),
                side('先查灯塔年表与1924换镜记录', 'signal_history'),
                back('先回到小屋主室，保持警惕继续行动', 'cottage')
            ]
        },
        keeper_log_page2: {
            narrative: P.keeper_log_page2,
            effects: { flags: { lh_intel: true } },
            choices: [
                side('先沿盐壳小径进入灯塔铁门岔口处', 'path'),
                side('先回主室核对墙上摩尔斯注释与铅片', 'morse_wall'),
                back('先合日志回到主室，保持警惕继续行动', 'cottage')
            ]
        },
        signal_history: {
            narrative: P.signal_history,
            choices: [
                side('先沿盐壳小径进入灯塔，查透镜异变', 'path'),
                side('先回主室翻阅桌上守塔日志与线索末页', 'keeper_log'),
                back('先回到小屋主室，保持警惕继续行动', 'cottage')
            ]
        },
        path: {
            narrative: P.path,
            effects: { location: '崖顶小径', mapRoom: 'path' },
            choices: [
                side('先沿主楼梯进入灯塔底部齿轮大厅', 'lighthouse'),
                side('先轻触塔身铜铃，确认勿敲警告牌', 'tower_bell'),
                {
                    id: 'down',
                    label: '先下台阶搜查储油室与拖拽痕迹',
                    next: 'oil_check',
                    skillCheck: { skill: '侦查' }
                }
            ]
        },
        tower_bell: {
            narrative: P.tower_bell,
            choices: [
                side('先沿主楼梯进入灯塔底部齿轮大厅', 'lighthouse'),
                side('先下台阶搜查储油室拖拽痕与盐纹与盐纹', 'oil_check'),
                back('先退回铁门岔口，保持警惕继续行动', 'path')
            ]
        },
        oil_check: {
            narrative: P.oil_check,
            groupOutcome: {
                allSuccess: P.oil_allSuccess,
                allFailure: P.oil_allFailure,
                mixed: P.oil_mixed
            },
            branch: { success: 'oil_ok', failure: 'oil_fail' }
        },
        oil_drum: {
            narrative: P.oil_drum,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先沿主楼梯上行，进入灯塔底部大厅大厅', 'lighthouse'),
                back('先退回储油室入口，保持警惕继续行动', 'oil_check')
            ]
        },
        oil_fail: {
            narrative: P.oil_fail,
            choices: [
                side('先退回小屋重读守塔日志，留意周围动静', 'cottage'),
                side('先近观晃动油桶，分辨桶内异声', 'oil_drum'),
                side('先咬牙沿主楼梯进入灯塔底部大厅大厅', 'lighthouse')
            ]
        },
        oil_ok: {
            narrative: P.oil_ok,
            effects: {
                clues: [
                    {
                        id: 'lh_uniform',
                        title: '守塔人制服',
                        content: '胸口盐结晶触手纹——非自然形成。',
                        type: 'physical',
                        quality: 'solid'
                    }
                ],
                sanCheck: '0/1',
                flags: { lh_intel: true }
            },
            choices: [
                side('先握紧制服证据，进入灯塔底部大厅', 'lighthouse'),
                side('先近观另一口晃动油桶的刮擦声', 'oil_drum')
            ]
        },
        lighthouse: {
            narrative: P.lighthouse,
            effects: { location: '灯塔底部', mapRoom: 'lighthouse' },
            choices: [
                side('先拔掉电报机电源，强行掐断循环信号', 'stop_telegraph'),
                side('先细查电报机纸带与波浪齿钥匙', 'telegraph_detail'),
                side('先进入侧室无线电桌，试听耳机循环', 'radio_room'),
                side('先查工具间撬棍与碎玻璃失败痕', 'gear_room'),
                side('先查煤灯室跪痕与三长两短粉笔', 'coal_lamp_room'),
                side('先查墙挂年表与1924换镜旧照', 'signal_history'),
                side('先在大厅角落查摩尔斯练习键与血指印', 'morse_practice'),
                {
                    id: 'top',
                    label: '先凭日志与制服线索登上灯室，留意周围动静',
                    next: 'top_approach',
                    requiresFlag: 'lh_intel'
                }
            ]
        },
        telegraph_detail: {
            narrative: P.telegraph_detail,
            choices: [
                side('先拔掉电报机电源，强行掐断信号', 'stop_telegraph'),
                side('先沿螺旋旋梯上行，抵灯室重门前', 'top_approach'),
                back('先回到大厅中心，保持警惕继续行动', 'lighthouse')
            ]
        },
        radio_room: {
            narrative: P.radio_room,
            choices: [
                side('先回大厅拔掉电报机电源与纸带与纸带', 'stop_telegraph'),
                side('先沿螺旋旋梯上行，抵灯室重门前', 'top_approach'),
                back('先回到大厅中心，保持警惕继续行动', 'lighthouse')
            ]
        },
        gear_room: {
            narrative: P.gear_room,
            choices: [
                side('先沿旋梯上行，携带工具抵灯室', 'spiral_stairs'),
                side('先凭日志线索直接抵灯室重门前', 'top_approach'),
                back('先回到大厅中心，保持警惕继续行动', 'lighthouse')
            ]
        },
        coal_lamp_room: {
            narrative: P.coal_lamp_room,
            choices: [
                side('先下台阶再查储油室拖拽痕与桶声与桶声', 'oil_check'),
                side('先回大厅查电报机、纸带与自动循环', 'lighthouse'),
                back('先回到大厅中心，保持警惕继续行动', 'lighthouse')
            ]
        },
        morse_practice: {
            narrative: P.morse_practice,
            choices: [
                side('先沿螺旋旋梯上行，抵灯室重门前', 'top_approach'),
                side('先拔掉电报机电源，强行掐断信号', 'stop_telegraph'),
                back('先回到大厅中心，保持警惕继续行动', 'lighthouse')
            ]
        },
        stop_telegraph: {
            narrative: P.stop_telegraph,
            effects: { sanCheck: '1/1D6', journal: '切断信号激怒了灯室中的存在。' },
            choices: [
                {
                    id: 't',
                    label: '先趁尖啸未歇沿旋梯冲上灯室，保持警惕',
                    next: 'top_approach',
                    requiresFlag: 'lh_intel'
                },
                side('先沿旋梯中段细听颅骨摩尔斯低语', 'spiral_whisper')
            ]
        },
        top_approach: {
            narrative: P.top_approach,
            effects: { location: '灯室门前', mapRoom: 'top' },
            choices: [
                side('先沿旋梯细查编号乱序与渗盐阶缝', 'spiral_stairs'),
                side('先查灯架维护廊的无电磷绿灯泡', 'lamp_gallery'),
                side('先推开灯室重门，直面异变守塔人', 'top')
            ]
        },
        spiral_stairs: {
            narrative: P.spiral_stairs,
            choices: [
                side('先停驻中段，分辨颅骨摩尔斯低语', 'spiral_whisper'),
                side('先查灯架维护廊备用镜片箱与磷光与磷光', 'lamp_gallery'),
                side('先推开灯室重门，直面深海透镜', 'top'),
                back('先退回灯室门前，保持警惕继续行动', 'top_approach')
            ]
        },
        spiral_whisper: {
            narrative: P.spiral_whisper,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先错拍节拍继续上行，抵灯室重门', 'top_approach'),
                side('先推开灯室重门，直面异变守塔人', 'top'),
                back('先退回旋梯下段，保持警惕继续行动', 'spiral_stairs')
            ]
        },
        lamp_gallery: {
            narrative: P.lamp_gallery,
            choices: [
                side('先近观透镜框架与非人短划螺栓', 'lens_detail'),
                side('先查备用镜片箱裂缘生长纹与倒影', 'beacon_glass'),
                side('先推开灯室重门，进入透镜对峙', 'top'),
                back('先退回旋梯，保持警惕继续行动', 'spiral_stairs')
            ]
        },
        lens_detail: {
            narrative: P.lens_detail,
            effects: { sanCheck: '0/1' },
            choices: [
                side('先推开灯室重门，直面三名守塔人', 'top'),
                back('先退回灯架廊，保持警惕继续行动', 'lamp_gallery')
            ]
        },
        beacon_glass: {
            narrative: P.beacon_glass,
            choices: [
                side('先推开灯室重门，进入透镜对峙', 'top'),
                back('先退回灯架廊，保持警惕继续行动', 'lamp_gallery')
            ]
        },
        top: {
            checkpoint: '灯室对峙：深海信号与守塔人异变',
            narrative: P.top,
            effects: {
                location: '灯室',
                mapRoom: 'top',
                sanCheck: '1/1D6',
                atmosphere: { level: 'dread', note: '深海信号' },
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'lh_keeper_down',
                    onLose: 'lh_keeper_press'
                }
            },
            choices: [
                side('先查塔顶雾号与灯室的联动振动', 'fog_signal'),
                {
                    id: 'destroy',
                    label: '先合力砸毁透镜，截断深海信号，留意周围动静',
                    next: 'destroy_check',
                    skillCheck: { skill: '力量', aggregate: 'all' },
                    requiresFlag: 'lh_intel',
                    requiresClueQuality: 'solid'
                },
                {
                    id: 'respond',
                    label: '先以摩尔斯键向信号应答，留意周围动静',
                    next: 'ending_respond'
                },
                {
                    id: 'flee',
                    label: '先锁上灯室门沿旋梯逃跑，留意周围动静',
                    next: 'ending_flee'
                }
            ]
        },
        fog_signal: {
            narrative: P.fog_signal,
            effects: { sanCheck: '0/1' },
            choices: [
                {
                    id: 'destroy2',
                    label: '先合力砸毁透镜，截断深海信号与雾墙',
                    next: 'destroy_check',
                    skillCheck: { skill: '力量', aggregate: 'all' }
                },
                {
                    id: 'flee2',
                    label: '先锁上灯室门沿旋梯逃向崖下小船',
                    next: 'ending_flee'
                },
                back('先退回灯室中心，保持警惕继续行动', 'top')
            ]
        },
        destroy_check: {
            narrative: P.destroy_check,
            groupOutcome: {
                allSuccess: P.destroy_allSuccess,
                allFailure: P.destroy_allFailure,
                mixed: P.destroy_mixed
            },
            branch: { success: 'ending_win', failure: 'ending_wounded' }
        },
        ending_win: {
            narrative: P.ending_win,
            effects: { journal: '摧毁透镜，终止深海信号。', enchantmentId: 'elder_sign' },
            end: true
        },
        ending_wounded: {
            narrative: P.ending_wounded,
            effects: { sanCheck: '1/1D8' },
            end: true
        },
        ending_respond: {
            narrative: P.ending_respond,
            effects: { sanCheck: '1D4/1D10', dispel: true },
            end: true
        },
        ending_flee: {
            narrative: P.ending_flee,
            end: true
        }
    }
};
