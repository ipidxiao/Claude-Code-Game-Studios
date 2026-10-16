/**
 * Creative Phase 5 scenario.
 */
export const CoCScenarioLighthouseNightWatch = {
    "id": "lighthouse_night_watch",
    "title": "灯塔夜班",
    "subtitle": "短篇：静谧调查 · 绳结图 · 无追逐",
    "author": "CoC Engine Team",
    "license": "Original - CoC Engine",
    "tags": ["短篇","1920s","证据分叉","战役账本","神话热度","战后余波","假线索"],
    "description": "雾崖余波后的灯塔夜班：用绳结图与日志完成静谧调查，无追逐。",
    "era": "1920s",
    "estimatedMinutes": 20,
    lorebook: [
        {
            "id": "lighthouse_night_watch_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "lighthouse_night_watch"
            ],
            "content": "「灯塔夜班」：保持1920s克苏鲁调查/恐怖基调。雾崖余波后的灯塔夜班：用绳结图与日志完成静谧调查，无追逐。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "lighthouse_night_watch_start",
            "title": "雾锁灯塔·灯室",
            "keys": [
                "雾锁灯塔·灯室",
                "雾锁灯塔",
                "灯塔夜班"
            ],
            "locations": [
                "雾锁灯塔"
            ],
            "priority": 12,
            "scenarioIds": [
                "lighthouse_night_watch"
            ],
            "content": "开场地点「雾锁灯塔·灯室」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "lighthouse_night_watch_mythos",
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
                "lighthouse_night_watch"
            ],
            "content": "神话目击/理智损失走 reality_check 等工具；叙事可暗示不可名状，禁止规则外直接改属性。"
        },
        {
            "id": "lighthouse_night_watch_invest",
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
                "lighthouse_night_watch"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        },
        {
            "id": "lighthouse_night_watch_pad_4",
            "title": "补充提示",
            "keys": [
                "灯塔夜班",
                "继续"
            ],
            "priority": 1,
            "scenarioIds": [
                "lighthouse_night_watch"
            ],
            "content": "围绕「灯塔夜班」推进：保持时代感，工具结算优先，避免剧透最终真相。"
        }
    ],
    "readsArcLedger": true,
    "requiresChapterUnlock": true,
    "startNode": "lamp_room",
    "initialLocation": "雾锁灯塔·灯室",
    "setup": {
        "location": "雾锁灯塔·灯室",
        "atmosphere": {
            "level": "calm",
            "note": "静谧夜班"
        },
        "journal": "夜班：对照绳结图核验雾笛时刻。",
        "flags": {
            "public_place": false
        }
    },
    "nodes": {
        "lamp_room": {
            "narrative": "灯室里只剩雾笛余音与煤油味。崖上追击留下的绳结图摊在台面——夜班没有追逐，只有核对、聆听与一次可能的假线索。窗外潮声像未写完的笔录，提醒你们把险奔收获写成可用的证据档，把雾中误导从笔记本上剔干净。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
            "checkpoint": "灯室：整理绳结图与日志",
            "effects": {
                "sanCheck": "0/1",
                "combat": {
                    "creatureId": "cultist",
                    "mode": "exchange",
                    "pendingRoll": true,
                    "attacker": "pc",
                    "weaponId": "knife",
                    "name": "惊醒的守夜人",
                    "onWin": "watch_clear",
                    "onLose": "watch_press"
                },
                "clues": [
                    {
                        "id": "lnw_knot",
                        "title": "绳结图抄本",
                        "content": "崖径绳结与满月雾笛时刻。",
                        "type": "document",
                        "quality": "partial"
                    }
                ]
            },
            "choices": [
                {
                    "id": "log",
                    "label": "对照灯塔日志核验雾笛时刻继续",
                    "next": "log_check",
                    "skillCheck": {
                        "skill": "图书馆使用"
                    }
                },
                {
                    "id": "rumor",
                    "label": "相信雾中人影去追假线索继续继续",
                    "next": "false_path",
                    "falseLead": true,
                    "falseNext": "false_path",
                    "skillCheck": {
                        "skill": "聆听"
                    }
                }
            ]
        },
        "false_path": {
            "narrative": "雾中人影只是灯笼晃动。你们空跑一圈回到灯室——假线索足以在笔记本上留下可疑一笔，却也提醒静谧调查仍需回到绳结图与日志的硬证据上，潮声与雾笛同时逼近，煤油灯一闪像在提醒证据档比传闻更重要。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
            "groupOutcome": {
                "allSuccess": "你们听清雾笛节奏与绳结图吻合，却也确认人影是假的。可疑笔记写下「雾影误导」，足以空耗一轮，却把调查拉回日志台面；灯室煤油灯一闪，像在提醒证据档比传闻更重要，潮声仍在窗外催促。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
                "allFailure": "雾声吞掉细节，你们只抓住「人影」二字便失去下文，不得不退回灯室；潮气渗进笔记本，假线索污染尚未开始的核验，而雾笛又近了一声，灯芯轻跳，像在嘲笑空跑的这一圈。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
                "mixed": "一人听清雾笛间隔，另一人被人影带偏——半真半假，足以把调查带偏一阵；回到灯室时绳结图仍在，笔记本却多了一行可疑箭头指向空廊，潮声与煤油味同时逼近。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。"
            },
            "branch": {
                "success": "false_done",
                "failure": "lamp_room"
            }
        },
        "false_done": {
            "narrative": "空廊确认无人。可疑笔记已写就——稍后可在线索板揭穿。你们回到灯室，把注意力放回绳结图与日志，夜班调查重新回到可核对的硬证据上；潮声与雾笛同时逼近，提醒假线索不能再污染证据档。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
            "effects": {
                "journal": "假线索：雾影空廊。",
                "flags": {
                    "false_lead_taken": true
                },
                "sanCheck": "0/1"
            },
            "choices": [
                {
                    "id": "back",
                    "label": "返回灯室继续核验绳结图与日志",
                    "next": "log_check",
                    "skillCheck": {
                        "skill": "图书馆使用"
                    }
                }
            ]
        },
        "log_check": {
            "narrative": "你把灯塔日志拖到煤油灯下。纸页被潮气泡得发软，墨迹在雾笛时刻那一栏晕成一片灰云，几处数字被前任守夜人用铅笔反复描过，又被指腹抹花。要从这些涂改里辨出真正的满月雾笛时刻，只能逐行对照绳结编号，一个刻度都不能放过。窗外潮声一阵紧过一阵，灯芯在玻璃罩里轻轻颤抖。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
            "groupOutcome": {
                "allSuccess": "涂改底下的原始笔迹终于浮出来：前任守夜人把满月雾笛时刻记了两遍，一遍写给巡查员看，一遍压在页脚的铅笔小字里，正好对上绳结图的编号。你把两行数字并排抄进笔记，墨还没干，雾笛便在窗外应声响起，节奏与纸面分毫不差。潮声退了半步，灯芯稳了下来。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
                "allFailure": "晕开的墨迹像故意躲着你，几行数字怎么对都差半个刻度。你抄下的时刻与绳结编号只能勉强挨上，旁边不得不画满问号。煤油味呛得眼睛发涩，雾笛在窗外拖着长音，像在嘲笑这份核对。手里的日志仍算一份证据，只是单薄得经不起一句追问。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
                "mixed": "一人从铅笔描痕里认出满月那一栏，另一人却被晕开的墨迹带偏了半格。两份抄本摆在一起，大半对得上，最关键的那一刻仍各执一词。你们只好把分歧原样写进笔记，留给终局去掂量。雾笛在窗外又响一声，灯芯轻跳，潮气爬上纸页的边角。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。"
            },
            "branch": {
                "success": "log_desk",
                "failure": "log_desk"
            }
        },
        "log_desk": {
            "narrative": "日志本墨迹被潮气晕开，满月雾笛时刻夹在涂改之间。绳结图与日志并排摊开——读出了几分，证据档就有几分分量，终局只认纸面上能宣读的东西；窗外潮声像在倒数，灯芯轻跳一下，夜班调查终于落到可宣读的纸面上。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
            "checkpoint": "日志台：绳结与雾笛对照",
            "effects": {
                "clues": [
                    {
                        "id": "lnw_log",
                        "title": "灯塔夜班日志",
                        "content": "满月雾笛时刻与绳结编号一致。",
                        "type": "document"
                    }
                ],
                "flags": {
                    "knot_verified": true
                }
            },
            "choices": [
                {
                    "id": "finish",
                    "label": "凭绳结图与日志进入证据档终局",
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
                    "label": "揭穿并更正先前那条可疑笔记继续",
                    "next": "debunk_note",
                    "requiresFlag": "false_lead_taken"
                }
            ]
        },
        "debunk_note": {
            "narrative": "你们把雾影可疑笔记更正为已解释——假线索不再污染证据档。灯室重新安静下来，只剩日志与绳结图的对照声，足以把静谧调查推向终局；潮声与雾笛同时逼近，像在等待宣读。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
            "effects": {
                "debunkFalseLead": true,
                "journal": "揭穿假线索：雾影更正。",
                "flags": {
                    "false_lead_debunked": true
                }
            },
            "choices": [
                {
                    "id": "go",
                    "label": "回到核验并进入证据档终局宣读",
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
            "narrative": "你们摊开绳结图与日志。终局将按证据档坚实程度落下——弱证只能存疑，实据足以定案，铁证则彻底钉死雾中误导。，宣读声却已经落定在灯室空气里。你把这一眼按进笔记：位置、声音、还没干的痕迹，然后才决定下一步。",
            "endingsByClueQuality": {
                "weak": "ending_weak",
                "solid": "ending_win",
                "decisive": "ending_decisive"
            },
            "choices": [
                {
                    "id": "read",
                    "label": "根据证据档宣读并进入终局收口",
                    "next": "ending_win"
                }
            ]
        },
        "ending_weak": {
            "narrative": "证据只够写成存疑笔录。雾笛时刻仍有缺口——你们至少留下可继承的余波，却没能钉死全部疑点。潮声像未写完的笔录，提醒下一剧本仍可选择继承或重置。\n\n记录合上之后，这一段不再往前。能带走的只有纸页、余温和尚未散去的气味。\n\n【结局：存疑】证据不足。",
            "effects": {
                "journal": "灯塔夜班：存疑。",
                "sanCheck": "0/1"
            },
            "end": true
        },
        "ending_win": {
            "narrative": "绳结图与日志对照成立，雾笛时刻被钉死。夜班调查完成——没有追逐的枪声，只有静谧核验的胜利，足以写进战役账本摘要。，灯芯却稳了下来。\n\n记录合上之后，这一段不再往前。能带走的只有纸页、余温和尚未散去的气味。\n\n【结局：定案】夜班核验成立。",
            "effects": {
                "journal": "灯塔夜班：定案。",
                "sanCheck": "0/1",
                "enchantmentId": "elder_sign"
            },
            "end": true
        },
        "ending_decisive": {
            "narrative": "完整证据链当众摊开：绳结、日志、雾笛节奏同一。这是一场干净的静谧胜利，足以示范无追逐调查模板，也给桌规卡留下可继承的档案与收获。\n\n记录合上之后，这一段不再往前。能带走的只有纸页、余温和尚未散去的气味。\n\n【结局：铁证】雾中疑点被钉死。",
            "effects": {
                "journal": "灯塔夜班：铁证。",
                "sanCheck": "0/1",
                "enchantmentId": "elder_sign"
            },
            "end": true
        }
    }
};
