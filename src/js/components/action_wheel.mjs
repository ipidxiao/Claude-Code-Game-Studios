/**
 * Action menu — the 行动 button opens a list of the available actions, upward from the button.
 * Replaced the quarter-circle fan (author, 2026-10-18): a list reads every label in full on a phone
 * and needs no aiming. Component name and props are unchanged; it emits `select` with the action.
 */

export const ActionWheel = {
    name: 'ActionWheel',
    props: {
        actions: { type: Array, default: () => [] },
        title: { type: String, default: '选择行动' },
        disabled: { type: Boolean, default: false },
        variant: { type: String, default: 'fab' }
    },
    emits: ['select'],
    data() {
        return { open: false, panelStyle: {} };
    },
    computed: {
        count() {
            return Array.isArray(this.actions) ? this.actions.length : 0;
        }
    },
    watch: {
        // The list follows the actions on offer; with none left there is nothing to show.
        count(n) { if (!n) this.close(); }
    },
    methods: {
        /** Anchor the list's bottom-left corner just above the button, kept inside the viewport. */
        place() {
            const btn = this.$refs.trigger;
            if (!btn || typeof window === 'undefined') return;
            const r = btn.getBoundingClientRect();
            const margin = 12;
            const left = Math.max(margin, Math.min(r.left, window.innerWidth - margin - Math.min(420, window.innerWidth - 2 * margin)));
            this.panelStyle = { left: `${left}px`, bottom: `${Math.max(margin, window.innerHeight - r.top + 8)}px` };
        },
        toggle() {
            if (this.disabled || !this.count) return;
            if (this.open) { this.close(); return; }
            this.place();
            this.open = true;
            window.addEventListener('resize', this.place, { passive: true });
            this.$nextTick(() => { const first = this.$refs.items && this.$refs.items.querySelector('button'); if (first) first.focus(); });
        },
        close() {
            if (!this.open) return;
            this.open = false;
            window.removeEventListener('resize', this.place);
            if (this.$refs.trigger) this.$refs.trigger.focus();
        },
        pick(action) {
            if (!action) return;
            this.close();
            this.$emit('select', action);
        },
        onKeydown(e) {
            if (this.open && e.key === 'Escape') this.close();
        }
    },
    mounted() {
        document.addEventListener('keydown', this.onKeydown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onKeydown);
        window.removeEventListener('resize', this.place);
    },
    template: `
        <div class="apex-action-wheel-host" :class="'apex-action-wheel-host--' + variant">
            <teleport to="body">
                <div v-if="open" class="apex-action-list-root">
                    <div class="apex-action-list-backdrop" aria-hidden="true" @click="close"></div>
                    <div class="apex-action-list" role="menu" :aria-label="title" :style="panelStyle">
                        <div class="apex-action-list__head">
                            <span>{{ title }}</span>
                            <button type="button" class="apex-action-list__close" @click="close" aria-label="收起行动列表">收起</button>
                        </div>
                        <div ref="items" class="apex-action-list__items">
                            <button v-for="(action, i) in actions" :key="'a-' + (action.id || i)"
                                type="button" role="menuitem" class="apex-action-list__item" @click="pick(action)">
                                <coc-icon :name="action.icon || (action.skillHint ? 'dice' : 'scroll')" :size="18"></coc-icon>
                                <span class="apex-action-list__text">{{ action.label }}
                                    <span v-if="action.skillHint" class="apex-action-list__skill">需要检定：{{ action.skillHint }}</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </teleport>

            <button type="button"
                ref="trigger"
                class="apex-action-wheel-trigger"
                :class="{ 'apex-action-wheel-trigger--fab': variant === 'fab' }"
                :disabled="disabled || !count"
                :aria-expanded="open ? 'true' : 'false'"
                :aria-label="title + '，点击展开行动列表'"
                aria-haspopup="menu"
                @click="toggle">
                <span class="apex-action-wheel-trigger__cone" aria-hidden="true"></span>
                <span class="apex-action-wheel-trigger__ring" aria-hidden="true"></span>
                <coc-icon name="combat" :size="variant === 'fab' ? 24 : 22" aria-hidden="true" class="apex-action-wheel-trigger__icon"></coc-icon>
                <span class="apex-action-wheel-trigger__label">行动</span>
            </button>
        </div>
    `
};
