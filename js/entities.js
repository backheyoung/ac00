// Entities: Base, Minions, Enemies, Projectiles with persistent upgrades
import { sound } from './audio.js';
import { StickmanRenderer } from './stickman.js';
import { saveManager } from './save.js';

export class Base {
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

export class Projectile {
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

export class Unit {
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
