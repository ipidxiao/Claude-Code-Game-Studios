/**
 * Creative content scenario.
 */
export const CoCScenarioCliffMistRun = {
    "id": "cliff_mist_run",
    "title": "雾崖险奔",
    "subtitle": "短篇：徒步 · 悬崖险情 · 无枪战",
    "author": "CoC Engine Team",
    "license": "Original - CoC Engine",
    "tags": [
        "追逐",
        "短篇",
        "1920s",
        "证据分叉",
        "神话热度",
        "战后余波",
        "战役账本"
    ],
    "description": "雾崖窄径：只用加速与险情拉近距离，无载具枪战。证明追逐骨架的徒步变体。",
    "era": "1920s",
    "estimatedMinutes": 20,
    lorebook: [
        {
            "id": "cliff_mist_run_tone",
            "title": "模组语气",
            "always": true,
            "priority": 20,
            "scenarioIds": [
                "cliff_mist_run"
            ],
            "content": "「雾崖险奔」：保持1920s克苏鲁调查/恐怖基调。雾崖窄径：只用加速与险情拉近距离，无载具枪战。证明追逐骨架的徒步变体。证据可分叉；假线存在时应可识别。"
        },
        {
            "id": "cliff_mist_run_start",
            "title": "雾崖小径入口",
            "keys": [
                "雾崖小径入口",
                "雾崖险奔"
            ],
            "locations": [
                "雾崖小径入口"
            ],
            "priority": 12,
            "scenarioIds": [
                "cliff_mist_run"
            ],
            "content": "开场地点「雾崖小径入口」。用氛围建立威胁，再引导玩家选择调查路径；地点切换时调用 set_position/create_map（如已用地图）。"
        },
        {
            "id": "cliff_mist_run_chase",
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
                "cliff_mist_run"
            ],
            "content": "追逐用 start_chase/chase_action；载具注意司机座位与行动数。追上后再允许 melee/fire，勿叙事空跑结算。"
        },
        {
            "id": "cliff_mist_run_mythos",
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
                "cliff_mist_run"
            ],
            "content": "神话目击/理智损失走 reality_check 等工具；叙事可暗示不可名状，禁止规则外直接改属性。"
        },
        {
            "id": "cliff_mist_run_invest",
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
                "cliff_mist_run"
            ],
            "content": "调查优先给可记录线索（add_clue/link_clues）。技能检定用 request_skill_check；社交对抗用 social_opposed。"
        }
    ],
    "readsArcLedger": true,
    "requiresChapterUnlock": true,
    "startNode": "trailhead",
    "initialLocation": "雾崖小径入口",
    "setup": {
        "location": "雾崖小径入口",
        "atmosphere": {
            "level": "tense",
            "note": "险情追逐"
        },
        "journal": "盯梢：对方一旦上崖就会消失在雾里。",
        "flags": {
            "public_place": false
        }
    },
    "nodes": {
        "trailhead": {
            "narrative": "雾把崖径剪成一段段白墙。走私向导踢翻灯笼窜向窄径——你们只能先在湿滑石阶上交锋，再决定是否追进那片吞没轮廓的雾堤。远处雾笛被风撕碎，像倒计时已经开始，而崖下潮声提醒：这里没有引擎，只有靴底与胆量。",
            "checkpoint": "崖口交锋：向导察觉盯梢",
            "effects": {
                "combat": {
                    "creatureId": "cultist",
                    "mode": "exchange",
                    "pendingRoll": true,
                    "attacker": "pc",
                    "weaponId": "knife",
                    "name": "走私向导",
                    "onWin": "trail_win",
                    "onLose": "trail_press"
                }
            },
            "choices": [
                {
                    "id": "resolve",
                    "label": "确认交锋结果之后继续追击向导",
                    "next": "mist_path"
                }
            ]
        },
        "mist_path": {
            "narrative": "向导沿着悬崖边狂奔，碎石坠入潮声。你们追上去——前方是没有护栏的窄径，风把雾撕成条索，每一步都像在赌靴底是否还粘得住岩面。徒步追逐已经开始，险情就在下一转角，而雾笛声像倒计时一样催促你们不要停步。",
            "checkpoint": "徒步追逐：雾崖窄径拉近",
            "effects": {
                "chase": {
                    "quarry": "走私向导",
                    "pursuer": "pc",
                    "lead": 3,
                    "pursuerMov": 8,
                    "quarryMov": 9
                },
                "flags": {
                    "foot_chase": true,
                    "cliff_hazard": true
                }
            },
            "choices": [
                {
                    "id": "push",
                    "label": "继续拉近距离并使用追逐面板加速",
                    "next": "ledge_gap",
                    "branchByClueQuality": {
                        "weak": {
                            "next": "ledge_gap",
                            "effects": {
                                "flags": {
                                    "fog_thick": true
                                }
                            }
                        },
                        "solid": {
                            "next": "ledge_gap"
                        },
                        "decisive": {
                            "next": "ledge_gap",
                            "effects": {
                                "flags": {
                                    "clean_footing": true
                                }
                            }
                        }
                    }
                },
                {
                    "id": "end_foot",
                    "label": "选择放弃追逐并且结束本段剧情",
                    "next": "ending_escape"
                }
            ]
        },
        "ledge_gap": {
            "narrative": "窄径断裂处露出湿黑岩缝。向导纵身跃过，雾笛在脚下轰鸣——你们必须在同一险情窗口跟上，否则猎物会钻进崖顶灌木消失。没有载具，没有枪战轮次，只有加速、险情与行动预算，以及是否敢在湿岩上再迈一步。",
            "effects": {
                "chase": {
                    "quarry": "走私向导",
                    "pursuer": "pc",
                    "lead": 2,
                    "pursuerMov": 8,
                    "quarryMov": 8
                },
                "flags": {
                    "hazard_beat": true,
                    "no_gunfight": true
                },
                "sanCheck": "0/1"
            },
            "choices": [
                {
                    "id": "leap",
                    "label": "跃过岩缝冲向崖顶灌木继续追击",
                    "next": "ridge_end",
                    "branchByClueQuality": {
                        "weak": {
                            "next": "ridge_end",
                            "effects": {
                                "flags": {
                                    "twisted_ankle": true
                                }
                            }
                        },
                        "solid": {
                            "next": "ridge_end"
                        },
                        "decisive": {
                            "next": "ending_win"
                        }
                    }
                },
                {
                    "id": "bail",
                    "label": "选择退回小径并且结束本段剧情",
                    "next": "ending_escape"
                }
            ]
        },
        "ridge_end": {
            "narrative": "崖顶灌木被踢开，向导绊倒在雾里。你们扑上去——防水袋散落潮汐暗号与绳结图，墨迹被潮气晕开，却仍足够写成笔录。没有枪声，只有风与雾笛；追逐以险情与距离收束，也验证了无枪战徒步骨架同样可用。",
            "effects": {
                "sanCheck": "0/1",
                "clues": [
                    {
                        "id": "cmr_knot",
                        "title": "绳结图",
                        "content": "崖径绳结与满月雾笛时刻。",
                        "type": "document",
                        "quality": "solid"
                    }
                ],
                "journal": "向导落网；绳结图入手。"
            },
            "choices": [
                {
                    "id": "win",
                    "label": "收队回报并且结束本段剧情内容",
                    "next": "ending_win"
                }
            ]
        },
        "ending_win": {
            "narrative": "雾稍散时，向导被铐在崖顶栏桩上，岸街警笛隐约传来。你们从崖口一路追到岩缝，湿岩上每一步都可能踏空，好在人没有跑掉。\n\n【结局：追上】向导落网。",
            "effects": {
                "journal": "雾崖险奔：猎物落网。",
                "enchantmentId": "elder_sign",
                "sanCheck": "0/1"
            },
            "end": true
        },
        "ending_escape": {
            "narrative": "靴声消失在雾堤尽头。你们站在空荡窄径，只剩打翻的灯笼与绳索印；至少摸清了对方上崖路线，下次不会再空手而归，雾笛也渐渐变成可记录的方位与节奏备查。\n\n【结局：逃脱】猎物跑了，但你们摸清了路线。",
            "effects": {
                "journal": "追逐失败；记下上崖路线。",
                "sanCheck": "0/1"
            },
            "end": true
        }
    }
};
