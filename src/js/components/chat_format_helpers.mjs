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

/** KP assistant bubble: story + narration only, cleaned. */
export function formatAssistantDisplay(raw) {
    if (!raw) return '';
    const parsed = parseAIResponse(String(raw));
    const hasTagged = /【(?:骰子|叙事|旁白|交互|行动)】/.test(parsed.raw || '');
    if (hasTagged) {
        const parts = [parsed.storyPhase, parsed.narrationPhase].filter(Boolean);
        if (parts.length) return stripMarkdownLite(parts.join('\n\n'));
    }
    return stripMarkdownLite(parsed.raw || raw);
}

/**
 * Parse 【交互】/【行动】 into clickable suggestion buttons (AI mode).
 * @returns {{ id: string, label: string }[]}
 */
export function parseAiActionChoices(raw) {
    const text = String(raw || '');
    if (!text.trim()) return [];
    const parsed = parseAIResponse(text);
    const choices = [];
    const seen = new Set();

    const add = (id, label) => {
        const lab = stripMarkdownLite(String(label || '').trim());
        if (!lab || lab.length < 2 || seen.has(lab)) return;
        seen.add(lab);
        choices.push({ id: id || `opt_${choices.length}`, label: lab });
    };

    const interaction = parsed.interactionPhase || '';
    interaction.split(/\n/).forEach((line) => {
        const m = line.trim().match(/^(?:[-*•]|\d+[\.\)、])\s*(.+)$/);
        if (m) add(`i_${choices.length}`, m[1]);
    });

    const action = parsed.actionOrderPhase || '';
    const codes = action.match(/[A-Z]\d+(?:\s*[-–—]\s*[A-Z]\d+)*/g) || action.match(/[A-Z]\d+/g) || [];
    codes.forEach((code) => {
        const label = code.replace(/\s+/g, '');
        add(`a_${label}`, label);
    });

    if (!choices.length) {
        const tail = text.split(/\n{2,}/).pop() || '';
        tail.split(/\n/).forEach((line) => {
            const m = line.trim().match(/^(?:[-*•]|\d+[\.\)、]|(?:建议|选项|你可以)[:：]?)\s*(.+)$/i);
            if (m) add(`t_${choices.length}`, m[1]);
        });
    }

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
