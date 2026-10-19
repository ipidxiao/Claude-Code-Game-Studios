/**
 * 「休庭对质」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement;
 * { roll: false, by: 'chase' | 'evidence' }: the chase's own rolls, or the evidence earlier rolls
 * found, settle it (an ending chosen by evidence has no options to go on with after a failure).
 */
export const courtRecessChecks = {
    "lobby": {
        "enter": {
            "skill": "说服",
            "fail": "你们在法官对面坐下，话才说了半截，他便用钢笔敲了敲笔录，说休庭不是辩论的场合。你们换了个说法，他的眉头只是皱得更深。\n\n门外法警的脚步一下一下踱过去，粉笔灰在灯光里浮着。他摘下眼镜擦了很久，像在等你们自己离开。"
        },
        "scuffle": {
            "skill": "话术",
            "fail": "你们好言相劝，那法警却把警棍横在胸前，嗓门越来越大，说什么也不肯让开。走廊尽头有人探出头张望，窃窃私语顺着墙根爬过来。\n\n等他终于嘟囔着退到一边，你们推门进去时，法官正低头写着什么，听见门响，便把笔帽合上了。"
        }
    },
    "false_lead_hall": {
        "back": {
            "skill": "图书馆使用",
            "fail": "走廊的长凳冰凉，你们把抄件一页页排开，粉笔灰落在纸面，混着潮气糊成浅灰的污迹。两份记录里的同一时刻对不上，翻来覆去，找不出该信哪一份。\n\n挂钟的指针挪了一格，法警朝这边瞥了一眼。你们把纸拢成一摞，指尖沾满了灰。"
        },
        "bench2": {
            "skill": "说服",
            "fail": "你们急着把每一处矛盾都摆上桌，话说得太快，连自己都听出了慌乱。法官抬手打断，慢条斯理地问你们是否受过法律训练，语气客气得近乎冷淡。\n\n雨声在窗玻璃上铺开。那几处精心排好的时间，忽然显得零碎又单薄。"
        }
    },
    "bench_strong": {
        "debunk": {
            "skill": "说服",
            "fail": "你们举起那页笔记，还没念完，法官便摆手说这不在今日的记录范围。门口的法警清了清嗓子，像在替他下逐客令。\n\n你们再要开口，声音撞上高高的天花板，散成一片空洞的回响。那页纸被推回桌角，压在一摞笔录底下。"
        },
        "expose": {
            "roll": false,
            "by": "evidence"
        }
    },
    "bench": {
        "show": {
            "roll": false,
            "by": "evidence"
        }
    },
    "debunk_note": {
        "finish": {
            "roll": false,
            "by": "evidence"
        }
    }
};
