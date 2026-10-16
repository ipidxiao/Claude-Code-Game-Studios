/**
 * CoC 7e pushed-roll failure consequences (structured, not narrative-only).
 * Keeper still narrates detail; engine writes status flags + severity.
 */

export const PUSH_FAIL_CONSEQUENCES = Object.freeze({
    default: [
        { id: 'exposed', severity: 'moderate', summary: '行动暴露，处境明显恶化。', status: { pushExposed: true } },
        { id: 'injury', severity: 'severe', summary: '受伤或器械反噬（1D3 伤害）。', damage: '1D3', status: { pushBackfire: true } },
        { id: 'lost_item', severity: 'moderate', summary: '关键物品掉落、损坏或被夺走。', status: { pushLostItem: true } },
        { id: 'alarm', severity: 'moderate', summary: '惊动他人或拉响警报。', status: { pushAlarm: true } }
    ],
    fumble: [
        { id: 'catastrophe', severity: 'extreme', summary: '灾难性后果：重伤风险、彻底暴露或不可逆损失。', damage: '1D6', status: { pushCatastrophe: true, pushExposed: true } },
        { id: 'trauma', severity: 'extreme', summary: '精神冲击（额外 1/1D4 SAN）。', sanLoss: '1/1D4', status: { pushTrauma: true } },
        { id: 'trapped', severity: 'severe', summary: '被困、被擒或陷入更糟局面。', status: { pushTrapped: true, grappled: { by: '情境', build: 0 } } }
    ],
    bySkill: {
        '锁匠': [{ id: 'jam_lock', severity: 'moderate', summary: '锁具卡死或工具折断。', status: { pushLostItem: true } }],
        '潜行': [{ id: 'spotted', severity: 'severe', summary: '被发现，遭遇开始。', status: { pushExposed: true, pushAlarm: true } }],
        '聆听': [{ id: 'mishear', severity: 'mild', summary: '误判声音来源，错过关键信息。', status: { pushMisread: true } }],
        '侦查': [{ id: 'miss_clue', severity: 'mild', summary: '关键痕迹被破坏或错过。', status: { pushMisread: true } }],
        '机械维修': [{ id: 'break_device', severity: 'severe', summary: '装置损坏，可能造成伤害。', damage: '1D3', status: { pushBackfire: true } }],
        '电气维修': [{ id: 'shock', severity: 'severe', summary: '触电或短路。', damage: '1D4', status: { pushBackfire: true } }],
        '说服': [{ id: 'offend', severity: 'moderate', summary: '对方彻底拒绝并怀有敌意。', status: { socialBackfire: true, pushExposed: true } }],
        '话术': [{ id: 'caught_lie', severity: 'moderate', summary: '谎言被识破。', status: { socialBackfire: true } }],
        '恐吓': [{ id: 'backfire_intimidate', severity: 'severe', summary: '对方反击或呼叫支援。', status: { socialBackfire: true, pushAlarm: true } }],
        '取悦': [{ id: 'awkward', severity: 'mild', summary: '场面尴尬，关系冷却。', status: { socialBackfire: true } }],
        '攀爬': [{ id: 'fall', severity: 'severe', summary: '跌落（按情境另行结算坠落）。', damage: '1D6', status: { prone: true } }],
        '跳跃': [{ id: 'sprain', severity: 'moderate', summary: '扭伤落地。', damage: '1D3', status: { prone: true } }],
        '游泳': [{ id: 'inhale', severity: 'severe', summary: '呛水，开始溺水。', status: { drowning: { roundsHeld: 1, conHalf: 25, kind: 'drowning' } } }],
        '斗殴': [{ id: 'counter', severity: 'severe', summary: '露出破绽，遭反击。', damage: '1D3', status: { pushExposed: true } }],
        '射击': [{ id: 'friendly_fire', severity: 'extreme', summary: '走火或误伤风险。', damage: '1D6', status: { pushCatastrophe: true } }]
    }
});

export function pickPushConsequence(skillName, isFumble) {
    const skill = String(skillName || '');
    const pool = isFumble
        ? PUSH_FAIL_CONSEQUENCES.fumble
        : (PUSH_FAIL_CONSEQUENCES.bySkill[skill] || PUSH_FAIL_CONSEQUENCES.default);
    const idx = Math.floor(Math.random() * pool.length);
    return Object.assign({ skill: skill || '未知', fumble: !!isFumble }, pool[idx]);
}
