// Hero Classes: Blade Master, Holy Paladin, Shadow Archer
// Features synchronized martial arts forward steps, hit-stop on impact,
// multi-keyframe attack animations, dynamic bow aiming, and Paladog aura.

import { sound } from './audio.js';
import { Projectile } from './entities.js';
import { StickmanRenderer } from './stickman.js';
import { saveManager } from './save.js';

export class Hero {
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
            // Fluid Run-and-Attack: Allow moving, jumping, and comboing during basic attacks!
            if (['attack1', 'attack2', 'attack3'].includes(this.state)) {
                let moveDir = 0;
                if (input.left) moveDir -= 1;
                if (input.right) moveDir += 1;
                if (moveDir !== 0) {
                    this.facing = moveDir;
                    this.x += moveDir * this.speed * 0.9 * dt;
                }

                // Jump while attacking
                if (input.jump && this.y >= this.groundY) {
                    this.vy = -450;
                    sound.jump();
                    particles.addDust(this.x, this.y, 0);
                }

                // Smooth Combo Chaining: if hit apex connected and player taps attack, go to next attack!
                if (input.attack && this.attackHitDone && this.state !== 'attack3') {
                    input.attack = false;
                    this.performBasicAttack();
                }
            }

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
