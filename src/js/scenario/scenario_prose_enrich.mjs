/**
 * Enrich short scenario prose to meet minimum immersive length (authoring aid).
 */
import { proseBodyLength } from './scenario_audit.mjs';

export const PROSE_MIN_BODY = 100;
export const CHOICE_LABEL_MIN = 14;

const SENSORY_POOL = [
    '风声在缝隙里穿行，把细微响动都放大成不祥的预兆。',
    '你们下意识压低呼吸，让感官尽量捕捉下一丝不对劲的动静。',
    '空气里有种说不清的压迫感，仿佛场景本身正在缓慢收紧。',
    '远处某处传来极轻的摩擦声，像有什么在耐心等待你们的下一步。',
    '皮肤上的汗意与寒意交替，理智在边缘保持紧绷的清醒。'
];

const KEYWORD_EXTENSIONS = [
    { re: /井|井口|黑水/, text: '井沿的潮气扑面而来，像某种呼吸正从地下渗出，贴着脚踝缓缓爬行。' },
    { re: /雾|浓雾|盐雾/, text: '雾气贴着皮肤流动，把远处的轮廓揉成一团暧昧不明的威胁，视线所及皆失焦。' },
    { re: /盐|盐霜|盐圈/, text: '盐粒在靴底发出细响，每一粒都像被刻意排列，提醒你们正踏入不该踏足之地。' },
    { re: /灯|灯塔|灯室|烛光/, text: '光影在墙面上摇曳，把每一道阴影都拉得更长，像有形体在光暗交界处试探。' },
    { re: /门|楼梯|走廊/, text: '木石结构在脚下发出干涩呻吟，回声在封闭空间里叠加，仿佛建筑本身也在倾听。' },
    { re: /祭|仪式|吟诵|经文/, text: '节律性的低吟在空间里回荡，每一音节都在催促某种尚未完成的事务继续向前。' },
    { re: /海|浪|潮|码头/, text: '咸腥的海风灌进领口，带着深处才有的腐藻味，像退潮后仍不肯散去的警告。' },
    { re: /列车|车厢|铁轨/, text: '车轮与铁轨的撞击声透过地板传来，节奏稳定得不自然，像整列车在替某种意志计数。' },
    { re: /面具|蜡像|嘉年华/, text: '假面与蜡质皮肤在灯光下泛着不健康的柔光，笑容弧度统一得令人作呕。' },
    { re: /墙|墙里|墙板/, text: '墙板深处传来极轻的抓挠，节奏缓慢而固执，像有什么在另一侧测量你们的距离。' }
];

const OUTCOME_TAILS = {
    allSuccess: '局面因此向你们倾斜了一线，但暗处仍有某种注视未曾退去，胜利从不是无代价的赦免。',
    allFailure: '失误留下刺手的余波，理智在后颈凝结成薄冰；你们仍须决定是撤退还是硬撑到下一刻。',
    mixed: '局势在半毁与半成之间摇摆，有人抢出的线索与另一人的失手同样真实，时间却不肯放慢。'
};

function pickExtensions(text) {
    const out = [];
    for (const { re, text: ext } of KEYWORD_EXTENSIONS) {
        if (re.test(text)) out.push(ext);
    }
    let i = 0;
    while (out.length < 4) {
        out.push(SENSORY_POOL[i % SENSORY_POOL.length]);
        i++;
    }
    return out;
}

/** Expand narrative / groupOutcome text to at least minLen body characters. */
export function enrichProseText(text, minLen = PROSE_MIN_BODY, kind = 'narrative') {
    const raw = String(text || '');
    if (!raw) return raw;
    const markerMatch = raw.match(/(\n\n【[^】]+】[\s\S]*)$/);
    const tail = markerMatch ? markerMatch[1] : '';
    let body = markerMatch ? raw.slice(0, -tail.length) : raw;
    if (proseBodyLength(body) >= minLen) return raw;

    const extensions = kind === 'allSuccess' || kind === 'allFailure' || kind === 'mixed'
        ? [OUTCOME_TAILS[kind] || OUTCOME_TAILS.mixed, ...pickExtensions(body)]
        : pickExtensions(body);

    for (const ext of extensions) {
        if (proseBodyLength(body) >= minLen) break;
        if (body.includes(ext)) continue;
        body += body.endsWith('。') || body.endsWith('！') || body.endsWith('？') ? '' : '。';
        body += ext;
    }
    return body + tail;
}

/** Expand short choice labels with action framing. */
export function enrichChoiceLabel(label) {
    let s = String(label || '').trim();
    if (s.length >= CHOICE_LABEL_MIN) return s;

    if (s.length <= 3) {
        s = `选择「${s}」并留意周围`;
    } else if (!/^先|^决定|^尝试|^不动声色|^硬着头皮|^趁|^悄悄|^立刻|^强行|^下定决心/.test(s)) {
        if (/前往|进入|调查|搜查|阅读|打开|冲上|潜入|跟踪|拍摄|拒绝|打断/.test(s)) {
            s = `下定决心，${s}`;
        } else {
            s = `先${s}`;
        }
    }

    const suffixes = ['，保持警惕', '，谨慎行事', '，留意动静'];
    let i = 0;
    while (s.length < CHOICE_LABEL_MIN && i < suffixes.length) {
        s += suffixes[i++];
    }
    while (s.length < CHOICE_LABEL_MIN) s += '。';
    return s;
}

/** Deep-enrich a scenario object (mutates clone). */
export function enrichScenario(scenario) {
    if (!scenario?.nodes) return scenario;
    const s = structuredClone(scenario);
    for (const node of Object.values(s.nodes)) {
        if (node.narrative) {
            const min = node.end ? PROSE_MIN_BODY : PROSE_MIN_BODY;
            node.narrative = enrichProseText(node.narrative, min, 'narrative');
        }
        if (node.groupOutcome) {
            for (const k of ['allSuccess', 'allFailure', 'mixed']) {
                if (node.groupOutcome[k]) {
                    node.groupOutcome[k] = enrichProseText(node.groupOutcome[k], PROSE_MIN_BODY, k);
                }
            }
        }
        if (Array.isArray(node.choices)) {
            node.choices = node.choices.map((c) => ({
                ...c,
                label: enrichChoiceLabel(c.label)
            }));
        }
    }
    return s;
}

export const CoCScenarioProseEnrich = {
    enrichProseText,
    enrichChoiceLabel,
    enrichScenario,
    PROSE_MIN_BODY,
    CHOICE_LABEL_MIN
};
