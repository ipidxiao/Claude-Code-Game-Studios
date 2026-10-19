/**
 * 「废弃疗养院」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement.
 */
export const abandonedAsylumChecks = {
    "gate": {
        "enter": {
            "roll": false
        }
    },
    "lobby_approach": {
        "in": {
            "roll": false
        }
    },
    "side_door": {
        "in": {
            "roll": false
        }
    },
    "lobby": {
        "ward": {
            "roll": false
        },
        "basement": {
            "roll": false
        },
        "courtyard": {
            "roll": false
        },
        "laundry_room": {
            "roll": false
        },
        "pharmacy": {
            "roll": false
        },
        "nurse_station": {
            "roll": false
        },
        "chapel": {
            "roll": false
        },
        "boiler": {
            "roll": false
        },
        "east_wing": {
            "roll": false
        },
        "west_wing": {
            "roll": false
        },
        "room16": {
            "roll": false
        },
        "room18": {
            "roll": false
        },
        "morgue": {
            "roll": false
        },
        "generator": {
            "roll": false
        },
        "staff_quarters": {
            "roll": false
        },
        "rain_pavilion": {
            "roll": false
        }
    },
    "listen_ok": {
        "w": {
            "roll": false
        }
    },
    "listen_fail": {
        "w2": {
            "skill": "聆听",
            "fail": "你们循着那点吱呀声穿过回廊，可每转过一个拐角，声音就换了方向，忽而在头顶，忽而贴着脚下的地板。\n\n走到病房区时，四下只剩自己的呼吸和鞋底黏住地板的轻响。那声音究竟藏在哪扇门后，你们说不上来。"
        },
        "off": {
            "skill": "图书馆使用",
            "fail": "院长办公室的抽屉一拉就散，纸页受过潮，粘成一叠叠硬块。你们借着手电一页页揭，揭开的不是药费单就是空白的病历表，墨水晕成一团团灰云。\n\n窗外的雾压得更低，手电的光开始发黄。桌角那本皮面本子仍静静搁着，你们还没来得及碰。"
        }
    },
    "basement_stairs": {
        "down": {
            "roll": false
        }
    },
    "ward_approach": {
        "in": {
            "roll": false
        }
    },
    "ward": {
        "office": {
            "roll": false
        }
    },
    "mirror_ok": {
        "off": {
            "roll": false
        }
    },
    "mirror_fail": {
        "run": {
            "skill": "闪避",
            "fail": "你们转身就跑，脚下踩到一滩药糊，整个人斜摔出去，手肘磕在门框上，麻得握不住手电。光柱在走廊里乱晃，墙上每一块玻璃都映出一张没有转开的脸。\n\n等你们跌跌撞撞挤进院长办公室、反手抵住门，膝盖还在抖，袖口沾满甜腥的黑糊。"
        }
    },
    "office": {
        "read": {
            "skill": "图书馆使用",
            "fail": "日记的封皮被热气烤得卷曲，前半本的纸页粘成一整块，指甲一抠便碎成焦渣。勉强揭开的几页，字迹挤在格线之间，缩写和涂改一层压一层，像故意不让旁人读懂。\n\n你们辨了许久，只认出几个日期。墙里又响起一声叩击，近得像就在书架后面。"
        },
        "base": {
            "roll": false
        }
    },
    "diary": {
        "down": {
            "roll": false
        },
        "back_office": {
            "skill": "侦查",
            "fail": "你们把书架上的文件夹一册册抽下，又一册册塞回去。账目、采购单、一沓没贴照片的入院表，翻到指尖发黑，也没找出比桌上那些更实在的东西。\n\n霉味混着焦糊往鼻子里钻，书架背后的墙板偶尔轻轻一响，像有人在那边陪你们耐心等着。"
        }
    },
    "basement": {
        "retreat": {
            "roll": false
        }
    },
    "courtyard": {
        "back_lobby": {
            "roll": false
        }
    },
    "laundry_room": {
        "back_lobby": {
            "roll": false
        }
    },
    "pharmacy": {
        "back_lobby": {
            "roll": false
        }
    },
    "nurse_station": {
        "back_lobby": {
            "roll": false
        }
    },
    "chapel": {
        "back_lobby": {
            "roll": false
        }
    },
    "boiler": {
        "back_lobby": {
            "roll": false
        }
    },
    "east_wing": {
        "back_lobby": {
            "roll": false
        }
    },
    "west_wing": {
        "back_lobby": {
            "roll": false
        }
    },
    "room16": {
        "back_lobby": {
            "roll": false
        }
    },
    "room18": {
        "back_lobby": {
            "roll": false
        }
    },
    "morgue": {
        "back_lobby": {
            "roll": false
        }
    },
    "generator": {
        "back_lobby": {
            "roll": false
        }
    },
    "staff_quarters": {
        "back_lobby": {
            "roll": false
        }
    },
    "rain_pavilion": {
        "back_lobby": {
            "roll": false
        }
    }
};
