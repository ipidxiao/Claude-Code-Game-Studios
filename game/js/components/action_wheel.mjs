/**
 * Action fan — quarter-circle wedges (90° from bottom-left).
 * Perf: shared SVG fills + one highlight wedge; CSS open/close; rAF hover.
 */

const FAN_PAD_DEG = 8;
const FAN_SPAN_DEG = 90;
const FAN_MIN_INNER = 72;
const FAN_MAX_INNER = 136;
const FAN_MIN_BAND = 152;
const FAN_MAX_SIZE = 480;

let fanUidCounter = 0;

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && !!window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function fanStartDeg() {
    return FAN_PAD_DEG;
}

function fanSpanDeg() {
    return FAN_SPAN_DEG - FAN_PAD_DEG * 2;
}

function computeFanLayout(actions, title) {
    const list = Array.isArray(actions) ? actions : [];
    const count = Math.max(list.length, 1);
    const spanDeg = fanSpanDeg();
    const startDeg = fanStartDeg();
    const sliceDeg = spanDeg / count;

    const titleText = String(title || '选择行动').trim();
    const titleLen = titleText.length;
    const hubLines = Math.min(2, Math.ceil(titleLen / 7) || 1);
    const hubCharW = 8.8;
    const hubLineH = 13;
    const hubHintH = 10;
    const hubGap = 5;
    const hubTextW = Math.min(titleLen, 7) * hubCharW + 16;
    const hubTextH = hubLines * hubLineH + hubGap + hubHintH + 12;
    const inner = Math.max(
        FAN_MIN_INNER,
        Math.min(FAN_MAX_INNER, Math.ceil(Math.max(hubTextW, hubTextH) / 0.7))
    );

    let maxLabelLen = 4;
    let anySkill = false;
    for (const a of list) {
        maxLabelLen = Math.max(maxLabelLen, (a.label || '').length);
        if (a.skillHint || a.skillCheck?.skill) anySkill = true;
    }

    const charsPerLine = Math.max(4, Math.floor(sliceDeg * 0.22));
    const labelLines = Math.min(3, Math.ceil(maxLabelLen / charsPerLine));
    const iconBand = 20;
    const lineBand = labelLines * 16;
    const skillBand = anySkill ? 14 : 0;
    const padBand = 28;
    let band = Math.max(FAN_MIN_BAND, iconBand + lineBand + skillBand + padBand);

    const tentativeLabelR = inner + band * 0.64;
    const arcLen = (sliceDeg * Math.PI / 180) * tentativeLabelR;
    const minArcForText = maxLabelLen * 7.4;
    if (arcLen < minArcForText) {
        const neededR = minArcForText / ((sliceDeg * Math.PI) / 180);
        band = Math.max(band, neededR - inner + 24);
    }

    const size = Math.min(FAN_MAX_SIZE, inner + band + 16);
    const outer = size - 8;
    const actualBand = outer - inner;

    let labelRadius;
    if (count <= 2) labelRadius = inner + actualBand * 0.72;
    else if (count <= 3) labelRadius = inner + actualBand * 0.66;
    else if (count <= 5) labelRadius = inner + actualBand * 0.6;
    else labelRadius = inner + actualBand * 0.54;

    return {
        size,
        inner,
        outer,
        labelRadius,
        spanDeg,
        startDeg,
        sliceDeg,
        count,
        maxLabelLen,
        labelLines,
        charsPerLine,
        originX: 0,
        originY: size
    };
}

function polarXY(r, deg, ox, oy) {
    const rad = (deg * Math.PI) / 180;
    return {
        x: ox + r * Math.cos(rad),
        y: oy - r * Math.sin(rad)
    };
}

function fanWedgePath(i, layout) {
    const { count, outer, inner, spanDeg, startDeg, originX, originY } = layout;
    if (!count) return '';
    const slice = spanDeg / count;
    const a0 = startDeg + i * slice;
    const a1 = startDeg + (i + 1) * slice;
    const p0i = polarXY(inner, a0, originX, originY);
    const p1i = polarXY(inner, a1, originX, originY);
    const p0o = polarXY(outer, a0, originX, originY);
    const p1o = polarXY(outer, a1, originX, originY);
    const large = slice > 180 ? 1 : 0;
    return [
        `M ${p0i.x.toFixed(2)} ${p0i.y.toFixed(2)}`,
        `L ${p0o.x.toFixed(2)} ${p0o.y.toFixed(2)}`,
        `A ${outer} ${outer} 0 ${large} 1 ${p1o.x.toFixed(2)} ${p1o.y.toFixed(2)}`,
        `L ${p1i.x.toFixed(2)} ${p1i.y.toFixed(2)}`,
        `A ${inner} ${inner} 0 ${large} 0 ${p0i.x.toFixed(2)} ${p0i.y.toFixed(2)}`,
        'Z'
    ].join(' ');
}

function fanDividerPath(i, layout) {
    const { count, outer, inner, spanDeg, startDeg, originX, originY } = layout;
    if (!count) return '';
    const slice = spanDeg / count;
    const a = startDeg + i * slice;
    const p0 = polarXY(inner + 1, a, originX, originY);
    const p1 = polarXY(outer - 1, a, originX, originY);
    return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

function labelStyleFor(i, layout, action) {
    const { count, spanDeg, startDeg, labelRadius, size, sliceDeg } = layout;
    const slice = spanDeg / count;
    const mid = startDeg + (i + 0.5) * slice;
    const p = polarXY(labelRadius, mid, 0, size);
    const rotate = -(mid - 45) * 0.42;
    const arcLen = (sliceDeg * Math.PI / 180) * labelRadius;
    const maxW = Math.floor(arcLen * 0.78);
    const labelLen = (action?.label || '').length;
    let fontScale = 1;
    if (labelLen > 18) fontScale = 0.92;
    else if (labelLen > 14) fontScale = 0.96;
    if (count >= 6) fontScale *= 0.9;
    else if (count >= 4) fontScale *= 0.95;
    return {
        left: `${(p.x / size) * 100}%`,
        top: `${(p.y / size) * 100}%`,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        maxWidth: `${(maxW / size) * 100}%`,
        '--fan-label-scale': String(Number(fontScale.toFixed(3))),
        '--fan-label-i': String(i)
    };
}

function hubCaptionStyleFor(layout) {
    const { inner, size } = layout;
    const wPct = (inner * 0.92 / size) * 100;
    return {
        left: `${(10 / size) * 100}%`,
        bottom: `${(12 / size) * 100}%`,
        width: `${wPct}%`,
        maxWidth: `${wPct}%`
    };
}

function fanQuarterPath(size) {
    return `M 0 ${size} L ${size} ${size} A ${size} ${size} 0 0 0 0 0 Z`;
}

function fanHubPath(inner, size) {
    return `M 0 ${size} L ${inner} ${size} A ${inner} ${inner} 0 0 0 0 ${size - inner} Z`;
}

function fanInnerArc(inner, size) {
    return `M ${inner} ${size} A ${inner} ${inner} 0 0 0 0 ${size - inner}`;
}

function fanOuterArc(outer, size) {
    return `M 0 ${size - outer} A ${outer} ${outer} 0 0 1 ${outer} ${size}`;
}

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
        fanUidCounter += 1;
        return {
            open: false,
            closing: false,
            hoverIndex: -1,
            fanUid: fanUidCounter,
            portalFanStyle: {},
            _resizeTimer: 0,
            _fxTimer: 0,
            _pendingSelect: null,
            _hoverRaf: 0,
            _pendingHover: -2
        };
    },
    computed: {
        count() {
            return Array.isArray(this.actions) ? this.actions.length : 0;
        },
        dividerCount() {
            return this.count > 0 ? this.count + 1 : 0;
        },
        fanLayout() {
            return computeFanLayout(this.actions, this.title);
        },
        fanViewBox() {
            const s = this.fanLayout.size;
            return `0 0 ${s} ${s}`;
        },
        fanQuarterPath() {
            return fanQuarterPath(this.fanLayout.size);
        },
        fanHubPath() {
            const { inner, size } = this.fanLayout;
            return fanHubPath(inner, size);
        },
        fanInnerArc() {
            const { inner, size } = this.fanLayout;
            return fanInnerArc(inner, size);
        },
        fanOuterArc() {
            const { outer, size } = this.fanLayout;
            return fanOuterArc(outer, size);
        },
        hubCaptionStyle() {
            return hubCaptionStyleFor(this.fanLayout);
        },
        highlightPath() {
            if (this.hoverIndex < 0) return '';
            return fanWedgePath(this.hoverIndex, this.fanLayout);
        },
        clipId() {
            return `apexFanClip-${this.fanUid}`;
        },
        glowGradId() {
            return `apexFanGlow-${this.fanUid}`;
        },
        rimGradId() {
            return `apexFanRim-${this.fanUid}`;
        },
        hubActiveGradId() {
            return `apexFanHubActive-${this.fanUid}`;
        },
        sliceIdleGradId() {
            return `apexFanSliceIdle-${this.fanUid}`;
        },
        sliceActiveGradId() {
            return `apexFanSliceActive-${this.fanUid}`;
        },
        sweepGradId() {
            return `apexFanSweep-${this.fanUid}`;
        },
        fanIconSize() {
            const raw = this.portalFanStyle['--fan-icon-size'];
            const n = parseFloat(raw);
            return Number.isFinite(n) ? Math.round(n) : 15;
        }
    },
    watch: {
        actions() {
            if (this.open) this.$nextTick(() => this.syncPortalAnchor());
        },
        title() {
            if (this.open) this.$nextTick(() => this.syncPortalAnchor());
        },
        hoverIndex(idx, prev) {
            if (idx >= 0 && idx !== prev && !this.closing) this.pulseHoverFx(idx);
        }
    },
    methods: {
        wedgePath(i) {
            return fanWedgePath(i, this.fanLayout);
        },
        dividerPath(i) {
            return fanDividerPath(i, this.fanLayout);
        },
        labelStyle(i) {
            return labelStyleFor(i, this.fanLayout, this.actions[i]);
        },
        sliceStyle(i) {
            return { '--fan-slice-i': String(i) };
        },
        dividerStyle(i) {
            return { '--fan-div-i': String(i) };
        },
        clientToSvg(svg, clientX, clientY) {
            if (!svg?.createSVGPoint) return null;
            const pt = svg.createSVGPoint();
            pt.x = clientX;
            pt.y = clientY;
            const ctm = svg.getScreenCTM();
            if (!ctm) return null;
            return pt.matrixTransform(ctm.inverse());
        },
        wedgeIndexAt(x, y) {
            const L = this.fanLayout;
            if (!L.count) return -1;
            const dx = x - L.originX;
            const dy = L.originY - y;
            if (dx < 0 || dy < 0) return -1;
            const dist = Math.hypot(dx, dy);
            if (dist < L.inner || dist > L.outer) return -1;
            const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
            if (deg < L.startDeg || deg > L.startDeg + L.spanDeg) return -1;
            const slice = L.spanDeg / L.count;
            return Math.min(L.count - 1, Math.floor((deg - L.startDeg) / slice));
        },
        isHubHit(x, y) {
            const L = this.fanLayout;
            const dx = x - L.originX;
            const dy = L.originY - y;
            if (dx < 0 || dy < 0) return false;
            return Math.hypot(dx, dy) <= L.inner + 2;
        },
        scheduleHover(idx) {
            this._pendingHover = idx;
            if (this._hoverRaf) return;
            this._hoverRaf = requestAnimationFrame(() => {
                this._hoverRaf = 0;
                const next = this._pendingHover;
                this._pendingHover = -2;
                if (next !== -2 && next !== this.hoverIndex) this.hoverIndex = next;
            });
        },
        onFanPointerMove(e) {
            if (this.closing) return;
            const svg = this.$refs.fanSvg;
            const pt = this.clientToSvg(svg, e.clientX, e.clientY);
            if (!pt) return;
            if (this.isHubHit(pt.x, pt.y)) {
                this.scheduleHover(-1);
                return;
            }
            this.scheduleHover(this.wedgeIndexAt(pt.x, pt.y));
        },
        onFanPointerLeave() {
            this.scheduleHover(-1);
        },
        onFanClick(e) {
            if (this.closing) return;
            const svg = this.$refs.fanSvg;
            const pt = this.clientToSvg(svg, e.clientX, e.clientY);
            if (!pt) return;
            e.stopPropagation();
            if (this.isHubHit(pt.x, pt.y)) {
                this.closeWheel();
                return;
            }
            const idx = this.wedgeIndexAt(pt.x, pt.y);
            if (idx >= 0 && this.actions[idx]) {
                this.pickAction(this.actions[idx]);
                return;
            }
            this.closeWheel();
        },
        syncPortalAnchor() {
            const btn = this.$refs.trigger;
            if (!btn) return;
            const r = btn.getBoundingClientRect();
            const layoutSize = this.fanLayout.size;
            const pad = 12;
            const roomW = Math.max(160, window.innerWidth - r.left - pad);
            const roomH = Math.max(160, r.bottom - pad);
            const viewportCap = Math.min(window.innerWidth * 0.94, window.innerHeight * 0.9);
            const displaySize = Math.max(
                Math.min(layoutSize, viewportCap),
                Math.min(roomW, roomH, viewportCap)
            );
            const scale = displaySize / layoutSize;
            const innerPx = (this.fanLayout.inner / layoutSize) * displaySize;
            const outerPx = (this.fanLayout.outer / layoutSize) * displaySize;
            this.portalFanStyle = {
                left: `${r.left}px`,
                bottom: `${window.innerHeight - r.bottom}px`,
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                '--fan-scale': String(Number(scale.toFixed(3))),
                '--fan-inner-px': `${innerPx}px`,
                '--fan-outer-px': `${outerPx}px`,
                '--fan-label-font': `${Math.max(11, Math.min(22, 11.5 * scale))}px`,
                '--fan-skill-font': `${Math.max(9, Math.min(16, 9.2 * scale))}px`,
                '--fan-icon-size': `${Math.max(14, Math.min(28, 15 * scale))}px`,
                '--fan-label-gap': `${Math.max(3, Math.min(6, 3.5 * scale))}px`
            };
        },
        onResizeDebounced() {
            if (this._resizeTimer) clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => this.syncPortalAnchor(), 80);
        },
        bindPortalListeners() {
            window.addEventListener('resize', this.onResizeDebounced, { passive: true });
            window.addEventListener('scroll', this.onResizeDebounced, { passive: true, capture: true });
        },
        unbindPortalListeners() {
            window.removeEventListener('resize', this.onResizeDebounced);
            window.removeEventListener('scroll', this.onResizeDebounced, true);
            if (this._resizeTimer) {
                clearTimeout(this._resizeTimer);
                this._resizeTimer = 0;
            }
        },
        clearFxTimer() {
            if (this._fxTimer) {
                clearTimeout(this._fxTimer);
                this._fxTimer = 0;
            }
        },
        clearHoverRaf() {
            if (this._hoverRaf) {
                cancelAnimationFrame(this._hoverRaf);
                this._hoverRaf = 0;
            }
            this._pendingHover = -2;
        },
        stopFanFx() {
            this.clearFxTimer();
            this.$refs.fanPanel?.classList.remove('apex-action-fan--css-open', 'apex-action-fan--css-close');
            this.$refs.fanBackdrop?.classList.remove('apex-action-fan-backdrop--css-open', 'apex-action-fan-backdrop--css-close');
            this.$refs.fanRoot?.classList.remove('apex-action-fan-root--css-open', 'apex-action-fan-root--css-close');
        },
        playOpenFx() {
            this.stopFanFx();
            const root = this.$refs.fanRoot;
            const fan = this.$refs.fanPanel;
            const backdrop = this.$refs.fanBackdrop;
            if (!fan) return;
            if (prefersReducedMotion()) {
                fan.style.opacity = '1';
                fan.style.transform = 'scale(1)';
                if (backdrop) backdrop.style.opacity = '1';
                return;
            }
            backdrop?.classList.add('apex-action-fan-backdrop--css-open');
            fan.classList.add('apex-action-fan--css-open');
            root?.classList.add('apex-action-fan-root--css-open');
            this._fxTimer = setTimeout(() => {
                this._fxTimer = 0;
                fan.classList.remove('apex-action-fan--css-open');
                backdrop?.classList.remove('apex-action-fan-backdrop--css-open');
                root?.classList.remove('apex-action-fan-root--css-open');
                fan.style.opacity = '1';
                fan.style.transform = 'scale(1)';
                if (backdrop) backdrop.style.opacity = '1';
            }, 520);
        },
        finishClose() {
            this.clearFxTimer();
            this.stopFanFx();
            const select = this._pendingSelect;
            this._pendingSelect = null;
            this.open = false;
            this.closing = false;
            this.hoverIndex = -1;
            this.clearHoverRaf();
            this.unbindPortalListeners();
            if (select) this.$emit('select', select);
        },
        playCloseFx() {
            if (this.closing) return;
            this.closing = true;
            this.hoverIndex = -1;
            this.clearHoverRaf();
            this.clearFxTimer();

            const fan = this.$refs.fanPanel;
            const backdrop = this.$refs.fanBackdrop;
            const root = this.$refs.fanRoot;
            if (!fan) {
                this.finishClose();
                return;
            }

            if (prefersReducedMotion()) {
                this.finishClose();
                return;
            }

            root?.classList.add('apex-action-fan-root--css-close');
            fan.classList.add('apex-action-fan--css-close');
            backdrop?.classList.add('apex-action-fan-backdrop--css-close');
            this._fxTimer = setTimeout(() => this.finishClose(), 380);
        },
        pulseHoverFx(idx) {
            if (idx < 0 || this.closing || prefersReducedMotion()) return;
            const label = this.$refs.fanRoot?.querySelectorAll('.apex-action-fan__label')[idx];
            const fx = label?.querySelector('.apex-action-fan__label-fx');
            if (!fx) return;
            fx.classList.remove('apex-action-fan__label-fx--pop');
            void fx.offsetWidth;
            fx.classList.add('apex-action-fan__label-fx--pop');
        },
        toggleWheel() {
            if (this.disabled || !this.count || this.closing) return;
            if (this.open) {
                this.closeWheel();
                return;
            }
            this.open = true;
            this.$nextTick(() => {
                this.syncPortalAnchor();
                this.bindPortalListeners();
                requestAnimationFrame(() => this.playOpenFx());
            });
        },
        closeWheel() {
            if (!this.open || this.closing) return;
            this._pendingSelect = null;
            this.playCloseFx();
        },
        pickAction(action) {
            if (!action || this.closing) return;
            this._pendingSelect = action;
            this.playCloseFx();
        },
        onBackdropClick(e) {
            if (e.target === e.currentTarget) this.closeWheel();
        },
        onKeydown(e) {
            if (e.key === 'Escape') this.closeWheel();
        }
    },
    mounted() {
        document.addEventListener('keydown', this.onKeydown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onKeydown);
        this.clearFxTimer();
        this.clearHoverRaf();
        this.stopFanFx();
        this.unbindPortalListeners();
    },
    template: `
        <div class="apex-action-wheel-host" :class="'apex-action-wheel-host--' + variant">
            <teleport to="body">
                <div v-if="open" ref="fanRoot" class="apex-action-fan-root" :class="{ 'apex-action-fan-root--closing': closing }">
                    <div ref="fanBackdrop"
                        class="apex-action-fan-backdrop"
                        aria-hidden="true"
                        @click="onBackdropClick"></div>

                    <div ref="fanPanel"
                        class="apex-action-fan apex-action-fan--portal"
                        role="menu"
                        :aria-label="title"
                        :style="portalFanStyle">
                        <svg ref="fanSvg"
                            class="apex-action-fan__svg"
                            :viewBox="fanViewBox"
                            @pointermove="onFanPointerMove"
                            @pointerleave="onFanPointerLeave"
                            @click="onFanClick">
                            <defs>
                                <clipPath :id="clipId">
                                    <path :d="fanQuarterPath"></path>
                                </clipPath>
                                <radialGradient :id="glowGradId" cx="0" cy="1" r="1">
                                    <stop offset="0%" stop-color="rgba(34, 211, 238, 0.16)"/>
                                    <stop offset="55%" stop-color="rgba(8, 14, 24, 0.97)"/>
                                    <stop offset="100%" stop-color="rgba(4, 8, 14, 0.99)"/>
                                </radialGradient>
                                <radialGradient :id="hubActiveGradId" cx="0" cy="1" r="0.9">
                                    <stop offset="0%" stop-color="rgba(232, 168, 74, 0.55)"/>
                                    <stop offset="100%" stop-color="rgba(34, 211, 238, 0.22)"/>
                                </radialGradient>
                                <linearGradient :id="rimGradId" x1="0" y1="1" x2="1" y2="0">
                                    <stop offset="0%" stop-color="rgba(232, 168, 74, 0.85)"/>
                                    <stop offset="100%" stop-color="rgba(34, 211, 238, 0.65)"/>
                                </linearGradient>
                                <linearGradient :id="sliceIdleGradId" x1="0" y1="1" x2="1" y2="0">
                                    <stop offset="0%" stop-color="rgba(14, 22, 34, 0.72)"/>
                                    <stop offset="100%" stop-color="rgba(24, 34, 50, 0.52)"/>
                                </linearGradient>
                                <linearGradient :id="sliceActiveGradId" x1="0" y1="1" x2="1" y2="0">
                                    <stop offset="0%" stop-color="rgba(232, 168, 74, 0.55)"/>
                                    <stop offset="55%" stop-color="rgba(34, 211, 238, 0.42)"/>
                                    <stop offset="100%" stop-color="rgba(34, 211, 238, 0.16)"/>
                                </linearGradient>
                                <linearGradient :id="sweepGradId" x1="0" y1="1" x2="1" y2="0">
                                    <stop offset="0%" stop-color="rgba(255, 255, 255, 0)"/>
                                    <stop offset="45%" stop-color="rgba(34, 211, 238, 0.95)"/>
                                    <stop offset="100%" stop-color="rgba(232, 168, 74, 0.8)"/>
                                </linearGradient>
                            </defs>

                            <g :clip-path="'url(#' + clipId + ')'">
                                <path class="apex-action-fan__quarter" :d="fanQuarterPath" :fill="'url(#' + glowGradId + ')'" :stroke="'url(#' + rimGradId + ')'" pointer-events="none"></path>

                                <path v-for="(action, i) in actions" :key="'s-' + (action.id || i)"
                                    :d="wedgePath(i)"
                                    class="apex-action-fan__slice"
                                    :class="{ 'apex-action-fan__slice--active': i === hoverIndex }"
                                    :fill="'url(#' + sliceIdleGradId + ')'"
                                    :style="sliceStyle(i)"
                                    pointer-events="all"
                                    :data-slice-index="i"></path>

                                <path v-if="hoverIndex >= 0"
                                    class="apex-action-fan__slice-highlight"
                                    :d="highlightPath"
                                    :fill="'url(#' + sliceActiveGradId + ')'"
                                    pointer-events="none"></path>

                                <path v-for="i in dividerCount" :key="'d-' + (i - 1)"
                                    :d="dividerPath(i - 1)"
                                    class="apex-action-fan__divider"
                                    :style="dividerStyle(i - 1)"
                                    pointer-events="none"></path>

                                <path class="apex-action-fan__hub-glow"
                                    :d="fanHubPath"
                                    pointer-events="none"></path>

                                <path class="apex-action-fan__hub apex-action-fan__hub--close"
                                    :d="fanHubPath"
                                    :fill="'url(#' + hubActiveGradId + ')'"
                                    :stroke="'url(#' + rimGradId + ')'"
                                    pointer-events="all"
                                    aria-label="收起行动扇形"></path>

                                <path class="apex-action-fan__rim-arc apex-action-fan__rim-arc--inner" :d="fanInnerArc" pointer-events="none"></path>
                                <path class="apex-action-fan__rim-arc apex-action-fan__rim-arc--outer" :d="fanOuterArc" pointer-events="none"></path>
                                <path ref="rimSweep"
                                    class="apex-action-fan__rim-sweep"
                                    :d="fanOuterArc"
                                    :stroke="'url(#' + sweepGradId + ')'"
                                    fill="none"
                                    pathLength="1"
                                    stroke-dasharray="0.22 0.88"
                                    stroke-dashoffset="1"
                                    pointer-events="none"></path>
                            </g>
                        </svg>

                        <div class="apex-action-fan__labels">
                            <div v-for="(action, i) in actions" :key="'l-' + (action.id || i)"
                                class="apex-action-fan__label"
                                :class="{ 'apex-action-fan__label--active': i === hoverIndex }"
                                :style="labelStyle(i)">
                                <div class="apex-action-fan__label-fx">
                                    <coc-icon :name="action.icon || (action.skillHint ? 'dice' : 'scroll')" :size="fanIconSize"></coc-icon>
                                    <span class="apex-action-fan__label-text">{{ action.label }}</span>
                                    <span v-if="action.skillHint" class="apex-action-fan__label-skill">【{{ action.skillHint }}】</span>
                                </div>
                            </div>
                        </div>

                        <div class="apex-action-fan__hub-caption" :style="hubCaptionStyle" aria-hidden="true">
                            <span class="apex-action-fan__hub-title">{{ title }}</span>
                            <span class="apex-action-fan__hub-close-hint">点击扇心收起</span>
                        </div>
                    </div>
                </div>
            </teleport>

            <button type="button"
                ref="trigger"
                class="apex-action-wheel-trigger"
                :class="{
                    'apex-action-wheel-trigger--fab': variant === 'fab',
                    'apex-action-wheel-trigger--anchor-hidden': open
                }"
                :disabled="disabled || !count"
                :aria-expanded="open ? 'true' : 'false'"
                :aria-label="title + '，点击展开行动扇形'"
                aria-haspopup="menu"
                @click="toggleWheel">
                <span class="apex-action-wheel-trigger__cone" aria-hidden="true"></span>
                <span class="apex-action-wheel-trigger__ring" aria-hidden="true"></span>
                <coc-icon name="combat" :size="variant === 'fab' ? 24 : 22" aria-hidden="true" class="apex-action-wheel-trigger__icon"></coc-icon>
                <span class="apex-action-wheel-trigger__label">行动</span>
            </button>
        </div>
    `
};
