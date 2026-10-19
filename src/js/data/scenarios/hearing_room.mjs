/**
 * Hearing Room — social confrontation short module (Creative D4).
 */
export const CoCScenarioHearingRoom = {
    id: 'hearing_room',
    title: '听证室对峙',
    subtitle: '短篇：证人、票根与一句传言',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['短篇', '1920s', '证据分叉', '战役账本', '双时钟', '神话热度', '战后余波', '假线索'],
    description:
        '市政听证室：对峙不可靠证人。演示信誉→线索质量、假线索回收、双时钟与证据档结局（无追逐）。',
    era: '1920s',
    estimatedMinutes: 25,
    lorebook: [
        {
            "id": "hearing_room_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "hearing_room"
            ],
            "content": "「听证室对峙」：保持1920s克苏鲁调查/恐怖基调。市政听证室：对峙不可靠证人。演示信誉→线索质量、假线索回收、双时钟与证据档结局（无追逐）。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "hearing_room_start",
            "title": "市政厅·听证室前厅",
            "keys": [
                "市政厅·听证室前厅",
                "市政厅",
                "听证室对峙"
            ],
            "locations": [
                "市政厅"
            ],
            "priority": 12,
            "scenarioIds": [
                "hearing_room"
            ],
            "content": "开场地点「市政厅·听证室前厅」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "hearing_room_mythos",
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
                "hearing_room"
            ],
            "content": "神话目击/理智损失走 reality_check 等工具；叙事可暗示不可名状，禁止规则外直接改属性。"
        },
        {
            "id": "hearing_room_invest",
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
                "hearing_room"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        },
        {
            "id": "hearing_room_pad_4",
            "title": "补充提示",
            "keys": [
                "听证室对峙",
                "继续"
            ],
            "priority": 1,
            "scenarioIds": [
                "hearing_room"
            ],
            "content": "围绕「听证室对峙」推进：保持时代感，工具结算优先，避免剧透最终真相。"
        }
    ],
    readsArcLedger: true,
    requiresChapterUnlock: true,
    startNode: 'antechamber',
    initialLocation: '市政厅·听证室前厅',
    clocks: { investigation: 0, ritual: 0, maxInvestigation: 5, maxRitual: 3 },
    onClockFull: {
        ritual: { next: 'ending_late', effects: { journal: '听证时钟已满；证人被带走。' } }
    },
    setup: {
        location: '市政厅·听证室前厅',
        atmosphere: { level: 'tense', note: '社交对峙' },
        journal: '听证：必须在公开记录前压住伪证。',
        flags: { public_place: true }
    },
    nodes: {
        antechamber: {
            narrative: '市政厅走廊里回荡皮鞋声与纸页翻动。听证室门半开，速记员已经摆好墨水瓶——你们只有一轮公开对峙的时间，去拆穿码头走私案的关键证人。墙上挂钟的秒针比往常更响，像在提醒仪式般的「听证截止」并不站在你们这边，而门外记者的闪光灯随时会把半真半假的证词钉成标题。',
            checkpoint: '听证前厅：整理证据与立场',
            effects: {
                advanceClock: { track: 'investigation', by: 1 },
                clues: [{
                    id: 'hr_docket',
                    title: '听证案卷摘要',
                    content: '证人声称满月夜不在码头；笔迹却与潮汐表同一人。',
                    type: 'document',
                    quality: 'partial'
                }]
            },
            choices: [
                { id: 'enter', label: '推门进入听证室开始公开对峙质证', next: 'hearing' },
                {
                    id: 'rumor',
                    label: '先相信走廊传言去追查假速记员',
                    next: 'rumor_listen',
                    falseLead: true,
                    falseNext: 'false_lead_corridor',
                    skillCheck: { skill: '聆听' }
                },
                { id: 'shove', label: '推开堵门记者并强行冲入听证室', next: 'press_scuffle' }
            ]
        },
        press_scuffle: {
            narrative: '堵门记者抓住你们的衣袖不放，闪光灯刺得睁不开眼。走廊瞬间变成短促推搡——必须先结束这场公开冲突，才能把注意力拉回听证桌上的伪证与票根，而挂钟仍在催促听证截止，调查窗口正一点点收窄到只剩下一声敲锤。雨声从石阶外灌进来，像在倒计时。',
            effects: {
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    name: '堵门记者',
                    onWin: 'press_clear',
                    onLose: 'press_press'
                },
                flags: { public_scuffle: true }
            },
            choices: [
                { id: 'after', label: '确认交锋结果之后进入听证室质证', next: 'hearing' }
            ]
        },
        rumor_listen: {
            narrative: '走廊尽头有人压低嗓音说「速记员是假的」。你们凑近听清细节——每一句都像对得上，却又像故意把你们拖离听证室门口；墙上挂钟又响了一下，像在嘲笑你们是否要把宝贵的对峙窗口浪费在半真半假的耳语上，而记者已经开始往门缝里塞话筒，闪光灯把半截传闻照成可上标题的伪证据。',
            groupOutcome: {
                allSuccess: '你们听清了绰号来源——所谓「假速记员」其实是门卫的玩笑。传言把你们拖向错误侧门，足以空耗一轮，却也让你们记下了证人助理的真实走向；听证室门缝里传出的敲锤声提醒：公开记录不会为你们的绕路停表，而那句传言已经在笔记本上留下可疑的一笔，你在旁边打了个问号。',
                allFailure: '耳语被脚步声吞掉，你们只抓住「假」字便失去下文，不得不改回正门；走廊灯光忽明忽暗，像有人故意用传闻拖延时间，而听证钟声已经开始催促下一轮发言，留给你们的窗口又短了一寸，记者们却把半句话当成了可写的标题草稿。',
                mixed: '一人听清侧门编号，另一人只听清「别信速记」——半真半假，足以把调查带偏一阵；你们在门廊争论该信哪半句时，听证室内已响起第一声敲锤，像在提醒证据比耳语更重要，而笔记本上只留下一行含糊箭头，指向尚未核实的锅炉房侧门。'
            },
            branch: { success: 'false_lead_corridor', failure: 'antechamber' }
        },
        false_lead_corridor: {
            narrative: '侧门通向锅炉房，哪里有什么假速记员。你们空跑一趟，听证钟声却更近了——仪式般的截止时间仿佛又逼近一寸，像有人在嘲笑你们把传闻当成证据；走廊潮气渗进笔记本页边，提醒调查仍需回到听证桌上的真实证词链，而那条可疑的笔记还等着你们揭穿或更正。',
            effects: {
                advanceClock: { track: 'ritual', by: 1 },
                journal: '弯路：侧门锅炉房空无一人。',
                flags: { false_lead_taken: true }
            },
            choices: [
                { id: 'back', label: '返回前厅重新整理手头全部证据', next: 'antechamber' },
                { id: 'enter2', label: '立刻推门进入听证室开始对峙质证', next: 'hearing' }
            ]
        },
        hearing: {
            narrative: '听证室内，证人艾琳把白手套叠在膝上，嗓音平稳得像排练过。速记员的笔尖沙沙作响——每一次停顿都像在给你们留缝，也像在给伪证留缝。窗外雨打石阶，记者们隔着玻璃窥探；你们必须在信誉与物证之间选一条能钉死谎言的路，否则公开记录将把半真半假写成定论。',
            checkpoint: '听证对峙：证人艾琳公开作证',
            effects: {
                location: '市政厅·听证室',
                advanceClock: { track: 'investigation', by: 1 },
                clues: [{
                    id: 'hr_witness',
                    title: '艾琳的不在场证明',
                    content: '声称满月夜在剧院包厢；票根时间与潮汐表冲突。',
                    type: 'testimony',
                    quality: 'partial',
                    npcId: 'witness_irene'
                }]
            },
            choices: [
                {
                    id: 'press',
                    label: '用心理学追问票根时间矛盾之处',
                    next: 'press_check',
                    skillCheck: { skill: '心理学' }
                },
                {
                    id: 'show',
                    label: '出示潮汐表与案卷对照公开质证',
                    next: 'ending_by_evidence',
                    requiresClueQuality: 'seed',
                    useSeedClueQuality: true,
                    branchByClueQuality: {
                        weak: { next: 'ending_weak' },
                        solid: { next: 'ending_win' },
                        decisive: { next: 'ending_decisive' }
                    }
                },
                {
                    id: 'buy_silence',
                    label: '花重金压住记者以免信誉再度崩盘',
                    next: 'ending_partial',
                    requiresFlag: 'reputation_hit',
                    requiresClueQuality: 'solid'
                },
                {
                    id: 'police_deal',
                    label: '向旁听警官交出完整物证换宽大',
                    next: 'ending_win',
                    requiresFlag: 'police_interest',
                    requiresClueQuality: 'solid'
                }
            ]
        },
        press_check: {
            narrative: '艾琳的瞳孔在追问下微微收缩。票根油墨与剧院印章的干燥程度对不上——你们必须在公开记录写下下一行之前，把这条裂缝撬开成可用的证据；速记员抬眼看了你们一眼，像在等待一句足够写进档案的判决词，而门外记者的闪光灯已经开始预热下一轮标题。',
            groupOutcome: {
                allSuccess: '艾琳的嗓音终于裂开一道缝：包厢票是事后补盖的。速记员写下「时间矛盾」四个字——证据更扎实了，听证室内的空气像被盐粒擦亮；记者闪光灯在门外炸响，却已无法把她的镇定表演重新粘回去，而你们笔记本上的可疑耳语也终于可以被划掉了。',
                allFailure: '艾琳把故事讲得滴水不漏，追问被她用眼泪挡回。公开记录偏向证人，仪式般的截止钟又近了一格；你们必须改用物证硬碰，否则听证将以「证据不足」收场，而走廊里那句传言还会继续把你们往岔路上引。',
                mixed: '一人听出油墨未干，另一人被眼泪带偏——半份突破足以削弱信誉，却不足以立刻定罪。速记员写下「存疑」；你们仍需把潮汐表与案卷摊上桌面，才能把裂缝钉成最后的证据，并决定是否揭穿先前那条可疑笔记内容备查核对。'
            },
            branch: { success: 'hearing_strong', failure: 'hearing' }
        },
        hearing_strong: {
            narrative: '艾琳的不在场证明已出现裂纹。潮汐表与案卷摊在听证桌上，墨迹被灯光照得发亮——证据足够把对峙推向终局，只要你们选择公开质证而非再被耳语带走；挂钟的秒针像在倒数，记者们已挤到门框，等待一句能上标题的判决，也等待你们是否更正那条「可疑」笔记。',
            effects: {
                clues: [{
                    id: 'hr_ink',
                    title: '未干油墨票根',
                    content: '剧院印章油墨未干；与满月夜时间冲突。',
                    type: 'physical',
                    quality: 'solid'
                }],
                flags: { witness_cracked: true },
                advanceClock: { track: 'investigation', by: 1 }
            },
            choices: [
                {
                    id: 'expose',
                    label: '公开质证，进入终局宣读',
                    next: 'ending_by_evidence',
                    branchByClueQuality: {
                        weak: { next: 'ending_weak' },
                        solid: { next: 'ending_win' },
                        decisive: { next: 'ending_decisive' }
                    }
                },
                {
                    id: 'debunk',
                    label: '揭穿并更正先前那条可疑笔记内容',
                    next: 'debunk_note',
                    requiresFlag: 'false_lead_taken'
                }
            ]
        },
        debunk_note: {
            narrative: '你们把「假速记员」那条可疑笔记摊开，当着听证记录更正为锅炉房空跑——那句传言被划成弯路，再搅不乱真正的证据。艾琳的律师试图抗议，但笔录已写下「误导性耳语」；公开对峙重新回到票根与潮汐表的硬证据上，记者闪光灯也找不到新的半真半假可写。',
            effects: {
                debunkFalseLead: true,
                journal: '侧门的耳语已当众拆穿：锅炉房空无一人。',
                flags: { false_lead_debunked: true }
            },
            choices: [
                {
                    id: 'finish',
                    label: '回到质证，进入终局宣读',
                    next: 'ending_by_evidence',
                    branchByClueQuality: {
                        weak: { next: 'ending_weak' },
                        solid: { next: 'ending_win' },
                        decisive: { next: 'ending_decisive' }
                    }
                }
            ]
        },
        ending_by_evidence: {
            narrative: '听证官敲锤，示意双方根据现有证据宣读结论。潮汐表、票根与案卷摊在灯光下——终局将按你们手头证据的坚实程度落下，而不是按走廊耳语；速记员抬起笔，记者们屏住呼吸，等待一句足以登上明早头版的判决词。',
            endingsByClueQuality: {
                weak: 'ending_weak',
                solid: 'ending_win',
                decisive: 'ending_decisive'
            },
            choices: [
                { id: 'read', label: '听从听证官宣读并进入终局收口', next: 'ending_win' }
            ]
        },
        ending_weak: {
            narrative: '证据只够让记录写下「存疑」。艾琳离开听证室时仍保持微笑，记者标题会写成「调查未果」——你们至少拖延了伪证定案，却没能彻底钉死谎言；走廊里的雨声像未写完的笔录，这件事远没有结束。\n\n【结局：存疑】证据不足，证人脱身。',
            effects: { journal: '听证：存疑收场。', sanCheck: '0/1' },
            end: true
        },
        ending_win: {
            narrative: '票根油墨与潮汐表对照公开宣读，艾琳的不在场证明当场崩塌。听证官下令扣押相关文件——伪证链被截断，公开记录终于站在调查一侧；记者闪光灯炸响时，你们已把物证收进公文包。\n\n【结局：质证成立】证人伪证被拆穿。',
            effects: {
                journal: '听证：质证成立。',
                enchantmentId: 'elder_sign',
                sanCheck: '0/1',
                flags: { deep_one_decisive_win: true }
            },
            end: true
        },
        ending_decisive: {
            narrative: '完整证据链当众摊开：票根、潮汐表、案卷笔迹同一人。艾琳无法再演，律师沉默——听证室里只剩笔尖与雨声。这是一场干净的胜利，靠的是证据，而不是嗓门。\n\n【结局：铁证】伪证链被彻底钉死。',
            effects: {
                journal: '听证：铁证定案。',
                enchantmentId: 'elder_sign',
                sanCheck: '0/1',
                flags: { deep_one_decisive_win: true }
            },
            end: true
        },
        ending_partial: {
            narrative: '重金压住了记者镜头，却买不回全部信誉。听证以「程序瑕疵」草草休会——你们保住了下一局的喘息，却留下警察关注的尾巴；有人记住了你们的脸，赢下这一场并不等于全身而退。\n\n【结局：买静】风波暂压，余波仍在。',
            effects: {
                journal: '听证：买静休会。',
                sanCheck: '0/1',
                flags: { police_interest: true }
            },
            end: true
        },
        ending_late: {
            narrative: '听证钟声落定，证人被法警带走。你们还站在走廊里整理半页笔记——窗口已关，只剩几页没写完的笔记；雨打石阶像未写完的笔录，提醒双时钟一旦走满，社交对峙就不再给你第二次开口机会了。\n\n【结局：迟到】听证截止，证人离席。',
            effects: { journal: '听证超时。', sanCheck: '0/1' },
            end: true
        }
    }
};
