/**
 * 「听证室对峙」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement;
 * { roll: false, by: 'chase' | 'evidence' }: the chase's own rolls, or the evidence earlier rolls
 * found, settle it (an ending chosen by evidence has no options to go on with after a failure).
 */
export const hearingRoomChecks = {
    "antechamber": {
        "enter": {
            "skill": "说服",
            "fail": "你们的第一个问题刚出口，艾琳便微微侧头，像在听一段无关紧要的琴声。她的回答滴水不漏，每个字都落在速记员的笔尖上，干净得挑不出毛病。\n\n旁听席有人轻笑。你们攥紧笔记本，发觉方才那番追问只在她的白手套上留下一道浅浅的褶。"
        },
        "shove": {
            "skill": "力量",
            "fail": "你们侧肩去挤，人墙却像潮水般合拢回来。一只手揪住领口，另一只把镁光灯举到你们脸前，砰的一声白光，眼前只剩一片灼烧的绿斑。\n\n衣袖被扯得嘶啦作响，门框就在三步外，却怎么也够不着。"
        }
    },
    "press_scuffle": {
        "after": {
            "skill": "斗殴",
            "fail": "推搡里不知谁的手杖绊住你们的脚踝，你们踉跄着撞上墙边的衣帽架，帽子滚了一地。等你们挣脱衣袖、扣好领口跨进门，艾琳已经说完了开场陈述。\n\n速记员正在翻页，她叠着手套，神情平静，那段话你们一个字也没听全。"
        }
    },
    "false_lead_corridor": {
        "back": {
            "skill": "图书馆使用",
            "fail": "回到前厅，你们把纸页摊在长椅上，潮气早把墨迹晕成一团团灰云。几张抄件的页码对不上，越理越乱，好几处摘记竟分不清是谁的笔迹。\n\n挂钟咔嗒一响，你们只得把这叠湿软的纸胡乱拢起，夹回腋下。"
        },
        "enter2": {
            "skill": "说服",
            "fail": "你们几乎是撞进门去的，问话也急，一句压着一句。艾琳只是抬眼，等你们喘匀了才开口，嗓音慢得像在给孩子讲道理。\n\n主持人敲了敲桌面，提醒你们注意措辞。旁听席的窃笑还没散，那位证人已经把话头轻轻拨回了她想要的地方。"
        }
    },
    "hearing_strong": {
        "debunk": {
            "skill": "说服",
            "fail": "你们刚把那页笔记推到桌心，艾琳的律师便起身，声音不高，却恰好盖过你们的后半句。主持人皱眉，示意速记员暂停。\n\n笔尖悬在半空，墨珠将落未落。门框边的闪光灯接连亮起，那页纸仍摊在灯下，皱巴巴的，没有人再看它一眼。"
        },
        "expose": {
            "roll": false,
            "by": "evidence"
        }
    },
    "hearing": {
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
