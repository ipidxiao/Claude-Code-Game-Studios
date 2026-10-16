// ===============================================
// 调查员立绘 — APEX 战术 HUD 风格 SVG 剪影
// ===============================================

import { charFlags, charWoundMarks } from './char_hud_helpers.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCItemDB } from '../data/items.mjs';

function archetypeFromChar(char) {
    const job = (char?.jobName || '').toLowerCase();
    if (/侦探|私家|记者/.test(job)) return 'detective';
    if (/教授|学者|图书|研究员|学生/.test(job)) return 'scholar';
    if (/士兵|海军|陆战|军人|退伍|警察/.test(job)) return 'soldier';
    if (/医生|护士/.test(job)) return 'medic';
    return 'investigator';
}

function tierRank(tier) {
    const map = { C: 2, B: 3, A: 4, S: 5, MYTHIC: 6 };
    return map[tier] || 0;
}

export const CharPortrait = {
    name: 'CharPortrait',
    props: {
        character: { type: Object, default: null },
        size: { type: String, default: 'md' },
        showGear: { type: Boolean, default: true },
        fill: { type: Boolean, default: false }
    },
    template: `
        <div class="char-portrait" :class="['char-portrait--' + size, 'char-portrait--' + archetype, { 'char-portrait--fill': fill, 'char-portrait--dying': flags.isDying, 'char-portrait--wound': flags.hasMajorWound, 'char-portrait--insane': flags.isInsane }]" role="img" :aria-label="ariaLabel">
            <div class="char-portrait__frame">
                <div class="char-portrait__scanline" aria-hidden="true"></div>
                <div class="char-portrait__glow" :style="glowStyle" aria-hidden="true"></div>
                <svg class="char-portrait__svg" viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="portraitBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="var(--apex-portrait-highlight)" stop-opacity="0.95"/>
                            <stop offset="100%" stop-color="var(--apex-portrait-shadow)" stop-opacity="0.35"/>
                        </linearGradient>
                        <filter id="portraitGlow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    <ellipse class="char-portrait__shadow" cx="60" cy="188" rx="34" ry="6"/>
                    <path class="char-portrait__body" d="M60 42c-14 0-24 10-24 24v8c0 6 4 10 10 12l-6 78c-1 8 6 14 14 14h12c8 0 15-6 14-14l-6-78c6-2 10-6 10-12v-8c0-14-10-24-24-24z" fill="url(#portraitBodyGrad)"/>
                    <circle class="char-portrait__head" cx="60" cy="32" r="18"/>
                    <path v-if="archetype === 'detective'" class="char-portrait__hat" d="M38 28h44l-4 8H42z"/>
                    <path v-if="archetype === 'scholar'" class="char-portrait__glasses" d="M48 30h8v6h-8zm16 0h8v6h-8zm-6 3h4"/>
                    <path v-if="archetype === 'soldier'" class="char-portrait__shoulder" d="M32 68 L48 58 M88 68 L72 58"/>
                    <path v-if="archetype === 'medic'" class="char-portrait__cross" d="M57 52h6v14h-6zm-3-3h12v6h-12z"/>
                    <path v-if="archetype === 'investigator'" class="char-portrait__coat" d="M42 70 L78 70 L82 120 L38 120 Z"/>
                    <g v-if="woundSlots.length" class="char-portrait__wounds" aria-hidden="true">
                        <ellipse v-if="woundSlots.includes('head')" class="char-portrait__wound" cx="60" cy="32" rx="20" ry="19"/>
                        <ellipse v-if="woundSlots.includes('torso')" class="char-portrait__wound" cx="60" cy="105" rx="15" ry="28"/>
                        <ellipse v-if="woundSlots.includes('rightArm')" class="char-portrait__wound" cx="36" cy="86" rx="9" ry="18"/>
                        <ellipse v-if="woundSlots.includes('leftArm')" class="char-portrait__wound" cx="84" cy="86" rx="9" ry="18"/>
                        <ellipse v-if="woundSlots.includes('rightLeg')" class="char-portrait__wound" cx="50" cy="160" rx="8" ry="18"/>
                        <ellipse v-if="woundSlots.includes('leftLeg')" class="char-portrait__wound" cx="70" cy="160" rx="8" ry="18"/>
                    </g>
                </svg>
                <div v-if="showGear" class="char-portrait__gear">
                    <div v-if="gearPreview.helmet" class="char-portrait__gear-item char-portrait__gear--head" :class="gearPreview.helmet.tierClass">
                        <coc-icon name="helmet" :size="gearIconSize"></coc-icon>
                    </div>
                    <div v-if="gearPreview.armor" class="char-portrait__gear-item char-portrait__gear--chest" :class="gearPreview.armor.tierClass">
                        <coc-icon name="shield" :size="gearIconSize"></coc-icon>
                    </div>
                    <div v-if="gearPreview.primary" class="char-portrait__gear-item char-portrait__gear--weapon" :class="gearPreview.primary.tierClass">
                        <coc-icon name="rifle" :size="gearIconSize + 4"></coc-icon>
                    </div>
                    <div v-if="gearPreview.secondary" class="char-portrait__gear-item char-portrait__gear--sidearm" :class="gearPreview.secondary.tierClass">
                        <coc-icon name="pistol" :size="gearIconSize"></coc-icon>
                    </div>
                    <div v-if="gearPreview.melee" class="char-portrait__gear-item char-portrait__gear--melee" :class="gearPreview.melee.tierClass">
                        <coc-icon name="equip" :size="gearIconSize"></coc-icon>
                    </div>
                </div>
                <div class="char-portrait__tag">
                    <span class="char-portrait__tag-label">OPERATIVE</span>
                    <span class="char-portrait__tag-name">{{ displayName }}</span>
                </div>
            </div>
        </div>
    `,
    computed: {
        archetype() {
            return archetypeFromChar(this.character);
        },
        flags() {
            return charFlags(this.character);
        },
        woundSlots() {
            return charWoundMarks(this.character).slots;
        },
        displayName() {
            return this.character?.name || '调查员';
        },
        ariaLabel() {
            const job = this.character?.jobName || '未知职业';
            const wounds = charWoundMarks(this.character).summary;
            return wounds
                ? `${this.displayName}，${job}立绘，重伤：${wounds}`
                : `${this.displayName}，${job}立绘`;
        },
        gearIconSize() {
            return this.size === 'lg' ? 22 : 18;
        },
        gearPreview() {
            const eq = this.character?.equipment || {};
            const acc = CoCStateAccessor;
            const resolve = (it) => (acc?.resolveItem ? acc.resolveItem(it) : null);
            const pack = (slotId) => {
                const raw = eq[slotId];
                if (!raw) return null;
                const r = resolve(raw) || (typeof raw === 'object' ? raw : { name: String(raw) });
                const tier = r.tier || 'C';
                return { tier, tierClass: `tier-${tier}` };
            };
            return {
                helmet: pack('helmet'),
                armor: pack('armor'),
                primary: pack('primary'),
                secondary: pack('secondary'),
                melee: pack('melee')
            };
        },
        glowStyle() {
            const eq = this.character?.equipment || {};
            const acc = CoCStateAccessor;
            const resolve = (it) => (acc?.resolveItem ? acc.resolveItem(it) : null);
            let best = { tier: 'C', color: 'var(--color-tier-c)' };
            Object.values(eq).forEach((raw) => {
                if (!raw) return;
                const r = resolve(raw) || (typeof raw === 'object' ? raw : {});
                const t = r.tier || 'C';
                if (tierRank(t) > tierRank(best.tier)) {
                    const tierDef = acc?.getItemTier ? acc.getItemTier(t) : CoCItemDB?.TIERS?.[t];
                    best = { tier: t, color: tierDef?.color || 'var(--color-tier-c)' };
                }
            });
            return { '--portrait-glow-color': best.color };
        }
    }
};
