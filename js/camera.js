// Smooth Camera with Screen Shake and Parallax Support

export class Camera {
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
