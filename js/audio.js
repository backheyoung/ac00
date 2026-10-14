// Procedural Web Audio Engine for Stickman Game
// Generates responsive, punchy sound effects without any external files!

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterVolume = 0.5;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, startVol = 0.3, endVol = 0.01) {
        if (!this.ctx || !this.enabled) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(startVol * this.masterVolume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playNoise(duration, filterFreq = 1000, startVol = 0.3) {
        if (!this.ctx || !this.enabled) return;
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(startVol * this.masterVolume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch (e) {}
    }

    // 칼 휘두르는 소리 (빠른 스윙 후시)
    slash() {
        this.init();
        if (!this.ctx || !this.enabled) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

            gain.gain.setValueAtTime(0.35 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.13);
        } catch (e) {}
    }

    // 칼로 베었을 때의 날카롭고 묵직한 타격음
    hitBlade() {
        this.init();
        this.playNoise(0.08, 2500, 0.4);
        this.playTone(180, 'triangle', 0.1, 0.4, 0.01);
    }

    // 둔탁한 해머 / 방패 타격음
    hitHeavy() {
        this.init();
        this.playNoise(0.15, 600, 0.5);
        this.playTone(90, 'sawtooth', 0.18, 0.5, 0.01);
    }

    // 화살 발사음 (활시위 튕김)
    arrowShoot() {
        this.init();
        if (!this.ctx || !this.enabled) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

            gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    // 화살 명중
    arrowHit() {
        this.init();
        this.playTone(320, 'square', 0.05, 0.2, 0.01);
    }

    // 마법 발사 & 폭발
    magicExplode() {
        this.init();
        this.playNoise(0.3, 1200, 0.45);
        this.playTone(120, 'sine', 0.25, 0.4, 0.01);
    }

    // 유닛 소환 소리
    summon() {
        this.init();
        if (!this.ctx || !this.enabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    // 스킬/궁극기 시전음 (강렬한 파워업)
    ultimate() {
        this.init();
        if (!this.ctx || !this.enabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.35);

        gain.gain.setValueAtTime(0.4 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
        this.playNoise(0.4, 3000, 0.4);
    }

    // 성채 피격 경고음
    baseHit() {
        this.init();
        this.playTone(140, 'square', 0.15, 0.3, 0.01);
    }

    // 승리 팡파레
    victory() {
        this.init();
        const notes = [261.6, 329.6, 392.0, 523.3];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.3, 0.4, 0.01);
            }, idx * 120);
        });
    }

    // 패배음
    defeat() {
        this.init();
        const notes = [300, 260, 220, 180];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'sawtooth', 0.35, 0.3, 0.01);
            }, idx * 150);
        });
    }

    // ================= PROCEDURAL CALM BGM ENGINE =================
    initBgm() {
        if (this.bgmInitialized) return;
        this.bgmInitialized = true;
        this.bgmEnabled = localStorage.getItem('stickman_bgm_enabled') !== 'false';
        this.bgmGain = null;
        this.bgmFilter = null;
        this.bgmTimer = null;
        this.bgmStep = 0;
    }

    startBgm() {
        this.init();
        this.initBgm();
        if (!this.bgmEnabled || !this.ctx || this.bgmTimer) return;

        if (!this.bgmGain) {
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

            this.bgmFilter = this.ctx.createBiquadFilter();
            this.bgmFilter.type = 'lowpass';
            this.bgmFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);

            this.bgmGain.connect(this.bgmFilter);
            this.bgmFilter.connect(this.ctx.destination);
        }

        // Chords: 4 gentle bars in F major / D minor (Peaceful fantasy atmosphere)
        const sequence = [
            // Bar 1 (Fmaj7)
            { root: 87.31, chord: [174.61, 220.00, 261.63, 329.63], melody: 523.25 },
            { chord: [261.63, 329.63], melody: 440.00 },
            { chord: [220.00, 261.63], melody: 392.00 },
            { chord: [174.61, 261.63], melody: 329.63 },

            // Bar 2 (Dm7)
            { root: 73.42, chord: [146.83, 220.00, 261.63, 349.23], melody: 440.00 },
            { chord: [220.00, 261.63], melody: 392.00 },
            { chord: [174.61, 220.00], melody: 349.23 },
            { chord: [146.83, 261.63], melody: 293.66 },

            // Bar 3 (Bbmaj7)
            { root: 58.27, chord: [116.54, 174.61, 220.00, 293.66], melody: 349.23 },
            { chord: [174.61, 220.00], melody: 392.00 },
            { chord: [220.00, 293.66], melody: 440.00 },
            { chord: [174.61, 293.66], melody: 523.25 },

            // Bar 4 (C9 / C)
            { root: 65.41, chord: [130.81, 196.00, 261.63, 293.66], melody: 587.33 },
            { chord: [196.00, 261.63], melody: 523.25 },
            { chord: [164.81, 196.00], melody: 392.00 },
            { chord: [130.81, 261.63], melody: 329.63 }
        ];

        const stepTime = 650; // ms per beat (gentle and relaxed tempo)

        const playStep = () => {
            if (!this.bgmEnabled || !this.ctx) return;
            const item = sequence[this.bgmStep % sequence.length];
            this.bgmStep++;

            const now = this.ctx.currentTime;

            // 1. Warm sub bass on chord root
            if (item.root) {
                try {
                    const bassOsc = this.ctx.createOscillator();
                    const bassGain = this.ctx.createGain();
                    bassOsc.type = 'sine';
                    bassOsc.frequency.setValueAtTime(item.root, now);
                    bassGain.gain.setValueAtTime(0.28, now);
                    bassGain.gain.exponentialRampToValueAtTime(0.01, now + (stepTime * 3.5) / 1000);
                    bassOsc.connect(bassGain);
                    bassGain.connect(this.bgmGain);
                    bassOsc.start(now);
                    bassOsc.stop(now + (stepTime * 3.6) / 1000);
                } catch (e) {}
            }

            // 2. Soft Rhodes / music box chord notes
            if (item.chord) {
                item.chord.forEach((freq, idx) => {
                    try {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
                        gain.gain.setValueAtTime(0.001, now + idx * 0.04);
                        gain.gain.linearRampToValueAtTime(0.065, now + idx * 0.04 + 0.03);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 1.4);
                        osc.connect(gain);
                        gain.connect(this.bgmGain);
                        osc.start(now + idx * 0.04);
                        osc.stop(now + idx * 0.04 + 1.45);
                    } catch (e) {}
                });
            }

            // 3. Calm bell/harp melody note
            if (item.melody) {
                try {
                    const melOsc = this.ctx.createOscillator();
                    const melGain = this.ctx.createGain();
                    melOsc.type = 'sine';
                    melOsc.frequency.setValueAtTime(item.melody, now + 0.08);
                    melGain.gain.setValueAtTime(0.001, now + 0.08);
                    melGain.gain.linearRampToValueAtTime(0.085, now + 0.1);
                    melGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
                    melOsc.connect(melGain);
                    melGain.connect(this.bgmGain);
                    melOsc.start(now + 0.08);
                    melOsc.stop(now + 1.15);
                } catch (e) {}
            }

            this.bgmTimer = setTimeout(playStep, stepTime);
        };

        playStep();
    }

    stopBgm() {
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    toggleBgm() {
        this.initBgm();
        this.bgmEnabled = !this.bgmEnabled;
        localStorage.setItem('stickman_bgm_enabled', this.bgmEnabled ? 'true' : 'false');
        if (this.bgmEnabled) {
            this.startBgm();
        } else {
            this.stopBgm();
        }
        return this.bgmEnabled;
    }
}

export const sound = new SoundEngine();
