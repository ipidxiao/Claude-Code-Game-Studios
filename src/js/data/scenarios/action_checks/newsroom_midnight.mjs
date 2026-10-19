/**
 * 「午夜编辑部」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement;
 * { roll: false, by: 'chase' | 'evidence' }: the chase's own rolls, or the evidence earlier rolls
 * found, settle it (an ending chosen by evidence has no options to go on with after a failure).
 */
export const newsroomMidnightChecks = {
    "newsroom": {
        "enter": {
            "skill": "说服",
            "fail": "你们刚摊开速记副本，主编便摆摆手，眼睛仍盯着校样，嘴里念着版面尺寸。你们讲的每一处时间，他都用一句「读者不在乎」挡回来。\n\n排字机的轰鸣从隔墙渗进来，压得人说话都要抬高嗓门。他终于抬头，只是为了看一眼挂钟。"
        },
        "scuffle": {
            "skill": "话术",
            "fail": "那排字工满嘴酒气，你们的劝说反倒像往炉子里添柴。他一把掀翻铅字盘，细小的字粒噼里啪啦撒了一地，几个学徒蹲下去捡，把过道堵得严严实实。\n\n等你们绕过这一地狼藉挤进主编室，他已重新埋头校样，连眼皮都懒得抬。"
        }
    },
    "false_lead_alley": {
        "back": {
            "skill": "图书馆使用",
            "fail": "编辑部的灯太暗，你们把一沓沓纸摊在排字架旁，油墨的热气熏得纸边发卷。抄录的时刻前后颠倒，来回比对，越看越像几份不同的东西被订在了一起。\n\n截稿钟又敲了一下，你们只好把这堆纸塞回公文包，扣不严的搭扣硌着手指。"
        },
        "editor2": {
            "skill": "说服",
            "fail": "你们一进门就开口，主编却先递来一支烟，问你们是不是也想上头版。几句玩笑把话头岔开，等再绕回正题，他已拿红笔一下下敲着桌沿，心思显然不在这里。\n\n窗框被雨敲得发颤，他靠回椅背，笑意里只剩疲惫。"
        }
    },
    "editor_strong": {
        "debunk": {
            "skill": "说服",
            "fail": "你们刚念出那条笔记的头一句，门口的排字工就哄笑起来，有人学着你们的腔调重复了一遍。主编抬手示意安静，却没有看你们手里的纸。\n\n笑声散得很慢。那页笔记在灯下微微卷边，像一片被人踩过的落叶。"
        },
        "expose": {
            "roll": false,
            "by": "evidence"
        }
    },
    "editor": {
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
