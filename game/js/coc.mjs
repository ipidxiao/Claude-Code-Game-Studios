// V18.4 Modular — thin ESM assembly layer
// Rule implementations live in js/engines/*.mjs (browser + Node share this graph)
// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { buildCoCEngine } from './engines/index.mjs';

/**
 * CoC 7th Edition Rules Engine — ESM entry (assembled from modular engines).
 * Browser and Node tests both load this module graph; no parallel .js track.
 */
const CoCEngine = buildCoCEngine();

export { CoCEngine };

if (typeof window !== 'undefined' && !window.CoCEngine) {
    // Avoid clobbering Node smoke mocks set before dynamic import.
    window.CoCEngine = CoCEngine;
}
