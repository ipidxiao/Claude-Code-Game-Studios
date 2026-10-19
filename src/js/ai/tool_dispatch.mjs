import { CoCToolDefinitions } from '../tools/definitions.mjs';
// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { MAX_TOOL_ARG_STRING_LENGTH, MAX_TOOL_ARG_ARRAY_ITEMS } from './network.mjs';
/**
 * CoC AI Tool Dispatch Layer
 *
 * Tool-argument validation, schema look-up, API-call sanitization, and
 * tool-call-id integrity checks.  Uses ESM CoCToolDefinitions.
 */
export const getToolArgumentSchema = (toolName) => {
    const defs = CoCToolDefinitions || null;
    return (defs && typeof defs.getSchema === 'function') ? defs.getSchema(toolName) : null;
};
export const buildAiToolDefinitions = () => {
    const defs = CoCToolDefinitions || null;
    return (defs && typeof defs.buildTools === 'function') ? defs.buildTools() : [];
};
/**
 * Parse raw tool arguments (JSON string or object) into a {ok, value, error?} shape.
 * @param {string|Object|null} raw - Raw arguments from AI tool_call
 * @returns {{ok: boolean, value: Object, error?: string}}
 */
export const parseToolArguments = (raw) => {
    if (raw === null || raw === undefined || raw === '') return { ok: true, value: {} };
    if (typeof raw === 'object') return { ok: true, value: raw };
    try { return { ok: true, value: JSON.parse(raw) }; }
    catch (e) { return { ok: false, value: {}, error: `JSON解析失败：${e.message || e}` }; }
};
export const isEmptyRequiredValue = (value) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
/**
 * Normalize and validate a single tool argument value against its JSON schema.
 * Handles type coercion (number→string, singleAsArray wrapping), length caps,
 * and enum validation.  Errors are pushed into the `errors` array.
 * @param {*} value - Raw argument value
 * @param {Object} [schema={}] - JSON Schema fragment for this parameter
 * @param {string} [path='参数'] - Dot-path for error reporting
 * @param {string[]} [errors=[]] - Accumulated error messages
 * @returns {*} Normalized value, or undefined if invalid
 */
export const normalizeToolValue = (value, schema = {}, path = '参数', errors = []) => {
    if (!schema || !schema.type) return value;
    if (value === undefined || value === null) return undefined;

    if (schema.type === 'string') {
        if (typeof value !== 'string') {
            if (typeof value === 'number' || typeof value === 'boolean') value = String(value);
            else { errors.push(`${path} 应为字符串`); return undefined; }
        }
        value = value.trim();
        if (value.length > MAX_TOOL_ARG_STRING_LENGTH) value = value.slice(0, MAX_TOOL_ARG_STRING_LENGTH);
        if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} 必须是 ${schema.enum.join('/')}`);
        return value;
    }

    if (schema.type === 'number') {
        if (typeof value === 'string' && value.trim() !== '') value = Number(value);
        if (typeof value !== 'number' || !Number.isFinite(value)) { errors.push(`${path} 应为数字`); return undefined; }
        return value;
    }

    if (schema.type === 'array') {
        let arr = value;
        if (!Array.isArray(arr) && schema.singleAsArray) arr = [arr];
        if (!Array.isArray(arr)) { errors.push(`${path} 应为数组`); return []; }
        if (arr.length > MAX_TOOL_ARG_ARRAY_ITEMS) {
            errors.push(`${path} 数组过长，已限制为 ${MAX_TOOL_ARG_ARRAY_ITEMS} 项`);
            arr = arr.slice(0, MAX_TOOL_ARG_ARRAY_ITEMS);
        }
        const normalized = arr.map((item, idx) => normalizeToolValue(item, schema.items || {}, `${path}[${idx}]`, errors)).filter(v => v !== undefined);
        if (schema.minItems && normalized.length < schema.minItems) errors.push(`${path} 至少需要 ${schema.minItems} 项`);
        return normalized;
    }

    if (schema.type === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push(`${path} 应为对象`); return {}; }
        const out = {};
        const props = schema.properties || {};
        const allowAdditional = schema.additionalProperties === true;
        if (!allowAdditional) {
            const allowed = new Set(Object.keys(props));
            Object.keys(value).forEach((key) => {
                if (!allowed.has(key)) errors.push(`${path}.${key} 未在工具 schema 中声明`);
            });
        }
        Object.keys(props).forEach((key) => {
            if (value[key] !== undefined) out[key] = normalizeToolValue(value[key], props[key], `${path}.${key}`, errors);
        });
        (schema.required || []).forEach((key) => {
            if (isEmptyRequiredValue(out[key])) errors.push(`${path}.${key} 为必填参数`);
        });
        return out;
    }

    return value;
};
export const validateToolArguments = (toolName, rawArgs) => {
    const parsed = parseToolArguments(rawArgs);
    if (!parsed.ok) return { ok: false, args: {}, error: parsed.error };
    const schema = getToolArgumentSchema(toolName);
    if (!schema) return { ok: true, args: parsed.value || {} };
    const errors = [];
    const args = normalizeToolValue(parsed.value || {}, schema, toolName || 'tool', errors);
    if (errors.length) return { ok: false, args: args || {}, error: errors.join('；') };
    return { ok: true, args: args || {} };
};
export const hasValidToolCallId = (tool) => !!(tool && typeof tool.id === 'string' && tool.id.trim());
/**
 * Strip internal-only fields from tool_calls before sending to the AI API.
 * Only preserves: id, type='function', function.name, function.arguments.
 * @param {Array} toolCalls - Raw tool_calls array from chatHistory
 * @returns {Array} API-safe tool_calls array
 */
export const sanitizeToolCallsForApi = (toolCalls) => {
    if (!Array.isArray(toolCalls)) return [];
    return toolCalls
        .filter((tool) => hasValidToolCallId(tool) && tool.function && typeof tool.function.name === 'string' && tool.function.name.trim())
        .map((tool) => ({
            id: tool.id,
            type: 'function',
            function: {
                name: tool.function.name.trim(),
                arguments: typeof tool.function.arguments === 'string' ? tool.function.arguments : JSON.stringify(tool.function.arguments || {})
            }
        }));
};
