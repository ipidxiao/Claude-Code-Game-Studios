/**
 * CoC SFX — Web Audio 合成音效引擎 (V16.5 P6-1)
 * 无外部文件依赖，纯 OscillatorNode 合成
 */
window.CoCSFX = (function() {
    let ctx = null;
    
    function getCtx() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch(e) { return null; }
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    /** 骰子碰撞 — 短促木质感 */
    function playDiceClatter(count) {
        const ac = getCtx();
        if (!ac) return;
        const now = ac.currentTime;
        for (let i = 0; i < Math.min(count, 5); i++) {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800 + Math.random() * 600, now + i * 0.04);
            osc.frequency.exponentialRampToValueAtTime(200 + Math.random() * 200, now + i * 0.04 + 0.08);
            gain.gain.setValueAtTime(0.08, now + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.1);
            osc.connect(gain); gain.connect(ac.destination);
            osc.start(now + i * 0.04); osc.stop(now + i * 0.04 + 0.1);
        }
    }

    /** 骰子落地 — 深沉共鸣 */
    function playDiceLand() {
        const ac = getCtx();
        if (!ac) return;
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(now); osc.stop(now + 0.25);

        // 噪声层模拟桌面震动
        const bufferSize = ac.sampleRate * 0.1;
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        const noise = ac.createBufferSource();
        const noiseGain = ac.createGain();
        noise.buffer = buffer;
        noiseGain.gain.setValueAtTime(0.06, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        noise.connect(noiseGain); noiseGain.connect(ac.destination);
        noise.start(now);
    }

    /** 成功提示 — 双音上行 */
    function playSuccess() {
        const ac = getCtx();
        if (!ac) return;
        const now = ac.currentTime;
        [523.25, 659.25].forEach((freq, i) => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
            osc.connect(gain); gain.connect(ac.destination);
            osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.18);
        });
    }

    /** 警告提示 — 低频脉冲 */
    function playWarning() {
        const ac = getCtx();
        if (!ac) return;
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.03, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(now); osc.stop(now + 0.3);
    }

    /** 危险提示 — 刺耳下降 */
    function playDanger() {
        const ac = getCtx();
        if (!ac) return;
        const now = ac.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600 - i * 100, now + i * 0.1);
            osc.frequency.exponentialRampToValueAtTime(150, now + i * 0.1 + 0.12);
            gain.gain.setValueAtTime(0.05, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
            osc.connect(gain); gain.connect(ac.destination);
            osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.18);
        }
    }

    /** SAN值警告 — 低沉心跳 */
    function playSanWarning(intensity) {
        const ac = getCtx();
        if (!ac) return;
        const now = ac.currentTime;
        const bassOsc = ac.createOscillator();
        const bassGain = ac.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(40, now);
        bassGain.gain.setValueAtTime(0.2 * intensity, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        bassOsc.connect(bassGain); bassGain.connect(ac.destination);
        bassOsc.start(now); bassOsc.stop(now + 0.45);

        // 泛音层
        const overtone = ac.createOscillator();
        const overGain = ac.createGain();
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(80, now);
        overtone.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        overGain.gain.setValueAtTime(0.08 * intensity, now);
        overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        overtone.connect(overGain); overGain.connect(ac.destination);
        overtone.start(now); overtone.stop(now + 0.4);
    }

    return {
        playDiceClatter,
        playDiceLand,
        playSuccess,
        playWarning,
        playDanger,
        playSanWarning,
        getCtx
    };
})();
