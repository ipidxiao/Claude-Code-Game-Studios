/* ===============================================
   归属：【美术】 视觉样式 / UI皮肤
   APEX 装备 Tab — 战术 HUD + 立绘
   =============================================== */
import { ApexEquipHud } from './apex_equip_hud.mjs';
import { CharPortrait } from './char_portrait.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';

export const StoryEquip = {
    name: 'StoryEquip',
    components: { ApexEquipHud, CharPortrait },
    template: `
        <div class="flex-grow-1 overflow-auto p-3 d-flex flex-column story-equip-tab apex-char-shell">
            <div class="apex-equip-hero text-center mb-3">
                <div class="apex-hud-sub text-uppercase">Tactical Loadout</div>
                <h5 class="apex-hud-title d-inline-flex align-items-center justify-content-center gap-2 mb-1">
                    <coc-icon name="equip" :size="22"></coc-icon> APEX 装备 HUD
                </h5>
                <p class="apex-hud-meta mb-0">搜 · 打 · 撤 — 六槽位等级替换 · 点击槽位从背包装备</p>
            </div>
            <div class="apex-equip-stage flex-grow-1">
                <apex-equip-hud layout="loadout" :show-portrait="true" :show-consumables="true" />
            </div>
        </div>
    `,
    setup() {
        return CoCStateAccessor.bindVueSetup();
    }
};
