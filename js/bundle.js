// Stickman Wars Standalone Unified Bundle
(function() {

/* --- js/save.js --- */
// Persistent Game Save and Upgrade Manager
// Uses localStorage to save stages cleared, unlocked heroes, gold, and stat upgrades.

const SAVE_KEY = 'stickman_wars_save_v1';

const DEFAULT_SAVE = {
    gold: 300,
    maxClearedStage: 0, // 0 means Stage 1 is playable, Stage 1 cleared makes it 1
    unlockedHeroes: ['blade'], // Initially only Blade Master is unlocked!
    selectedHero: 'blade',
    upgrades: {
        // Castle & Mana
        manaMaxLv: 1,    // +30 Max Mana per Lv
        manaRegenLv: 1,  // +2 Mana/sec per Lv
        castleHpLv: 1,   // +200 Castle HP per Lv
        castleTurretLv: 1,// +8 Turret DMG per Lv
        // Hero
        heroHpLv: 1,     // +15% Hero HP per Lv
        heroAtkLv: 1,    // +15% Hero ATK per Lv
        // Units
        swordsmanLv: 1,
        shieldLv: 1,
        bowLv: 1,
        mageLv: 1
    }
};

class SaveManager {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SAVE));
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_SAVE,
                ...parsed,
                upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) }
            };
        } catch (e) {
            return JSON.parse(JSON.stringify(DEFAULT_SAVE));
        }
    }

    save() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch (e) {}
    }

    reset() {
        this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
        this.save();
    }

    addGold(amount) {
        this.data.gold += Math.round(amount);
        this.save();
    }

    isHeroUnlocked(heroId) {
        return this.data.unlockedHeroes.includes(heroId);
    }

    unlockHero(heroId) {
        if (!this.data.unlockedHeroes.includes(heroId)) {
            this.data.unlockedHeroes.push(heroId);
            this.save();
            return true;
        }
        return false;
    }

    recordStageClear(stageNumber) {
        let newlyUnlocked = [];
        if (stageNumber > this.data.maxClearedStage) {
            this.data.maxClearedStage = stageNumber;
        }

        // Stage 1 clear unlocks Archer!
        if (this.data.maxClearedStage >= 1 && !this.isHeroUnlocked('archer')) {
            this.unlockHero('archer');
            newlyUnlocked.push('archer');
        }

        // Stage 3 clear unlocks Paladin!
        if (this.data.maxClearedStage >= 3 && !this.isHeroUnlocked('paladin')) {
            this.unlockHero('paladin');
            newlyUnlocked.push('paladin');
        }

        this.save();
        return newlyUnlocked;
    }

    getUpgradeCost(statKey) {
        const lv = this.data.upgrades[statKey] || 1;
        return Math.round(60 * Math.pow(1.5, lv - 1));
    }

    upgradeStat(statKey) {
        const cost = this.getUpgradeCost(statKey);
        if (this.data.gold >= cost) {
            this.data.gold -= cost;
            this.data.upgrades[statKey] = (this.data.upgrades[statKey] || 1) + 1;
            this.save();
            return true;
        }
        return false;
    }
}

const saveManager = new SaveManager();


/* --- js/audio.js --- */
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
}

const sound = new SoundEngine();


/* --- js/particles.js --- */
// Particle and Visual Effects System
// Handles: Slash Trails, Hit Sparks, Ink Blood, Floating Damage Numbers, Ground Shockwaves, Dust

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.damageTexts = [];
        this.slashArcs = [];
        this.shockwaves = [];
    }

    update(dt) {
        // Update regular particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += (p.gravity || 0) * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            if (p.sizeGrowth) {
                p.size += p.sizeGrowth * dt;
            }
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update damage texts
        for (let i = this.damageTexts.length - 1; i >= 0; i--) {
            const t = this.damageTexts[i];
            t.y += t.vy * dt;
            t.vy += 80 * dt; // slight downward gravity after rise
            t.life -= dt;
            t.scale = Math.max(0.6, t.scale - 0.4 * dt);
            if (t.life <= 0) {
                this.damageTexts.splice(i, 1);
            }
        }

        // Update slash arcs
        for (let i = this.slashArcs.length - 1; i >= 0; i--) {
            const arc = this.slashArcs[i];
            arc.life -= dt;
            arc.alpha = Math.max(0, arc.life / arc.maxLife);
            if (arc.life <= 0) {
                this.slashArcs.splice(i, 1);
            }
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed * dt;
            sw.life -= dt;
            sw.alpha = Math.max(0, sw.life / sw.maxLife);
            if (sw.life <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    draw(ctx, camera) {
        ctx.save();

        // 1. Draw Shockwaves
        for (const sw of this.shockwaves) {
            const screenX = sw.x - camera.x;
            const screenY = sw.y - camera.y;
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, sw.radius, sw.radius * 0.35, 0, 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = sw.alpha * 0.8;
            ctx.lineWidth = sw.lineWidth || 4;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.restore();
        }

        // 2. Draw Slash Arcs
        for (const arc of this.slashArcs) {
            const screenX = arc.x - camera.x;
            const screenY = arc.y - camera.y;
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.scale(arc.facing, 1);
            ctx.rotate(arc.rotation);
            ctx.globalAlpha = arc.alpha;

            ctx.beginPath();
            ctx.arc(0, 0, arc.radius, arc.startAngle, arc.endAngle, false);
            ctx.strokeStyle = arc.color;
            ctx.lineWidth = arc.width * (arc.life / arc.maxLife);
            ctx.lineCap = 'round';
            ctx.shadowColor = arc.glowColor || arc.color;
            ctx.shadowBlur = 16;
            ctx.stroke();

            // Inner highlight arc
            ctx.beginPath();
            ctx.arc(0, 0, arc.radius * 0.95, arc.startAngle + 0.1, arc.endAngle - 0.1, false);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, arc.width * 0.35);
            ctx.stroke();

            ctx.restore();
        }

        // 3. Draw Particles (Sparks, Ink, Dust)
        for (const p of this.particles) {
            const screenX = p.x - camera.x;
            const screenY = p.y - camera.y;
            ctx.save();
            ctx.globalAlpha = p.alpha;

            if (p.type === 'spark') {
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                // Draw motion-streaked spark
                const angle = Math.atan2(p.vy, p.vx);
                ctx.translate(screenX, screenY);
                ctx.rotate(angle);
                ctx.fillRect(-p.size * 1.5, -p.size * 0.5, p.size * 3, p.size);
            } else if (p.type === 'circle') {
                ctx.beginPath();
                ctx.arc(screenX, screenY, Math.max(0.1, p.size), 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                if (p.glow) {
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = p.glow;
                }
                ctx.fill();
            } else if (p.type === 'ink') {
                // Cartoony splat
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, Math.max(0.1, p.size), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 4. Draw Damage Numbers
        for (const t of this.damageTexts) {
            const screenX = t.x - camera.x;
            const screenY = t.y - camera.y;
            ctx.save();
            ctx.globalAlpha = Math.min(1, t.life / (t.maxLife * 0.5));
            ctx.translate(screenX, screenY);
            ctx.scale(t.scale, t.scale);

            ctx.font = t.isCrit ? '900 24px "Impact", "Arial Black", sans-serif' : 'bold 18px "Arial", sans-serif';
            ctx.textAlign = 'center';

            // Text Outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = t.isCrit ? 5 : 3;
            ctx.strokeText(t.text, 0, 0);

            // Text Fill
            ctx.fillStyle = t.color;
            if (t.isCrit) {
                ctx.shadowColor = t.color;
                ctx.shadowBlur = 10;
            }
            ctx.fillText(t.text, 0, 0);

            ctx.restore();
        }

        ctx.restore();
    }

    // Slash Arc effect (for sword, scythe, kicks)
    addSlashArc(x, y, radius, facing, color = '#ff3366', glowColor = '#ff7799', startAngle = -Math.PI * 0.45, endAngle = Math.PI * 0.45, width = 14) {
        this.slashArcs.push({
            x, y,
            radius,
            facing,
            color,
            glowColor,
            rotation: 0,
            startAngle,
            endAngle,
            width,
            life: 0.18,
            maxLife: 0.18,
            alpha: 1
        });
    }

    // Hit sparks and impact burst
    addHitSparks(x, y, count = 12, color = '#ffeb3b') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 150 + Math.random() * 350;
            this.particles.push({
                type: 'spark',
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                gravity: 300,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.4 ? color : '#ffffff',
                life: 0.2 + Math.random() * 0.25,
                maxLife: 0.4,
                alpha: 1
            });
        }

        // Ink / blood splatter
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 180;
            this.particles.push({
                type: 'ink',
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                gravity: 400,
                size: 2 + Math.random() * 3.5,
                color: '#1a1a1a', // Stickman dark ink
                life: 0.35 + Math.random() * 0.2,
                maxLife: 0.5,
                alpha: 1
            });
        }
    }

    // Shockwave
    addShockwave(x, y, color = '#ffffff', maxRadius = 90, speed = 400, lineWidth = 4) {
        this.shockwaves.push({
            x, y,
            radius: 5,
            speed,
            color,
            lineWidth,
            life: maxRadius / speed,
            maxLife: maxRadius / speed,
            alpha: 1
        });
    }

    // Dust on dash / jump / run
    addDust(x, y, facing) {
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                type: 'circle',
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 4,
                vx: -facing * (40 + Math.random() * 80),
                vy: -20 - Math.random() * 30,
                gravity: 40,
                size: 3 + Math.random() * 4,
                sizeGrowth: 6,
                color: 'rgba(180, 180, 190, 0.6)',
                life: 0.25 + Math.random() * 0.15,
                maxLife: 0.4,
                alpha: 0.6
            });
        }
    }

    // Floating damage numbers
    addDamageText(x, y, amount, isCrit = false, isHeal = false) {
        let color = '#ffffff';
        let text = typeof amount === 'number' ? `${Math.round(amount)}` : String(amount);
        if (isHeal) {
            color = '#2ecc71';
            text = `+${text}`;
        } else if (isCrit) {
            color = '#ffeb3b';
            text = `CRIT! ${text}`;
        }

        this.damageTexts.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 20,
            vy: -140 - Math.random() * 40,
            text,
            color,
            isCrit,
            scale: isCrit ? 1.6 : 1.1,
            life: 0.85,
            maxLife: 0.85
        });
    }
}


/* --- js/stickman.js --- */
// High-Quality Procedural Stickman Animation Engine
// Features 2-bone Inverse Kinematics (IK), smooth multi-keyframe cubic easing,
// organic spine curvature, dual-arm weapon grip, and dynamic polygonal blade trails.

// Easing Utilities
function easeInCubic(t) { return t * t * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPoint(p1, p2, t) {
    return { x: lerp(p1.x, p2.x, t), y: lerp(p1.y, p2.y, t) };
}

/**
 * 2-Bone Inverse Kinematics (IK) Solver
 * Solves elbow/knee joint position given root, target, bone lengths, and bend direction.
 */
function solveIK(root, target, l1, l2, bendDir = 1) {
    const dx = target.x - root.x;
    const dy = target.y - root.y;
    let dist = Math.hypot(dx, dy);
    const maxReach = (l1 + l2) * 0.999;
    if (dist > maxReach) dist = maxReach;
    if (dist < 0.001) dist = 0.001;

    const baseAngle = Math.atan2(dy, dx);
    const cosAngle1 = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
    const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)));

    const jointAngle = baseAngle + bendDir * angle1;
    return {
        x: root.x + Math.cos(jointAngle) * l1,
        y: root.y + Math.sin(jointAngle) * l1
    };
}

class StickmanRenderer {
    constructor(options = {}) {
        this.scale = options.scale || 1.0;
        this.color = options.color || '#0f172a';
        this.headRadius = (options.headRadius || 8.5) * this.scale;
        this.lineWidth = (options.lineWidth || 4.2) * this.scale;
        this.type = options.type || 'basic';
        this.isHero = options.isHero || false;

        // Limb Lengths
        this.upperArmLen = 15 * this.scale;
        this.forearmLen = 14 * this.scale;
        this.thighLen = 16 * this.scale;
        this.shinLen = 15 * this.scale;

        // Blade Trail History (records sword tip & base in local space)
        this.trailPoints = [];
        this.maxTrailLength = 12;

        // Scarf / Headband Verlet Physics
        this.capePoints = [];
        this.hasCape = options.hasCape || false;
        this.capeColor = options.capeColor || '#e11d48';
        if (this.hasCape) {
            for (let i = 0; i < 6; i++) {
                this.capePoints.push({ x: 0, y: 0, vx: 0, vy: 0 });
            }
        }
    }

    updatePhysics(dt, rootX, rootY, facing) {
        if (!this.hasCape || this.capePoints.length === 0) return;

        const neckX = rootX - facing * (4 * this.scale);
        const neckY = rootY - (48 * this.scale);
        this.capePoints[0].x = neckX;
        this.capePoints[0].y = neckY;

        for (let i = 1; i < this.capePoints.length; i++) {
            const pt = this.capePoints[i];
            const prev = this.capePoints[i - 1];
            const targetX = prev.x - facing * (10 * this.scale);
            const targetY = prev.y + (5 * this.scale);

            pt.x += (targetX - pt.x) * 18 * dt;
            pt.y += (targetY - pt.y) * 18 * dt;
        }
    }

    draw(ctx, x, y, facing, state, animTimer, customProps = {}) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        const s = this.scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;

        // Calculate organic keyframe pose
        const pose = this.calculatePose(state, animTimer, s, customProps);

        // Continuous Aerial Somersault Spin for Skill 1 - spins all the way until touching the ground!
        if (customProps && customProps.isSpinning) {
            ctx.translate(0, -30 * s);
            ctx.rotate(customProps.spinAngle || 0);
            ctx.translate(0, 30 * s);
        }

        // Record & Render Blade Trail
        if (state.startsWith('attack') || state.startsWith('skill') || state === 'ult') {
            this.updateAndDrawBladeTrail(ctx, pose.weapon, s, state);
        } else {
            this.trailPoints = [];
        }

        // 1. Draw Cape / Scarf in background
        if (this.hasCape) {
            this.drawScarf(ctx, pose, s);
        }

        // 2. Draw Back Leg
        this.drawLeg(ctx, pose.hip, pose.backFoot, s, -1);

        // 3. Draw Back Arm
        this.drawArm(ctx, pose.backShoulder, pose.backHand, s, -1);

        // 4. Draw Spine & Torso (Curved martial arts spine)
        ctx.beginPath();
        ctx.moveTo(pose.hip.x, pose.hip.y);
        ctx.bezierCurveTo(pose.spineLow.x, pose.spineLow.y, pose.spineHigh.x, pose.spineHigh.y, pose.neck.x, pose.neck.y);
        ctx.stroke();

        // 5. Draw Head & Headwear
        this.drawHead(ctx, pose.head, pose.headAngle || 0, s, customProps);

        // 6. Draw Front Leg
        this.drawLeg(ctx, pose.hip, pose.frontFoot, s, 1);

        // 7. Draw Front Arm & Weapon
        this.drawArm(ctx, pose.frontShoulder, pose.frontHand, s, 1);
        this.drawWeapon(ctx, pose.weapon, s, customProps);

        ctx.restore();
    }

    /**
     * Solves multi-keyframe poses with smooth cubic easing and martial arts weight distribution
     */
    calculatePose(state, time, s, customProps = {}) {
        // Base proportions
        let hip = { x: 0, y: -30 * s };
        let neck = { x: 0, y: -54 * s };
        let head = { x: 0, y: -64 * s };
        let headAngle = 0;

        let frontFoot = { x: 8 * s, y: 0 };
        let backFoot = { x: -8 * s, y: 0 };

        let frontHand = { x: 12 * s, y: -36 * s };
        let backHand = { x: 8 * s, y: -36 * s };
        let weaponAngle = 0.5;
        let weaponLength = 34 * s;

        // ================= IDLE STANCE (Ready Combat Stance) =================
        if (state === 'idle') {
            const breath = Math.sin(time * 3.5);
            hip.y = (-30 + breath * 1.5) * s;
            neck.y = (-54 + breath * 2.0) * s;
            neck.x = 4 * s;
            head.x = 6 * s;
            head.y = neck.y - 10 * s;

            frontFoot = { x: 14 * s, y: 0 };
            backFoot = { x: -12 * s, y: 0 };

            // Low ready sword grip
            frontHand = { x: 12 * s, y: -34 * s + breath * 1.5 * s };
            backHand = { x: 8 * s, y: -34 * s + breath * 1.5 * s };
            weaponAngle = 0.6 + breath * 0.05;

        // ================= RUN CYCLE (Dynamic Ninja Dash) =================
        } else if (state === 'run') {
            const freq = 12;
            const cycle = (time * freq) % (Math.PI * 2);
            const sin = Math.sin(cycle);
            const cos = Math.cos(cycle);

            // Forward aggressive lean
            hip.x = 2 * s;
            hip.y = (-28 + Math.abs(sin) * 3) * s;
            neck.x = 14 * s;
            neck.y = -50 * s;
            head.x = 18 * s;
            head.y = -58 * s;
            headAngle = 0.15;

            // Pumping feet
            frontFoot = { x: (sin * 22 + 4) * s, y: Math.min(0, cos * 10 * s) };
            backFoot = { x: (-sin * 22 - 4) * s, y: Math.min(0, -cos * 10 * s) };

            // Sword held backward trailing in wind
            frontHand = { x: (-sin * 12 - 4) * s, y: -36 * s };
            backHand = { x: (sin * 14 + 6) * s, y: -38 * s };
            weaponAngle = 2.4 - sin * 0.2;

        // ================= ATTACK 1: HORIZONTAL CRESCENT SLASH =================
        } else if (state === 'attack1') {
            const duration = 0.34;
            const progress = Math.min(1, time / duration);

            if (progress < 0.32) {
                // PHASE 1: Wind-up (Coiling back into Battoujutsu stance)
                const t = easeInCubic(progress / 0.32);
                hip.x = lerp(0, -8 * s, t);
                hip.y = lerp(-30 * s, -24 * s, t); // lower stance
                neck.x = lerp(4 * s, -10 * s, t);
                neck.y = lerp(-54 * s, -48 * s, t);
                head.x = -8 * s;
                headAngle = -0.2;

                frontFoot = { x: 12 * s, y: 0 };
                backFoot = { x: -16 * s, y: 0 };

                // Pull sword far back to right hip
                frontHand = { x: lerp(12 * s, -18 * s, t), y: lerp(-34 * s, -38 * s, t) };
                backHand = { x: lerp(8 * s, -22 * s, t), y: lerp(-34 * s, -38 * s, t) };
                weaponAngle = lerp(0.6, -2.6, t); // cocked backward

            } else if (progress < 0.65) {
                // PHASE 2: Explosive Forward Lunge & Searing Crescent Slash!
                const t = easeOutCubic((progress - 0.32) / 0.33);
                hip.x = lerp(-8 * s, 16 * s, t);
                hip.y = lerp(-24 * s, -26 * s, t);
                neck.x = lerp(-10 * s, 26 * s, t); // powerful torso thrust forward
                neck.y = lerp(-48 * s, -46 * s, t);
                head.x = 30 * s;
                headAngle = 0.25;

                // Deep forward martial lunge
                frontFoot = { x: lerp(12 * s, 28 * s, t), y: 0 };
                backFoot = { x: -16 * s, y: 0 };

                // Full-power horizontal blade sweep
                frontHand = { x: lerp(-18 * s, 34 * s, t), y: lerp(-38 * s, -32 * s, t) };
                backHand = { x: lerp(-22 * s, 28 * s, t), y: lerp(-38 * s, -32 * s, t) };
                weaponAngle = lerp(-2.6, 1.45, t); // massive 230-degree arc cut!

            } else {
                // PHASE 3: Recoil & Smooth Settle
                const t = easeInOutQuad((progress - 0.65) / 0.35);
                hip.x = lerp(16 * s, 6 * s, t);
                neck.x = lerp(26 * s, 10 * s, t);
                head.x = lerp(30 * s, 12 * s, t);

                frontFoot = { x: 20 * s, y: 0 };
                backFoot = { x: -12 * s, y: 0 };

                frontHand = { x: lerp(34 * s, 20 * s, t), y: lerp(-32 * s, -34 * s, t) };
                backHand = { x: lerp(28 * s, 14 * s, t), y: lerp(-32 * s, -34 * s, t) };
                weaponAngle = lerp(1.45, 0.7, t);
            }

        // ================= ATTACK 2: RISING DRAGON UPPERCUT =================
        } else if (state === 'attack2') {
            const duration = 0.36;
            const progress = Math.min(1, time / duration);

            if (progress < 0.30) {
                // PHASE 1: Low crouching windup
                const t = easeInCubic(progress / 0.30);
                hip.x = 2 * s;
                hip.y = lerp(-30 * s, -18 * s, t); // deep squat
                neck.x = 8 * s;
                neck.y = lerp(-54 * s, -38 * s, t);
                head.x = 10 * s;
                headAngle = 0.3;

                frontFoot = { x: 16 * s, y: 0 };
                backFoot = { x: -14 * s, y: 0 };

                // Sword dipped low towards ground
                frontHand = { x: lerp(12 * s, 10 * s, t), y: lerp(-34 * s, -12 * s, t) };
                backHand = { x: lerp(8 * s, 6 * s, t), y: lerp(-34 * s, -12 * s, t) };
                weaponAngle = lerp(0.6, 2.3, t);

            } else if (progress < 0.68) {
                // PHASE 2: Airborne Launch & Sky-piercing Upward Arc!
                const t = easeOutBack((progress - 0.30) / 0.38);
                hip.x = lerp(2 * s, 14 * s, t);
                hip.y = lerp(-18 * s, -42 * s, t); // lifted into air!
                neck.x = lerp(8 * s, 12 * s, t);
                neck.y = lerp(-38 * s, -68 * s, t);
                head.x = 14 * s;
                headAngle = -0.35; // looking up at the slice

                frontFoot = { x: 10 * s, y: lerp(0, -18 * s, t) };
                backFoot = { x: -8 * s, y: lerp(0, -26 * s, t) };

                // Sword launched skyward
                frontHand = { x: lerp(10 * s, 26 * s, t), y: lerp(-12 * s, -72 * s, t) };
                backHand = { x: lerp(6 * s, 20 * s, t), y: lerp(-12 * s, -72 * s, t) };
                weaponAngle = lerp(2.3, -1.2, t); // vertical upward slice

            } else {
                // PHASE 3: Landing back
                const t = easeInOutQuad((progress - 0.68) / 0.32);
                hip.y = lerp(-42 * s, -28 * s, t);
                neck.y = lerp(-68 * s, -52 * s, t);
                frontFoot = { x: 14 * s, y: 0 };
                backFoot = { x: -10 * s, y: 0 };

                frontHand = { x: lerp(26 * s, 16 * s, t), y: lerp(-72 * s, -40 * s, t) };
                backHand = { x: lerp(20 * s, 12 * s, t), y: lerp(-72 * s, -40 * s, t) };
                weaponAngle = lerp(-1.2, 0.4, t);
            }

        // ================= ATTACK 3: HELM SPLITTER / GROUND SLAM (FINISHER) =================
        } else if (state === 'attack3') {
            const duration = 0.50;
            const progress = Math.min(1, time / duration);

            if (progress < 0.35) {
                // PHASE 1: Dramatic Aerial Somersault Windup!
                const t = easeInCubic(progress / 0.35);
                hip.x = lerp(0, 8 * s, t);
                hip.y = lerp(-30 * s, -54 * s, t); // jumps 24px into air
                neck.x = 6 * s;
                neck.y = lerp(-54 * s, -78 * s, t);
                head.x = 8 * s;
                headAngle = -0.4;

                // Tucked legs
                frontFoot = { x: 6 * s, y: lerp(0, -32 * s, t) };
                backFoot = { x: -10 * s, y: lerp(0, -28 * s, t) };

                // Two hands gripping sword high over head
                frontHand = { x: lerp(12 * s, 4 * s, t), y: lerp(-34 * s, -86 * s, t) };
                backHand = { x: lerp(8 * s, 0 * s, t), y: lerp(-34 * s, -86 * s, t) };
                weaponAngle = lerp(0.5, -2.85, t); // raised straight up

            } else if (progress < 0.60) {
                // PHASE 2: Crushing Downward Hammer Slam!
                const t = easeInCubic((progress - 0.35) / 0.25);
                hip.x = lerp(8 * s, 22 * s, t);
                hip.y = lerp(-54 * s, -16 * s, t); // rocketing down to deep squat
                neck.x = lerp(6 * s, 30 * s, t);
                neck.y = lerp(-78 * s, -34 * s, t);
                head.x = 32 * s;
                headAngle = 0.5;

                frontFoot = { x: 30 * s, y: 0 };
                backFoot = { x: -8 * s, y: 0 };

                // Sword slammed into ground!
                frontHand = { x: lerp(4 * s, 36 * s, t), y: lerp(-86 * s, -10 * s, t) };
                backHand = { x: lerp(0 * s, 32 * s, t), y: lerp(-86 * s, -10 * s, t) };
                weaponAngle = lerp(-2.85, 1.48, t); // vertically embedded in floor

            } else {
                // PHASE 3: Superhero Landing / Standing up
                const t = easeOutCubic((progress - 0.60) / 0.40);
                hip.x = lerp(22 * s, 10 * s, t);
                hip.y = lerp(-16 * s, -28 * s, t);
                neck.x = lerp(30 * s, 12 * s, t);
                neck.y = lerp(-34 * s, -52 * s, t);
                head.x = 14 * s;
                headAngle = lerp(0.5, 0, t);

                frontFoot = { x: 18 * s, y: 0 };
                backFoot = { x: -10 * s, y: 0 };

                frontHand = { x: lerp(36 * s, 16 * s, t), y: lerp(-10 * s, -34 * s, t) };
                backHand = { x: lerp(32 * s, 12 * s, t), y: lerp(-10 * s, -34 * s, t) };
                weaponAngle = lerp(1.48, 0.6, t);
            }

        // ================= SKILL 1: AERIAL CYCLONE DIVE SLAM =================
        } else if (state === 'skill1' && this.type === 'blade') {
            if (customProps && customProps.isSpinning) {
                // Tucked spinning buzzsaw pose with katana extended outward radially!
                hip.x = 6 * s;
                hip.y = -30 * s;
                neck.x = 2 * s;
                neck.y = -46 * s;
                head.x = 4 * s;
                head.y = -52 * s;
                headAngle = 0;

                frontFoot = { x: 10 * s, y: -20 * s };
                backFoot = { x: -10 * s, y: -18 * s };

                frontHand = { x: 28 * s, y: -32 * s };
                backHand = { x: 22 * s, y: -32 * s };
                weaponAngle = 0.15; // sawblade radiating outward

            } else if (customProps && customProps.slamLanded) {
                // Slam landed pose: 3-point ground landing with sword planted in earth
                hip.x = 24 * s;
                hip.y = -14 * s;
                neck.x = 32 * s;
                neck.y = -28 * s;
                head.x = 34 * s;
                headAngle = 0.45;

                frontFoot = { x: 30 * s, y: 0 };
                backFoot = { x: -10 * s, y: 0 };

                frontHand = { x: 36 * s, y: -6 * s };
                backHand = { x: 32 * s, y: -6 * s };
                weaponAngle = 1.48; // buried vertically in the ground

            } else {
                // Initial jump launch pose
                hip.x = 6 * s;
                hip.y = -48 * s;
                neck.x = 6 * s;
                neck.y = -72 * s;
                head.x = 8 * s;
                headAngle = -0.3;

                frontFoot = { x: 8 * s, y: -30 * s };
                backFoot = { x: -8 * s, y: -26 * s };

                frontHand = { x: 14 * s, y: -58 * s };
                backHand = { x: 10 * s, y: -58 * s };
                weaponAngle = -1.2;
            }

        // ================= ARCHER SHOOT & CHARGE =================
        } else if (state === 'shoot') {
            neck.x = -2 * s;
            const ratio = (customProps && customProps.chargeRatio) || 0;
            const aim = (customProps && customProps.aimAngle !== undefined) ? customProps.aimAngle : 0;
            const cos = Math.cos(aim);
            const sin = Math.sin(aim);

            // Bow holding front hand extended towards aim direction
            frontHand = { x: 18 * s + cos * 6 * s, y: -46 * s + sin * 6 * s };
            // String drawing back hand pulled back along aim vector
            const drawPull = 12 * s + ratio * 16 * s;
            backHand = { x: frontHand.x - cos * drawPull, y: frontHand.y - sin * drawPull };
            weaponAngle = aim;

        // ================= HIT FLINCH =================
        } else if (state === 'hit') {
            hip.x = -10 * s;
            neck.x = -20 * s;
            head.x = -26 * s;
            headAngle = -0.3;
            frontHand = { x: 2 * s, y: -40 * s };
            backHand = { x: -4 * s, y: -40 * s };

        // ================= DEAD =================
        } else if (state === 'dead') {
            hip.y = -6 * s;
            neck.y = -6 * s;
            neck.x = -22 * s;
            head.y = -6 * s;
            head.x = -34 * s;
            frontFoot = { x: 18 * s, y: -4 * s };
            backFoot = { x: 12 * s, y: -2 * s };
            frontHand = { x: -8 * s, y: -4 * s };
        }

        // Spine control points (3-point Bezier for fluid organic curves)
        const spineLow = { x: hip.x * 0.7 + neck.x * 0.3, y: hip.y * 0.7 + neck.y * 0.3 };
        const spineHigh = { x: hip.x * 0.3 + neck.x * 0.7, y: hip.y * 0.3 + neck.y * 0.7 };

        // Shoulders
        const frontShoulder = { x: neck.x + 3 * s, y: neck.y + 4 * s };
        const backShoulder = { x: neck.x - 3 * s, y: neck.y + 4 * s };

        // Solve IK for Arms and Legs
        const frontArmJoint = solveIK(frontShoulder, frontHand, this.upperArmLen, this.forearmLen, 1);
        const backArmJoint = solveIK(backShoulder, backHand, this.upperArmLen, this.forearmLen, -1);

        const frontLegJoint = solveIK(hip, frontFoot, this.thighLen, this.shinLen, 1);
        const backLegJoint = solveIK(hip, backFoot, this.thighLen, this.shinLen, -1);

        // Weapon geometry
        const weaponBase = frontHand;
        const weaponTip = {
            x: frontHand.x + Math.cos(weaponAngle) * weaponLength,
            y: frontHand.y + Math.sin(weaponAngle) * weaponLength
        };

        return {
            hip, neck, head, headAngle,
            spineLow, spineHigh,
            frontShoulder, backShoulder,
            frontHand, backHand,
            frontFoot, backFoot,
            frontArmJoint, backArmJoint,
            frontLegJoint, backLegJoint,
            weapon: { base: weaponBase, tip: weaponTip, angle: weaponAngle }
        };
    }

    /**
     * Renders a glowing polygon ribbon trail connecting recent blade tip and base positions!
     */
    updateAndDrawBladeTrail(ctx, weapon, s, state) {
        this.trailPoints.unshift({
            base: { ...weapon.base },
            tip: { ...weapon.tip },
            alpha: 1.0
        });

        if (this.trailPoints.length > this.maxTrailLength) {
            this.trailPoints.pop();
        }

        if (this.trailPoints.length < 2) return;

        ctx.save();
        for (let i = 0; i < this.trailPoints.length - 1; i++) {
            const p1 = this.trailPoints[i];
            const p2 = this.trailPoints[i + 1];
            const tRatio = 1 - (i / this.trailPoints.length);

            // Dynamic color by hero/state
            let edgeColor = '#ff2a5f';
            let glowColor = '#ff0055';
            if (this.type === 'paladin') {
                edgeColor = '#ffd700';
                glowColor = '#ffaa00';
            } else if (state === 'skill1') {
                edgeColor = '#00e5ff';
                glowColor = '#0099ff';
            }

            ctx.beginPath();
            ctx.moveTo(p1.base.x, p1.base.y);
            ctx.lineTo(p1.tip.x, p1.tip.y);
            ctx.lineTo(p2.tip.x, p2.tip.y);
            ctx.lineTo(p2.base.x, p2.base.y);
            ctx.closePath();

            ctx.fillStyle = edgeColor;
            ctx.globalAlpha = tRatio * 0.65;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 12 * tRatio;
            ctx.fill();

            // Searing inner white core
            ctx.beginPath();
            const mid1 = lerpPoint(p1.base, p1.tip, 0.7);
            const mid2 = lerpPoint(p2.base, p2.tip, 0.7);
            ctx.moveTo(mid1.x, mid1.y);
            ctx.lineTo(p1.tip.x, p1.tip.y);
            ctx.lineTo(p2.tip.x, p2.tip.y);
            ctx.lineTo(mid2.x, mid2.y);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = tRatio * 0.85;
            ctx.fill();
        }
        ctx.restore();
    }

    drawScarf(ctx, pose, s) {
        ctx.save();
        ctx.fillStyle = this.capeColor;
        ctx.beginPath();
        ctx.moveTo(pose.neck.x - 3 * s, pose.neck.y);
        ctx.quadraticCurveTo(pose.neck.x - 18 * s, pose.neck.y + 8 * s, pose.neck.x - 28 * s, pose.neck.y + 18 * s);
        ctx.quadraticCurveTo(pose.neck.x - 14 * s, pose.neck.y + 14 * s, pose.neck.x - 4 * s, pose.neck.y + 8 * s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawHead(ctx, head, headAngle, s, props) {
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(headAngle);

        ctx.beginPath();
        ctx.arc(0, 0, this.headRadius, 0, Math.PI * 2);
        ctx.fill();

        // Eye / Visual style
        if (this.type === 'blade') {
            ctx.fillStyle = '#ff2a5f';
            ctx.shadowColor = '#ff2a5f';
            ctx.shadowBlur = 8;
            ctx.fillRect(1 * s, -2 * s, 6 * s, 2.5 * s);

            // Flowing red ninja bandana knot
            ctx.strokeStyle = '#ff2a5f';
            ctx.lineWidth = 3 * s;
            ctx.beginPath();
            ctx.moveTo(-6 * s, -1 * s);
            ctx.quadraticCurveTo(-16 * s, -5 * s, -26 * s, 1 * s);
            ctx.stroke();

        } else if (this.type === 'paladin') {
            ctx.strokeStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2.5 * s;
            ctx.beginPath();
            ctx.ellipse(0, -12 * s, 10 * s, 3.5 * s, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 6;
            ctx.fillRect(2 * s, -1 * s, 4 * s, 2 * s);

        } else if (this.type === 'archer') {
            ctx.fillStyle = '#27ae60';
            ctx.beginPath();
            ctx.arc(0, 0, this.headRadius + 2 * s, Math.PI * 0.8, Math.PI * 1.9);
            ctx.fill();

            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(2 * s, -1 * s, 3 * s, 2 * s);

        } else if (this.type === 'enemy') {
            ctx.fillStyle = '#ff0033';
            ctx.shadowColor = '#ff0033';
            ctx.shadowBlur = 6;
            ctx.fillRect(1 * s, -2 * s, 4 * s, 2 * s);
        }

        ctx.restore();
    }

    drawLeg(ctx, hip, foot, s, bendDir) {
        const joint = solveIK(hip, foot, this.thighLen, this.shinLen, bendDir);

        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y);
        ctx.lineTo(joint.x, joint.y);
        ctx.lineTo(foot.x, foot.y);
        ctx.stroke();

        // Foot sole line
        ctx.beginPath();
        ctx.moveTo(foot.x - 3 * s, foot.y);
        ctx.lineTo(foot.x + 5 * s, foot.y);
        ctx.stroke();
    }

    drawArm(ctx, shoulder, hand, s, bendDir) {
        const joint = solveIK(shoulder, hand, this.upperArmLen, this.forearmLen, bendDir);

        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(joint.x, joint.y);
        ctx.lineTo(hand.x, hand.y);
        ctx.stroke();
    }

    drawWeapon(ctx, weapon, s, props) {
        ctx.save();
        ctx.translate(weapon.base.x, weapon.base.y);
        ctx.rotate(weapon.angle);

        if (this.type === 'blade') {
            // Katana: razor-sharp silver blade with glowing edge & tsuba
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 3.0 * s;
            ctx.beginPath();
            ctx.moveTo(-6 * s, 0);
            ctx.lineTo(32 * s, 0);
            ctx.stroke();

            // Searing blade glow edge
            ctx.strokeStyle = '#ff2a5f';
            ctx.shadowColor = '#ff2a5f';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 1.6 * s;
            ctx.beginPath();
            ctx.moveTo(6 * s, -1 * s);
            ctx.lineTo(34 * s, -1 * s);
            ctx.stroke();

            // Tsuba guard & Tsuka hilt
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 4.2 * s;
            ctx.beginPath();
            ctx.moveTo(-6 * s, 0);
            ctx.lineTo(-14 * s, 0);
            ctx.stroke();

            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-6 * s, -4 * s, 2.5 * s, 8 * s);

        } else if (this.type === 'paladin') {
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 3.8 * s;
            ctx.beginPath();
            ctx.moveTo(-8 * s, 0);
            ctx.lineTo(26 * s, 0);
            ctx.stroke();

            // Golden War Hammer Head
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 10;
            ctx.fillRect(16 * s, -12 * s, 14 * s, 24 * s);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(21 * s, -8 * s, 4 * s, 16 * s);
            ctx.fillRect(17 * s, -2 * s, 12 * s, 4 * s);

        } else if (this.type === 'archer') {
            const isCharging = props && props.isCharging;
            const ratio = (props && props.chargeRatio) || 0;
            const stringPull = isCharging ? ratio * 14 * s : 0;

            // Curved Bow Stave
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2.8 * s;
            ctx.beginPath();
            ctx.arc(8 * s, 0, 18 * s, -Math.PI * 0.45, Math.PI * 0.45);
            ctx.stroke();

            // Drawn Bowstring
            ctx.strokeStyle = isCharging && ratio >= 0.95 ? '#00e5ff' : 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = (isCharging && ratio >= 0.95 ? 1.6 : 1.0) * s;
            ctx.beginPath();
            ctx.moveTo(8 * s + 18 * s * Math.cos(-Math.PI * 0.45), 18 * s * Math.sin(-Math.PI * 0.45));
            ctx.lineTo(-2 * s - stringPull, 0);
            ctx.lineTo(8 * s + 18 * s * Math.cos(Math.PI * 0.45), 18 * s * Math.sin(Math.PI * 0.45));
            ctx.stroke();

            // Nocked Arrow during Charge
            if (isCharging) {
                const isMax = ratio >= 0.95;
                ctx.save();
                ctx.strokeStyle = isMax ? '#00e5ff' : '#cbd5e1';
                ctx.lineWidth = (isMax ? 2.5 : 1.8) * s;
                if (isMax) {
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 10;
                }

                // Shaft
                ctx.beginPath();
                ctx.moveTo(-2 * s - stringPull, 0);
                ctx.lineTo(26 * s, 0);
                ctx.stroke();

                // Glowing Arrowhead
                ctx.fillStyle = isMax ? '#00e5ff' : (ratio >= 0.5 ? '#34d399' : '#ffeb3b');
                ctx.beginPath();
                ctx.moveTo(26 * s, 0);
                ctx.lineTo(20 * s, -3.5 * s);
                ctx.lineTo(20 * s, 3.5 * s);
                ctx.closePath();
                ctx.fill();

                if (isMax) {
                    // Pulsing Charge Aura on Arrow Tip
                    const pulse = 1.0 + Math.sin(Date.now() * 0.015) * 0.25;
                    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
                    ctx.beginPath();
                    ctx.arc(26 * s, 0, 7 * s * pulse, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

        } else if (this.type === 'swordsman') {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.6 * s;
            ctx.beginPath();
            ctx.moveTo(-4 * s, 0);
            ctx.lineTo(18 * s, 0);
            ctx.stroke();

        } else if (this.type === 'enemy') {
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 3.2 * s;
            ctx.beginPath();
            ctx.moveTo(-6 * s, 0);
            ctx.lineTo(22 * s, 0);
            ctx.stroke();
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(14 * s, -8 * s, 10 * s, 16 * s);
        }

        ctx.restore();
    }
}


/* --- js/entities.js --- */
// Entities: Base, Minions, Enemies, Projectiles with persistent upgrades



class Base {
    constructor(x, y, isPlayer = true, baseHp = 1200) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;

        // Apply Player Castle Upgrades
        if (this.isPlayer) {
            const u = saveManager.data.upgrades;
            this.maxHp = baseHp + (u.castleHpLv - 1) * 250;
            this.turretDamage = 25 + (u.castleTurretLv - 1) * 12;
        } else {
            this.maxHp = baseHp;
            this.turretDamage = 25;
        }

        this.hp = this.maxHp;
        this.width = 120;
        this.height = 180;
        this.attackTimer = 0;
        this.attackInterval = 1.7;
        this.attackRange = 540; // Extended defensive perimeter
        this.turretAngle = isPlayer ? -0.2 : Math.PI + 0.2;
        this.turretMuzzleFlash = 0;
    }

    update(dt, enemies, projectiles) {
        // Automatic defense ballista with accurate ballistic lead targeting
        this.attackTimer += dt;
        if (this.turretMuzzleFlash > 0) this.turretMuzzleFlash -= dt;

        const dir = this.isPlayer ? 1 : -1;
        const launchX = this.x + dir * 40;
        const launchY = this.y - 120;

        // Find enemies in front of the base within attack range
        const validEnemies = enemies.filter(e => {
            if (e.hp <= 0) return false;
            const dist = (e.x - launchX) * dir;
            return dist > 15 && dist <= this.attackRange;
        });

        if (validEnemies.length > 0) {
            // Target the closest threat approaching the castle
            validEnemies.sort((a, b) => Math.abs(a.x - launchX) - Math.abs(b.x - launchX));
            const target = validEnemies[0];

            // Target position (aim at chest)
            const targetX = target.x;
            const targetY = target.y - 28;
            const targetVx = (target.vx !== undefined && Math.abs(target.vx) > 1)
                ? target.vx
                : (target.facing || -dir) * (target.speed || 65) * (target.speedMultiplier || 1);

            // Ballistic calculation with gravity g = 340
            const g = 340;
            const approxSpeed = 500;
            const directDx = targetX - launchX;
            let flightTime = Math.max(0.28, Math.abs(directDx) / approxSpeed);

            // Lead target movement
            const predictedX = targetX + targetVx * flightTime;
            const dx = predictedX - launchX;
            flightTime = Math.max(0.28, Math.abs(dx) / approxSpeed);

            const vx = dx / flightTime;
            const dy = targetY - launchY;
            const vy = (dy - 0.5 * g * flightTime * flightTime) / flightTime;

            // Smoothly track turret aim angle towards target
            const targetAngle = Math.atan2(vy, vx);
            this.turretAngle = targetAngle;

            if (this.attackTimer >= this.attackInterval) {
                this.attackTimer = 0;
                this.turretMuzzleFlash = 0.15;

                projectiles.push(new Projectile({
                    x: launchX,
                    y: launchY,
                    vx: vx,
                    vy: vy,
                    damage: this.turretDamage,
                    isPlayer: this.isPlayer,
                    type: 'arrow',
                    gravity: g,
                    radius: 7,
                    isTurretShot: true
                }));
                sound.arrowShoot();
            }
        } else {
            // Idle aim angle
            const defaultAngle = this.isPlayer ? -0.2 : Math.PI + 0.2;
            this.turretAngle += (defaultAngle - this.turretAngle) * 5 * dt;
        }
    }

    takeDamage(amount, particles) {
        this.hp = Math.max(0, this.hp - amount);
        sound.baseHit();
        particles.addHitSparks(this.x + (this.isPlayer ? 40 : -40), this.y - 80, 10, '#ff9900');
        particles.addDamageText(this.x, this.y - 100, amount, true);
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();
        ctx.fillStyle = this.isPlayer ? '#2c3e50' : '#4a235a';
        ctx.strokeStyle = this.isPlayer ? '#3498db' : '#e74c3c';
        ctx.lineWidth = 4;

        const bx = screenX - 60;
        const by = screenY - this.height;
        ctx.beginPath();
        ctx.rect(bx, by, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.isPlayer ? '#1a252f' : '#2c1438';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(bx + i * 32, by - 16, 22, 16);
            ctx.strokeRect(bx + i * 32, by - 16, 22, 16);
        }

        // Castle Banner / Flag
        ctx.fillStyle = this.isPlayer ? '#00e5ff' : '#ff0055';
        ctx.beginPath();
        ctx.moveTo(bx + (this.isPlayer ? 20 : 100), by - 16);
        ctx.lineTo(bx + (this.isPlayer ? 20 : 100), by - 45);
        ctx.lineTo(bx + (this.isPlayer ? -15 : 135), by - 32);
        ctx.closePath();
        ctx.fill();

        // Magic Core Crystal
        const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
        ctx.fillStyle = this.isPlayer ? `rgba(0, 229, 255, ${pulse})` : `rgba(255, 0, 85, ${pulse})`;
        ctx.shadowColor = this.isPlayer ? '#00e5ff' : '#ff0055';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bx + this.width / 2, by + 50, 16, 0, Math.PI * 2);
        ctx.fill();

        // Castle Rooftop Ballista Turret
        const turretMountX = bx + (this.isPlayer ? 95 : 25);
        const turretMountY = by - 10;

        ctx.save();
        ctx.translate(turretMountX, turretMountY);
        // Base mount
        ctx.fillStyle = '#334155';
        ctx.fillRect(-10, -4, 20, 8);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(-10, -4, 20, 8);

        // Rotating Ballista Bow & Barrel
        ctx.rotate(this.turretAngle);
        ctx.fillStyle = this.isPlayer ? '#38bdf8' : '#ef4444';
        ctx.fillRect(-6, -3, 28, 6); // Ballista stock
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(-6, -3, 28, 6);

        // Bow arms
        ctx.strokeStyle = this.isPlayer ? '#00e5ff' : '#ff0055';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(14, 0, 12, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.stroke();

        // Muzzle flash when firing
        if (this.turretMuzzleFlash > 0) {
            ctx.fillStyle = '#ffea00';
            ctx.shadowColor = '#ffea00';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(28, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        ctx.restore();

        this.drawHpBar(ctx, bx, by - 55, this.width, 10);
    }

    drawHpBar(ctx, x, y, w, h) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, w, h);

        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = this.isPlayer ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(x, y, w * pct, h);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(this.hp)} / ${this.maxHp}`, x + w / 2, y - 4);
        ctx.restore();
    }
}

class Projectile {
    constructor({
        x, y, vx, vy, damage, isPlayer,
        type = 'arrow',
        gravity = 300,
        radius = 6,
        pierceCount = 1,
        isCharged = false,
        chargeRatio = 0,
        isTurretShot = false
    }) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.isPlayer = isPlayer;
        this.type = type;
        this.gravity = gravity;
        this.radius = radius;
        this.pierceCount = pierceCount;
        this.isCharged = isCharged;
        this.chargeRatio = chargeRatio;
        this.isTurretShot = isTurretShot;
        this.hitTargets = new Set();
        this.alive = true;
        this.trailTimer = 0;
    }

    update(dt, targets, enemyBase, particles) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;

        // Subtle particle trail for charged arrows or turret ballista bolts
        this.trailTimer += dt;
        if (this.trailTimer >= 0.04) {
            this.trailTimer = 0;
            if (this.isCharged) {
                particles.addHitSparks(this.x, this.y, 2, this.chargeRatio >= 0.95 ? '#00e5ff' : '#10b981');
            } else if (this.isTurretShot) {
                particles.addHitSparks(this.x, this.y, 1, this.isPlayer ? '#38bdf8' : '#ef4444');
            }
        }

        if (this.y >= 540) {
            this.alive = false;
            particles.addDust(this.x, 540, Math.sign(this.vx));
            return;
        }

        for (const target of targets) {
            if (target.hp <= 0 || this.hitTargets.has(target)) continue;
            const dist = Math.hypot(target.x - this.x, (target.y - 30) - this.y);
            if (dist < target.hitRadius + this.radius) {
                this.hitTargets.add(target);

                if (this.type === 'magic') {
                    this.alive = false;
                    sound.magicExplode();
                    particles.addShockwave(this.x, this.y, '#9b59b6', 70, 300);
                    for (const splashTarget of targets) {
                        if (splashTarget.hp > 0 && Math.abs(splashTarget.x - this.x) < 80) {
                            splashTarget.takeDamage(this.damage, particles, Math.sign(this.vx));
                        }
                    }
                    return;
                } else {
                    sound.arrowHit();
                    target.takeDamage(this.damage, particles, Math.sign(this.vx));

                    // Charged arrow impact shockwave
                    if (this.isCharged && this.chargeRatio >= 0.75) {
                        particles.addShockwave(this.x, this.y, '#00e5ff', 50, 220, 4);
                        particles.addHitSparks(this.x, this.y, 8, '#00e5ff');
                    }

                    this.pierceCount--;
                    if (this.pierceCount <= 0) {
                        this.alive = false;
                        return;
                    }
                }
            }
        }

        if (enemyBase && enemyBase.hp > 0) {
            const hitBase = this.isPlayer ? (this.x >= enemyBase.x - 60) : (this.x <= enemyBase.x + 60);
            if (hitBase && this.y >= enemyBase.y - enemyBase.height && this.y <= enemyBase.y) {
                this.alive = false;
                enemyBase.takeDamage(this.damage, particles);
                if (this.isCharged) {
                    particles.addShockwave(this.x, this.y, '#00e5ff', 70, 260, 5);
                }
            }
        }
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        if (this.type === 'arrow') {
            const angle = Math.atan2(this.vy, this.vx);
            ctx.translate(sx, sy);
            ctx.rotate(angle);

            const isMaxCharge = this.isCharged && this.chargeRatio >= 0.95;
            const arrowScale = this.isCharged ? (1.0 + this.chargeRatio * 0.6) : (this.isTurretShot ? 1.3 : 1.0);

            ctx.scale(arrowScale, arrowScale);

            if (isMaxCharge) {
                // Radiant max charge arrow
                ctx.strokeStyle = '#00e5ff';
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 12;
                ctx.lineWidth = 3.5;
            } else if (this.isCharged) {
                ctx.strokeStyle = '#34d399';
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 8;
                ctx.lineWidth = 2.8;
            } else if (this.isTurretShot) {
                ctx.strokeStyle = this.isPlayer ? '#38bdf8' : '#ef4444';
                ctx.shadowColor = this.isPlayer ? '#38bdf8' : '#ef4444';
                ctx.shadowBlur = 6;
                ctx.lineWidth = 3.0;
            } else {
                ctx.strokeStyle = this.isPlayer ? '#ffffff' : '#e74c3c';
                ctx.lineWidth = 2.2;
            }

            // Arrow shaft
            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(12, 0);
            ctx.stroke();

            // Arrow head
            ctx.fillStyle = isMaxCharge ? '#00e5ff' : (this.isCharged ? '#34d399' : '#ffeb3b');
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.lineTo(6, -4);
            ctx.lineTo(6, 4);
            ctx.closePath();
            ctx.fill();

            // Fletching
            ctx.strokeStyle = isMaxCharge ? '#ffffff' : '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(-20, -3);
            ctx.moveTo(-16, 0);
            ctx.lineTo(-20, 3);
            ctx.stroke();

        } else if (this.type === 'magic') {
            ctx.fillStyle = '#9b59b6';
            ctx.shadowColor = '#8e44ad';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class Unit {
    constructor(config) {
        this.x = config.x;
        this.y = config.y || 540;
        this.isPlayer = config.isPlayer ?? true;
        this.facing = this.isPlayer ? 1 : -1;
        this.unitType = config.unitType || 'swordsman';

        // Apply Unit upgrades if player unit
        let hpMultiplier = 1.0;
        let dmgMultiplier = 1.0;
        if (this.isPlayer) {
            const u = saveManager.data.upgrades;
            if (this.unitType === 'swordsman') {
                hpMultiplier += (u.swordsmanLv - 1) * 0.15;
                dmgMultiplier += (u.swordsmanLv - 1) * 0.15;
            } else if (this.unitType === 'shield') {
                hpMultiplier += (u.shieldLv - 1) * 0.22;
                dmgMultiplier += (u.shieldLv - 1) * 0.10;
            } else if (this.unitType === 'bow') {
                hpMultiplier += (u.bowLv - 1) * 0.12;
                dmgMultiplier += (u.bowLv - 1) * 0.18;
            } else if (this.unitType === 'mage') {
                hpMultiplier += (u.mageLv - 1) * 0.12;
                dmgMultiplier += (u.mageLv - 1) * 0.22;
            }
        }

        this.maxHp = Math.round((config.maxHp || 100) * hpMultiplier);
        this.hp = this.maxHp;
        this.speed = config.speed || 80;
        this.attackPower = Math.round((config.attackPower || 15) * dmgMultiplier);
        this.attackRange = config.attackRange || 45;
        this.attackSpeed = config.attackSpeed || 1.0;
        this.hitRadius = config.hitRadius || 18;
        this.cost = config.cost || 30;

        this.state = 'idle';
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.knockbackVx = 0;

        // Buffs from Hero Aura
        this.buffed = false;
        this.attackMultiplier = 1.0;
        this.defenseMultiplier = 1.0;
        this.speedMultiplier = 1.0;

        this.renderer = new StickmanRenderer({
            scale: config.scale || 0.9,
            color: this.isPlayer ? '#111827' : '#311025',
            type: this.unitType,
            hasCape: config.hasCape || false,
            capeColor: config.capeColor
        });
    }

    update(dt, enemies, enemyBase, projectiles, particles) {
        this.stateTimer += dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        if (Math.abs(this.knockbackVx) > 5) {
            this.x += this.knockbackVx * dt;
            this.knockbackVx *= 0.88;
        }

        if (this.hp <= 0) {
            this.state = 'dead';
            return;
        }

        let target = null;
        let minDist = Infinity;
        for (const e of enemies) {
            if (e.hp <= 0) continue;
            const dist = (e.x - this.x) * this.facing;
            if (dist > -10 && dist < minDist) {
                minDist = dist;
                target = e;
            }
        }

        const baseDist = enemyBase ? (enemyBase.x - this.x) * this.facing : Infinity;

        if (target && minDist <= this.attackRange) {
            this.handleAttack(dt, target, null, projectiles, particles);
        } else if (enemyBase && baseDist <= this.attackRange + 40 && enemyBase.hp > 0) {
            this.handleAttack(dt, null, enemyBase, projectiles, particles);
        } else {
            this.state = 'run';
            this.x += this.facing * this.speed * this.speedMultiplier * dt;
        }
    }

    handleAttack(dt, unitTarget, baseTarget, projectiles, particles) {
        if (this.attackCooldown <= 0) {
            this.attackCooldown = 1.0 / this.attackSpeed;
            this.state = this.unitType === 'bow' ? 'shoot' : (this.unitType === 'mage' ? 'cast' : 'attack1');
            this.stateTimer = 0;

            const finalDamage = this.attackPower * this.attackMultiplier;

            if (this.unitType === 'bow') {
                sound.arrowShoot();
                projectiles.push(new Projectile({
                    x: this.x + this.facing * 16,
                    y: this.y - 35,
                    vx: this.facing * 430,
                    vy: -80,
                    damage: finalDamage,
                    isPlayer: this.isPlayer,
                    type: 'arrow',
                    gravity: 280
                }));
            } else if (this.unitType === 'mage') {
                sound.arrowShoot();
                projectiles.push(new Projectile({
                    x: this.x + this.facing * 18,
                    y: this.y - 40,
                    vx: this.facing * 340,
                    vy: 0,
                    damage: finalDamage,
                    isPlayer: this.isPlayer,
                    type: 'magic',
                    gravity: 0
                }));
            } else {
                sound.slash();
                particles.addSlashArc(this.x + this.facing * 20, this.y - 30, 32, this.facing, this.isPlayer ? '#00e5ff' : '#e74c3c');
                setTimeout(() => {
                    if (unitTarget && unitTarget.hp > 0) {
                        unitTarget.takeDamage(finalDamage, particles, this.facing);
                        sound.hitBlade();
                    } else if (baseTarget && baseTarget.hp > 0) {
                        baseTarget.takeDamage(finalDamage, particles);
                        sound.hitBlade();
                    }
                }, 120);
            }
        } else if (this.stateTimer > 0.45) {
            this.state = 'idle';
        }
    }

    takeDamage(amount, particles, attackDir = 0) {
        const actualDamage = Math.max(1, amount / this.defenseMultiplier);
        this.hp = Math.max(0, this.hp - actualDamage);
        this.knockbackVx = attackDir * 90;
        this.state = 'hit';
        this.stateTimer = 0;

        particles.addHitSparks(this.x, this.y - 30, 8, this.isPlayer ? '#ff3366' : '#ffeb3b');
        particles.addDamageText(this.x, this.y - 35, actualDamage, false);
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        if (this.buffed && this.hp > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(sx, sy, 20, 6, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.restore();
        }

        this.renderer.draw(ctx, sx, sy, this.facing, this.state, this.stateTimer, { buffed: this.buffed });

        if (this.hp > 0 && this.hp < this.maxHp) {
            const barW = 28;
            const barH = 4;
            const barX = sx - barW / 2;
            const barY = sy - 65;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = this.isPlayer ? '#2ecc71' : '#e74c3c';
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
        }
    }
}


/* --- js/heroes.js --- */
// Hero Classes: Blade Master, Holy Paladin, Shadow Archer
// Features synchronized martial arts forward steps, hit-stop on impact,
// multi-keyframe attack animations, dynamic bow aiming, and Paladog aura.





class Hero {
    constructor(type = 'blade') {
        this.type = type;
        this.x = 180;
        this.y = 540;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1;
        this.groundY = 540;
        this.hitRadius = 26;

        // Aura Settings (Paladog style!)
        this.auraRadius = 220;
        this.auraPulse = 0;

        // State Machine
        this.state = 'idle'; // idle, run, dash, jump, attack1, attack2, attack3, shoot, aim, skill1, skill2, ult, hit, dead
        this.stateTimer = 0;
        this.comboCounter = 0;
        this.comboResetTimer = 0;
        this.attackHitDone = false;
        this.invulnerable = false;

        // Archer Aiming & Charge Shot System
        this.isAiming = false;
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 1.0;
        this.chargeRatio = 0;
        this.attackCooldown = 0;
        this.aimAngle = -0.2;
        this.aimPower = 650;

        // Initialize Stats with Upgrades
        this.initStats();

        // Stickman visual renderer
        this.renderer = new StickmanRenderer({
            scale: 1.15,
            color: '#0f172a',
            type: this.type,
            isHero: true,
            hasCape: true,
            capeColor: this.getCapeColor()
        });
    }

    getCapeColor() {
        if (this.type === 'blade') return '#e11d48';
        if (this.type === 'paladin') return '#3b82f6';
        return '#059669';
    }

    initStats() {
        const u = saveManager.data.upgrades;
        const hpMultiplier = 1 + (u.heroHpLv - 1) * 0.15;
        const atkMultiplier = 1 + (u.heroAtkLv - 1) * 0.15;

        if (this.type === 'blade') {
            this.name = '검성 (Blade Master)';
            this.title = '질풍의 참격술사';
            this.maxHp = Math.round(600 * hpMultiplier);
            this.hp = this.maxHp;
            this.speed = 220;
            this.attackPower = Math.round(48 * atkMultiplier);
            this.auraColor = 'rgba(239, 68, 68, 0.2)';
            this.auraBorderColor = '#ef4444';
            this.skills = {
                skill1: { name: '회천 강타', cd: 5.0, currentCd: 0, desc: '공중 도약 360도 회전 후 지면 강타' },
                skill2: { name: '승룡격', cd: 7.0, currentCd: 0, desc: '적을 공중으로 띄우는 검기' },
                ult: { name: '무한의 검무', cd: 18.0, currentCd: 0, desc: '전 화면 적을 난도질' }
            };
        } else if (this.type === 'paladin') {
            this.name = '성기사 (Holy Paladin)';
            this.title = '빛의 수호자';
            this.maxHp = Math.round(900 * hpMultiplier);
            this.hp = this.maxHp;
            this.speed = 175;
            this.attackPower = Math.round(55 * atkMultiplier);
            this.auraColor = 'rgba(234, 179, 8, 0.22)';
            this.auraBorderColor = '#eab308';
            this.skills = {
                skill1: { name: '방패 돌진', cd: 5.5, currentCd: 0, desc: '돌진하여 적을 밀치고 기절' },
                skill2: { name: '심판의 빛', cd: 7.5, currentCd: 0, desc: '광역 신성 벼락 폭발' },
                ult: { name: '신의 가호', cd: 20.0, currentCd: 0, desc: '전원 무적 보호막 & 대량 힐' }
            };
        } else { // archer
            this.name = '그림자 궁수 (Shadow Archer)';
            this.title = '심연의 저격수';
            this.maxHp = Math.round(500 * hpMultiplier);
            this.hp = this.maxHp;
            this.speed = 230;
            this.attackPower = Math.round(42 * atkMultiplier);
            this.auraColor = 'rgba(16, 185, 129, 0.2)';
            this.auraBorderColor = '#10b981';
            this.skills = {
                skill1: { name: '산탄 사격', cd: 4.0, currentCd: 0, desc: '5발의 화살을 부채꼴 발사' },
                skill2: { name: '곡예 저격', cd: 6.5, currentCd: 0, desc: '백텀블링 회피 및 관통 레이저' },
                ult: { name: '유성우 폭격', cd: 19.0, currentCd: 0, desc: '하늘에서 쏟아지는 화살 비' }
            };
        }
    }

    update(dt, input, allies, enemies, enemyBase, projectiles, particles, camera, game) {
        this.stateTimer += dt;
        this.auraPulse += dt * 3;

        // Reduce skill cooldowns
        for (const k in this.skills) {
            if (this.skills[k].currentCd > 0) {
                this.skills[k].currentCd = Math.max(0, this.skills[k].currentCd - dt);
            }
        }

        // Reset attack combo
        if (this.comboResetTimer > 0) {
            this.comboResetTimer -= dt;
            if (this.comboResetTimer <= 0) this.comboCounter = 0;
        }

        // Apply Paladog Aura
        for (const ally of allies) {
            const dist = Math.abs(ally.x - this.x);
            if (dist <= this.auraRadius) {
                ally.buffed = true;
                if (this.type === 'blade') {
                    ally.attackMultiplier = 1.35;
                    ally.speedMultiplier = 1.3;
                } else if (this.type === 'paladin') {
                    ally.defenseMultiplier = 1.5;
                    ally.hp = Math.min(ally.maxHp, ally.hp + 6 * dt);
                } else { // archer
                    ally.attackMultiplier = 1.25;
                    ally.speedMultiplier = 1.15;
                }
            } else {
                ally.buffed = false;
                ally.attackMultiplier = 1.0;
                ally.defenseMultiplier = 1.0;
                ally.speedMultiplier = 1.0;
            }
        }

        if (this.hp <= 0) {
            this.state = 'dead';
            return;
        }

        // Gravity & Jump Physics
        this.y += this.vy * dt;
        if (this.y < this.groundY) {
            this.vy += 900 * dt;
        } else {
            this.y = this.groundY;
            this.vy = 0;
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        }

        // ================= ARCHER CHARGING & AIMING MODE =================
        if (this.type === 'archer') {
            const wantsAttack = input.aiming || input.attackHeld || input.attack;
            if (wantsAttack && this.attackCooldown <= 0) {
                input.attack = false;
                this.isCharging = true;
                this.isAiming = true;
                this.state = 'shoot';
                this.chargeTime += dt;
                this.chargeRatio = Math.min(1.0, this.chargeTime / this.maxChargeTime);

                // Directional Aiming
                if (input.aimOffset) {
                    this.aimAngle = Math.atan2(input.aimOffset.dy, input.aimOffset.dx);
                    this.facing = input.aimOffset.dx >= 0 ? 1 : -1;
                } else {
                    const defaultAngle = this.facing === 1 ? -0.18 : Math.PI - 0.18;
                    if (!input.up && !input.down && Math.abs(this.aimAngle - defaultAngle) > 1.2) {
                        this.aimAngle = defaultAngle;
                    }
                }
                if (input.up) this.aimAngle -= 2.2 * dt;
                if (input.down) this.aimAngle += 2.2 * dt;

                // Visual charging sparks
                if (this.chargeRatio >= 0.4 && Math.random() < 0.35) {
                    particles.addHitSparks(this.x + this.facing * 24, this.y - 42, 2, this.chargeRatio >= 0.95 ? '#00e5ff' : '#10b981');
                }

                // Slow tactical movement during charge
                let moveDir = 0;
                if (input.left) moveDir -= 1;
                if (input.right) moveDir += 1;
                if (moveDir !== 0) {
                    this.facing = moveDir;
                    this.x += moveDir * this.speed * 0.42 * dt;
                }

                // Release on releaseAim / releaseAttack
                if (input.releaseAim || input.releaseAttack) {
                    input.releaseAim = false;
                    input.releaseAttack = false;
                    input.aiming = false;
                    input.attackHeld = false;
                    this.releaseArcherShot(projectiles, particles, camera);
                }
                return;
            } else if (this.isCharging && (input.releaseAim || input.releaseAttack || !wantsAttack)) {
                input.releaseAim = false;
                input.releaseAttack = false;
                input.aiming = false;
                input.attackHeld = false;
                this.releaseArcherShot(projectiles, particles, camera);
                return;
            } else {
                this.isCharging = false;
                this.isAiming = false;
            }
        }

        // Check if locked in action animation
        const isLocked = ['attack1', 'attack2', 'attack3', 'shoot', 'skill1', 'skill2', 'ult'].includes(this.state);

        if (!isLocked) {
            let moveDir = 0;
            if (input.left) moveDir -= 1;
            if (input.right) moveDir += 1;

            if (moveDir !== 0) {
                this.facing = moveDir;
                this.x += moveDir * this.speed * dt;
                this.state = 'run';
                if (Math.random() < 0.2) particles.addDust(this.x, this.y, this.facing);
            } else {
                this.state = 'idle';
            }

            // Jump
            if (input.jump && this.y >= this.groundY) {
                this.vy = -450;
                this.state = 'jump';
                particles.addDust(this.x, this.y, 0);
            }

            // Attack
            if (input.attack) {
                input.attack = false;
                if (this.type !== 'archer') {
                    this.performBasicAttack();
                }
            }

            // Skill 1 (K)
            if (input.skill1 && this.skills.skill1.currentCd <= 0) {
                input.skill1 = false;
                this.performSkill1(enemies, enemyBase, projectiles, particles, camera, game);
            }

            // Skill 2 (L)
            if (input.skill2 && this.skills.skill2.currentCd <= 0) {
                input.skill2 = false;
                this.performSkill2(enemies, enemyBase, projectiles, particles, camera, game);
            }

            // Ultimate (I)
            if (input.ult && this.skills.ult.currentCd <= 0) {
                input.ult = false;
                this.performUltimate(allies, enemies, enemyBase, projectiles, particles, camera, game);
            }

        } else {
            // ================= IN-ACTION FORWARD STEP & HIT DETECTION =================
            if (this.state === 'attack1') {
                const duration = 0.34;
                // Forward lunge momentum between 0.12s ~ 0.24s
                if (this.stateTimer >= 0.12 && this.stateTimer <= 0.24) {
                    this.x += this.facing * 160 * dt;
                }
                // Hit Apex at 0.16s
                if (!this.attackHitDone && this.stateTimer >= 0.16) {
                    this.attackHitDone = true;
                    sound.slash();
                    const hitCount = this.hitAreaEnemies(enemies, enemyBase, 80, this.attackPower * 1.0, particles, camera, this.facing);
                    if (hitCount > 0) {
                        if (game && typeof game.triggerHitStop === "function") game.triggerHitStop(0.045);
                        camera.shake(3);
                        sound.hitBlade();
                    }
                }
                if (this.stateTimer >= duration) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }

            } else if (this.state === 'attack2') {
                const duration = 0.36;
                // Upward dragon step momentum
                if (this.stateTimer >= 0.12 && this.stateTimer <= 0.26) {
                    this.x += this.facing * 120 * dt;
                }
                // Hit Apex at 0.18s
                if (!this.attackHitDone && this.stateTimer >= 0.18) {
                    this.attackHitDone = true;
                    sound.slash();
                    const hitCount = this.hitAreaEnemies(enemies, enemyBase, 85, this.attackPower * 1.3, particles, camera, this.facing * 1.2);
                    if (hitCount > 0) {
                        if (game && typeof game.triggerHitStop === "function") game.triggerHitStop(0.05);
                        camera.shake(4.5);
                        sound.hitBlade();
                    }
                }
                if (this.stateTimer >= duration) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }

            } else if (this.state === 'attack3') {
                const duration = 0.50;
                // Downward slam dive momentum
                if (this.stateTimer >= 0.18 && this.stateTimer <= 0.30) {
                    this.x += this.facing * 140 * dt;
                }
                // Ground Slam Impact at 0.28s!
                if (!this.attackHitDone && this.stateTimer >= 0.28) {
                    this.attackHitDone = true;
                    sound.hitHeavy();
                    particles.addShockwave(this.x + this.facing * 35, this.y, '#ff0055', 120, 480, 8);
                    const hitCount = this.hitAreaEnemies(enemies, enemyBase, 105, this.attackPower * 1.8, particles, camera, this.facing * 2.5);
                    if (hitCount > 0) {
                        if (game && typeof game.triggerHitStop === "function") game.triggerHitStop(0.065);
                        camera.shake(7);
                    }
                }
                if (this.stateTimer >= duration) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }

            } else if (this.state === 'skill1') {
                if (this.type === 'blade') {
                    // Check if landed on ground after slam
                    if (this.skill1SlamDone) {
                        this.isSpinning = false;
                        this.slamRecoveryTimer = (this.slamRecoveryTimer || 0) + dt;
                        if (this.slamRecoveryTimer >= 0.22) {
                            this.state = 'idle';
                            this.stateTimer = 0;
                            this.skill1SlamDone = false;
                        }
                    } else {
                        // Mid-air phase
                        // Phase 1: Initial upward jump ascent (first 0.16s)
                        if (this.stateTimer < 0.16) {
                            this.isSpinning = false;
                            this.x += this.facing * 160 * dt;
                        }
                        // Phase 2: Aerial Somersault Dive - spins all the way until touching the ground!
                        else {
                            this.isSpinning = true;
                            this.spinAngle = (this.spinAngle || 0) + 28 * dt;
                            this.x += this.facing * 150 * dt;

                            // Rapid downward dive acceleration
                            this.vy += 1500 * dt;

                            // Spin slice multi-hit along the dive
                            this.skill1SpinTimer = (this.skill1SpinTimer || 0) + dt;
                            if (this.skill1SpinTimer >= 0.07) {
                                this.skill1SpinTimer = 0;
                                sound.slash();
                                particles.addSlashArc(this.x + this.facing * 20, this.y - 35, 65, this.facing, '#00e5ff', '#ffffff');
                                const hit = this.hitAreaEnemies(enemies, enemyBase, 80, this.attackPower * 0.45, particles, camera, this.facing * 0.5);
                                if (hit > 0) {
                                    sound.hitBlade();
                                    particles.addHitSparks(this.x + this.facing * 25, this.y - 30, 6, '#00e5ff');
                                }
                            }

                            // Ground Impact Check: the exact instant of touching the ground!
                            if (this.y >= this.groundY - 12) {
                                this.y = this.groundY;
                                this.vy = 0;
                                this.isSpinning = false;
                                this.skill1SlamDone = true;
                                this.slamRecoveryTimer = 0;

                                sound.hitHeavy();
                                camera.shake(9);
                                if (game && typeof game.triggerHitStop === 'function') game.triggerHitStop(0.065);

                                particles.addShockwave(this.x + this.facing * 30, this.groundY, '#00e5ff', 160, 520, 8);
                                particles.addShockwave(this.x + this.facing * 30, this.groundY, '#ff0055', 95, 360, 6);
                                particles.addHitSparks(this.x + this.facing * 30, this.groundY - 15, 24, '#00e5ff');
                                particles.addDust(this.x + this.facing * 30, this.groundY, 0);

                                this.hitAreaEnemies(enemies, enemyBase, 115, this.attackPower * 2.4, particles, camera, this.facing * 2.5);
                            }
                        }
                    }
                } else {
                    let duration = 0.45;
                    if (this.stateTimer >= duration) {
                        this.state = 'idle';
                        this.stateTimer = 0;
                    }
                }
            } else {
                let duration = 0.35;
                if (this.state === 'skill2') duration = 0.55;
                if (this.state === 'ult') duration = 0.9;

                if (this.stateTimer >= duration) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }
            }
        }

        this.x = Math.max(100, Math.min(2150, this.x));
    }

    // ================= ARCHER CHARGED SHOT RELEASE =================
    releaseArcherShot(projectiles, particles, camera) {
        const isMax = this.chargeRatio >= 0.95;
        // Travel speed tuned: deliberate 380 px/s when uncharged, up to 600 px/s when fully charged
        const speed = 380 + (600 - 380) * this.chargeRatio;
        const vx = Math.cos(this.aimAngle) * speed;
        const vy = Math.sin(this.aimAngle) * speed;
        // Damage multiplier: 1.0x (42 DMG) to 3.0x (126 DMG)!
        const dmgMult = 1.0 + this.chargeRatio * 2.0;
        const pierce = isMax ? 3 : (this.chargeRatio >= 0.5 ? 2 : 1);

        projectiles.push(new Projectile({
            x: this.x + this.facing * 22,
            y: this.y - 42,
            vx,
            vy,
            damage: Math.round(this.attackPower * dmgMult),
            isPlayer: true,
            type: 'arrow',
            gravity: 260 - this.chargeRatio * 40,
            radius: isMax ? 9 : (this.chargeRatio >= 0.5 ? 7 : 5),
            isCharged: this.chargeRatio >= 0.35,
            chargeRatio: this.chargeRatio,
            pierceCount: pierce
        }));

        sound.arrowShoot();
        if (isMax) {
            sound.magicExplode();
            camera.shake(6);
            particles.addShockwave(this.x + this.facing * 26, this.y - 42, '#00e5ff', 55, 240, 5);
            particles.addHitSparks(this.x + this.facing * 30, this.y - 42, 16, '#00e5ff');
            particles.addDamageText(this.x, this.y - 70, '⚡ MAX CHARGE! ⚡', false, true);
        } else if (this.chargeRatio >= 0.5) {
            camera.shake(3);
            particles.addHitSparks(this.x + this.facing * 25, this.y - 42, 6, '#10b981');
        }

        this.isCharging = false;
        this.isAiming = false;
        this.chargeTime = 0;
        this.chargeRatio = 0;
        this.attackCooldown = 0.45; // Eliminates rapid-fire spamming
        this.state = 'shoot';
        this.stateTimer = 0;
    }

    // ================= BASIC ATTACK INITIATION =================
    performBasicAttack() {
        this.comboCounter = (this.comboCounter % 3) + 1;
        this.comboResetTimer = 0.85;
        this.state = `attack${this.comboCounter}`;
        this.stateTimer = 0;
        this.attackHitDone = false;
    }

    // ================= SKILL 1 =================
    performSkill1(enemies, enemyBase, projectiles, particles, camera, game) {
        this.skills.skill1.currentCd = this.skills.skill1.cd;
        this.state = 'skill1';
        this.stateTimer = 0;

        if (this.type === 'blade') {
            sound.slash();
            camera.shake(3);
            this.vy = -560;
            this.isSpinning = false;
            this.spinAngle = 0;
            this.skill1SlamDone = false;
            this.skill1SpinTimer = 0;
            this.slamRecoveryTimer = 0;
            particles.addDust(this.x, this.y, 0);

        } else if (this.type === 'paladin') {
            sound.hitHeavy();
            camera.shake(6);
            if (game && typeof game.triggerHitStop === "function") game.triggerHitStop(0.05);
            this.x += this.facing * 110;
            particles.addShockwave(this.x, this.y, '#ffd700', 90, 450, 6);
            this.hitAreaEnemies(enemies, enemyBase, 90, this.attackPower * 1.8, particles, camera, this.facing * 3);

        } else { // archer
            sound.arrowShoot();
            camera.shake(2);
            for (let i = -2; i <= 2; i++) {
                projectiles.push(new Projectile({
                    x: this.x + this.facing * 20,
                    y: this.y - 42,
                    vx: this.facing * 550,
                    vy: i * 75,
                    damage: this.attackPower * 0.95,
                    isPlayer: true,
                    type: 'arrow'
                }));
            }
        }
    }

    // ================= SKILL 2 =================
    performSkill2(enemies, enemyBase, projectiles, particles, camera, game) {
        this.skills.skill2.currentCd = this.skills.skill2.cd;
        this.state = 'skill2';
        this.stateTimer = 0;

        if (this.type === 'blade') {
            sound.slash();
            this.vy = -380;
            camera.shake(5);
            if (game && typeof game.triggerHitStop === "function") game.triggerHitStop(0.05);

            particles.addSlashArc(this.x + this.facing * 25, this.y - 45, 75, this.facing, '#e11d48', '#ff7799', -Math.PI * 0.7, 0, 20);
            this.hitAreaEnemies(enemies, enemyBase, 85, this.attackPower * 2.5, particles, camera, this.facing);

        } else if (this.type === 'paladin') {
            sound.magicExplode();
            camera.shake(8);
            if (game && typeof game.triggerHitStop === "function") game.triggerHitStop(0.06);

            const targetX = this.x + this.facing * 120;
            particles.addShockwave(targetX, this.y, '#ffd700', 120, 350, 8);
            for (const e of enemies) {
                if (e.hp > 0 && Math.abs(e.x - targetX) < 110) {
                    e.takeDamage(this.attackPower * 2.8, particles, 0);
                }
            }

        } else { // archer
            sound.arrowShoot();
            this.vy = -300;
            this.x -= this.facing * 80;
            camera.shake(4);

            projectiles.push(new Projectile({
                x: this.x + this.facing * 20,
                y: this.y - 40,
                vx: this.facing * 800,
                vy: 0,
                damage: this.attackPower * 3.4,
                isPlayer: true,
                type: 'magic',
                gravity: 0,
                radius: 12
            }));
        }
    }

    // ================= ULTIMATE =================
    performUltimate(allies, enemies, enemyBase, projectiles, particles, camera, game) {
        this.skills.ult.currentCd = this.skills.ult.cd;
        this.state = 'ult';
        this.stateTimer = 0;
        sound.ultimate();
        camera.shake(12);

        if (this.type === 'blade') {
            let cuts = 0;
            const maxCuts = 7;
            const interval = setInterval(() => {
                cuts++;
                camera.shake(6);
                sound.slash();
                sound.hitBlade();
                if (game && typeof game.triggerHitStop === "function") game.triggerHitStop(0.035);

                const target = enemies.find(e => e.hp > 0 && Math.abs(e.x - this.x) < 300);
                const hitX = target ? target.x : this.x + this.facing * (50 + Math.random() * 150);
                const hitY = 500 - Math.random() * 50;

                particles.addSlashArc(hitX, hitY, 75, (cuts % 2 === 0 ? 1 : -1), '#ff0055', '#ffffff');
                particles.addHitSparks(hitX, hitY, 15, '#ff0055');

                for (const e of enemies) {
                    if (e.hp > 0 && Math.abs(e.x - hitX) < 90) {
                        e.takeDamage(this.attackPower * 1.5, particles, this.facing);
                    }
                }

                if (cuts >= maxCuts) {
                    clearInterval(interval);
                    particles.addShockwave(this.x + this.facing * 100, this.y, '#ff0055', 160, 500, 8);
                }
            }, 90);

        } else if (this.type === 'paladin') {
            particles.addShockwave(this.x, this.y, '#ffd700', 300, 400, 10);
            for (const ally of allies) {
                if (ally.hp > 0) {
                    ally.hp = Math.min(ally.maxHp, ally.hp + 200);
                    particles.addDamageText(ally.x, ally.y, 200, false, true);
                }
            }
            this.hp = Math.min(this.maxHp, this.hp + 300);
            particles.addDamageText(this.x, this.y, 300, false, true);

        } else { // archer
            const targetCenterX = this.x + this.facing * 180;
            let count = 0;
            const interval = setInterval(() => {
                count++;
                sound.arrowShoot();
                const spawnX = targetCenterX + (Math.random() - 0.5) * 260;
                projectiles.push(new Projectile({
                    x: spawnX,
                    y: 100,
                    vx: this.facing * 50,
                    vy: 700,
                    damage: this.attackPower * 1.35,
                    isPlayer: true,
                    type: 'arrow',
                    gravity: 100
                }));
                if (count >= 15) clearInterval(interval);
            }, 60);
        }
    }

    hitAreaEnemies(enemies, enemyBase, range, damage, particles, camera, knockbackDir) {
        let hitCount = 0;
        for (const e of enemies) {
            if (e.hp <= 0) continue;
            const dist = (e.x - this.x) * this.facing;
            if (dist >= -20 && dist <= range) {
                e.takeDamage(damage, particles, knockbackDir);
                hitCount++;
            }
        }
        if (enemyBase && enemyBase.hp > 0) {
            const baseDist = (enemyBase.x - this.x) * this.facing;
            if (baseDist >= 0 && baseDist <= range + 30) {
                enemyBase.takeDamage(damage, particles);
                hitCount++;
            }
        }
        return hitCount;
    }

    takeDamage(amount, particles, attackDir = 0) {
        if (this.invulnerable || this.hp <= 0) return;
        this.hp = Math.max(0, this.hp - amount);
        this.x += attackDir * 20;
        sound.hitHeavy();
        particles.addHitSparks(this.x, this.y - 30, 10, '#ff3366');
        particles.addDamageText(this.x, this.y - 50, amount, true);
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // 1. Hero Aura Circle
        ctx.save();
        ctx.beginPath();
        const pulseOffset = Math.sin(this.auraPulse) * 8;
        ctx.ellipse(sx, sy, this.auraRadius + pulseOffset, (this.auraRadius + pulseOffset) * 0.28, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.auraColor;
        ctx.fill();
        ctx.strokeStyle = this.auraBorderColor;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.restore();

        // 2. Archer Aim Guide & Charge Meter
        if (this.type === 'archer' && this.isCharging) {
            this.drawAimGuide(ctx, sx, sy);
            this.drawArcherChargingGauge(ctx, sx, sy);
        }

        // 3. Stickman Hero
        this.renderer.draw(ctx, sx, sy, this.facing, this.state, this.stateTimer, {
            isSpinning: this.isSpinning,
            spinAngle: this.spinAngle,
            slamLanded: this.skill1SlamDone,
            isCharging: this.isCharging,
            chargeRatio: this.chargeRatio,
            aimAngle: this.aimAngle
        });

        // 4. Hero Name & HP Bar
        if (this.hp > 0) {
            const barW = 60;
            const barH = 7;
            const bx = sx - barW / 2;
            const by = sy - 85;

            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(this.name, sx, by - 6);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(bx, by, barW, barH);

            const pct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = pct > 0.4 ? '#22c55e' : '#ef4444';
            ctx.fillRect(bx, by, barW * pct, barH);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, by, barW, barH);
            ctx.restore();
        }
    }

    drawAimGuide(ctx, sx, sy) {
        ctx.save();
        const isMax = this.chargeRatio >= 0.95;
        const guideColor = isMax ? '#00e5ff' : (this.chargeRatio >= 0.5 ? '#34d399' : '#eab308');

        ctx.strokeStyle = guideColor;
        ctx.fillStyle = guideColor;
        ctx.lineWidth = isMax ? 2.5 : 1.8;
        ctx.setLineDash([6, 6]);

        let startX = sx + this.facing * 20;
        let startY = sy - 42;
        const speed = 380 + (600 - 380) * this.chargeRatio;
        const gravity = 260 - this.chargeRatio * 40;
        let vx = Math.cos(this.aimAngle) * speed;
        let vy = Math.sin(this.aimAngle) * speed;
        const dt = 0.045;
        const steps = 18 + Math.round(this.chargeRatio * 12);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (let i = 0; i < steps; i++) {
            startX += vx * dt;
            startY += vy * dt;
            vy += gravity * dt;
            ctx.lineTo(startX, startY);
            if (startY >= 540 - camera.y) break;
        }
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(startX, startY, isMax ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawArcherChargingGauge(ctx, sx, sy) {
        ctx.save();
        const barW = 76;
        const barH = 8;
        const bx = sx - barW / 2;
        const by = sy - 110;
        const isMax = this.chargeRatio >= 0.95;

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(bx - 2, by - 2, barW + 4, barH + 4, 4);
        ctx.fill();

        // Meter fill
        const meterColor = isMax ? '#00e5ff' : (this.chargeRatio >= 0.5 ? '#10b981' : '#f59e0b');
        ctx.fillStyle = meterColor;
        if (isMax) {
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.roundRect(bx, by, barW * this.chargeRatio, barH, 3);
        ctx.fill();

        // Border
        ctx.strokeStyle = isMax ? '#ffffff' : '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);

        // Text Indicator
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isMax ? '#00e5ff' : '#ffffff';
        const label = isMax ? '⚡ MAX CHARGE ⚡' : `차지: ${Math.round(this.chargeRatio * 100)}%`;
        ctx.fillText(label, sx, by - 5);
        ctx.restore();
    }
}


/* --- js/spawner.js --- */
// Multi-Island Stage System and Enemy Wave Spawner

const ISLANDS = [
    {
        id: 'isolated',
        name: '외딴섬 (Island 1)',
        icon: '🏝️',
        desc: '안개 낀 해안과 바위 협곡으로 둘러싸인 고블린 요새 (스테이지 1-1 ~ 1-5)',
        stages: [1, 2, 3, 4, 5],
        requiredClear: 0 // Available immediately
    },
    {
        id: 'sea',
        name: '바다섬 (Island 2)',
        icon: '🌊',
        desc: '거친 파도와 난파선 해적단, 심해 괴수가 도사리는 푸른 바다의 섬 (스테이지 2-1 ~ 2-5)',
        stages: [6, 7, 8, 9, 10],
        requiredClear: 5 // Requires Island 1 Clear (Stage 5)
    },
    {
        id: 'volcano',
        name: '화산섬 (Island 3)',
        icon: '🌋',
        desc: '작열하는 마그마와 암흑 군단이 도사리는 흑요석 화산 요새 (스테이지 3-1 ~ 3-5)',
        stages: [11, 12, 13, 14, 15],
        requiredClear: 10 // Requires Island 2 Clear (Stage 10)
    }
];

const STAGE_CONFIGS = [
    // ================= ISLAND 1: 외딴섬 (Stages 1-1 to 1-5) =================
    {
        stage: 1,
        islandId: 'isolated',
        subStage: '1-1',
        title: '외딴섬 1-1: 안개 낀 해안',
        desc: '안개 낀 해변가로 고블린 검병 척후단이 아군 성채를 노립니다.',
        bgColors: { sky1: '#09152a', sky2: '#162842', moon: '#38bdf8', ground: '#1a2936' },
        baseHp: 1200,
        bossTime: 32,
        bossHp: 550,
        bossName: '고블린 척후장',
        goldReward: 200,
        unlockReward: null,
        enemyPool: ['swordsman']
    },
    {
        stage: 2,
        islandId: 'isolated',
        subStage: '1-2',
        title: '외딴섬 1-2: 바람 부는 평원',
        desc: '고블린 검병과 뼈 화살 궁수단이 몰려오기 시작합니다.',
        bgColors: { sky1: '#0c1b33', sky2: '#1c3456', moon: '#60a5fa', ground: '#162f27' },
        baseHp: 1500,
        bossTime: 34,
        bossHp: 750,
        bossName: '평원의 고블린 정예병',
        goldReward: 260,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow']
    },
    {
        stage: 3,
        islandId: 'isolated',
        subStage: '1-3',
        title: '외딴섬 1-3: 버려진 망루',
        desc: '단단한 방패병이 아군 전선을 압박해오며 포위망을 좁혀옵니다.',
        bgColors: { sky1: '#11223b', sky2: '#233f64', moon: '#93c5fd', ground: '#1d3326' },
        baseHp: 1850,
        bossTime: 35,
        bossHp: 950,
        bossName: '철벽의 방패 오우거',
        goldReward: 330,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield']
    },
    {
        stage: 4,
        islandId: 'isolated',
        subStage: '1-4',
        title: '외딴섬 1-4: 바위 협곡',
        desc: '어둠의 마법사가 합류하여 강력한 원거리 폭격을 가합니다.',
        bgColors: { sky1: '#181b29', sky2: '#2c3247', moon: '#f472b6', ground: '#2b2628' },
        baseHp: 2250,
        bossTime: 36,
        bossHp: 1200,
        bossName: '협곡의 암석 골렘',
        goldReward: 420,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 5,
        islandId: 'isolated',
        subStage: '1-5',
        title: '외딴섬 1-5: 지배자의 성채',
        desc: '외딴섬의 지배자 [고블린 군주 그로그]와의 결전입니다!',
        bgColors: { sky1: '#240d2e', sky2: '#411952', moon: '#ec4899', ground: '#271530' },
        baseHp: 2700,
        bossTime: 35,
        bossHp: 1600,
        bossName: '고블린 군주 그로그',
        goldReward: 550,
        unlockReward: 'archer', // Unlocks Shadow Archer & Sea Island!
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },

    // ================= ISLAND 2: 바다섬 (Stages 2-1 to 2-5) =================
    {
        stage: 6,
        islandId: 'sea',
        subStage: '2-1',
        title: '바다섬 2-1: 푸른 파도 여울',
        desc: '재빠른 바다 해적단이 푸른 파도를 가르며 상륙합니다.',
        bgColors: { sky1: '#041d30', sky2: '#0b4266', moon: '#38bdf8', ground: '#0b2f3d' },
        baseHp: 3200,
        bossTime: 36,
        bossHp: 2000,
        bossName: '산호초 거수',
        goldReward: 650,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow']
    },
    {
        stage: 7,
        islandId: 'sea',
        subStage: '2-2',
        title: '바다섬 2-2: 난파선 해적단',
        desc: '해적 작살 궁수단과 방패병이 거세게 진격해옵니다.',
        bgColors: { sky1: '#05223a', sky2: '#0e4e79', moon: '#00e5ff', ground: '#0c2738' },
        baseHp: 3800,
        bossTime: 38,
        bossHp: 2450,
        bossName: '난파선의 망령 선장',
        goldReward: 780,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield']
    },
    {
        stage: 8,
        islandId: 'sea',
        subStage: '2-3',
        title: '바다섬 2-3: 심해 산호 동굴',
        desc: '심해의 마력을 다루는 바다 마법사들의 파도 마법이 쏟아집니다.',
        bgColors: { sky1: '#061a29', sky2: '#123e5c', moon: '#2dd4bf', ground: '#092128' },
        baseHp: 4400,
        bossTime: 38,
        bossHp: 2900,
        bossName: '심해 크라켄 파수병',
        goldReward: 900,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 9,
        islandId: 'sea',
        subStage: '2-4',
        title: '바다섬 2-4: 폭풍우 치는 암초',
        desc: '폭풍우치는 밤, 바다섬 해적 함대의 정예 군단이 총공세를 펼칩니다.',
        bgColors: { sky1: '#031422', sky2: '#092b45', moon: '#67e8f9', ground: '#071c26' },
        baseHp: 5000,
        bossTime: 40,
        bossHp: 3500,
        bossName: '폭풍의 군단장 렉스',
        goldReward: 1050,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 10,
        islandId: 'sea',
        subStage: '2-5',
        title: '바다섬 2-5: 해저 신전의 심연',
        desc: '바다섬의 절대 지배자 [해적 제독 바르바롯]과의 대결투!',
        bgColors: { sky1: '#01192b', sky2: '#083758', moon: '#06b6d4', ground: '#051824' },
        baseHp: 5800,
        bossTime: 38,
        bossHp: 4200,
        bossName: '해적 제독 바르바롯',
        goldReward: 1300,
        unlockReward: 'paladin', // Unlocks Holy Paladin & Volcano Island!
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },

    // ================= ISLAND 3: 화산섬 (Stages 3-1 to 3-5) =================
    {
        stage: 11,
        islandId: 'volcano',
        subStage: '3-1',
        title: '화산섬 3-1: 잿빛 유황 지대',
        desc: '뜨거운 유황 연기 속에서 화염 갑주를 두른 용암 검병단이 돌격합니다.',
        bgColors: { sky1: '#250808', sky2: '#471616', moon: '#f87171', ground: '#2b1515' },
        baseHp: 6500,
        bossTime: 38,
        bossHp: 4800,
        bossName: '마그마 골렘 브루트',
        goldReward: 1500,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield']
    },
    {
        stage: 12,
        islandId: 'volcano',
        subStage: '3-2',
        title: '화산섬 3-2: 마그마 협곡',
        desc: '화염 화살과 작열하는 폭염 마법이 성채를 불태우려 합니다.',
        bgColors: { sky1: '#2e0a0d', sky2: '#57181e', moon: '#ef4444', ground: '#331418' },
        baseHp: 7200,
        bossTime: 40,
        bossHp: 5500,
        bossName: '인페르노 화염술사',
        goldReward: 1750,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 13,
        islandId: 'volcano',
        subStage: '3-3',
        title: '화산섬 3-3: 흑요석 요새',
        desc: '단단한 흑요석 철갑으로 무장한 정예 군단과의 치열한 공방전입니다.',
        bgColors: { sky1: '#210815', sky2: '#41132e', moon: '#f43f5e', ground: '#26101e' },
        baseHp: 8000,
        bossTime: 40,
        bossHp: 6200,
        bossName: '흑요석 철인 저거너트',
        goldReward: 2000,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 14,
        islandId: 'volcano',
        subStage: '3-4',
        title: '화산섬 3-4: 분화구 결전지',
        desc: '타오르는 화산 분화구에서 암흑 군단의 최정예 총공세가 펼쳐집니다.',
        bgColors: { sky1: '#2a0707', sky2: '#5f1212', moon: '#ff0055', ground: '#2b0a0a' },
        baseHp: 8900,
        bossTime: 42,
        bossHp: 7000,
        bossName: '화염용기사 발록',
        goldReward: 2350,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 15,
        islandId: 'volcano',
        subStage: '3-5',
        title: '화산섬 3-5: 파멸의 암흑 제단',
        desc: '대륙의 평화를 건 최후의 결전! [암흑 군주 말로크]를 처단하라!',
        bgColors: { sky1: '#16000a', sky2: '#330017', moon: '#ff0055', ground: '#1c000e' },
        baseHp: 9999,
        bossTime: 40,
        bossHp: 8200,
        bossName: '암흑 군주 말로크',
        goldReward: 3200,
        unlockReward: 'legend', // Ultimate Triumph!
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    }
];

class Spawner {
    constructor(baseX = 2100, stageNumber = 1) {
        this.baseX = baseX;
        this.stageNumber = stageNumber;
        this.config = STAGE_CONFIGS[stageNumber - 1] || STAGE_CONFIGS[0];

        this.timer = 0;
        this.spawnTimer = 0;
        this.nextSpawnDelay = 3.2;
        this.bossSpawned = false;

        this.announcement = this.config.title;
        this.announcementTimer = 3.5;
    }

    update(dt, enemies) {
        this.timer += dt;
        this.spawnTimer += dt;

        if (this.announcementTimer > 0) {
            this.announcementTimer -= dt;
        }

        // Boss spawn trigger
        if (!this.bossSpawned && this.timer >= this.config.bossTime) {
            this.bossSpawned = true;
            this.announcement = `⚠️ WARNING: [${this.config.bossName}] 출현! ⚠️`;
            this.announcementTimer = 4.0;
            this.spawnBoss(enemies);
        }

        // Regular enemy spawns
        if (this.spawnTimer >= this.nextSpawnDelay) {
            this.spawnTimer = 0;
            // Spawn interval gently speeds up as battle progresses
            const baseDelay = Math.max(1.5, 3.8 - this.timer * 0.02 - (this.stageNumber - 1) * 0.05);
            this.nextSpawnDelay = baseDelay + Math.random() * 1.2;

            const pool = this.config.enemyPool;
            const chosenType = pool[Math.floor(Math.random() * pool.length)];
            this.spawnEnemy(enemies, chosenType);
        }
    }

    spawnEnemy(enemies, type) {
        const stageMod = (this.stageNumber - 1);
        let config = {
            x: this.baseX - 40,
            y: 540,
            isPlayer: false,
            scale: 0.9
        };

        if (type === 'swordsman') {
            config = {
                ...config,
                unitType: 'enemy',
                maxHp: 80 + stageMod * 16,
                attackPower: 12 + stageMod * 2.2,
                speed: 85,
                attackRange: 45,
                attackSpeed: 1.0,
                cost: 20 + stageMod * 4
            };
        } else if (type === 'bow') {
            config = {
                ...config,
                unitType: 'bow',
                maxHp: 65 + stageMod * 14,
                attackPower: 14 + stageMod * 2.5,
                speed: 70,
                attackRange: 280,
                attackSpeed: 0.75,
                cost: 30 + stageMod * 5
            };
        } else if (type === 'shield') {
            config = {
                ...config,
                unitType: 'shield',
                maxHp: 240 + stageMod * 45,
                attackPower: 10 + stageMod * 2.0,
                speed: 55,
                attackRange: 40,
                attackSpeed: 0.8,
                scale: 1.05,
                cost: 50 + stageMod * 8
            };
        } else if (type === 'mage') {
            config = {
                ...config,
                unitType: 'mage',
                maxHp: 85 + stageMod * 18,
                attackPower: 26 + stageMod * 3.5,
                speed: 65,
                attackRange: 240,
                attackSpeed: 0.65,
                cost: 65 + stageMod * 10
            };
        }

        enemies.push(new Unit(config));
    }

    spawnBoss(enemies) {
        const islandId = this.config.islandId;
        const capeColor = islandId === 'volcano' ? '#ffd700' : (islandId === 'sea' ? '#00e5ff' : '#ff0055');

        const config = {
            x: this.baseX - 50,
            y: 540,
            isPlayer: false,
            unitType: 'enemy',
            maxHp: this.config.bossHp,
            attackPower: 35 + this.stageNumber * 5,
            speed: 58,
            attackRange: 70,
            attackSpeed: 0.85,
            scale: 1.55,
            hasCape: true,
            capeColor: capeColor,
            cost: 250 + this.stageNumber * 30
        };
        enemies.push(new Unit(config));
    }
}


/* --- js/camera.js --- */
// Smooth Camera with Screen Shake and Parallax Support

class Camera {
    constructor(viewportWidth = 1280, viewportHeight = 720) {
        this.x = 0;
        this.y = 0;
        this.width = viewportWidth;
        this.height = viewportHeight;
        this.targetX = 0;
        this.minX = 0;
        this.maxX = 2300 - this.width;

        this.shakeIntensity = 0;
        this.shakeDecay = 12;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.maxX = Math.max(0, 2300 - this.width);
    }

    shake(amount) {
        this.shakeIntensity = Math.min(25, this.shakeIntensity + amount);
    }

    follow(targetX, dt) {
        // Target is centered horizontally
        const desiredX = targetX - this.width * 0.4;
        this.x += (desiredX - this.x) * 6 * dt;

        // Clamp inside battlefield
        this.x = Math.max(this.minX, Math.min(this.maxX, this.x));

        // Screen Shake decay
        if (this.shakeIntensity > 0) {
            this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
        }
    }

    getOffsetX() {
        if (this.shakeIntensity <= 0) return 0;
        return (Math.random() - 0.5) * this.shakeIntensity * 2;
    }

    getOffsetY() {
        if (this.shakeIntensity <= 0) return 0;
        return (Math.random() - 0.5) * this.shakeIntensity * 2;
    }
}


/* --- js/game.js --- */
// Main Game Engine with Stage System, Mobile Touch Controls, In-battle Mana Booster, and Save Integration







class Game {
    constructor(canvas, heroType = 'blade', stageNumber = 1, onExitToLobby = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.heroType = heroType;
        this.stageNumber = stageNumber;
        this.onExitToLobby = onExitToLobby;
        this.stageConfig = STAGE_CONFIGS[stageNumber - 1] || STAGE_CONFIGS[0];

        // Viewport & Camera
        this.width = canvas.width = 1280;
        this.height = canvas.height = 720;
        this.camera = new Camera(this.width, this.height);

        // State & Systems
        this.particles = new ParticleSystem();
        this.spawner = new Spawner(2100, this.stageNumber);
        this.hitStopTimer = 0;
        this.isGameOver = false;
        this.gameResult = null; // 'VICTORY' | 'DEFEAT'
        this.newlyUnlocked = [];

        // Bases
        this.playerBase = new Base(120, 540, true, 1200);
        this.enemyBase = new Base(2100, 540, false, this.stageConfig.baseHp);

        // Hero
        this.hero = new Hero(this.heroType);
        this.heroRespawnTimer = 0;

        // Armies & Projectiles
        this.allies = [];
        this.enemies = [];
        this.projectiles = [];

        // Economy & In-battle Mana Booster (Cartoon Wars style!)
        const u = saveManager.data.upgrades;
        this.gold = 0; // Earned in battle
        this.mana = 60;
        this.maxMana = 100 + (u.manaMaxLv - 1) * 35;
        this.manaRate = 12 + (u.manaRegenLv - 1) * 2.5;
        this.battleManaLevel = 1;
        this.battleManaUpgradeCost = 50; // In-battle mana cost

        // Summon Units
        this.summonUnits = {
            swordsman: { name: '검병', key: '1', cost: 30, cd: 2.0, curCd: 0, icon: '⚔️' },
            shield: { name: '방패병', key: '2', cost: 50, cd: 4.5, curCd: 0, icon: '🛡️' },
            bow: { name: '궁수', key: '3', cost: 45, cd: 3.0, curCd: 0, icon: '🏹' },
            mage: { name: '마법사', key: '4', cost: 80, cd: 6.0, curCd: 0, icon: '🔮' }
        };

        // Inputs
        this.input = {
            left: false,
            right: false,
            jump: false,
            attack: false,
            attackHeld: false,
            releaseAttack: false,
            skill1: false,
            skill2: false,
            ult: false,
            aiming: false,
            aimOffset: null,
            releaseAim: false,
            up: false,
            down: false
        };

        this.setupKeyboardEvents();
        this.setupMouseAndTouchEvents();
        this.lastTime = performance.now();
    }

    setupKeyboardEvents() {
        this._keydownHandler = (e) => {
            sound.init();
            if (this.isGameOver) {
                if (e.code === 'Space' && this.onExitToLobby) {
                    this.onExitToLobby();
                }
                return;
            }

            const code = e.code;
            if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = true;
            if (code === 'KeyD' || code === 'ArrowRight') this.input.right = true;
            if (code === 'KeyW' || code === 'Space' || code === 'ArrowUp') this.input.jump = true;
            if (code === 'KeyS' || code === 'ArrowDown') this.input.down = true;

            // Attack & Aiming / Charging for Archer
            if (code === 'KeyJ') {
                if (this.hero.type === 'archer') {
                    this.input.aiming = true;
                    this.input.attackHeld = true;
                } else {
                    this.input.attack = true;
                }
            }

            if (code === 'KeyK') this.input.skill1 = true;
            if (code === 'KeyL') this.input.skill2 = true;
            if (code === 'KeyI' || code === 'KeyU') this.input.ult = true;

            // Summons
            if (e.key === '1') this.trySummon('swordsman');
            if (e.key === '2') this.trySummon('shield');
            if (e.key === '3') this.trySummon('bow');
            if (e.key === '4') this.trySummon('mage');

            // Cartoon Wars In-battle Mana Boost
            if (code === 'KeyO' || code === 'KeyP') this.boostBattleMana();
        };

        this._keyupHandler = (e) => {
            const code = e.code;
            if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = false;
            if (code === 'KeyD' || code === 'ArrowRight') this.input.right = false;
            if (code === 'KeyW' || code === 'Space' || code === 'ArrowUp') this.input.jump = false;
            if (code === 'KeyS' || code === 'ArrowDown') this.input.down = false;

            if (code === 'KeyJ' && this.hero.type === 'archer') {
                this.input.releaseAim = true;
                this.input.releaseAttack = true;
                this.input.aiming = false;
                this.input.attackHeld = false;
            }
        };

        window.addEventListener('keydown', this._keydownHandler);
        window.addEventListener('keyup', this._keyupHandler);
    }

    setupMouseAndTouchEvents() {
        const getCanvasCoords = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        // Mouse Drag Aiming
        let isMouseDown = false;
        this.canvas.addEventListener('mousedown', (e) => {
            sound.init();
            if (this.isGameOver) return;
            if (e.button === 0) {
                isMouseDown = true;
                const pos = getCanvasCoords(e.clientX, e.clientY);
                if (this.hero.type === 'archer') {
                    this.input.aiming = true;
                    const heroScreenX = this.hero.x - this.camera.x;
                    const heroScreenY = this.hero.y - this.camera.y - 40;
                    this.input.aimOffset = { dx: pos.x - heroScreenX, dy: pos.y - heroScreenY };
                } else {
                    this.input.attack = true;
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isMouseDown && this.hero.type === 'archer' && this.input.aiming) {
                const pos = getCanvasCoords(e.clientX, e.clientY);
                const heroScreenX = this.hero.x - this.camera.x;
                const heroScreenY = this.hero.y - this.camera.y - 40;
                this.input.aimOffset = { dx: pos.x - heroScreenX, dy: pos.y - heroScreenY };
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isMouseDown) {
                isMouseDown = false;
                if (this.hero.type === 'archer') {
                    this.input.releaseAim = true;
                    this.input.releaseAttack = true;
                    this.input.aiming = false;
                    this.input.attackHeld = false;
                }
            }
        });

        // Touch Drag & Tap on Canvas
        let isTouching = false;
        this.canvas.addEventListener('touchstart', (e) => {
            sound.init();
            if (this.isGameOver) return;
            const t = e.touches[0];
            isTouching = true;
            const pos = getCanvasCoords(t.clientX, t.clientY);
            if (this.hero.type === 'archer') {
                this.input.aiming = true;
                this.input.attackHeld = true;
                const heroScreenX = this.hero.x - this.camera.x;
                const heroScreenY = this.hero.y - this.camera.y - 40;
                this.input.aimOffset = { dx: pos.x - heroScreenX, dy: pos.y - heroScreenY };
            } else {
                this.input.attack = true;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (isTouching && this.hero.type === 'archer' && this.input.aiming) {
                const t = e.touches[0];
                const pos = getCanvasCoords(t.clientX, t.clientY);
                const heroScreenX = this.hero.x - this.camera.x;
                const heroScreenY = this.hero.y - this.camera.y - 40;
                this.input.aimOffset = { dx: pos.x - heroScreenX, dy: pos.y - heroScreenY };
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            if (isTouching) {
                isTouching = false;
                if (this.hero.type === 'archer') {
                    this.input.releaseAim = true;
                    this.input.releaseAttack = true;
                    this.input.aiming = false;
                    this.input.attackHeld = false;
                }
            }
        }, { passive: true });
    }

    // In-Battle Cartoon Wars Mana Booster
    boostBattleMana() {
        if (this.mana >= this.battleManaUpgradeCost) {
            this.mana -= this.battleManaUpgradeCost;
            this.battleManaLevel++;
            this.maxMana += 35;
            this.manaRate += 3.0;
            this.battleManaUpgradeCost = Math.round(this.battleManaUpgradeCost * 1.5);
            sound.victory();
            this.particles.addDamageText(this.hero.x, this.hero.y - 70, `MANA BOOST Lv.${this.battleManaLevel}!`, true, true);
        }
    }

    trySummon(type) {
        const u = this.summonUnits[type];
        if (!u) return;

        if (this.mana >= u.cost && u.curCd <= 0) {
            this.mana -= u.cost;
            u.curCd = u.cd;
            sound.summon();

            let unitConfig = {
                x: this.playerBase.x + 50,
                y: 540,
                isPlayer: true
            };

            if (type === 'swordsman') {
                unitConfig = {
                    ...unitConfig,
                    unitType: 'swordsman',
                    maxHp: 110,
                    attackPower: 20,
                    speed: 95,
                    attackRange: 45,
                    attackSpeed: 1.1,
                    cost: 30
                };
            } else if (type === 'shield') {
                unitConfig = {
                    ...unitConfig,
                    unitType: 'shield',
                    maxHp: 320,
                    attackPower: 12,
                    speed: 65,
                    attackRange: 40,
                    attackSpeed: 0.8,
                    cost: 50,
                    scale: 1.05
                };
            } else if (type === 'bow') {
                unitConfig = {
                    ...unitConfig,
                    unitType: 'bow',
                    maxHp: 80,
                    attackPower: 22,
                    speed: 80,
                    attackRange: 280,
                    attackSpeed: 0.8,
                    cost: 45
                };
            } else if (type === 'mage') {
                unitConfig = {
                    ...unitConfig,
                    unitType: 'mage',
                    maxHp: 90,
                    attackPower: 38,
                    speed: 70,
                    attackRange: 230,
                    attackSpeed: 0.65,
                    cost: 80
                };
            }

            this.allies.push(new Unit(unitConfig));
            this.particles.addShockwave(unitConfig.x, 540, '#00e5ff', 40, 200, 3);
        }
    }

    triggerHitStop(duration = 0.045) {
        this.hitStopTimer = duration;
    }

    update(dt) {
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return;
        }

        dt = Math.min(dt, 0.05);

        // Economy
        this.mana = Math.min(this.maxMana, this.mana + this.manaRate * dt);
        for (const k in this.summonUnits) {
            const u = this.summonUnits[k];
            if (u.curCd > 0) u.curCd = Math.max(0, u.curCd - dt);
        }

        // Camera follow
        const followTarget = (this.hero.hp > 0) ? this.hero.x : this.playerBase.x + 300;
        this.camera.follow(followTarget, dt);

        this.particles.update(dt);

        if (!this.isGameOver) {
            this.spawner.update(dt, this.enemies);
        }

        // Update Bases
        this.playerBase.update(dt, this.enemies, this.projectiles);
        this.enemyBase.update(dt, [...this.allies, ...(this.hero.hp > 0 ? [this.hero] : [])], this.projectiles);

        // Update Hero
        if (this.hero.hp > 0) {
            this.hero.update(dt, this.input, this.allies, this.enemies, this.enemyBase, this.projectiles, this.particles, this.camera, this);
        } else {
            this.heroRespawnTimer += dt;
            if (this.heroRespawnTimer >= 8.0) {
                this.heroRespawnTimer = 0;
                this.hero.hp = this.hero.maxHp;
                this.hero.x = this.playerBase.x + 80;
                this.hero.y = 540;
                this.hero.state = 'idle';
                this.particles.addShockwave(this.hero.x, 540, '#ffd700', 80, 250);
                sound.victory();
            }
        }

        // Update Allies
        for (let i = this.allies.length - 1; i >= 0; i--) {
            const ally = this.allies[i];
            ally.update(dt, this.enemies, this.enemyBase, this.projectiles, this.particles);
            if (ally.hp <= 0 && ally.stateTimer > 0.6) {
                this.allies.splice(i, 1);
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const enemyTargets = [...this.allies, ...(this.hero.hp > 0 ? [this.hero] : [])];
            enemy.update(dt, enemyTargets, this.playerBase, this.projectiles, this.particles);

            if (enemy.hp <= 0 && enemy.stateTimer > 0.6) {
                const reward = enemy.cost || 20;
                this.gold += reward;
                saveManager.addGold(reward);
                this.mana = Math.min(this.maxMana, this.mana + 15);
                this.particles.addDamageText(enemy.x, enemy.y - 40, `+${reward}G`, false);
                this.enemies.splice(i, 1);
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const targets = proj.isPlayer ? this.enemies : [...this.allies, ...(this.hero.hp > 0 ? [this.hero] : [])];
            const targetBase = proj.isPlayer ? this.enemyBase : this.playerBase;
            proj.update(dt, targets, targetBase, this.particles);

            if (!proj.alive) {
                this.projectiles.splice(i, 1);
            }
        }

        // Win / Defeat check
        if (!this.isGameOver) {
            if (this.enemyBase.hp <= 0) {
                this.isGameOver = true;
                this.gameResult = 'VICTORY';
                sound.victory();
                // Reward gold for stage clear
                saveManager.addGold(this.stageConfig.goldReward);
                this.newlyUnlocked = saveManager.recordStageClear(this.stageNumber);
            } else if (this.playerBase.hp <= 0) {
                this.isGameOver = true;
                this.gameResult = 'DEFEAT';
                sound.defeat();
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.translate(this.camera.getOffsetX(), this.camera.getOffsetY());

        // 1. Stage Parallax Background
        this.drawBackground(ctx);

        // 2. Bases
        this.playerBase.draw(ctx, this.camera);
        this.enemyBase.draw(ctx, this.camera);

        // 3. Units
        for (const ally of this.allies) ally.draw(ctx, this.camera);
        for (const enemy of this.enemies) enemy.draw(ctx, this.camera);

        // 4. Hero
        if (this.hero.hp > 0) {
            this.hero.draw(ctx, this.camera);
        }

        // 5. Projectiles & Particles
        for (const proj of this.projectiles) proj.draw(ctx, this.camera);
        this.particles.draw(ctx, this.camera);

        ctx.restore();

        // 6. HUD
        this.drawHUD(ctx);

        // 7. Announcements / Game Over Overlay
        this.drawOverlays(ctx);
    }

    drawBackground(ctx) {
        const camX = this.camera.x;
        const bg = this.stageConfig.bgColors;

        const skyGrad = ctx.createLinearGradient(0, 0, 0, 540);
        skyGrad.addColorStop(0, bg.sky1);
        skyGrad.addColorStop(1, bg.sky2);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, 540);

        // Moon
        ctx.save();
        ctx.fillStyle = bg.moon;
        ctx.shadowColor = bg.moon;
        ctx.shadowBlur = 45;
        const moonScreenX = 900 - camX * 0.05;
        ctx.beginPath();
        ctx.arc(moonScreenX, 140, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mountains (Parallax Layer 1)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, 540);
        for (let x = 0; x <= this.width; x += 60) {
            const worldX = x + camX * 0.12;
            const y = 370 + Math.sin(worldX * 0.003) * 60 + Math.cos(worldX * 0.008) * 30;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(this.width, 540);
        ctx.closePath();
        ctx.fill();

        // Middle silhouettes (Parallax Layer 2)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.moveTo(0, 540);
        for (let x = 0; x <= this.width; x += 40) {
            const worldX = x + camX * 0.35;
            const y = 460 + Math.sin(worldX * 0.007) * 25;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(this.width, 540);
        ctx.closePath();
        ctx.fill();

        // Ground Floor
        const groundGrad = ctx.createLinearGradient(0, 540, 0, 720);
        groundGrad.addColorStop(0, bg.ground);
        groundGrad.addColorStop(1, '#08080a');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, 540, this.width, 180);

        // Ground Line
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 540);
        ctx.lineTo(this.width, 540);
        ctx.stroke();

        ctx.shadowBlur = 0;
    }

    drawHUD(ctx) {
        ctx.save();

        // Top Status Bar
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(16, 14, 520, 80, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px "Impact", sans-serif';
        ctx.fillText(`💰 GOLD: ${saveManager.data.gold}`, 32, 42);

        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`⚡ MANA: ${Math.floor(this.mana)} / ${this.maxMana}`, 200, 42);

        // In-Battle Mana Boost Tag
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`[⚡부스터 Lv.${this.battleManaLevel}] (키[O]: ${this.battleManaUpgradeCost}⚡소모)`, 370, 42);

        // Mana Bar
        const manaBarW = 485;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(32, 54, manaBarW, 12);
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(32, 54, manaBarW * (this.mana / this.maxMana), 12);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(32, 54, manaBarW, 12);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(`초당 마나 회복: +${this.manaRate.toFixed(1)}/s`, 32, 84);

        // Stage Title (Top Center)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.roundRect(this.width / 2 - 130, 14, 260, 40, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.stageConfig.title, this.width / 2, 40);

        if (this.hero.hp <= 0) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            const leftTime = Math.max(0, 8 - this.heroRespawnTimer).toFixed(1);
            ctx.fillText(`영웅 부활 대기: ${leftTime}초...`, this.width / 2, 95);
        }

        ctx.restore();
    }

    drawOverlays(ctx) {
        // Stage Announcement
        if (this.spawner.announcementTimer > 0) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = '900 46px "Impact", sans-serif';
            ctx.fillStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 25;
            ctx.fillText(this.spawner.announcement, this.width / 2, 220);
            ctx.restore();
        }

        // Game Over Overlay
        if (this.isGameOver) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, this.width, this.height);

            ctx.textAlign = 'center';
            if (this.gameResult === 'VICTORY') {
                ctx.font = '900 68px "Impact", sans-serif';
                ctx.fillStyle = '#22c55e';
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 30;
                ctx.fillText('STAGE CLEAR!', this.width / 2, this.height / 2 - 80);

                ctx.font = 'bold 24px sans-serif';
                ctx.fillStyle = '#ffd700';
                ctx.fillText(`보상 골드: +${this.stageConfig.goldReward}G 획득!`, this.width / 2, this.height / 2 - 15);

                if (this.newlyUnlocked.length > 0) {
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = 'bold 26px sans-serif';
                    const names = this.newlyUnlocked.map(h => h === 'archer' ? '🏹 그림자 궁수 (Archer)' : '🛡️ 성기사 (Paladin)').join(', ');
                    ctx.fillText(`🎉 [새로운 영웅 해금: ${names}]!`, this.width / 2, this.height / 2 + 35);
                }
            } else {
                ctx.font = '900 68px "Impact", sans-serif';
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 30;
                ctx.fillText('DEFEAT...', this.width / 2, this.height / 2 - 60);

                ctx.font = 'bold 22px sans-serif';
                ctx.fillStyle = '#cbd5e1';
                ctx.fillText('아군 성채가 무너졌습니다. 상점에서 능력을 업그레이드해보세요!', this.width / 2, this.height / 2 + 10);
            }

            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('화면을 터치하거나 [SPACE]를 눌러 로비로 이동', this.width / 2, this.height / 2 + 100);
            ctx.restore();
        }
    }

    destroy() {
        window.removeEventListener('keydown', this._keydownHandler);
        window.removeEventListener('keyup', this._keyupHandler);
    }

    start() {
        this.running = true;
        const loop = (currentTime) => {
            if (!this.running) return;
            const dt = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;

            this.update(dt);
            this.draw();

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    stop() {
        this.running = false;
        this.destroy();
    }
}


/* --- js/main.js --- */
// Main Application Controller (Mobile & Desktop Unified)




let currentGame = null;
let currentIslandId = 'isolated';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const lobbyScreen = document.getElementById('lobby-screen');
const mobileControls = document.getElementById('mobile-controls');
const ingameTopBar = document.getElementById('ingame-top-bar');
const lobbyGoldDisplay = document.getElementById('lobby-gold-display');
const btnPauseLobby = document.getElementById('btn-pause-lobby');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Containers
const islandSelectorBar = document.getElementById('island-selector-bar');
const islandBannerInfo = document.getElementById('island-banner-info');
const stagesContainer = document.getElementById('stages-container');
const heroesContainer = document.getElementById('heroes-container');

// Universal Fast-Tap Helper (Instant 0ms Mobile Touch & Desktop Mouse Support)
function bindFastTap(elem, callback) {
    if (!elem) return;
    let touchHandled = false;
    let touchStartX = 0, touchStartY = 0;
    let touchStartTime = 0;

    elem.addEventListener('touchstart', (e) => {
        touchHandled = true;
        touchStartTime = Date.now();
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
    }, { passive: true });

    elem.addEventListener('touchend', (e) => {
        if (!touchHandled) return;
        const elapsed = Date.now() - touchStartTime;
        const t = e.changedTouches[0];
        const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
        
        // If deliberate tap (held < 500ms and moved < 20px)
        if (elapsed < 500 && dist < 20) {
            e.preventDefault();
            sound.init();
            callback(e);
        }
        setTimeout(() => { touchHandled = false; }, 400);
    }, { passive: false });

    elem.addEventListener('click', (e) => {
        if (touchHandled) return;
        sound.init();
        callback(e);
    });
}

// Tab Switching
tabBtns.forEach(btn => {
    bindFastTap(btn, () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.dataset.tab;
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
        sound.slash();
        refreshLobbyUI();
    });
});

// Refresh Lobby UI
function refreshLobbyUI() {
    lobbyGoldDisplay.textContent = saveManager.data.gold;

    // 1. Render Stages
    renderStages();

    // 2. Render Heroes
    renderHeroes();

    // 3. Refresh Shop Items
    refreshShopItems();
}

function renderIslandNav() {
    if (!islandSelectorBar) return;
    islandSelectorBar.innerHTML = '';
    const maxCleared = saveManager.data.maxClearedStage;

    ISLANDS.forEach(island => {
        const isUnlocked = maxCleared >= island.requiredClear;
        const clearedInIsland = island.stages.filter(s => s <= maxCleared).length;
        const isSelected = island.id === currentIslandId;

        const btn = document.createElement('button');
        btn.className = `btn-island ${isSelected ? 'active' : ''} ${isUnlocked ? '' : 'locked'}`;
        btn.innerHTML = `
            <span class="island-tab-icon">${island.icon}</span>
            <span class="island-tab-name">${island.name.split(' ')[0]}</span>
            <span class="island-tab-badge">${isUnlocked ? `${clearedInIsland}/5 Clear` : '🔒 잠김'}</span>
        `;

        bindFastTap(btn, () => {
            if (isUnlocked) {
                currentIslandId = island.id;
                sound.slash();
                renderStages();
            } else {
                sound.defeat();
                const reqStageName = island.requiredClear === 5 ? '외딴섬 1-5' : '바다섬 2-5';
                showToast(`🔒 이전 섬의 모든 스테이지(${reqStageName})를 클리어해야 개방됩니다!`);
            }
        });

        islandSelectorBar.appendChild(btn);
    });
}

function renderStages() {
    renderIslandNav();

    const maxCleared = saveManager.data.maxClearedStage;
    const currentIsland = ISLANDS.find(i => i.id === currentIslandId) || ISLANDS[0];

    // Render Banner Info
    if (islandBannerInfo) {
        const isUnlocked = maxCleared >= currentIsland.requiredClear;
        const clearedCount = currentIsland.stages.filter(s => s <= maxCleared).length;
        islandBannerInfo.innerHTML = `
            <div class="island-banner-content">
                <div class="island-banner-title">
                    <span>${currentIsland.icon} ${currentIsland.name}</span>
                    <span class="island-banner-progress">${clearedCount} / 5 스테이지 정복 ⭐</span>
                </div>
                <div class="island-banner-desc">${currentIsland.desc}</div>
            </div>
        `;
    }

    stagesContainer.innerHTML = '';
    const stages = STAGE_CONFIGS.filter(cfg => cfg.islandId === currentIslandId);

    stages.forEach((cfg) => {
        const isIslandUnlocked = maxCleared >= currentIsland.requiredClear;
        const isUnlocked = isIslandUnlocked && (cfg.stage <= maxCleared + 1);
        const isCleared = cfg.stage <= maxCleared;

        const card = document.createElement('div');
        card.className = `stage-card ${isUnlocked ? '' : 'locked'}`;

        let statusTag = '';
        if (isCleared) {
            statusTag = `<span class="badge-status cleared">⭐ 클리어 완료</span>`;
        } else if (isUnlocked) {
            statusTag = `<span class="badge-status available">⚔️ 출격 가능</span>`;
        } else {
            statusTag = `<span class="badge-status locked">🔒 이전 관문 클리어 필요</span>`;
        }

        let unlockTag = '';
        if (cfg.unlockReward === 'archer') {
            unlockTag = `<div class="stage-unlock-tag">🎁 클리어 시 [그림자 궁수] 해금 & 바다섬 개방!</div>`;
        } else if (cfg.unlockReward === 'paladin') {
            unlockTag = `<div class="stage-unlock-tag">🎁 클리어 시 [성기사] 해금 & 화산섬 개방!</div>`;
        } else if (cfg.unlockReward === 'legend') {
            unlockTag = `<div class="stage-unlock-tag gold">👑 전설의 대륙 구원자 칭호 획득!</div>`;
        }

        card.innerHTML = `
            <div class="stage-card-body">
                <div class="stage-badge-num">STAGE ${cfg.subStage}</div>
                <div class="stage-title">${cfg.title.split(': ')[1] || cfg.title}</div>
                <div class="stage-desc">${cfg.desc}</div>
                <div class="stage-boss-preview">👹 보스: <strong>${cfg.bossName}</strong> (HP: ${cfg.bossHp})</div>
                <div class="stage-status-row">${statusTag}</div>
                ${unlockTag}
                <div class="stage-reward">💰 클리어 보상: +${cfg.goldReward}G</div>
            </div>
            ${isUnlocked ? `<button class="btn-stage-start" data-stage="${cfg.stage}">출격하기 (BATTLE)</button>` : `<button class="btn-stage-start disabled" disabled>잠김</button>`}
        `;

        if (isUnlocked) {
            const btn = card.querySelector('.btn-stage-start');
            const cardBody = card.querySelector('.stage-card-body');
            const launchBattle = () => {
                sound.ultimate();
                startBattle(cfg.stage);
            };
            bindFastTap(btn, launchBattle);
            bindFastTap(cardBody, launchBattle);
        }

        stagesContainer.appendChild(card);
    });
}

function renderHeroes() {
    heroesContainer.innerHTML = '';
    const heroesData = [
        {
            id: 'blade',
            name: '검성 (Blade Master)',
            role: '초고속 참격 & 콤보 딜러',
            icon: '⚔️',
            aura: '🌀 <strong>질풍의 오라</strong><br>아군 공속 +35% / 이속 +30%',
            unlockCond: '기본 지급'
        },
        {
            id: 'archer',
            name: '그림자 궁수 (Archer)',
            role: '자유 조준 & 차지 저격 관통포',
            icon: '🏹',
            aura: '🎯 <strong>집중의 눈 오라</strong><br>아군 치명타 +40% / 사거리 +25%',
            unlockCond: '외딴섬 1-5 클리어 시 해금'
        },
        {
            id: 'paladin',
            name: '성기사 (Holy Paladin)',
            role: '거대 해머 탱커 & 아군 수호',
            icon: '🛡️',
            aura: '✨ <strong>수호의 성역 오라</strong><br>아군 방어력 +50% / 초당 HP 회복',
            unlockCond: '바다섬 2-5 클리어 시 해금'
        }
    ];

    heroesData.forEach(h => {
        const isUnlocked = saveManager.isHeroUnlocked(h.id);
        const isSelected = saveManager.data.selectedHero === h.id;

        const card = document.createElement('div');
        card.className = `hero-card ${isUnlocked ? '' : 'locked'} ${isSelected ? 'selected' : ''}`;

        card.innerHTML = `
            <div class="hero-icon">${h.icon}</div>
            <div class="hero-card-title">${h.name}</div>
            <div class="hero-card-role">${h.role}</div>
            <div class="hero-card-aura">${h.aura}</div>
            ${isUnlocked ?
                `<button class="btn-select-hero">${isSelected ? '선택됨' : '영웅 선택'}</button>` :
                `<div class="hero-locked-msg">🔒 ${h.unlockCond}</div>`
            }
        `;

        if (isUnlocked) {
            const btn = card.querySelector('.btn-select-hero');
            const selectHero = () => {
                saveManager.data.selectedHero = h.id;
                saveManager.save();
                sound.slash();
                renderHeroes();
                showToast(`👤 ${h.name} 선택 완료!`);
            };
            bindFastTap(btn, selectHero);
            bindFastTap(card, selectHero);
        }

        heroesContainer.appendChild(card);
    });
}

function refreshShopItems() {
    const shopItems = document.querySelectorAll('.upgrade-item');
    shopItems.forEach(item => {
        const statKey = item.dataset.stat;
        const currentLv = saveManager.data.upgrades[statKey] || 1;
        const cost = saveManager.getUpgradeCost(statKey);

        const lvLabel = item.querySelector('.up-lv');
        const buyBtn = item.querySelector('.btn-buy-upgrade');

        if (lvLabel) lvLabel.textContent = `Lv.${currentLv}`;
        if (buyBtn) {
            buyBtn.textContent = `강화: ${cost}G`;
            if (saveManager.data.gold >= cost) {
                buyBtn.classList.remove('disabled');
            } else {
                buyBtn.classList.add('disabled');
            }

            bindFastTap(buyBtn, () => {
                if (saveManager.upgradeStat(statKey)) {
                    sound.victory();
                    refreshLobbyUI();
                    showToast('✨ 강화 완료!');
                } else {
                    sound.defeat();
                    showToast('골드가 부족합니다!');
                }
            });
        }
    });
}

// Start Battle
function startBattle(stageNumber) {
    if (currentGame) {
        currentGame.stop();
    }

    lobbyScreen.style.display = 'none';
    mobileControls.style.display = 'block';
    ingameTopBar.style.display = 'block';

    const heroType = saveManager.data.selectedHero || 'blade';

    // Update attack button label based on hero
    const atkIcon = document.getElementById('attack-btn-icon');
    const atkLabel = document.getElementById('attack-btn-label');
    if (heroType === 'archer') {
        atkIcon.textContent = '🏹';
        atkLabel.textContent = '조준사격';
    } else if (heroType === 'paladin') {
        atkIcon.textContent = '🔨';
        atkLabel.textContent = '강타';
    } else {
        atkIcon.textContent = '⚔️';
        atkLabel.textContent = '참격';
    }

    currentGame = new Game(canvas, heroType, stageNumber, () => {
        exitToLobby();
    });
    currentGame.start();
}

function exitToLobby() {
    if (currentGame) {
        currentGame.stop();
        currentGame = null;
    }
    lobbyScreen.style.display = 'flex';
    mobileControls.style.display = 'none';
    ingameTopBar.style.display = 'none';
    refreshLobbyUI();
}

if (btnPauseLobby) bindFastTap(btnPauseLobby, exitToLobby);

// ================= MOBILE & PC TOUCH EVENT BINDINGS =================
function bindTouchButton(elemId, onDown, onUp) {
    const btn = document.getElementById(elemId);
    if (!btn) return;

    let isPressed = false;

    const start = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isPressed) return;
        isPressed = true;
        sound.init();
        btn.classList.add('active');
        if (onDown) onDown();
    };

    const stop = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!isPressed) return;
        isPressed = false;
        btn.classList.remove('active');
        if (onUp) onUp();
    };

    btn.addEventListener('pointerdown', start);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);

    btn.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchend', stop, { passive: false });
    window.addEventListener('touchcancel', stop, { passive: false });

    btn.addEventListener('mousedown', start);
    window.addEventListener('mouseup', stop);
}

// Left / Right / Jump
bindTouchButton('touch-left',
    () => { if (currentGame) currentGame.input.left = true; },
    () => { if (currentGame) currentGame.input.left = false; }
);

bindTouchButton('touch-right',
    () => { if (currentGame) currentGame.input.right = true; },
    () => { if (currentGame) currentGame.input.right = false; }
);

bindTouchButton('touch-jump',
    () => { if (currentGame) currentGame.input.jump = true; },
    () => { if (currentGame) currentGame.input.jump = false; }
);

// Attack Button (Interactive Aiming for Archer)
const touchAttackBtn = document.getElementById('touch-attack');
if (touchAttackBtn) {
    let touchOrigin = null;

    const startAttack = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        sound.init();
        if (!currentGame) return;

        if (currentGame.hero.type === 'archer') {
            currentGame.input.aiming = true;
            currentGame.input.attackHeld = true;
            const touch = e.touches ? e.touches[0] : (e.clientX !== undefined ? e : null);
            if (touch) {
                touchOrigin = { x: touch.clientX, y: touch.clientY };
            }
            currentGame.input.aimOffset = { dx: (currentGame.hero.facing || 1) * 150, dy: -30 };
        } else {
            currentGame.input.attack = true;
        }
    };

    const moveAttack = (e) => {
        if (!currentGame || !currentGame.input.aiming || !touchOrigin) return;
        const touch = e.touches ? e.touches[0] : (e.clientX !== undefined ? e : null);
        if (!touch) return;
        const dx = touch.clientX - touchOrigin.x;
        const dy = touch.clientY - touchOrigin.y;
        if (Math.hypot(dx, dy) > 10) {
            currentGame.input.aimOffset = { dx: dx * 3, dy: dy * 3 };
        }
    };

    const endAttack = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!currentGame) return;
        if (currentGame.hero.type === 'archer') {
            currentGame.input.releaseAim = true;
            currentGame.input.releaseAttack = true;
            currentGame.input.aiming = false;
            currentGame.input.attackHeld = false;
        }
        touchOrigin = null;
    };

    touchAttackBtn.addEventListener('pointerdown', startAttack);
    window.addEventListener('pointermove', moveAttack);
    window.addEventListener('pointerup', endAttack);
    window.addEventListener('pointercancel', endAttack);

    touchAttackBtn.addEventListener('touchstart', startAttack, { passive: false });
    window.addEventListener('touchmove', moveAttack, { passive: false });
    window.addEventListener('touchend', endAttack, { passive: false });

    touchAttackBtn.addEventListener('mousedown', startAttack);
    window.addEventListener('mousemove', moveAttack);
    window.addEventListener('mouseup', endAttack);
}

// Skills
bindTouchButton('touch-skill-1',
    () => { if (currentGame) currentGame.input.skill1 = true; },
    () => {}
);

bindTouchButton('touch-skill-2',
    () => { if (currentGame) currentGame.input.skill2 = true; },
    () => {}
);

bindTouchButton('touch-ult',
    () => { if (currentGame) currentGame.input.ult = true; },
    () => {}
);

// Summon buttons
['swordsman', 'shield', 'bow', 'mage'].forEach((unit, idx) => {
    const btn = document.getElementById(`touch-summon-${idx + 1}`);
    if (btn) {
        bindFastTap(btn, () => {
            if (currentGame) currentGame.trySummon(unit);
        });
    }
});

// Mana Boost
const manaBoostBtn = document.getElementById('touch-mana-boost');
if (manaBoostBtn) {
    bindFastTap(manaBoostBtn, () => {
        if (currentGame) {
            currentGame.boostBattleMana();
            const costLabel = document.getElementById('label-boost-cost');
            if (costLabel) costLabel.textContent = `${currentGame.battleManaUpgradeCost}⚡`;
        }
    });
}

// ================= MOBILE UTILITIES & FULLSCREEN =================
const modalQrConnect = document.getElementById('modal-qr-connect');
const btnPhoneConnect = document.getElementById('btn-phone-connect');
const btnCloseQrModal = document.getElementById('btn-close-qr-modal');
const qrUrlText = document.getElementById('qr-url-text');
const qrCodeImg = document.getElementById('qr-code-img');
const btnCopyUrl = document.getElementById('btn-copy-url');

const PUBLIC_ONLINE_URL = 'https://backheyoung.github.io/ac00/';
const activeMobileUrl = (window.location && window.location.href && window.location.href.startsWith('https://backheyoung.github.io'))
    ? window.location.href
    : PUBLIC_ONLINE_URL;

if (qrUrlText) qrUrlText.value = activeMobileUrl;
if (qrCodeImg) {
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeMobileUrl)}`;
}

if (btnPhoneConnect) {
    bindFastTap(btnPhoneConnect, () => {
        if (modalQrConnect) modalQrConnect.style.display = 'flex';
    });
}

if (btnCloseQrModal) {
    bindFastTap(btnCloseQrModal, () => {
        if (modalQrConnect) modalQrConnect.style.display = 'none';
    });
}

if (btnCopyUrl && qrUrlText) {
    bindFastTap(btnCopyUrl, () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(qrUrlText.value).then(() => {
                btnCopyUrl.textContent = '복사됨!';
                setTimeout(() => { btnCopyUrl.textContent = '복사'; }, 1500);
            }).catch(() => {
                qrUrlText.select();
            });
        } else {
            qrUrlText.select();
        }
    });
}

// Toast Notification Utility
const toastPill = document.getElementById('toast-pill');
let toastTimer = null;
function showToast(msg, duration = 2500) {
    if (!toastPill) return;
    toastPill.textContent = msg;
    toastPill.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastPill.style.display = 'none';
    }, duration);
}

// Robust Fullscreen Toggle (Supports Desktop, Android, iOS fallback)
function toggleFullscreen() {
    sound.init();
    const doc = document;
    const docEl = document.documentElement;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!isFs) {
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {
                fallbackFullscreen();
            });
        } else if (docEl.webkitRequestFullscreen) {
            try { docEl.webkitRequestFullscreen(); } catch (e) { fallbackFullscreen(); }
        } else if (docEl.mozRequestFullScreen) {
            try { docEl.mozRequestFullScreen(); } catch (e) { fallbackFullscreen(); }
        } else if (docEl.msRequestFullscreen) {
            try { docEl.msRequestFullscreen(); } catch (e) { fallbackFullscreen(); }
        } else {
            fallbackFullscreen();
        }
    } else {
        if (doc.exitFullscreen) {
            doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
            try { doc.webkitExitFullscreen(); } catch (e) {}
        } else if (doc.mozCancelFullScreen) {
            try { doc.mozCancelFullScreen(); } catch (e) {}
        } else if (doc.msExitFullscreen) {
            try { doc.msExitFullscreen(); } catch (e) {}
        }
        document.body.classList.remove('simulated-fullscreen');
    }
}

function fallbackFullscreen() {
    document.body.classList.toggle('simulated-fullscreen');
    window.scrollTo(0, 1);
    showToast('⛶ 전체 화면 모드가 적용되었습니다 (기기를 가로로 회전해주세요)');
}

const btnFsLobby = document.getElementById('btn-fullscreen-lobby');
const btnFsIngame = document.getElementById('btn-fullscreen-ingame');
if (btnFsLobby) {
    bindFastTap(btnFsLobby, toggleFullscreen);
}
if (btnFsIngame) {
    bindFastTap(btnFsIngame, toggleFullscreen);
}

// Web Audio Unlock on First Touch/Click
['touchstart', 'click', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => sound.init(), { once: true, passive: true });
});

// Initialize on Load
refreshLobbyUI();


    if (typeof window !== 'undefined') {
        window.ISLANDS = ISLANDS;
        window.STAGE_CONFIGS = STAGE_CONFIGS;
        window.saveManager = saveManager;
        window.Base = Base;
        window.Hero = Hero;
        window.Game = Game;
    }
})();
