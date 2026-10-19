// Pure chat / toast formatting helpers — shared by UI components and tests.

import { parseAIResponse } from '../ai/output_protocol.mjs';

export function toastTitle(type) {
    return ({ success: '成功', warning: '注意', danger: '错误', info: '提示' }[type]) || '提示';
}

/** Light markdown → plain text for in-game chat (no raw ** or protocol tags). */
export function stripMarkdownLite(text) {
    if (!text) return '';
    return String(text)
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*]\s+/gm, '• ')
        .trim();
}

/** KP assistant bubble: the story only — never a section header, the dice lines or the action list. */
export function formatAssistantDisplay(raw) {
    if (!raw) return '';
    const parsed = parseAIResponse(String(raw));
    const parts = [parsed.storyPhase, parsed.narrationPhase].filter(Boolean);
    return stripMarkdownLite(parts.length ? parts.join('\n\n') : String(raw));
}

// A list marker in front of an action: "1. ", "- ", "（A）", "A1 ".
const ACTION_MARKER_RE = /^\s*(?:[-*•]\s*|\d+\s*[.)、．]\s*|[（(][A-Za-z\d][)）]\s*|[A-Z]\d*\s*[.)、．:：]\s*|[A-Z]\d+\s+)/;

/**
 * The reply's 【行动】 list as buttons for the action menu (AI mode): one per line or per "；" item,
 * labelled by what it does — list markers and letter codes removed, bare codes dropped.
 * @returns {{ id: string, label: string }[]}
 */
export function parseAiActionChoices(raw) {
    const text = String(raw || '');
    if (!text.trim()) return [];
    const parsed = parseAIResponse(text);
    const choices = [];
    const seen = new Set();

    const add = (label) => {
        const lab = stripMarkdownLite(String(label || '').replace(ACTION_MARKER_RE, '').replace(/[。；;]+$/, '').trim());
        if (!lab || lab.length < 2 || /^[A-Z]\d*(?:\s*[-–—]\s*[A-Z]\d*)*$/i.test(lab) || seen.has(lab)) return;
        seen.add(lab);
        choices.push({ id: `act_${choices.length}`, label: lab });
    };

    const list = parsed.actionOrderPhase || parsed.interactionPhase || '';
    list.split(/\n/).forEach((line) => line.split(/[；;]/).forEach(add));
    return choices.slice(0, 6);
}

export function formatChatContent(msg) {
    if (!msg) return '';
    if (msg.statusAlert && msg.statusAlert.kind === 'hp_damage') {
        const sa = msg.statusAlert;
        const lines = [`🩸 ${sa.name} 失去 ${sa.dmg} 点生命（${sa.hp}/${sa.maxHp}）`];
        if (Array.isArray(sa.lines)) lines.push(...sa.lines);
        if (sa.majorWound && sa.majorWound.droppedWeapon) lines.push(`🔻 武器掉落：${sa.majorWound.droppedWeapon}`);
        if (sa.majorWound && sa.majorWound.bleeding) lines.push('🩸 内出血！需立即急救。');
        return lines.filter(Boolean).join('\n');
    }
    // Local scenario KP: keep original paragraph breaks (no protocol reparse).
    if (msg.role === 'assistant' && msg._scenario) {
        return stripMarkdownLite(msg.content || '');
    }
    if (msg.role === 'assistant') {
        return msg.displayContent || formatAssistantDisplay(msg.content);
    }
    return stripMarkdownLite(msg.content || '');
}
