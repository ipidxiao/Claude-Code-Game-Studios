/**
 * 「巷口到柏油路」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement;
 * { roll: false, by: 'chase' | 'evidence' }: the chase's own rolls, or the evidence earlier rolls
 * found, settle it (an ending chosen by evidence has no options to go on with after a failure).
 */
export const alleyToAsphaltChecks = {
    "alley": {
        "resolve": {
            "skill": "斗殴",
            "fail": "你们扑上去时，马克一肘撞在最近那人的肋下，烟头烫过手背，焦味混进腐鱼气里。等你们从空箱堆里撑起身，他已甩开半条巷子的距离。\n\n积水还在晃，靴底的回声越来越远，只能咬牙追上去。"
        }
    },
    "flee_foot": {
        "quiet_push": {
            "skill": "潜行",
            "fail": "你们贴着砖墙绕进晾衣绳下的窄道，偏偏踢倒一只空酒瓶。玻璃在石板上滚出清脆的长音，巷口那顶警帽转了过来，手电光扫过湿漉漉的墙皮。\n\n你们屏息蹲在煤堆后，等那光挪开，前方怠速的引擎声已经更响，也更近了。"
        },
        "push": {
            "roll": false,
            "by": "chase"
        }
    },
    "car_jump": {
        "gunfight": {
            "skill": "射击",
            "fail": "车身猛地一甩，你们扣下扳机的刹那，枪口撞上门框，子弹钻进路旁的煤气灯杆，火星溅进雨里。前车里的人影连头都没缩。\n\n枪声在耳膜里嗡嗡回荡，手腕发麻，黑色轿车的尾灯仍在前方摇晃。"
        }
    },
    "gunfight_hold": {
        "caught": {
            "roll": false,
            "by": "chase"
        }
    }
};
