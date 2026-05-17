// ============================================
// physics.js ADDITION — Particle System
// Claude handles: spawn, trajectory, physics
// Gemini handles: draw loop + alpha fading
// ============================================

// ─── PARTICLE POOL ───────────────────────────────────────
// Gemini reads this array and renders each particle
const particles = [];

// ─── PARTICLE FACTORY ────────────────────────────────────
function spawnParticle(x, y, velX, velY, options = {}) {
    particles.push({
        x, y,
        velX, velY,
        alpha:     options.alpha    ?? 1.0,
        decay:     options.decay    ?? 0.03,   // alpha loss per frame
        friction:  options.friction ?? 0.88,   // horizontal drag
        gravity:   options.gravity  ?? 0.18,   // per-particle mini gravity
        size:      options.size     ?? 3,
        color:     options.color    ?? "#00ffff",
    });
}

// ─── JUMP BURST ──────────────────────────────────────────
// Call this inside handleJump() after setting velY
function spawnJumpParticles(isDoubleJump) {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height;
    const count = isDoubleJump ? 14 : 9;
    const color = isDoubleJump ? "#ffffff" : "#00ffff";

    for (let i = 0; i < count; i++) {
        const angle  = Math.PI + (Math.random() * Math.PI); // downward arc
        const speed  = 1.5 + Math.random() * 2.5;
        spawnParticle(
            cx + (Math.random() - 0.5) * player.width,
            cy,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            {
                decay:    isDoubleJump ? 0.025 : 0.035,
                friction: 0.85,
                gravity:  0.12,
                size:     isDoubleJump ? 2 + Math.random() * 2 : 1.5 + Math.random() * 1.5,
                color,
            }
        );
    }
}

// ─── LANDING SPLASH ──────────────────────────────────────
// Call this inside checkPlatform() on confirmed landing
function spawnLandingParticles(platformY) {
    const cx     = player.x + player.width / 2;
    const impact = Math.abs(player.velY); // harder landing = more spread
    const count  = Math.min(18, Math.floor(impact * 1.8));

    for (let i = 0; i < count; i++) {
        const side  = Math.random() > 0.5 ? 1 : -1;
        const speed = (1 + Math.random() * impact * 0.4) * side;
        spawnParticle(
            cx + (Math.random() - 0.5) * player.width * 2,
            platformY,
            speed,
            -(0.5 + Math.random() * 1.5),  // slight upward kick
            {
                decay:    0.04,
                friction: 0.80,
                gravity:  0.08,
                size:     1 + Math.random() * 2,
                color:    "#00ffff",
            }
        );
    }
}

// ─── PARTICLE TICK ───────────────────────────────────────
// Call this in updatePhysics() every frame
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.velY  += p.gravity;
        p.velX  *= p.friction;
        p.x     += p.velX;
        p.y     += p.velY;
        p.alpha -= p.decay;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}