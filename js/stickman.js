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

export class StickmanRenderer {
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
