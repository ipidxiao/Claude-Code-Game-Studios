/**
 * 「灯塔夜班」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement;
 * { roll: false, by: 'chase' | 'evidence' }: the chase's own rolls, or the evidence earlier rolls
 * found, settle it (an ending chosen by evidence has no options to go on with after a failure).
 */
export const lighthouseNightWatchChecks = {
    "log_desk": {
        "debunk": {
            "skill": "图书馆使用",
            "fail": "你们把日志与绳结图逐行对照，可潮气晕开的墨迹偏偏落在最要紧的几处，一个数字既像三又像八。对着灯芯眯眼辨认，越看越拿不准。\n\n灯芯又跳了一下，窗外潮声一阵紧过一阵。那条笔记还摊在原处，旁边的铅笔批注被你们擦了又写，写了又擦。"
        },
        "finish": {
            "roll": false,
            "by": "evidence"
        }
    },
    "debunk_note": {
        "go": {
            "roll": false,
            "by": "evidence"
        }
    }
};
