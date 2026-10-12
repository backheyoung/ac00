// Main Game Engine with Stage System, Mobile Touch Controls, In-battle Mana Booster, and Save Integration
import { sound } from './audio.js';
import { ParticleSystem } from './particles.js';
import { Base, Unit } from './entities.js';
import { Hero } from './heroes.js';
import { Spawner, STAGE_CONFIGS } from './spawner.js';
import { Camera } from './camera.js';
import { saveManager } from './save.js';

export class Game {
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
