// Particle and Visual Effects System
// Handles: Slash Trails, Hit Sparks, Ink Blood, Floating Damage Numbers, Ground Shockwaves, Dust

export class ParticleSystem {
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
