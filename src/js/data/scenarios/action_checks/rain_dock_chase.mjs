/**
 * 「雨夜码头」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement;
 * { roll: false, by: 'chase' | 'evidence' }: the chase's own rolls, or the evidence earlier rolls
 * found, settle it (an ending chosen by evidence has no options to go on with after a failure).
 */
export const rainDockChaseChecks = {
    "pier": {
        "resolve": {
            "skill": "斗殴",
            "fail": "莉娜抄起一截湿缆绳抽过来，你们抬臂去挡，脚下栈板一滑，膝盖重重磕在木钉上。咸水灌进袖口，冰得人一激灵。\n\n再抬头时，她的背影已在雨里缩成一道灰线，栈桥尽头传来引擎吃力的喘息。"
        }
    },
    "boat_jump": {
        "gunfight": {
            "skill": "射击",
            "fail": "一个浪头恰在此时掀起船首，你们的子弹打进雾里，连回声都没有。舱底的积水泼上膝头，枪管滴着咸水，握柄滑得像抹了油。\n\n前方的引擎声忽远忽近，雾堤合拢，那团模糊的船影仍在白茫茫里起伏。"
        }
    },
    "foot_dock": {
        "push": {
            "roll": false,
            "by": "chase"
        }
    },
    "gunfight_hold": {
        "caught": {
            "roll": false,
            "by": "chase"
        }
    }
};
