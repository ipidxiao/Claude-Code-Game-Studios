/**
 * Creative Phase 5 scenario.
 */
export const CoCScenarioCourtRecess = {
    "id": "court_recess",
    "title": "休庭对质",
    "subtitle": "短篇：法庭社交 · 证据门 · 无追逐",
    "author": "CoC Engine Team",
    "license": "Original - CoC Engine",
    "tags": ["短篇","1920s","证据分叉","战役账本","双时钟","神话热度","战后余波","假线索"],
    "description": "编辑部余波后的休庭室：纯社交对质，证据档终局。无追逐。",
    "era": "1920s",
    "estimatedMinutes": 25,
    lorebook: [
        {
            "id": "court_recess_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "court_recess"
            ],
            "content": "「休庭对质」：保持1920s克苏鲁调查/恐怖基调。编辑部余波后的休庭室：纯社交对质，证据档终局。无追逐。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "court_recess_start",
            "title": "地方法院·休庭室",
            "keys": [
                "地方法院·休庭室",
                "地方法院",
                "休庭对质"
            ],
            "locations": [
                "地方法院"
            ],
            "priority": 12,
            "scenarioIds": [
                "court_recess"
            ],
            "content": "开场地点「地方法院·休庭室」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "court_recess_mythos",
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
                "court_recess"
            ],
            "content": "神话目击/理智损失走 reality_check 等工具；叙事可暗示不可名状，禁止规则外直接改属性。"
        },
        {
            "id": "court_recess_invest",
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
                "court_recess"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        },
        {
            "id": "court_recess_pad_4",
            "title": "补充提示",
            "keys": [
                "休庭对质",
                "继续"
            ],
            "priority": 1,
            "scenarioIds": [
                "court_recess"
            ],
            "content": "围绕「休庭对质」推进：保持时代感，工具结算优先，避免剧透最终真相。"
        }
    ],
    "readsArcLedger": true,
    "requiresChapterUnlock": true,
    "startNode": "lobby",
    "initialLocation": "地方法院·休庭室",
    "clocks": {
        "investigation": 0,
        "ritual": 0,
        "maxInvestigation": 5,
        "maxRitual": 3
    },
    "onClockFull": {
        "ritual": {
            "next": "ending_late",
            "effects": {
                "journal": "休庭截止；证人离席。"
            }
        }
    },
    "setup": {
        "location": "地方法院·休庭室",
        "atmosphere": {
            "level": "tense",
            "note": "休庭对质"
        },
        "journal": "休庭前必须用证据压住伪证。",
        "flags": {
            "public_place": true
        }
    },
    "nodes": {
        "lobby": {
            "narrative": "休庭室走廊混着粉笔灰与潮气。法官把笔录拍在桌上——裁定写成「听证翻车」，比你们记得的对峙更像丑闻。墙上挂钟指向休庭，法警在门外踱步；你们只有一轮社交窗口，去纠正这条即将变成公开记录的谎言，否则它明早就会变成全市传阅的定论。",
            "checkpoint": "休庭室：休庭前整理证据",
            "effects": {
                "advanceClock": {
                    "track": "investigation",
                    "by": 1
                },
                "combat": {
                    "creatureId": "cultist",
                    "mode": "exchange",
                    "pendingRoll": true,
                    "attacker": "pc",
                    "weaponId": "knife",
                    "name": "闹事法警",
                    "onWin": "type_clear",
                    "onLose": "type_press"
                },
                "clues": [
                    {
                        "id": "cr_proof",
                        "title": "听证速记录副本",
                        "content": "质证段落与票根时间矛盾的公开记录。",
                        "type": "document",
                        "quality": "partial"
                    }
                ]
            },
            "choices": [
                {
                    "id": "enter",
                    "label": "推开休庭室门开始公开对质继续",
                    "next": "bench"
                },
                {
                    "id": "rumor",
                    "label": "先相信走廊传言去追假证人继续",
                    "next": "rumor_listen",
                    "falseLead": true,
                    "falseNext": "false_lead_hall",
                    "skillCheck": {
                        "skill": "聆听"
                    }
                },
                {
                    "id": "scuffle",
                    "label": "先解决闹事法警再进休庭室继续",
                    "next": "bench"
                }
            ]
        },
        "rumor_listen": {
            "narrative": "法警房有人压低嗓音说「线人在后巷」。你们凑近听清细节——每一句都像能写成独家，却又像故意把你们拖离休庭桌；挂钟又响了一下，提醒歪曲裁定正在冷却成铅块，而假线索会在笔记本上留下可疑一笔。",
            "groupOutcome": {
                "allSuccess": "你们听清了绰号来源——所谓「假线人」其实是送油墨的学徒玩笑。传言把你们拖向空巷，足以空耗一轮，却也让你们记下了笔录上真正该改的段落；休庭钟声提醒公开记录不会为绕路停表，而那条可疑的笔记已经记在本子上。",
                "allFailure": "耳语被机器轰鸣吞掉，你们只抓住「后巷」二字便失去下文，不得不改回法官室；油墨味更浓了，像有人故意用传闻拖延时间，而休庭窗口又短了一寸，裁定却已排进笔录栏。",
                "mixed": "一人听清巷口编号，另一人只听清「别信法官」——半真半假，足以把调查带偏一阵；你们争论该信哪半句时，法警机已敲完一行歪曲裁定，笔记本上只留下含糊箭头，指向尚未核实的后巷。"
            },
            "branch": {
                "success": "false_lead_hall",
                "failure": "lobby"
            }
        },
        "false_lead_hall": {
            "narrative": "后巷只有空油墨桶与雨渍。你们空跑一趟，休庭钟声却更近了——像有人在嘲笑你们把传闻当成证据；潮气渗进笔记本页边，提醒调查仍需回到法官桌上的笔录与速记录，而那条可疑的笔记还等着你们揭穿。",
            "effects": {
                "advanceClock": {
                    "track": "ritual",
                    "by": 1
                },
                "journal": "假线索：后巷空无一人。",
                "flags": {
                    "false_lead_taken": true
                }
            },
            "choices": [
                {
                    "id": "back",
                    "label": "返回休庭室重新整理手头全部证据",
                    "next": "lobby"
                },
                {
                    "id": "bench2",
                    "label": "立刻进入法官室开始休庭对峙继续",
                    "next": "bench"
                }
            ]
        },
        "bench": {
            "narrative": "法官把眼镜推到额上，笔录墨迹未干。他说「读者要戏剧，不要你们的潮汐表」——速记副本摊在灯下，每一处时间矛盾都像钉子。窗外雨打窗框，法警机轰鸣不断；你们必须在信誉与物证之间选一条能改掉裁定的路，否则铅字将把半真半假铸成定论。",
            "checkpoint": "法官室：休庭对峙",
            "effects": {
                "location": "地方法院·法官室",
                "advanceClock": {
                    "track": "investigation",
                    "by": 1
                },
                "clues": [
                    {
                        "id": "nm_bench",
                        "title": "法官的改稿批注",
                        "content": "批注倾向夸大听证失败；与速记录冲突。",
                        "type": "testimony",
                        "quality": "partial",
                        "npcId": "bench_hale"
                    }
                ]
            },
            "choices": [
                {
                    "id": "press",
                    "label": "用心理学追问批注夸大之处继续",
                    "next": "press_check",
                    "skillCheck": {
                        "skill": "心理学"
                    }
                },
                {
                    "id": "show",
                    "label": "出示速记录与笔录对照公开改稿",
                    "next": "ending_by_evidence",
                    "requiresClueQuality": "seed",
                    "useSeedClueQuality": true,
                    "branchByClueQuality": {
                        "weak": {
                            "next": "ending_weak"
                        },
                        "solid": {
                            "next": "ending_win"
                        },
                        "decisive": {
                            "next": "ending_decisive"
                        }
                    }
                },
                {
                    "id": "buy_silence",
                    "label": "花重金买下版面以免信誉再度崩盘",
                    "next": "ending_partial",
                    "requiresFlag": "reputation_hit",
                    "requiresClueQuality": "solid"
                },
                {
                    "id": "police_deal",
                    "label": "向旁听警官出示完整物证换宽大",
                    "next": "ending_win",
                    "requiresFlag": "police_interest",
                    "requiresClueQuality": "solid"
                }
            ]
        },
        "press_check": {
            "narrative": "法官的瞳孔在追问下微微收缩。批注笔迹与速记录时间对不上——你们必须在笔录付印前，把这条裂缝撬开成可用的证据；法警工抬眼看了你们一眼，像在等待一句足够改掉裁定的判决词。",
            "groupOutcome": {
                "allSuccess": "法官的嗓音裂开一道缝：夸大段落是为了卖报。笔录上「听证翻车」被划掉——证据更扎实了，休庭室空气像被盐粒擦亮；闪光灯在门外炸响，却已无法把歪曲裁定重新粘回，而可疑耳语也终于可以被更正。",
                "allFailure": "法官把故事讲得滴水不漏，心理学追问被他用休庭压力挡回。笔录偏向夸张，仪式般的截止钟又近了一格；你们必须改用物证硬碰，否则歪曲裁定将付印，假线索会继续污染下一轮调查。",
                "mixed": "一人指出笔迹矛盾，另一人被休庭恐吓带偏——半份突破足以削弱夸大，却不足以立刻改稿。笔录写下「存疑」；你们仍需把速记录摊上桌面，才能把裂缝钉成最后的证据，并揭穿可疑笔记。"
            },
            "branch": {
                "success": "bench_strong",
                "failure": "bench"
            }
        },
        "bench_strong": {
            "narrative": "夸大批注已出现裂纹。速记录与笔录摊在灯下——证据足够把对峙推向终局，只要你们选择公开改稿而非再被耳语带走；挂钟的秒针像在倒数，法警工已挤到门框，等待一句能上版的判决。",
            "effects": {
                "clues": [
                    {
                        "id": "nm_ink",
                        "title": "被划掉的夸大裁定",
                        "content": "「听证翻车」被墨线否定；与速记录一致。",
                        "type": "physical",
                        "quality": "solid"
                    }
                ],
                "flags": {
                    "bench_cracked": true
                },
                "advanceClock": {
                    "track": "investigation",
                    "by": 1
                }
            },
            "choices": [
                {
                    "id": "expose",
                    "label": "公开改稿，进入终局宣读",
                    "next": "ending_by_evidence",
                    "branchByClueQuality": {
                        "weak": {
                            "next": "ending_weak"
                        },
                        "solid": {
                            "next": "ending_win"
                        },
                        "decisive": {
                            "next": "ending_decisive"
                        }
                    }
                },
                {
                    "id": "debunk",
                    "label": "揭穿并更正先前那条可疑笔记内容",
                    "next": "debunk_note",
                    "requiresFlag": "false_lead_taken"
                }
            ]
        },
        "debunk_note": {
            "narrative": "你们把「假线人」那条可疑笔记摊开，当着法官更正为后巷空跑——假线索被标成已解释，不再干扰真正的证据。律师式抗议被法警机轰鸣盖过；公开对峙重新回到速记录与笔录的硬证据上。",
            "effects": {
                "debunkFalseLead": true,
                "journal": "揭穿假线索：后巷耳语更正为已解释。",
                "flags": {
                    "false_lead_debunked": true
                }
            },
            "choices": [
                {
                    "id": "finish",
                    "label": "回到改稿，进入终局宣读",
                    "next": "ending_by_evidence",
                    "branchByClueQuality": {
                        "weak": {
                            "next": "ending_weak"
                        },
                        "solid": {
                            "next": "ending_win"
                        },
                        "decisive": {
                            "next": "ending_decisive"
                        }
                    }
                }
            ]
        },
        "ending_by_evidence": {
            "narrative": "法官敲桌，示意根据现有证据改写裁定。速记录、笔录与批注摊在灯光下——终局将按你们手头证据的坚实程度落下，而不是按后巷耳语；法警工抬起铅条，等待一句足以写进判决书的结论。",
            "endingsByClueQuality": {
                "weak": "ending_weak",
                "solid": "ending_win",
                "decisive": "ending_decisive"
            },
            "choices": [
                {
                    "id": "read",
                    "label": "听从法官宣读并进入终局收口继续",
                    "next": "ending_win"
                }
            ]
        },
        "ending_weak": {
            "narrative": "证据只够让笔录改成「听证存疑」。歪曲裁定被削弱，却未彻底钉死——你们至少拖延了丑闻定版，却没能写成干净的更正启事；雨声像未写完的笔录，这件事远没有结束。\n\n【结局：存疑】证据不足，裁定半改。",
            "effects": {
                "journal": "休庭室：存疑收场。",
                "sanCheck": "0/1"
            },
            "end": true
        },
        "ending_win": {
            "narrative": "速记录与笔录对照公开改稿，「听证翻车」被划掉。法官下令重排裁定——伪裁定链被截断，铅字终于站在调查一侧；闪光灯炸响时，你们已把物证收进公文包。\n\n【结局：改稿成立】歪曲裁定被拆穿。",
            "effects": {
                "journal": "休庭室：改稿成立。",
                "enchantmentId": "elder_sign",
                "sanCheck": "0/1",
                "flags": {
                    "deep_one_decisive_win": true
                }
            },
            "end": true
        },
        "ending_decisive": {
            "narrative": "完整证据链当众摊开：速记录、批注笔迹、笔录时间同一矛盾。法官无法再演，法警工沉默——休庭室只剩机声与雨声。这是一场干净的胜利，靠的是证据，而不是嗓门。\n\n【结局：铁证】伪裁定链被彻底钉死。",
            "effects": {
                "journal": "休庭室：铁证定版。",
                "enchantmentId": "elder_sign",
                "sanCheck": "0/1",
                "flags": {
                    "deep_one_decisive_win": true
                }
            },
            "end": true
        },
        "ending_partial": {
            "narrative": "重金买下了版面，却买不回全部信誉。报纸以「程序瑕疵」草草改题——你们保住了下一局的喘息，却留下警察关注的尾巴；有人记住了你们的脸。\n\n【结局：买版】风波暂压，余波仍在。",
            "effects": {
                "journal": "休庭室：买版休战。",
                "sanCheck": "0/1",
                "flags": {
                    "police_interest": true
                }
            },
            "end": true
        },
        "ending_late": {
            "narrative": "休庭钟声落定，歪曲裁定已付印。你们还站在法警架旁整理半页笔记——窗口已关，只剩几页没写完的笔记；雨打窗框像未写完的笔录，提醒双时钟一旦走满就不再给你第二次改稿机会。\n\n【结局：休庭】裁定已见报。",
            "effects": {
                "journal": "休庭室超时。",
                "sanCheck": "0/1"
            },
            "end": true
        }
    }
};
