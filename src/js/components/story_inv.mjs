import { equipItemFromInventory } from './apex_equip_hud.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCItemDB } from '../data/items.mjs';

export const StoryInv = {
    name: 'StoryInv',
    template: `
        <div class="flex-grow-1 overflow-auto p-2 p-md-3 story-inv-panel apex-char-shell" @click="tooltipItem = null">
            <header class="apex-panel__head mb-3 justify-content-center">
                <coc-icon name="inventory" :size="18"></coc-icon>
                <span>随身行囊 · INVENTORY</span>
            </header>
            
            <div v-if="activeRoster.length > 1" class="apex-panel apex-panel--compact mb-3">
                <div class="small text-info d-flex align-items-center gap-2">
                    <coc-icon name="character" :size="14"></coc-icon>
                    <span>当前操作调查员：<b class="text-light">{{ selectedCharName }}</b></span>
                </div>
            </div>

            <section class="apex-panel apex-panel--flush">
            <ul class="list-group list-group-flush apex-inv-list">
                <li v-if="inventory.length === 0" class="list-group-item apex-inv-row empty-state empty-state-compact border-0">
                    <coc-icon name="inventory" :size="32" class="empty-state-icon text-secondary"></coc-icon>
                    <div class="empty-state-title">背包空空如也</div>
                    <div class="empty-state-hint">探索与战斗获得的物品会显示在这里</div>
                </li>
                <li v-for="(item, idx) in inventory" :key="idx" class="list-group-item apex-inv-row d-flex justify-content-between align-items-center inv-item" :data-tier="getItemTierKey(item) || undefined" @click.stop="toggleTooltip($event, item, idx)">
                    <div class="d-flex align-items-center gap-2">
                        <span v-if="getItemTierKey(item)" class="tier-badge" :class="'tier-badge-' + getItemTierKey(item)">
                            <coc-icon :name="getItemTierIconName(item)" :size="14"></coc-icon>
                        </span>
                        <span v-else class="item-icon-slot d-flex align-items-center justify-content-center">
                            <coc-icon :name="getItemIconName(item)" :size="20"></coc-icon>
                        </span>
                        <div>
                            <span class="item-name" style="cursor:pointer;">{{ getItemDisplayName(item) }}</span>
                            <small v-if="getItemSubtitle(item)" class="text-muted d-block" style="font-size:0.65rem;">{{ getItemSubtitle(item) }}</small>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-1 flex-shrink-0">
                        <span class="apex-badge apex-badge--sm me-1" :style="'--badge-bg:' + getCategoryColor(item)">{{ getItemTierLabel(item) || getItemCategory(item) }}</span>
                        <button v-if="isEquippable(item)" class="btn btn-sm apex-btn-accent" @click.stop="smartEquipItem(item, idx)">穿戴</button>
                        <button class="btn btn-sm apex-btn-ghost" @click.stop="moveToStorage(item, idx)">存入</button>
                    </div>
                </li>
            </ul>
            </section>

            <div v-if="tooltipItem" class="item-tooltip apex-item-tooltip" :style="{left: tooltipX + 'px', top: tooltipY + 'px'}" @click.stop>
                <div class="tooltip-header">
                    <coc-icon :name="getItemIconName(tooltipItem)" :size="18" class="tooltip-icon-svg"></coc-icon>
                    <strong>{{ getItemDisplayName(tooltipItem) }}</strong>
                    <span class="apex-badge apex-badge--sm ms-auto" :style="'--badge-bg:' + getCategoryColor(tooltipItem)">{{ getItemCategory(tooltipItem) }}</span>
                </div>
                <div class="tooltip-body">
                    <div v-if="getItemDamage(tooltipItem)" class="tooltip-row">
                        <span class="d-inline-flex align-items-center gap-1 text-danger"><coc-icon name="combat" :size="12"></coc-icon>伤害</span>
                        <strong>{{ getItemDamage(tooltipItem) }}</strong>
                    </div>
                    <div v-if="getItemRange(tooltipItem)" class="tooltip-row">
                        <span class="d-inline-flex align-items-center gap-1 text-info"><coc-icon name="eye" :size="12"></coc-icon>射程</span>
                        <span>{{ getItemRange(tooltipItem) }} 码</span>
                    </div>
                    <div v-if="getItemAmmo(tooltipItem)" class="tooltip-row">
                        <span class="d-inline-flex align-items-center gap-1 text-warning"><coc-icon name="pistol" :size="12"></coc-icon>目录弹容</span>
                        <span>{{ getItemAmmo(tooltipItem) }} 发（开火扣背包，无需先装填）</span>
                    </div>
                    <div v-else-if="getItemSubtitle(tooltipItem) && getItemSubtitle(tooltipItem).includes('无需装填')" class="tooltip-row text-muted">
                        <span>{{ getItemSubtitle(tooltipItem) }}</span>
                    </div>
                    <div v-if="getItemArmor(tooltipItem)" class="tooltip-row">
                        <span class="d-inline-flex align-items-center gap-1 text-primary"><coc-icon name="shield" :size="12"></coc-icon>护甲</span>
                        <span>{{ getItemArmor(tooltipItem) }}</span>
                    </div>
                    <div v-if="getItemNotes(tooltipItem)" class="tooltip-row">
                        <span class="d-inline-flex align-items-center gap-1 text-muted"><coc-icon name="scroll" :size="12"></coc-icon>{{ getItemNotes(tooltipItem) }}</span>
                    </div>
                    <div v-if="!getItemDamage(tooltipItem) && !getItemArmor(tooltipItem) && !getItemAmmo(tooltipItem) && !(getItemSubtitle(tooltipItem) && getItemSubtitle(tooltipItem).includes('无需装填'))" class="tooltip-row text-muted">
                        <span>暂无详细属性</span>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup(props, context) {
        const { computed, ref } = window.Vue;
        const tooltipItem = ref(null);
        const tooltipItemId = ref(-1);
        const tooltipX = ref(0);
        const tooltipY = ref(0);
        const state = CoCStateAccessor.getState();
        const gameState = state.gameState;
        const notify = (message, type = 'warning') => {
            if (CoCStateAccessor.showToast) CoCStateAccessor.showToast(message, type);
            else console.warn(message);
        };
        const activeRoster = computed(() => gameState.roster.filter(c => c.isActive));
        const selectedChar = computed(() => {
            const resolve = CoCStateAccessor.resolveSelectedActiveChar;
            if (typeof resolve === 'function') return resolve(gameState);
            CoCStateAccessor.clampSelectedCharIndex(gameState);
            const roster = gameState.roster || [];
            const at = roster[gameState.selectedCharIndex];
            if (at && at.isActive) return at;
            return activeRoster.value[0] || null;
        });
        const selectedCharName = computed(() => selectedChar.value ? selectedChar.value.name : "未知");
        const inventory = computed(() => gameState.inventory || []);

        const resolveItem = (item) => {
            if (!item) return {};
            if (typeof item === 'object' && item.name) return item;
            if (CoCStateAccessor.resolveItem) {
                const resolved = CoCStateAccessor.resolveItem(item);
                if (resolved && resolved.name) return resolved;
            }
            const name = typeof item === 'string' ? item : (item.name || String(item));
            if (window.parseItemData) return window.parseItemData(name);
            return { name, category: '杂物' };
        };

        const getItemDisplayName = (item) => {
            const r = resolveItem(item);
            return r.name || String(item);
        };
        const getItemCategory = (item) => {
            const r = resolveItem(item);
            return r.category || '杂物';
        };
        const getItemIconName = (item) => {
            const r = resolveItem(item);
            if (r.category === '手枪') return 'pistol';
            if (r.category === '步枪' || r.category === '霰弹枪' || r.category === '冲锋枪') return 'rifle';
            if (r.category === '武器' || r.type === 'melee') return 'equip';
            if (r.category === '护甲' || r.armor) return 'shield';
            if (r.category === '医疗') return 'growth';
            if (r.category === '工具') return 'settings';
            if (r.category === '文件' || r.category === '关键物品') return 'scroll';
            return 'inventory';
        };
        const getCategoryColor = (item) => {
            const r = resolveItem(item);
            if (CoCItemDB && CoCItemDB.getCategoryColor) {
                const tc = CoCItemDB.getCategoryColor(r);
                if (tc && tc !== '#6c757d') return tc;
            }
            if (r.tier && CoCItemDB && CoCItemDB.TIERS && CoCItemDB.TIERS[r.tier]) {
                return CoCItemDB.TIERS[r.tier].color;
            }
            if (r.category === '手枪' || r.category === '步枪' || r.category === '霰弹枪' || r.category === '冲锋枪') return '#d9534f';
            if (r.category === '武器') return '#f0ad4e';
            if (r.category === '护甲' || r.armor) return '#5bc0de';
            if (r.category === '医疗') return '#5cb85c';
            return '#6c757d';
        };
        const getItemSubtitle = (item) => {
            const r = resolveItem(item);
            if (r.damage) return `伤害 ${r.damage}`;
            if (r.armor) return `护甲 ${r.armor}`;
            // Ammo stays in backpack for fire_weapon — no UI load step required.
            if (r.category === '弹药' || r.type === 'ammo'
                || (typeof item === 'string' && (item.includes('子弹') || item.includes('弹药') || item.includes('ammo')))) {
                return '开火时从背包消耗（无需装填）';
            }
            return '';
        };
        const getItemDamage = (item) => { const r = resolveItem(item); return r.damage || ''; };
        const getItemRange = (item) => { const r = resolveItem(item); return r.range || ''; };
        const getItemAmmo = (item) => { const r = resolveItem(item); return r.ammo || ''; };
        const getItemArmor = (item) => { const r = resolveItem(item); return r.armor || ''; };
        const getItemNotes = (item) => { const r = resolveItem(item); return r.notes || ''; };
        const getItemTierLabel = (item) => {
            const r = resolveItem(item);
            if (r.tier && CoCItemDB && CoCItemDB.TIERS && CoCItemDB.TIERS[r.tier]) {
                return CoCItemDB.TIERS[r.tier].label;
            }
            return null;
        };
        const getItemTierKey = (item) => {
            const r = resolveItem(item);
            return r.tier || '';
        };
        const getItemTierIconName = (item) => {
            const key = getItemTierKey(item);
            if (!key) return '';
            return 'tier-' + key.toLowerCase();
        };
        const getItemTierIcon = (item) => getItemTierIconName(item);
        const isEquippable = (item) => {
            const r = resolveItem(item);
            return r.category === '武器' || r.category === '护甲' || r.armor || r.damage;
        };

        // ✅ Vue-reactive tooltip (replaces raw DOM manipulation)
        const toggleTooltip = (event, item, idx) => {
            if (tooltipItem.value && tooltipItemId.value === idx) {
                tooltipItem.value = null;
                tooltipItemId.value = -1;
                return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            tooltipItem.value = item;
            tooltipItemId.value = idx;
            tooltipX.value = Math.min(rect.right + 10, window.innerWidth - 300);
            tooltipY.value = Math.min(rect.top, window.innerHeight - 200);
            setTimeout(() => {
                const closer = () => { tooltipItem.value = null; tooltipItemId.value = -1; document.removeEventListener('click', closer); };
                document.addEventListener('click', closer, { once: true });
            }, 10);
        };

        const smartEquipItem = (itemString, idx) => {
            if (!selectedChar.value) { notify("没有活跃的调查员可以穿戴装备！"); return; }
            equipItemFromInventory(gameState, selectedChar.value, itemString, idx, notify);
        };

        const moveToStorage = (item, idx) => {
            const i = Number(idx);
            if (!Number.isInteger(i) || i < 0 || i >= gameState.inventory.length) {
                notify('转移失败：索引无效', 'warning');
                return;
            }
            if (gameState.inventory[i] !== item) {
                notify('转移失败：物品与索引不匹配', 'warning');
                return;
            }
            gameState.storage.push(item);
            gameState.inventory.splice(i, 1);
            notify('物品已转移至仓库。', 'info');
        };

        const getItemTypeName = (type) => {
            const map = { 'weapon':'武器', 'head':'头部', 'hands':'手套', 'feet':'鞋靴', 'accessory':'饰品', 'consumable':'消耗品', 'ammo':'弹药', 'misc':'杂物' };
            return map[type] || '杂物';
        };

        return { gameState, inventory, activeRoster, selectedCharName, tooltipItem, tooltipItemId, tooltipX, tooltipY, getItemDisplayName, getItemCategory, getItemIconName, getCategoryColor, getItemSubtitle, getItemDamage, getItemRange, getItemAmmo, getItemArmor, getItemNotes, getItemTierLabel, getItemTierIcon, getItemTierKey, getItemTierIconName, isEquippable, smartEquipItem, moveToStorage, getItemTypeName, toggleTooltip };
    }
};
