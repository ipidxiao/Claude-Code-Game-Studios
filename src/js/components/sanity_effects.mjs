/**
 * SAN overlay — mounts on #app. Reads canonical derived.sanity / insanity flags.
 */
import { charFlags, charSanCurrent, charSanMax } from './char_hud_helpers.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCEngine } from '../coc.mjs';
import { resolveSelectedActiveChar } from '../state/selection.mjs';

export const SanityEffects = {
    name: 'SanityEffects',
    template: '<div id="san-overlay" :class="overlayClass" aria-hidden="true"></div>',
    setup() {
        const Vue = window.Vue;
        const { ref, computed, watch, onBeforeUnmount } = Vue;
        const acc = () => CoCStateAccessor;  // ESM

        const shockTimer = ref(null);
        const lastSan = ref(null);

        const activeChar = computed(() => {
            const gs = acc()?.getGameState?.();
            const roster = gs?.roster || [];
            return resolveSelectedActiveChar(gs) || roster.find((r) => r && r.isActive) || roster[0] || null;
        });

        const currentSan = computed(() => charSanCurrent(activeChar.value));
        const maxSan = computed(() => charSanMax(activeChar.value));
        const sanRatio = computed(() => maxSan.value > 0 ? currentSan.value / maxSan.value : 1);
        const insane = computed(() => charFlags(activeChar.value).isInsane);

        const overlayClass = computed(() => {
            if (insane.value) return 'madness-border';
            if (sanRatio.value < 0.2) return 'critical-san';
            if (sanRatio.value < 0.4) return 'very-low-san';
            if (sanRatio.value < 0.6) return 'low-san';
            return '';
        });

        const triggerShock = () => {
            const app = document.getElementById('app');
            if (!app) return;
            app.classList.remove('san-shock', 'san-shake');
            void app.offsetWidth;
            app.classList.add('san-shock', 'san-shake');
            clearTimeout(shockTimer.value);
            shockTimer.value = setTimeout(() => {
                app.classList.remove('san-shock', 'san-shake');
            }, 700);
        };

        watch(currentSan, (newVal, oldVal) => {
            if (oldVal == null) {
                lastSan.value = newVal;
                return;
            }
            if (newVal >= oldVal) {
                lastSan.value = newVal;
                return;
            }
            const loss = oldVal - newVal;
            lastSan.value = newVal;
            const narr = CoCEngine?.SanityEngine?.getSanNarrative?.(loss);
            if (narr?.shake || narr?.shock || loss >= 3) triggerShock();
        });

        watch(insane, (val) => {
            const app = document.getElementById('app');
            if (!app) return;
            if (val) app.classList.add('san-pulse');
            else app.classList.remove('san-pulse');
        });

        onBeforeUnmount(() => {
            clearTimeout(shockTimer.value);
            const app = document.getElementById('app');
            if (app) app.classList.remove('san-pulse', 'san-shock', 'san-shake');
        });

        return { overlayClass };
    }
};
