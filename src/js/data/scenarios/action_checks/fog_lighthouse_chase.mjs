/**
 * 「雾锁灯塔」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement;
 * { roll: false, by: 'chase' | 'evidence' }: the chase's own rolls, or the evidence earlier rolls
 * found, settle it (an ending chosen by evidence has no options to go on with after a failure).
 */
export const fogLighthouseChaseChecks = {
    "fog_path": {
        "resolve": {
            "skill": "斗殴",
            "fail": "卡尔猛地矮身，一记头槌撞在你们胸口，石阶上的青苔让你们连退三步，掌心在岩棱上擦出血来。油灯碎片还在地上冒烟。\n\n等你们撑着湿冷的石壁站稳，他的脚步声已经钻进雾里，只剩崖边碎石滚落的声音在引路。"
        }
    },
    "cliff_hazard": {
        "leap": {
            "skill": "跳跃",
            "fail": "起跳时脚下的岩块一松，你们只扑过去半个身子，胸口重重砸在对面石沿上，手指死死扣进湿苔。下方潮声翻涌，冷气从岩缝里往上冒。\n\n好不容易爬上来，膝头已经磨破，铁门那边的油灯光晃了晃，正一级级往高处去。"
        }
    },
    "cliff_run": {
        "push": {
            "roll": false,
            "by": "chase"
        }
    },
    "tower_stairs": {
        "caught": {
            "roll": false,
            "by": "chase"
        }
    }
};
