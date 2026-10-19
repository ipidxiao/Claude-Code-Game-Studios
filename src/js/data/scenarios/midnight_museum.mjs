/** Original mini-scenario — museum heist / occult exhibit (not Chaosium IP).
 *
 * Narrative / check contract (thin module — no 100k prose bank):
 * - Node.narrative = scene setup only (no 检定成功/失败 spoilers).
 * - Choice.skillCheck.next → branch node with groupOutcome + branch.success/failure.
 * - After the roll, KP shows groupOutcome then lands on success/failure node prose.
 * - Choice labels name the action only (no 「下定决心 / 保持警惕」 filler).
 */
export const CoCScenarioMidnightMuseum = {
    id: 'midnight_museum',
    title: '午夜博物馆',
    subtitle: '失窃的古埃及面具',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['博物馆', '1920s', '盗窃', '古埃及', '证据分叉', '战役账本', '战后余波'],
    description: '大都会自然史博物馆新展「法老之夜」开幕前夜，核心展品「奈布-卡面具」被盗。馆长雇你在闭馆后潜入调查。',
    era: '1920s',
    estimatedMinutes: 35,
    lorebook: [
        {
            "id": "midnight_museum_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "midnight_museum"
            ],
            "content": "「午夜博物馆」：保持1920s克苏鲁调查/恐怖基调。大都会自然史博物馆新展「法老之夜」开幕前夜，核心展品「奈布-卡面具」被盗。馆长雇你在闭馆后潜入调查。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "midnight_museum_start",
            "title": "博物馆·屋顶",
            "keys": [
                "博物馆·屋顶",
                "博物馆",
                "午夜博物馆"
            ],
            "locations": [
                "博物馆"
            ],
            "priority": 12,
            "scenarioIds": [
                "midnight_museum"
            ],
            "content": "开场地点「博物馆·屋顶」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "midnight_museum_room_0",
            "title": "屋顶",
            "keys": [
                "屋顶"
            ],
            "locations": [
                "屋顶"
            ],
            "priority": 8,
            "scenarioIds": [
                "midnight_museum"
            ],
            "content": "场景「屋顶」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "midnight_museum_room_1",
            "title": "主展厅",
            "keys": [
                "主展厅"
            ],
            "locations": [
                "主展厅"
            ],
            "priority": 7,
            "scenarioIds": [
                "midnight_museum"
            ],
            "content": "场景「主展厅」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "midnight_museum_room_2",
            "title": "埃及厅",
            "keys": [
                "埃及厅"
            ],
            "locations": [
                "埃及厅"
            ],
            "priority": 6,
            "scenarioIds": [
                "midnight_museum"
            ],
            "content": "场景「埃及厅」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "midnight_museum_room_3",
            "title": "保险库",
            "keys": [
                "保险库"
            ],
            "locations": [
                "保险库"
            ],
            "priority": 5,
            "scenarioIds": [
                "midnight_museum"
            ],
            "content": "场景「保险库」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "midnight_museum_room_4",
            "title": "馆长办公室",
            "keys": [
                "馆长办公室"
            ],
            "locations": [
                "馆长办公室"
            ],
            "priority": 5,
            "scenarioIds": [
                "midnight_museum"
            ],
            "content": "场景「馆长办公室」：给出可交互线索或 NPC 接触点；发现物证用 add_clue，勿一次倾倒全案真相。"
        },
        {
            "id": "midnight_museum_mythos",
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
                "midnight_museum"
            ],
            "content": "神话目击/理智损失走 reality_check 等工具；叙事可暗示不可名状，禁止规则外直接改属性。"
        },
        {
            "id": "midnight_museum_invest",
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
                "midnight_museum"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        },
        {
            "id": "midnight_museum_space",
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
                "midnight_museum"
            ],
            "content": "空间压迫感服务悬疑：出口受限、信息不全。战斗/环境伤害须走工具；保持玩家有至少一条可推进的调查口。"
        }
    ],
    readsArcLedger: true,
    startNode: 'roof',
    initialLocation: '博物馆·屋顶',
    setup: {
        location: '博物馆·屋顶',
        atmosphere: { level: 'calm', note: '城市灯火与月光' },
        map: {
            title: '大都会自然史博物馆',
            rooms: [
                { id: 'roof', name: '屋顶', connections: ['hall'] },
                { id: 'hall', name: '主展厅', connections: ['roof', 'egypt', 'office'] },
                { id: 'egypt', name: '埃及厅', connections: ['hall', 'vault'] },
                { id: 'vault', name: '保险库', connections: ['egypt'] },
                { id: 'office', name: '馆长办公室', connections: ['hall'] }
            ],
            currentRoomId: 'roof'
        },
        journal: '委托：找回奈布-卡面具，查明内鬼。报酬丰厚。'
    },
    nodes: {
        roof: {
            narrative: '大都会自然史博物馆在午夜像一座被掏空的巨兽。你沿天窗绳降入内——馆长远程关闭了警报一小时，并坚持「别惊动保安」。主展厅深处，埃及厅方向有手电光在展品间晃动；不止你一人醒着，而奈布-卡面具的展柜此刻应当正空着。城市灯火从穹顶玻璃投下冷色，恐龙骨架的颚骨在月光下像一柄缓缓张开的剪，等待剪断任何多余的脚步声。',
            choices: [
                { id: 'stealth', label: '贴着展柜阴影潜入主展厅深处寻找路径', next: 'hall_sneak', skillCheck: { skill: '潜行' } },
                { id: 'direct', label: '不经主展厅直接赶往埃及厅查看展柜', next: 'egypt_approach' }
            ]
        },
        egypt_approach: {
            narrative: '你贴着二楼栏杆横切主展厅外圈，恐龙骨架的颚骨在月光下像一柄缓缓张开的剪。埃及厅侧门虚掩，焚香味与干燥沙粒的气味从门缝渗出——里面有人低声说话，节奏整齐，不像闲聊，更像背诵。大理石地面映出你们的鞋底，脚步声因此像有另一队人在头顶镜像行走；侧门把手上沾着新鲜沙粒，像有人刚抱着某件沉重的东西从这里通过。',
            choices: [
                { id: 'in', label: '推开侧门进入埃及厅查看展柜情况', next: 'egypt' },
                { id: 'hall', label: '先经主展厅摸清保安巡逻的具体位置', next: 'hall' }
            ]
        },
        hall_sneak: {
            narrative: '主展厅里恐龙骨架投下的阴影像一座移动的墓园。你们贴着展柜底部潜行，皮鞋与大理石之间只隔着一层布——任何多余的呼吸声都可能惊动那束在埃及厅方向晃动的手电光。展柜玻璃映出你们的剪影，与骨架重叠，像三具尸体在同时移动；空调低鸣像巨兽呼吸，把夜间的博物馆变成一座缓慢收缩的肺。',
            groupOutcome: {
                allSuccess: '你们如影子般贴着展柜底部穿过主展厅，恐龙骨架的阴影像移动的墓园从头顶掠过——手电光在埃及厅方向晃动，却始终没有锁定你们的脚步。保安的皮鞋声在远处规律巡逻，与你们的路线错开半拍；埃及厅侧门的焚香味因此变得更浓，像终点已在前方呼吸。',
                allFailure: '保安的手电光猛地扫过展柜，你们几乎同时暴露；展厅里空气瞬间凝固，只能硬冲进埃及厅方向，或被迫绕远路重新潜入。玻璃上的倒影出卖了最后一瞬的慌乱，而警报虽仍关闭，保安的无线电里已传来含糊的询问声，时间因此变得更紧。',
                mixed: '一人踩碎玻璃发出轻响，另一人及时拽住同伴闪入阴影——保安的视线在你们刚才的位置停留片刻，终究未能锁定。碎玻璃在靴底发出细微的咯吱声，却已被空调轰鸣盖住；你们因此失去最佳路线，却仍比完全暴露多了一线机会。'
            },
            branch: { success: 'hall', failure: 'hall_spotted' }
        },
        hall_spotted: {
            narrative: '手电光猛地扫过你的脸。保安转身，你下意识绷紧肌肉——他却压低声音：「别动，我是市警。」便衣警察的徽章在月光下闪了一下，「面具还在馆内，窃贼没跑远。你们若不想背锅，最好跟我合作。」他的目光扫向埃及厅，焚香味与沙粒的气息从那个方向涌来，像某种仪式正在闭馆后的黑暗里继续排练。',
            effects: {
                clues: [{ id: 'mus_cop', title: '便衣警察', content: '警方已介入，面具仍在馆内。', type: 'testimony' }]
            },
            choices: [{ id: 'team', label: '答应与便衣警察联手继续馆内调查', next: 'hall' }]
        },
        hall: {
            narrative: '主展厅中央，恐龙骨架投下巨大的阴影，把你们吞没其中。埃及厅入口被警戒线拦住，但侧门已被撬开——门轴歪斜，门缝里飘出焚香味与干燥沙粒混合的古怪气味。馆长办公室的门也亮着一线灯光，像另一只尚未闭合的眼睛；两处光亮在黑暗里形成三角，而奈布-卡面具应当就在这个三角的某一点上。',
            effects: { location: '主展厅', mapRoom: 'hall' },
            choices: [
                { id: 'egypt', label: '推开侧门进入埃及厅查看展柜情况', next: 'egypt' },
                { id: 'office', label: '转入馆长办公室搜查走私相关证据', next: 'office' }
            ]
        },
        office: {
            narrative: '馆长办公室的保险柜半开着，像一张被迫张开的嘴。里面没有面具，只有一叠走私清单——馆长的签名在每一页底部，墨迹新鲜，仿佛他刚刚还在这里清点赃物。桌上摊着埃及厅的平面图，保险库位置被红笔圈出，旁边写着「仪式窗口：闭馆后一小时」；窗外主展厅的恐龙骨架在月光下沉默矗立，像一位早已知情却不肯开口的证人。',
            effects: {
                location: '馆长办公室',
                mapRoom: 'office',
                clues: [{ id: 'mus_smuggle', title: '走私清单', content: '馆长参与文物走私；面具可能是掩护。', type: 'document' }]
            },
            choices: [
                { id: 'confront', label: '持走私清单当场对质馆长追问去向', next: 'confront', skillCheck: { skill: '说服' } },
                { id: 'egypt2', label: '暂不对质先返回埃及厅继续追查', next: 'egypt' }
            ]
        },
        confront: {
            narrative: '馆长坐在办公桌后，指节敲着桌面，节奏紊乱。你把走私清单推到他面前——他的脸色在台灯光下迅速褪成惨白，额角渗出细汗，嘴唇翕动却发不出完整的句子。窗外埃及厅方向传来低沉吟诵，像沙粒在齿间摩擦，每七句便有一次停顿；台灯光把他的影子拉得极长，投在走私清单上，像另一份尚未签名的认罪书。',
            groupOutcome: {
                allSuccess: '馆长在你们一致逼问下心理防线崩溃，声音发颤地承认：面具仍在保险库，而他的合伙人已背叛他——保险库钥匙在台灯光下像一枚烫手的证物。保安手电光柱在远处晃动，像钟摆一样规律，提醒你们时间仍被人类制度计量；展柜里的文物沉默，却比任何解说牌都更擅长让人产生被注视的错觉。',
                allFailure: '馆长拍桌否认，手悄悄摸向抽屉——便衣警察立刻上前一步，办公室里的空气一触即发，你们只能改从侧门或埃及厅另寻突破口。抽屉里枪柄的冷光一闪即逝，而埃及厅的吟诵已拔高半个音阶，像仪式不再等待人类的谈判结果。',
                mixed: '一人的施压没能击穿对方防线，但另一人把走私清单拍在桌上时，馆长脸色瞬间惨白，嘴唇开始不受控制地发抖。展厅射灯把展品切成明暗两半，标签上的年份在玻璃反光里显得不可信；钥匙虽未到手，馆长的眼神却已出卖保险库方向。'
            },
            branch: { success: 'confront_ok', failure: 'confront_fail' }
        },
        confront_ok: {
            narrative: '「面具在保险库！」馆长声音发颤，像被掐住喉咙，「我的合伙人背叛了我——他要用它举行仪式！」他抖着手把保险库钥匙拍在桌上，金属撞击声在安静的办公室里格外刺耳。钥匙齿痕磨损严重，像被反复匆忙使用过；他目光躲向埃及厅，仿佛那里有什么东西正透过墙壁回望，催促你们快点做出选择。',
            effects: {
                items: [{ name: '保险库钥匙', qty: 1 }],
                journal: '面具在保险库，有仪式阴谋。'
            },
            choices: [{ id: 'vault', label: '用钥匙径直前往保险库门口并开门', next: 'vault' }]
        },
        confront_fail: {
            narrative: '馆长猛地拉开抽屉——枪柄的冷光一闪。便衣警察从侧翼扑上，将他按倒在满地散落的文件里。保险库方向却在这时传来低沉的吟诵，像沙粒在齿间摩擦，节奏正越来越快；文件上的馆长签名与走私清单重叠，像一张早已写好的命运契约，而你们必须在下一音节落下前冲向埃及厅。',
            choices: [{ id: 'v', label: '顾不得钥匙先冲向保险库门口查看', next: 'vault_rush' }]
        },
        egypt: {
            narrative: '埃及厅里，奈布-卡面具的展柜空了一格，玻璃内侧留着指印。地面撒着新鲜沙粒，脚印通向一面与墙融为一体的保险库门——门缝渗出焚香味，混着某种更古老、更干燥的尘土气息。吟诵声从门后传来，比刚才更清晰，每七句便有一次停顿，像呼吸；展柜标签仍写着面具的名字，而格子里只剩一圈灰尘，形状恰好是一张人脸。',
            checkpoint: '埃及厅：空展柜与保险库入口',
            effects: { location: '埃及厅', mapRoom: 'egypt' },
            choices: [
                { id: 'track', label: '循脚印与沙流向追踪盗贼离开去向', next: 'track_check', skillCheck: { skill: '追踪' } },
                { id: 'vault2', label: '试着推开保险库那扇厚重的大门', next: 'vault_blocked' },
                { id: 'listen', label: '贴着库门仔细聆听里面仪式动静', next: 'listen_check', skillCheck: { skill: '聆听' } }
            ]
        },
        listen_check: {
            narrative: '你把耳朵贴近保险库门，金属门板冰得像墓道里的石盖。门内至少有两名黑袍人——一人吟诵，另一人在沙地上拖行重物，金属与石面摩擦，像面具被重新挂回支架；每七句吟诵后，会有短暂的寂静，像某种呼吸。门缝渗出的焚香味因此变得更浓，沙粒簌簌落下，像倒计时正在门外堆积。',
            groupOutcome: {
                allSuccess: '你们听清了沙阵的节拍与缺口位置：四角本应用盐封印，却被人挖空——破阵前必须先弄清从哪一侧潜入才不会惊动守卫。吟诵的第七句停顿与保安巡逻的节拍恰好错开，像内应刻意留下的窗口；便衣警察低声记下方位，眼神却越来越沉，仿佛已听见面具在沙阵上方轻轻转动。',
                allFailure: '门内突然安静，仿佛里面的人也在听。你们退后半步时，沙粒从门缝涌出，像某种警告；吟诵在寂静后以更尖锐的音节重启，琥珀色的光从门缝一线渗出，证明仪式并未因你们的聆听而停顿，反而更接近高潮，而保安的脚步声已在主展厅远处响起。',
                mixed: '一人听丢了节拍，险些把侧道位置记反，另一人仍记下盐阵缺口的大致方位——情报不完整，却足够决定从正门还是侧道潜入。丢失节拍者却注意到门把手上新鲜沙粒的流向，意外补上了最后一块拼图，让侧道入口在展柜底座后重新变得清晰可辨。'
            },
            branch: { success: 'listen_ok', failure: 'trace_lost' }
        },
        listen_ok: {
            narrative: '吟诵节奏在门后形成可预测的间隙——每七句会有一次停顿，像呼吸。便衣警察（若同行）低声说：「那是我们的窗口。」沙粒从门缝落下，在地板上堆成细小的三角，与古埃及护符的形状隐约重合；埃及厅的射灯把空展柜照得格外刺眼，仿佛那张面具从未离开，只是换了一种方式悬在沙阵上方。',
            effects: { journal: '盐阵四角缺口未封；仪式每七句一停顿。' },
            choices: [
                { id: 'side', label: '沿侧通道悄然潜入保险库内部查看', next: 'vault' },
                { id: 'trace', label: '先摸清通往保险库的那条隐蔽侧道', next: 'search_check', skillCheck: { skill: '侦查' } }
            ]
        },
        track_check: {
            narrative: '脚印在展柜后突然消失——有人用沙刻意抹平了踪迹，像试图擦去一行不该被读出的咒语。你蹲下身，沙粒仍带着体温与焚香味的余味，说明掩盖者离开不久，保险库门就在附近。展柜底座与墙面之间的缝隙里卡着一缕黑布纤维，像黑袍人在匆忙间留下的线头，指向某个尚未被发现的入口。',
            groupOutcome: {
                allSuccess: '你们协力辨认沙粒流向与鞋印深浅，确认隐藏通道就在展柜底座之后——侧门在指尖下无声滑开，像走私团伙留给内应的最后退路。通道内仍有余温，沙粒尚未落尽，证明搬运面具的人刚通过不久；黑袍吟诵声因此变得更近，却仍未察觉后方来人。',
                allFailure: '沙粒被刻意搅乱，脚印在展柜后彻底消失；你们只能改从正门硬闯，或花更多时间在厅内重新搜证。时间因此流逝得格外快，而门内吟诵每少一次停顿，琥珀色的光就从门缝渗出更多一线，像面具正在苏醒，而保安巡逻的路线也正朝埃及厅收拢。',
                mixed: '一名调查员跟丢了踪迹，但同伴在展柜底座发现了新鲜沙粒堆积的异常——通道仍在，只是需要更多时间把它挖出来。跟丢者却注意到墙面与展柜之间有一道几乎看不见的气流，证明暗门就在触手可及之处，便立刻用手电为同伴照亮底座边缘。'
            },
            branch: { success: 'track_ok', failure: 'trace_lost' }
        },
        track_ok: {
            narrative: '你在展柜底座摸到一处隐蔽的开关。暗门无声滑开，露出一条窄小的侧通道——墙上的沙粒还未落尽，像刚有人抱着面具从这里通过。通道内壁刻着简陋的荷鲁斯纹，却被新刻的划痕覆盖，像两种时代在黑暗中争夺同一条退路；前方保险库门的金属反光隐约可见，吟诵声因此贴得更近。',
            effects: {
                clues: [{ id: 'mus_secret', title: '隐藏通道', content: '走私团伙的馆内通道。', type: 'physical' }]
            },
            choices: [{ id: 'side', label: '沿侧通道悄然潜入保险库内部查看', next: 'vault' }]
        },
        trace_lost: {
            narrative: '踪迹在展柜后彻底断掉，像有人刻意把你们引向死胡同。保险库门仍紧闭，门内吟诵却越来越急——若再耽搁，面具恐怕真要完全苏醒。埃及厅的射灯自动切换成夜间模式，空展柜在明暗交替中像一张正在呼吸的嘴；你们必须在保安巡逻折返前，决定是硬闯还是再赌一次搜证。',
            choices: [
                { id: 'search', label: '复查展柜底座与地上沙粒的流向', next: 'search_check', skillCheck: { skill: '侦查' } },
                { id: 'lock', label: '绕开锁芯尝试打开保险库厚重大门', next: 'lock_check', skillCheck: { skill: '锁匠' } },
                { id: 'rush', label: '放弃撬锁强行撞开保险库大门现', next: 'vault_rush' }
            ]
        },
        search_check: {
            narrative: '手电光扫过地面，沙粒在灯下闪着不属于埃及的细芒——有人掺了博物馆修复用的石英粉，用来掩盖真实流向。你蹲下身，指尖触到尚带余温的粉痕，展柜底座的轮廓在光里变得可疑，像一扇被刻意藏起的矮门。石英粉被风吹起时发出极轻的嘶嘶声，仿佛沙阵在门外也已感应到有人在寻找缺口。',
            groupOutcome: {
                allSuccess: '你们确认隐藏开关就在展柜底座：侧通道仍可通行，黑袍人似乎尚未察觉有人摸到这条退路。开关滑开时几乎没有声音，沙粒却像活物般向内流动，为通道让路；前方保险库内的琥珀色光芒因此变得更清晰，像奈布-卡面具正在沙阵上方缓缓转向你们。',
                allFailure: '石英粉被风吹散，最后一点流向也消失了；正门成了唯一选择，而门内的吟诵已拔高半个音阶。保安的皮鞋声同时在主展厅远处响起，巡逻路线正向埃及厅收拢，你们必须在被盘问前做出更粗暴的决定，否则奈布-卡面具将在人类制度抵达前完全睁眼。',
                mixed: '一人看走了眼，把粉痕误认成清洁痕迹，另一人仍撬开展柜底座的一角——侧道狭窄，却还能挤进一个人。误认者因此负责放风，而潜入者已看见通道尽头保险库门缝渗出的琥珀色光，像沙暴在门后预演最后的苏醒；两人目光在黑暗里短暂交汇，确认窗口仍值得一赌。'
            },
            branch: { success: 'track_ok', failure: 'trace_cornered' }
        },
        trace_cornered: {
            narrative: '展厅远处传来皮鞋声——保安巡逻正在靠近埃及厅。你们必须在被盘问前进入保险库，或躲回主展厅阴影里失去先机。空展柜的射灯把你们的影子拉得很长，投在保险库门上，像提前宣告了入侵；门内吟诵却在这时突然停顿，仿佛里面的人也听见了走廊上的脚步声。',
            effects: {
                sanCheck: '0/1',
                combat: {
                    creatureId: 'security_guard',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'mus_guard_down',
                    onLose: 'mus_guard_press'
                }
            },
            choices: [
                { id: 'lock', label: '绕开锁芯尝试打开保险库厚重大门', next: 'lock_check', skillCheck: { skill: '锁匠' } },
                { id: 'rush', label: '放弃撬锁强行撞开保险库大门现', next: 'vault_rush' }
            ]
        },
        vault_blocked: {
            narrative: '保险库门纹丝不动——黄铜密码转盘拧得死紧，门面上找不到任何钥匙孔。门内吟诵清晰可闻，沙粒从门缝簌簌落下，像倒计时；琥珀色的光在门缝一线脉动，与吟诵的节拍同步，仿佛奈布-卡面具正在门后缓慢睁眼。埃及厅的焚香味因此浓得刺鼻，像某种古老防腐剂正在空气中复活。',
            choices: [
                { id: 'lock', label: '绕开锁芯尝试打开保险库厚重大门', next: 'lock_check', skillCheck: { skill: '锁匠' } },
                { id: 'trace', label: '回身搜索厅内其他隐蔽入口位置', next: 'trace_lost' }
            ]
        },
        lock_check: {
            narrative: '保险库用的是走私圈常见的仿制锁——三枚弹片，一片防撬钢针。手电只能照亮一瞬，门内吟诵却像催命符；你们必须在下一音节落下前，让锁舌收回。锁孔周围有新鲜沙粒，像有人刚用仪式粉末润滑过机关；钢针复位时发出的细响，与门内吟诵的停顿惊人地重合。',
            groupOutcome: {
                allSuccess: '锁舌在最后一秒收回，门向内滑开一条缝——黑袍人的背影就在三米外，尚未回头。沙阵的琥珀色光芒因此泼到你们脸上，灼热而干燥，像沙漠夜风倒灌进保险库；吟诵在那一刻出现第七次停顿，窗口短暂地属于你们，而黑袍人肩头的沙粒甚至还未察觉身后的空气变化。',
                allFailure: '钢针复位，锁芯彻底锁死；撞击声惊动了门内的人，吟诵骤然拔高。保安的无线电同时在走廊里响起，问埃及厅为何有异响——你们必须在内外夹击合拢前，改用最粗暴的方式撞门而入，否则面具将在合围完成前彻底脱离人类的展柜与规则。',
                mixed: '一人弄弯了钢针，另一人仍撬开半寸门缝——足够侧身挤入，但已谈不上隐蔽。门缝涌出的焚香味与琥珀光因此变得更烈，黑袍人似乎已察觉身后空气的变化，吟诵却尚未中断，留给你们的时间只剩下一个停顿的长度，而便衣警察已在门外握紧了枪柄。'
            },
            branch: { success: 'vault', failure: 'vault_rush' }
        },
        vault: {
            narrative: '保险库内，戴面具的黑袍人正在吟诵。面具悬浮在沙阵上方，双眼槽发出琥珀色光芒。这不是普通盗窃——是唤醒仪式。你们仍赶在完全苏醒前摸到沙阵边缘，脚下沙粒温热，像被体内余温烘过的骨灰；黑袍人的背影在光芒里轻轻摇晃，仿佛与面具共用同一套呼吸节拍。',
            checkpoint: '保险库仪式：奈布-卡面具唤醒现场',
            effects: {
                location: '保险库',
                mapRoom: 'vault',
                sanCheck: '0/1',
                atmosphere: { level: 'ritual', note: '面具仪式' },
                clues: [{ id: 'mus_ritual', title: '唤醒仪式', content: '沙阵+面具双眼槽琥珀光；四角盐封被挖空。', type: 'occult' }]
            },
            choices: [
                { id: 'disrupt', label: '硬闯上去破坏正在进行的仪式沙阵', next: 'ritual_check', requiresClueQuality: 'seed', useSeedClueQuality: true, skillCheck: { skill: '神秘学', aggregate: 'all' } },
                { id: 'grab', label: '抛开沙阵直接扑向奈布-卡面具', next: 'grab_fail' },
                {
                    id: 'buy_cover',
                    label: '花重金买通便衣压住现场风声再破阵',
                    next: 'ritual_check',
                    requiresFlag: 'reputation_hit',
                    requiresClueQuality: 'solid',
                    skillCheck: { skill: '神秘学', aggregate: 'all' }
                }
            ]
        },
        vault_rush: {
            narrative: '你们撞门而入时，黑袍人猛然回头——沙阵已转过半圈，面具双眼槽的琥珀色光芒刺得睁不开眼。吟诵没有停，反而像欢迎迟到者加入合唱；沙粒被气流卷起，在光芒中形成细小的漩涡，像奈布-卡王朝最后的沙暴已在室内预演。便衣警察的枪柄尚未拔出，黑袍人却已举起一面小镜，把光芒折向你们的眼睛。',
            checkpoint: '保险库仪式：奈布-卡面具唤醒现场',
            effects: {
                location: '保险库',
                mapRoom: 'vault',
                sanCheck: '1/1D4',
                atmosphere: { level: 'ritual', note: '面具即将苏醒' },
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'mus_cultist_down',
                    onLose: 'mus_cultist_press'
                }
            },
            choices: [
                { id: 'disrupt', label: '硬闯上去破坏正在进行的仪式沙阵', next: 'ritual_check', skillCheck: { skill: '神秘学', aggregate: 'all' } },
                { id: 'grab', label: '抛开沙阵直接扑向奈布-卡面具', next: 'grab_fail' }
            ]
        },
        grab_fail: {
            narrative: '触碰面具的瞬间，你看见奈布-卡王朝最后的记忆——万人坑与沙暴中的巨眼。理智剧震，黑袍人的吟诵趁虚而入，像沙粒从耳孔灌进颅腔；面具在掌心发烫，双眼槽的琥珀光随之脉动，仿佛你们的手指正被它记住，成为下一张被唤醒的面孔的模板。',
            effects: { sanCheck: '1/1D6' },
            choices: [
                { id: 'd2', label: '咬牙仍试图捣毁正在进行的沙阵', next: 'ritual_check', skillCheck: { skill: '神秘学', aggregate: 'all' } }
            ]
        },
        ritual_check: {
            narrative: '保险库内的沙阵在琥珀色光芒中缓缓旋转。你辨认出它的结构——四角本应用盐封印，却被人刻意挖空，像四扇向深渊敞开的窗。必须四人缺口同时封死，或至少全员协力一致，才能在面具完全苏醒前截断仪式；黑袍人的吟诵每七句停顿一次，那停顿便是你们唯一可操作的缝隙。',
            groupOutcome: {
                allSuccess: '你们同时找到盐阵的四处缺口，撒盐封阵的时机在琥珀色光芒里一闪而过——黑袍人的吟诵被迫中断，面具在沙阵上方开始坠落。沙粒如断线木偶般散落，黑袍人的黑袍随之塌陷，里面只剩干燥的沙与人形的空壳；博物馆的夜因此重新属于人类，至少在这一刻。',
                allFailure: '神秘学解读接连失手，沙阵旋转反而加速——黑袍人抬头时，面具双眼槽的琥珀色光芒已亮到刺目，苏醒只差最后一音节。你们撒出的盐被气流卷走，像被沙暴嘲笑的徒劳；保险库门在身后缓缓合拢，仿佛建筑本身也要把你们留作仪式的见证。',
                mixed: '一人的破阵步骤出现偏差，险些反噬，但另一人仍抢在面具完全苏醒前封住两处缺口——仪式被削弱，却尚未彻底终止。琥珀光因此黯淡一半，黑袍人发出非人的嘶声，而面具仍在沙阵中心轻轻悬浮，像一只尚未完全闭上的眼睛。'
            },
            branch: { success: 'ending_by_evidence', failure: 'ending_partial' }
        },
        ending_by_evidence: {
            narrative: '盐阵散开的瞬间，你们手里的证据决定了黎明后这座城市会听到怎样的说法。便衣警察已在门外等候，馆长的走私账本是否齐全、面具归还是否可核验，全取决于你们今晚带走了什么；雨声敲打玻璃展柜，像在倒计时，埃及厅的焚香仍未散尽。',
            endingsByClueQuality: {
                weak: 'ending_win_weak',
                solid: 'ending_win',
                decisive: 'ending_win_decisive'
            }
        },
        ending_win_weak: {
            narrative: '你们勉强截断了仪式，面具坠落——但馆长与警察只听到互相矛盾的证言。走私网大半漏网，埃及厅被封锁「待查」。你们活着离开，却拿不出足以定罪的完整物证链，只能在雨夜里反复核对残缺的笔记，听着警笛远去而不知该向谁呈交。\n\n【结局：证据不足】仪式被阻，调查在程序上半途而废。',
            effects: { journal: '仪式中断；物证不足，走私网未尽。', sanCheck: '0/1' },
            end: true
        },
        ending_win: {
            narrative: '你们将盐撒入沙阵缺口，面具如断线木偶般坠落。黑袍人在琥珀色光芒熄灭的同时化为沙粒，散落一地。便衣警察冲入保险库，馆长走私网被一网打尽——奈布-卡面具被归还展柜。黎明前，博物馆恢复死寂。沙阵余温仍在靴底停留，像某种尚未散尽的梦；埃及厅的焚香味久久不散，提醒你们今夜并非只是一场盗窃。\n\n【结局：面具回收】你们阻止了唤醒，但神话的余味仍贴在玻璃展柜内侧。',
            effects: { journal: '阻止仪式，面具归还展柜。', enchantmentId: 'elder_sign' },
            end: true
        },
        ending_win_decisive: {
            narrative: '完整的物证链让便衣警察无需犹豫：馆长、黑袍人与走私账本同一夜落网。面具归还展柜时，你们还留下了一枚临时绘制的旧印记——至少在这座博物馆里，下一次唤醒会更难。黎明的警笛第一次听起来像胜利，而不是追赶；焚香终于淡去。\n\n【结局：铁证如山】仪式终止，走私网覆灭，神话余波被短暂压住。',
            effects: {
                journal: '铁证结案；面具归还并加临时封印。',
                enchantmentId: 'elder_sign',
                flags: { museum_decisive_win: true }
            },
            end: true
        },
        ending_partial: {
            narrative: '盐阵只被毁去一半——一半黑袍人化为沙粒，另一半仍站在琥珀色光芒里，面具裂口喷出奈布-卡王朝最后的沙暴。你们撤出保险库时，埃及厅已在身后被黄沙吞没；抬头望去，城市上空浮现一只巨大的沙之眼，缓缓睁开。警笛在远处响起，却像隔了一层沙幕；你们活下来了，但知道迟到的胜利仍是一种失败。\n\n【结局：迟了一步】你们截断了部分仪式，却未能阻止神话余波扩散到街面。',
            effects: { sanCheck: '1/1D8', dispel: true, flags: { mythos_heat_delta: 2 } },
            end: true
        }
    }
};
