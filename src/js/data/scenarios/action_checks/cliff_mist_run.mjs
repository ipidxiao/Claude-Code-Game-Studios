/**
 * 「雾崖险奔」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement;
 * { roll: false, by: 'chase' | 'evidence' }: the chase's own rolls, or the evidence earlier rolls
 * found, settle it (an ending chosen by evidence has no options to go on with after a failure).
 */
export const cliffMistRunChecks = {
    "trailhead": {
        "resolve": {
            "skill": "斗殴",
            "fail": "向导抡起灯笼的铁提手横扫过来，你们偏头躲开半寸，却被他一脚踹在膝弯，跪倒在湿冷的石阶上。煤油味呛进鼻腔，碎玻璃在掌下咯吱作响。\n\n等你们爬起来，雾里只剩一串越来越轻的脚步，崖下的潮声一浪盖过一浪。"
        }
    },
    "mist_path": {
        "push": {
            "roll": false,
            "by": "chase"
        }
    },
    "ledge_gap": {
        "leap": {
            "roll": false,
            "by": "chase"
        }
    }
};
