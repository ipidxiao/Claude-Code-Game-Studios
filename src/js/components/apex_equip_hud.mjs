/* ===============================================
   APEX Legends 风格装备 HUD — 共享组件
   人物页 / 装备 Tab 共用；槽位逻辑来自 CoCItemDB
   =============================================== */
import { CoCItemDB } from '../data/items.mjs';
import { CharPortrait } from './char_portrait.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';

const SLOT_ICON_IDS = {
    helmet: 'helmet',
    armor: 'shield',
    backpack: 'inventory',
    primary: 'rifle',
    secondary: 'pistol',
    melee: 'equip'
};

const LEGACY_SLOT_MAP = {
    head: 'helmet',
    body: 'armor',
    weapon: 'primary',
    hands: 'melee'
};

/** Migrate legacy paper-doll keys (head/weapon/…) to APEX slot ids. */
export function normalizeLegacyEquipment(char) {
    if (!char || !char.equipment || typeof char.equipment !== 'object') {
        if (char) char.equipment = {};
        return;
    }
    const eq = char.equipment;
    if ('helmet' in eq || 'primary' in eq || 'armor' in eq) return;
    for (const [legacy, apex] of Object.entries(LEGACY_SLOT_MAP)) {
        if (eq[legacy] && !eq[apex]) {
            eq[apex] = eq[legacy];
        }
        if (legacy in eq) delete eq[legacy];
    }
    ['acc1', 'acc2', 'feet'].forEach((k) => { if (k in eq) delete eq[k]; });
}

function resolveAccessor() {
    return CoCStateAccessor;
}

function resolveState() {
    try {
        return CoCStateAccessor.getState();
    } catch (_e) {
        return null;
    }
}

/** Equip resolved item from inventory index into APEX slot for active character. */
export function equipItemFromInventory(gameState, char, item, invIdx, notify) {
    if (!gameState || !char || item === undefined) return false;
    const inv = gameState.inventory;
    if (!Array.isArray(inv)) return false;
    const idx = Number(invIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= inv.length) {
        if (notify) notify('装备失败：物品索引无效', 'warning');
        return false;
    }
    const atIdx = inv[idx];
    const nameOf = (x) => (typeof x === 'string' ? x : (x && x.name) || '');
    if (item != null && nameOf(atIdx) !== nameOf(item) && atIdx !== item) {
        if (notify) notify('装备失败：背包索引与物品不匹配', 'warning');
        return false;
    }
    const useItem = atIdx;
    const acc = resolveAccessor();
    const resolve = (it) => (acc?.resolveItem ? acc.resolveItem(it) : CoCItemDB.resolve(it));
    const getSlotForItem = (it) => (acc?.getSlotForItem ? acc.getSlotForItem(it) : CoCItemDB.getSlotForItem(it));
    const canReplace = (a, b) => (acc?.canReplaceItem ? acc.canReplaceItem(a, b) : CoCItemDB.canReplace(a, b));
    const slots = acc?.getEquipSlots ? acc.getEquipSlots() : CoCItemDB.EQUIP_SLOTS;

    normalizeLegacyEquipment(char);
    const r = resolve(useItem);
    const slotKey = getSlotForItem(r);
    if (!slotKey || !slots[slotKey]) {
        if (notify) notify('该物品无法装入 APEX 装备槽', 'warning');
        return false;
    }
    const slot = slots[slotKey];
    if (!char.equipment) char.equipment = {};
    const existing = char.equipment[slot.id];
    if (existing && !canReplace(existing, r)) {
        if (notify) notify(`需要更高等级或同等级的${slot.label}才能替换`, 'warning');
        return false;
    }
    if (existing) gameState.inventory.push(existing);
    char.equipment[slot.id] = r;
    // Keep legacy weapon field in sync for combat/wound readers.
    if (slot.id === 'primary' || slot.id === 'secondary' || slot.id === 'melee') {
        char.equipment.weapon = typeof r === 'string' ? r : (r.name || useItem);
    }
    gameState.inventory.splice(idx, 1);
    if (notify) notify(`已装备 ${r.name || nameOf(useItem)} → ${slot.label}`, 'success');
    return true;
}

export const ApexEquipHud = {
    name: 'ApexEquipHud',
    props: {
        compact: { type: Boolean, default: false },
        showConsumables: { type: Boolean, default: true },
        layout: { type: String, default: 'auto' },
        showPortrait: { type: Boolean, default: false }
    },
    components: {
        CharPortrait
    },
    template: `
        <div class="apex-equip-hud" :class="hudClassList">
            <div class="apex-equip-panel story-equip-panel coc-panel-card" :class="{ 'apex-equip-panel--embedded': compact }">
                <div v-if="resolvedLayout === 'loadout'" class="apex-loadout" :class="{ 'apex-loadout--slots-only': !showPortrait }" role="group" aria-label="APEX 装备配置">
                    <div class="apex-loadout__portrait" v-if="showPortrait && selectedChar">
                        <char-portrait :character="selectedChar" size="lg" />
                    </div>
                    <div class="apex-loadout__slots">
                        <div v-for="slot in slots" :key="slot.id"
                            class="apex-slot apex-slot--loadout"
                            :class="[getSlotClass(slot), 'apex-slot--' + slot.id]"
                            tabindex="0"
                            role="button"
                            :aria-label="slot.label + '装备槽'"
                            @click="openSlotPicker(slot)"
                            @keydown.enter.prevent="openSlotPicker(slot)"
                            @dragover.prevent
                            @drop="onDrop($event, slot)">
                            <div class="apex-slot__corner apex-slot__corner--tl" aria-hidden="true"></div>
                            <div class="apex-slot__corner apex-slot__corner--br" aria-hidden="true"></div>
                            <div class="slot-icon">
                                <coc-icon :name="slotIconId(slot)" :size="22" :title="slot.label"></coc-icon>
                            </div>
                            <div class="slot-label">{{ slot.label }}</div>
                            <div v-if="getEquipped(slot)" class="slot-item">
                                <div class="slot-item-art" :class="'tier-' + (getItemTierKey(getEquipped(slot)) || 'C')">
                                    <coc-icon :name="slotIconId(slot)" :size="28"></coc-icon>
                                </div>
                                <div class="slot-item-name">{{ getEquippedName(slot) }}</div>
                                <div class="slot-tier" :style="{ color: getEquippedTierColor(slot) }">{{ getEquippedTierLabel(slot) }}</div>
                            </div>
                            <div v-else class="slot-empty">+ 装备</div>
                        </div>
                    </div>
                </div>
                <div v-else class="apex-slots apex-slots--bar" role="group" :aria-label="compact ? '人物装备槽' : 'APEX 装备 HUD'">
                    <div v-for="slot in slots" :key="slot.id"
                        class="apex-slot"
                        :class="getSlotClass(slot)"
                        tabindex="0"
                        role="button"
                        :aria-label="slot.label + '装备槽'"
                        @click="openSlotPicker(slot)"
                        @keydown.enter.prevent="openSlotPicker(slot)"
                        @dragover.prevent
                        @drop="onDrop($event, slot)">
                        <div class="slot-icon">
                            <coc-icon :name="slotIconId(slot)" :size="compact ? 18 : 22" :title="slot.label"></coc-icon>
                        </div>
                        <div class="slot-label">{{ slot.label }}</div>
                        <div v-if="getEquipped(slot)" class="slot-item">
                            <div class="slot-item-art" :class="'tier-' + (getItemTierKey(getEquipped(slot)) || 'C')">
                                <coc-icon :name="slotIconId(slot)" :size="compact ? 22 : 26"></coc-icon>
                            </div>
                            <div class="slot-item-name">{{ getEquippedName(slot) }}</div>
                            <div class="slot-tier" :style="{ color: getEquippedTierColor(slot) }">{{ getEquippedTierLabel(slot) }}</div>
                        </div>
                        <div v-else class="slot-empty">空</div>
                    </div>
                </div>
                <div v-if="showConsumables && !compact && resolvedLayout !== 'loadout'" class="apex-consumables" aria-label="消耗品快捷栏">
                    <div class="consumable-slot" v-for="n in 3" :key="'con'+n" title="消耗品槽（即将开放）">
                        <coc-icon name="inventory" :size="16" class="consumable-icon"></coc-icon>
                    </div>
                </div>
            </div>

            <div v-if="pickerSlot" class="apex-picker-overlay" @click="pickerSlot = null">
                <div class="apex-picker" role="dialog" aria-modal="true" @click.stop>
                    <div class="picker-header">
                        <span class="d-inline-flex align-items-center gap-1">
                            <coc-icon :name="slotIconId(pickerSlot)" :size="16"></coc-icon> {{ pickerSlot.label }}
                        </span>
                        <button type="button" class="btn btn-sm btn-outline-light" @click="pickerSlot = null">✕</button>
                    </div>
                    <div class="picker-body">
                        <div v-if="compatibleItems.length === 0" class="text-muted p-3 text-center">
                            背包中没有可装入此槽的物品<br>
                            <small>请先在「随身」页拾取对应类型装备</small>
                        </div>
                        <div v-for="(entry, idx) in compatibleItems" :key="entry.idx + '-' + idx"
                            class="picker-item"
                            :class="{ 'picker-selected': isEquipped(entry.item, pickerSlot) }"
                            :style="getPickerItemStyle(entry.item)"
                            @click="equipToSlot(pickerSlot, entry.item, entry.idx)">
                            <span v-if="getItemTierKey(entry.item)" class="picker-item-icon tier-badge" :class="'tier-badge-' + getItemTierKey(entry.item)">
                                <coc-icon :name="getItemTierIconName(entry.item)" :size="14"></coc-icon>
                            </span>
                            <div class="picker-item-info">
                                <strong>{{ getItemName(entry.item) }}</strong>
                                <small class="text-muted">{{ getItemSubtitle(entry.item) }}</small>
                            </div>
                            <span class="badge" :style="{ background: getItemTierColor(entry.item) }">{{ getItemTierLabel(entry.item) }}</span>
                            <span v-if="isEquipped(entry.item, pickerSlot)" class="text-success ms-2">✓ 已装备</span>
                        </div>
                    </div>
                    <div class="picker-footer">
                        <button type="button" class="btn btn-sm btn-outline-danger" @click="unequipSlot(pickerSlot)">卸下</button>
                        <button type="button" class="btn btn-sm btn-outline-warning" @click="dropEquipped(pickerSlot)">丢弃</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup(props) {
        const { computed, ref, watch } = window.Vue;
        const acc = resolveAccessor();
        const state = resolveState();
        const gameState = state?.gameState;
        const notify = (msg, type = 'info') => {
            if (state?.showToast) state.showToast(msg, type);
            else if (acc?.showToast) acc.showToast(msg, type);
        };

        const pickerSlot = ref(null);
        const slots = Object.values(acc?.getEquipSlots?.() || CoCItemDB.EQUIP_SLOTS || {});

        const activeRoster = computed(() => (gameState?.roster || []).filter((c) => c && c.isActive));
        const selectedChar = computed(() => {
            if (!state || !gameState) return null;
            const resolve = state.resolveSelectedActiveChar || acc?.resolveSelectedActiveChar;
            if (typeof resolve === 'function') return resolve(gameState);
            if (state.clampSelectedCharIndex) state.clampSelectedCharIndex(gameState);
            const roster = gameState.roster || [];
            const at = roster[gameState.selectedCharIndex];
            if (at && at.isActive) return at;
            return activeRoster.value[0] || null;
        });

        const resolvedLayout = computed(() => {
            if (props.layout === 'loadout' || props.layout === 'bar') return props.layout;
            return props.compact ? 'loadout' : 'bar';
        });

        const hudClassList = computed(() => ({
            'apex-equip-hud--compact': props.compact,
            'apex-equip-hud--full': !props.compact,
            'apex-equip-hud--loadout': resolvedLayout.value === 'loadout'
        }));

        watch(selectedChar, (char) => {
            if (char) normalizeLegacyEquipment(char);
        }, { immediate: true });

        const resolve = (item) => (acc?.resolveItem ? acc.resolveItem(item) : CoCItemDB.resolve(item));

        const slotIconId = (slot) => slot.iconId || SLOT_ICON_IDS[slot.id] || 'equip';

        const slotKeyFor = (slot) => {
            const entry = Object.entries(CoCItemDB.EQUIP_SLOTS || {}).find(([, def]) => def.id === slot.id);
            return entry ? entry[0] : slot.id.toUpperCase();
        };

        const getEquipped = (slot) => {
            const char = selectedChar.value;
            if (!char?.equipment) return null;
            return char.equipment[slot.id] || null;
        };

        const getEquippedName = (slot) => {
            const item = getEquipped(slot);
            if (!item) return '';
            return typeof item === 'object' ? (item.name || '') : String(item);
        };

        const getItemTierKey = (item) => resolve(item)?.tier || '';

        const getItemTierIconName = (item) => {
            const key = getItemTierKey(item);
            return key ? `tier-${key.toLowerCase()}` : '';
        };

        const getEquippedTierLabel = (slot) => {
            const item = getEquipped(slot);
            if (!item) return '';
            const r = resolve(item);
            const tier = acc?.getItemTier ? acc.getItemTier(r.tier) : CoCItemDB.TIERS[r.tier];
            return tier ? tier.label.split('·')[0].trim() : '';
        };

        const getEquippedTierColor = (slot) => {
            const item = getEquipped(slot);
            if (!item) return 'var(--equip-slot-text)';
            const r = resolve(item);
            const tier = acc?.getItemTier ? acc.getItemTier(r.tier) : CoCItemDB.TIERS[r.tier];
            return tier ? tier.color : 'var(--equip-slot-text)';
        };

        const getSlotClass = (slot) => {
            const item = getEquipped(slot);
            if (!item) return 'slot-empty-state';
            const r = resolve(item);
            return `tier-${r.tier || 'C'}`;
        };

        const compatibleItems = computed(() => {
            if (!pickerSlot.value || !selectedChar.value || !gameState?.inventory) return [];
            const wantKey = slotKeyFor(pickerSlot.value);
            return gameState.inventory
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) => {
                    const slotForItem = acc?.getSlotForItem
                        ? acc.getSlotForItem(item)
                        : CoCItemDB.getSlotForItem(item);
                    return slotForItem === wantKey;
                });
        });

        const getItemName = (item) => resolve(item)?.name || String(item);
        const getItemTierLabel = (item) => {
            const r = resolve(item);
            const tier = acc?.getItemTier ? acc.getItemTier(r.tier) : CoCItemDB.TIERS[r.tier];
            return tier ? tier.label : '';
        };
        const getItemTierColor = (item) => {
            const r = resolve(item);
            const tier = acc?.getItemTier ? acc.getItemTier(r.tier) : CoCItemDB.TIERS[r.tier];
            return tier ? tier.color : 'var(--equip-slot-text)';
        };
        const getItemSubtitle = (item) => {
            const r = resolve(item);
            const parts = [];
            if (r.damage) parts.push('⚔' + r.damage);
            if (r.armor) parts.push('🛡' + r.armor);
            if (r.range) parts.push('🎯' + r.range + 'm');
            if (r.ammo) parts.push('🔫' + r.ammo);
            return parts.join(' ') || r.desc || '';
        };
        const getPickerItemStyle = (item) => {
            const color = getItemTierColor(item);
            return color ? `border-left: 3px solid ${color}` : '';
        };
        const isEquipped = (item, slot) => {
            const equipped = getEquipped(slot);
            if (!equipped) return false;
            return getItemName(item) === getItemName(equipped);
        };

        const openSlotPicker = (slot) => { pickerSlot.value = slot; };

        const equipToSlot = (slot, item, invIdx) => {
            const char = selectedChar.value;
            if (!char) return;
            if (isEquipped(item, slot)) {
                unequipSlot(slot);
                return;
            }
            equipItemFromInventory(gameState, char, item, invIdx, notify);
            pickerSlot.value = null;
        };

        const unequipSlot = (slot) => {
            const char = selectedChar.value;
            if (!char?.equipment) return;
            const equipped = getEquipped(slot);
            if (equipped) {
                if (!Array.isArray(gameState.inventory)) gameState.inventory = [];
                gameState.inventory.push(equipped);
                char.equipment[slot.id] = null;
                notify(`已卸下${slot.label}`, 'info');
            }
            pickerSlot.value = null;
        };

        const dropEquipped = (slot) => {
            const char = selectedChar.value;
            if (!char?.equipment) return;
            if (getEquipped(slot)) {
                char.equipment[slot.id] = null;
                notify(`已丢弃${slot.label}上的装备`, 'warning');
            }
            pickerSlot.value = null;
        };

        const onDrop = (event, slot) => {
            event.preventDefault();
            const itemName = event.dataTransfer?.getData('text/plain');
            if (!itemName || !gameState?.inventory) return;
            const idx = gameState.inventory.findIndex((i) => getItemName(i) === itemName || i === itemName);
            if (idx >= 0) equipToSlot(slot, gameState.inventory[idx], idx);
        };

        return {
            slots, pickerSlot, compatibleItems, selectedChar, resolvedLayout, hudClassList,
            slotIconId, getEquipped, getEquippedName, getEquippedTierLabel, getEquippedTierColor,
            getSlotClass, getItemName, getItemTierLabel, getItemTierColor, getItemTierKey, getItemTierIconName,
            getItemSubtitle, getPickerItemStyle, isEquipped,
            openSlotPicker, equipToSlot, unequipSlot, dropEquipped, onDrop
        };
    }
};
