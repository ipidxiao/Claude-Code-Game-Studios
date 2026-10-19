/**
 * 「无尽列车」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement.
 */
export const trainToNowhereChecks = {
    "cabin": {
        "dining": {
            "roll": false
        },
        "window": {
            "skill": "侦查",
            "fail": "你把额头贴近车窗，玻璃凉得像井水。雾一层层翻涌，白得发灰，偶尔鼓起一团，没等你看清又平了下去。\n\n看久了，眼睛开始发酸，枯树的枝杈在视野里叠成重影。你揉了揉眼角，再望出去，只剩一片不肯散开的白。"
        },
        "corridor_green": {
            "roll": false
        },
        "sleeper_berth": {
            "roll": false
        },
        "conductor_closet": {
            "roll": false
        },
        "mail_car": {
            "roll": false
        },
        "dining_galley": {
            "roll": false
        },
        "observation_deck": {
            "roll": false
        },
        "bathroom_water": {
            "roll": false
        },
        "freight_latch": {
            "roll": false
        },
        "radio_booth": {
            "roll": false
        },
        "coal_tender": {
            "roll": false
        },
        "private_suite": {
            "roll": false
        },
        "brakeman_post": {
            "roll": false
        },
        "tunnel_roar": {
            "roll": false
        },
        "timetable_wall": {
            "roll": false
        }
    },
    "window": {
        "d": {
            "skill": "说服",
            "fail": "餐车里炖菜的蒸汽糊住了吊灯，你在桌边坐下，向那位列车员搭话。他替你斟了半杯水，笑容一丝不动，却对每个问题都只答「请慢用」。\n\n邻桌的乘客埋头喝汤，勺子碰碗的声音整齐得像钟摆。你再开口时，连列车员也转身走开了。"
        },
        "b": {
            "skill": "侦查",
            "fail": "行李车里的箱子垒到车顶，一摇晃便互相磕碰。你掀开几只的搭扣，里面不是旧衣就是空的，樟脑味呛得人直咳。\n\n灯泡在头顶晃，影子在箱缝间来回爬。你翻得满手灰，却说不出哪一只该多看一眼，只听见远处车厢的门在风里一开一合。"
        }
    },
    "talk_ok": {
        "caboose": {
            "roll": false
        },
        "engine": {
            "skill": "侦查",
            "fail": "你们朝车头走去，越往前，车厢里的热气越稠，汗顺着鬓角流进衣领。一股白汽从连接处喷出，扑得你们眼前一片模糊。\n\n等汽散开，前方只剩一扇被煤灰熏黑的铁门，门后传来闷响，分不清是机器还是别的什么。你们揩着眼睛，这一路上究竟经过了什么，一样也没看清。"
        }
    },
    "talk_fail": {
        "din": {
            "roll": false
        }
    },
    "dining": {
        "bag": {
            "roll": false
        },
        "eng": {
            "roll": false
        }
    },
    "ask_ok": {
        "e": {
            "skill": "侦查",
            "fail": "你们记着那句话往前挤，过道忽然窄了，一位裹着毛毯的乘客横睡在地板上，怎么也唤不醒。绕过他时，你们的袖口被铁钩挂住，扯开一道口子。\n\n再抬头，车头那扇门已近在眼前，门缝里的热浪烫得睁不开眼。你们只顾着喘气，什么也没看进去。"
        }
    },
    "ask_fail": {
        "refuse": {
            "skill": "意志",
            "fail": "你把碗推回去，指尖却迟迟离不开那滚烫的碗沿。列车员不说话，只是笑，那股铁锈味顺着鼻腔往里钻，你竟咽了一下口水。\n\n等你终于站起身，腿软得像坐了一整夜。你们跌跌撞撞穿过两节车厢，到行李车时脑子里还嗡嗡作响，满眼的箱子都在晃。"
        },
        "eat": {
            "skill": "体质",
            "fail": "勺子刚碰到舌尖，喉咙就猛地一紧。你弯腰呛咳，汤汁顺着下巴滴在桌布上，洇开一片褐色。\n\n列车员递来一块餐巾，叠得方方正正。你攥着它，胃里一阵阵抽紧，那股味道却已留在了齿缝间。头顶的吊灯晃了一下，你的眼前也跟着暗了一下。"
        }
    },
    "eat_bad": {
        "flee": {
            "skill": "敏捷",
            "fail": "你推开椅子就跑，脚下的地板却偏在这时一倾，你撞上邻桌，汤碗翻倒，滚烫的汤泼了半边袖子。\n\n过道比来时长得多，每扇门的把手都滑腻腻的。等你扶着门框跨进行李车，肺里像灌满了煤烟，眼前的箱子一只只叠着重影，看什么都隔着一层水。"
        }
    },
    "baggage": {
        "cab": {
            "roll": false
        }
    },
    "search_fail": {
        "eng": {
            "skill": "侦查",
            "fail": "你们顶着风穿过连廊，铁板在脚下一起一落。煤灰被气流卷起，钻进眼里，泪水止不住地流。\n\n走到车头前，你们只能眯着眼摸索铁壁，掌心烫出一道红痕。门后的声响一阵紧过一阵，你们却连脚边踩着什么都分辨不出。"
        },
        "din": {
            "skill": "说服",
            "fail": "餐车里的乘客各占一桌，谁也不看谁。你们挨个问过去，有人把帽檐压低，有人只顾搅汤，一位老妇人抬起眼，嘴唇动了动，又低头去数碗里的豆子。\n\n列车员远远站在吧台后擦杯子，一下，又一下，始终没有走过来。"
        }
    },
    "search_ok": {
        "c": {
            "roll": false
        }
    },
    "caboose_approach": {
        "in": {
            "roll": false
        }
    },
    "engine_approach": {
        "in": {
            "roll": false
        }
    },
    "engine": {
        "feed": {
            "skill": "投掷",
            "fail": "你掏出那件遗物，朝巨口掷去。车身恰在此刻一震，它撞在锅炉的铁沿上，弹回煤堆，半截埋进了炭屑里。\n\n巨口发出一声沉闷的低吼，热风扑面，吹得你眉毛发焦。你伏在煤堆边，指尖刚碰到那冰凉的边角，炉膛深处的火光便朝你这边偏了过来。"
        },
        "run": {
            "skill": "闪避",
            "fail": "你转身就跑，一缕黑烟却贴着地面追来，缠住了脚踝。你重重摔在铁板上，膝盖磕得发麻，手肘擦掉一层皮。\n\n挣开时，那烟像不甘心似的缩回车头。你一瘸一拐穿过几节车厢，扶住连廊的栏杆，裤脚还在冒着焦糊味，身后的低鸣久久不散。"
        }
    },
    "corridor_green": {
        "back_cabin": {
            "roll": false
        }
    },
    "sleeper_berth": {
        "back_cabin": {
            "roll": false
        }
    },
    "conductor_closet": {
        "back_cabin": {
            "roll": false
        }
    },
    "mail_car": {
        "back_cabin": {
            "roll": false
        }
    },
    "dining_galley": {
        "back_cabin": {
            "roll": false
        }
    },
    "observation_deck": {
        "back_cabin": {
            "roll": false
        }
    },
    "bathroom_water": {
        "back_cabin": {
            "roll": false
        }
    },
    "freight_latch": {
        "back_cabin": {
            "roll": false
        }
    },
    "radio_booth": {
        "back_cabin": {
            "roll": false
        }
    },
    "coal_tender": {
        "back_cabin": {
            "roll": false
        }
    },
    "private_suite": {
        "back_cabin": {
            "roll": false
        }
    },
    "brakeman_post": {
        "back_cabin": {
            "roll": false
        }
    },
    "tunnel_roar": {
        "back_cabin": {
            "roll": false
        }
    },
    "timetable_wall": {
        "back_cabin": {
            "roll": false
        }
    }
};
