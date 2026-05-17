const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score-display");
const flowDisplay = document.getElementById("flow-display");
const gameOverScreen = document.getElementById("game-over-screen");
const finalScoreDisplay = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");

// Global environmental settings requested by physics.js
const CANVAS_H = canvas.height;
let isGameOver = false;
let gameSpeed = 5.5;

// Unified player data object structure
let player = {
    x: 150,
    y: 150,
    width: 20,
    height: 46,
    velY: 0,
    isOnGround: false,
    canDoubleJump: false,
    hasDoubleJumped: false,
    isSliding: false,

    normalWidth: 20,
    normalHeight: 46,
    slideWidth: 38,
    slideHeight: 22,
    
    flowPoints: 0,
    trail: []
};

// Global interactive flag engine state
const input = {
    jump: false,
    slide: false
};

// Callback modifier triggered from within Claude's physics loop
function addFlow(amount) {
    player.flowPoints = Math.min(100, player.flowPoints + amount);
}

// Procedural environmental registries
let platforms = [];
let obstacles = [];
let score = 0;
let distanceTraveled = 0;

function resetGame() {
    score = 0;
    gameSpeed = 5.5;
    distanceTraveled = 0;
    isGameOver = false;
    gameOverScreen.classList.remove("active");

    player.x = 150;
    player.y = 150;
    player.velY = 0;
    player.flowPoints = 0;
    player.trail = [];
    player.isOnGround = false;

    // Standard baseline procedural track initialization array
    platforms = [
        { x: 0, width: 400, y: 300 },
        { x: 450, width: 300, y: 280 },
        { x: 800, width: 400, y: 320 }
    ];
    obstacles = [];
}

function updateWorld() {
    distanceTraveled += gameSpeed;
    score = Math.floor(distanceTraveled / 10);
    
    // Scale up step rate incrementally as scores progress forward
    gameSpeed = 5.5 + Math.min(6, (score / 300)) + (player.flowPoints / 25);

    // Minor passive decay over time
    if (player.flowPoints > 0) player.flowPoints -= 0.05;

    // Track state variations to form visual ghost runner trails
    if (player.flowPoints > 40 && Math.random() > 0.4) {
        player.trail.push({
            x: player.x,
            y: player.y,
            w: player.width,
            h: player.height,
            alpha: 0.5
        });
    }
    
    player.trail.forEach(t => { t.x -= gameSpeed * 0.3; t.alpha -= 0.04; });
    player.trail = player.trail.filter(t => t.alpha > 0);

    // Reposition building platform spaces along the X axis
    platforms.forEach(p => p.x -= gameSpeed);
    if (platforms[0] && platforms[0].x + platforms[0].width < 0) {
        platforms.shift();
    }

    // Append continuous layouts to edge spaces
    if (platforms[platforms.length - 1].x < canvas.width + 200) {
        let lastP = platforms[platforms.length - 1];
        let gap = 70 + Math.random() * 90 + Math.min(50, gameSpeed * 3);
        let nextWidth = 200 + Math.random() * 250;
        let nextY = Math.max(180, Math.min(380, lastP.y + (Math.random() * 100 - 50)));

        let newPlatform = { x: lastP.x + lastP.width + gap, width: nextWidth, y: nextY };
        platforms.push(newPlatform);

        // Calculate conditional obstacle spawn cycles
        if (Math.random() > 0.3 && nextWidth > 200) {
            let obstacleX = newPlatform.x + 80 + Math.random() * (nextWidth - 120);
            let type = Math.random() > 0.5 ? 'spike' : 'low-clearance';
            
            if (type === 'spike') {
                obstacles.push({ x: obstacleX, y: newPlatform.y - 25, width: 20, height: 25, type: 'spike' });
            } else {
                obstacles.push({ x: obstacleX, y: newPlatform.y - 65, width: 40, height: 35, type: 'low-clearance' });
            }
        }
    }

    // Scroll hazards and strip off-screen arrays
    obstacles.forEach(o => o.x -= gameSpeed);
    obstacles = obstacles.filter(o => o.x + o.width > 0);

    // Call out to Claude's physics module tracking mechanics across instances
    let safeLanded = false;
    platforms.forEach(p => {
        if (checkPlatform(p)) {
            safeLanded = true;
        }
    });
    if (!safeLanded) player.isOnGround = false;

    // Detect solid intersection on hazardous elements
    obstacles.forEach(o => {
        let padding = 3; 
        if (
            player.x + padding < o.x + o.width &&
            player.x + player.width - padding > o.x &&
            player.y + padding < o.y + o.height &&
            player.y + player.height - padding > o.y
        ) {
            isGameOver = true;
        }
    });

    if (isGameOver) {
        finalScoreDisplay.innerText = `FINAL SCORE: ${score}`;
        gameOverScreen.classList.add("active");
    }
}

function drawWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Visual background structural alignment ticks
    ctx.strokeStyle = "rgba(0, 255, 255, 0.03)";
    ctx.lineWidth = 2;
    let gridOffset = (distanceTraveled * 0.2) % 40;
    for (let x = -gridOffset; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }

    // Render active structural blocks
    platforms.forEach(p => {
        ctx.fillStyle = "#292e54";
        ctx.fillRect(p.x, p.y, p.width, canvas.height - p.y);
        ctx.strokeStyle = "#4d5b9e";
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x, p.y, p.width, canvas.height - p.y);
        
        ctx.beginPath();
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.width, p.y);
        ctx.stroke();
    });

    // Render spikes/ceilings
    obstacles.forEach(o => {
        if (o.type === 'spike') {
            ctx.fillStyle = "#ff3366";
            ctx.beginPath();
            ctx.moveTo(o.x, o.y + o.height);
            ctx.lineTo(o.x + o.width / 2, o.y);
            ctx.lineTo(o.x + o.width, o.y + o.height);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = "#ffcc00";
            ctx.fillRect(o.x, o.y, o.width, o.height);
            ctx.strokeStyle = "#b38f00";
            ctx.strokeRect(o.x, o.y, o.width, o.height);
        }
    });

    // Draw active velocity trailing shapes
    player.trail.forEach(t => {
        ctx.fillStyle = `rgba(0, 255, 255, ${t.alpha})`;
        ctx.fillRect(t.x, t.y, t.w, t.h);
    });

    drawStickman();

    scoreDisplay.innerText = `SCORE: ${score}`;
    flowDisplay.innerText = `FLOW: ${Math.floor(player.flowPoints)}%`;
}

function drawStickman() {
    ctx.strokeStyle = player.flowPoints > 50 ? "#00ffff" : "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    let cx = player.x + player.width / 2;
    let cy = player.y;

    if (player.isSliding) {
        ctx.beginPath(); ctx.arc(player.x + player.width - 8, player.y + 10, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(player.x + player.width - 13, player.y + 10); ctx.lineTo(player.x + 5, player.y + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(player.x + 5, player.y + 12); ctx.lineTo(player.x, player.y + 6); ctx.stroke();
    } else {
        let headY = cy + 10;
        let neckY = cy + 16;
        let pelvisY = cy + 32;

        ctx.beginPath(); ctx.arc(cx, headY, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, neckY); ctx.lineTo(cx, pelvisY); ctx.stroke();

        let animCycle = (distanceTraveled * 0.15);
        let leftLegAngle = Math.sin(animCycle);
        let rightLegAngle = Math.cos(animCycle);

        if (!player.isOnGround) {
            leftLegAngle = 0.5;
            rightLegAngle = -0.3;
        }

        ctx.beginPath(); ctx.moveTo(cx, pelvisY);
        ctx.lineTo(cx + Math.sin(leftLegAngle) * 12, pelvisY + 14); ctx.stroke();

        ctx.beginPath(); ctx.moveTo(cx, pelvisY);
        ctx.lineTo(cx + Math.sin(rightLegAngle) * 12, pelvisY + 14); ctx.stroke();

        ctx.beginPath(); ctx.moveTo(cx, neckY);
        ctx.lineTo(cx - 8, neckY + 6); ctx.stroke();
    }
}

function gameLoop() {
    if (!isGameOver) {
        updatePhysics(); // Invoking Claude's computational foundation layer inside physics.js
        updateWorld();
    }
    drawWorld();
    requestAnimationFrame(gameLoop);
}

// ============================================
// COMBINED HARNESS INPUT CONTROL MAPS
// ============================================

// --- Desktop Keyboard Listeners (Arrows + WASD configuration) ---
window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        input.jump = true;
        e.preventDefault();
    }
    if (["ArrowDown", "KeyS"].includes(e.code)) {
        input.slide = true;
        e.preventDefault();
    }
});

window.addEventListener("keyup", (e) => {
    if (["ArrowDown", "KeyS"].includes(e.code)) {
        input.slide = false;
    }
});

// --- Mobile Tactile Layout Interfaces ---
const mobileJumpBtn = document.getElementById("mobile-jump");
const mobileSlideBtn = document.getElementById("mobile-slide");

mobileJumpBtn.addEventListener("touchstart", (e) => {
    input.jump = true;
    e.preventDefault();
}, { passive: false });

mobileSlideBtn.addEventListener("touchstart", (e) => {
    input.slide = true;
    e.preventDefault();
}, { passive: false });

mobileSlideBtn.addEventListener("touchend", (e) => {
    input.slide = false;
    e.preventDefault();
});

mobileSlideBtn.addEventListener("touchcancel", () => { input.slide = false; });

// Hybrid desktop-pointer backup connections for mobile graphical panels
mobileJumpBtn.addEventListener("mousedown", () => { input.jump = true; });
mobileSlideBtn.addEventListener("mousedown", () => { input.slide = true; });
window.addEventListener("mouseup", () => { input.slide = false; });

// ============================================
// WINDOW VIEWPORT AND ORIENTATION EXPANSION HANDLERS
// ============================================
const fullscreenBtn = document.getElementById("fullscreen-btn");
const gameContainer = document.getElementById("game-container");
const gameTitle = document.querySelector("h1");
const controlsHint = document.getElementById("controls-hint");

fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        gameContainer.requestFullscreen().then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock("landscape").catch(() => {
                    console.log("Landscape lock bypass triggered on standard desktop.");
                });
            }
            fullscreenBtn.style.display = "none";
            if(gameTitle) gameTitle.style.display = "none";
            if(controlsHint) controlsHint.style.display = "none";
        }).catch(err => {
            console.error(`Fullscreen request rejected: ${err.message}`);
        });
    }
});

document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        fullscreenBtn.style.display = "inline-block";
        if(gameTitle) gameTitle.style.display = "block";
        if(controlsHint) controlsHint.style.display = "block";
    }
});

restartBtn.addEventListener("click", resetGame);

// Bootstrap start execution
resetGame();
gameLoop();