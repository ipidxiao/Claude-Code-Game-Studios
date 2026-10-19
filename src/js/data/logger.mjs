// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * Conditional logger — wraps console methods so production builds can
 * suppress debug output while keeping error/warn always on.
 *
 * Set window.COC_LOG_LEVEL to 'debug' to enable all logs.
 * Default (unset): only error + warn are shown.
 */
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, none: 99 };
const currentLevel = (typeof window !== 'undefined' && window.COC_LOG_LEVEL)
    ? (LEVELS[window.COC_LOG_LEVEL] ?? LEVELS.warn)
    : LEVELS.warn;

const noop = function() {};

export const CoCLog = {
    debug: currentLevel <= LEVELS.debug ? console.debug.bind(console) : noop,
    log:   currentLevel <= LEVELS.debug ? console.log.bind(console) : noop,
    info:  currentLevel <= LEVELS.info  ? console.info.bind(console) : noop,
    warn:  console.warn.bind(console),
    error: console.error.bind(console),
};

if (typeof window !== 'undefined') {
    window.CoCLog = CoCLog;
}
