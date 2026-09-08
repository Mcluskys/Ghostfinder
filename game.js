"use strict";

const LOGICAL_W = 900;
const LOGICAL_H = 600;
const LIGHT_RADIUS = 70;
const WHITE = "#ffffff";
const SPAWN_INTERVAL = 1500;
const MIN_DISTANCE = 100;
const GHOST_SIZE = 70;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

let dpr = 1;
function resizeBackingStore() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(LOGICAL_W * dpr);
  const h = Math.round(LOGICAL_H * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
resizeBackingStore();
window.addEventListener("resize", resizeBackingStore, { passive: true });

const paths = {
  background: "assets/images/fond.webp",
  ghost: "assets/images/ghost.webp",
  lamp: "assets/images/lampe.webp",
  victory: "assets/images/FantomePokemon.webp",
  music: "assets/audio/BandeSonFantome.mp3",
  ghostSound: "assets/audio/ghost.mp3",
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const music = new Audio(paths.music);
music.loop = true;
music.preload = "auto";
music.volume = 0.5;

let audioUnlocked = false;
async function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    await music.play();
  } catch {
    audioUnlocked = false;
  }
}

function playGhostSound(volume) {
  const sfx = new Audio(paths.ghostSound);
  sfx.preload = "auto";
  sfx.volume = volume;
  sfx.play().catch(() => {});
}

let backgroundImg;
let ghostImg;
let lampImg;
let victoryImg;

let state = "loading";
let selectedPlayers = 1;
let totalGhosts = 4;
let ghosts = [];
let spawnedGhosts = 0;
let foundCount = 0;
let gameOver = false;
let lastSpawnTime = 0;
let activeJumpGhost = null;
let pointer = { x: LOGICAL_W / 2, y: LOGICAL_H / 2, down: false, type: "mouse" };

const plusRect = { x: LOGICAL_W / 2 + 150, y: 300, w: 50, h: 50 };
const minusRect = { x: LOGICAL_W / 2 - 200, y: 300, w: 50, h: 50 };
const startRect = { x: LOGICAL_W / 2 - 75, y: 400, w: 150, h: 50 };

function nowMs() {
  return performance.now();
}

function pointerToLogical(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(LOGICAL_W, (event.clientX - rect.left) * LOGICAL_W / rect.width)),
    y: Math.max(0, Math.min(LOGICAL_H, (event.clientY - rect.top) * LOGICAL_H / rect.height)),
  };
}

function pointInRect(x, y, r, padding = 0) {
  return x >= r.x - padding && x <= r.x + r.w + padding &&
         y >= r.y - padding && y <= r.y + r.h + padding;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function font(size) {
  return `${size}px Crow, system-ui, sans-serif`;
}

function centeredText(text, x, y, size, color = WHITE) {
  ctx.font = font(size);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawButton(rect, label, fontSize) {
  ctx.fillStyle = WHITE;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  centeredText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, fontSize, "#000");
}

function resetGame() {
  totalGhosts = 4 * selectedPlayers;
  ghosts = [];
  spawnedGhosts = 0;
  foundCount = 0;
  gameOver = false;
  activeJumpGhost = null;
  lastSpawnTime = nowMs();
  pointer.x = LOGICAL_W / 2;
  pointer.y = LOGICAL_H / 2;
  state = "playing";
  // Pendant la partie, l'image de la lampe remplace le curseur.
  canvas.style.cursor = "none";
}

function spawnGhost(currentTime) {
  if (spawnedGhosts >= totalGhosts || currentTime - lastSpawnTime <= SPAWN_INTERVAL) return;

  let x = 0;
  let y = 0;
  let foundSpot = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    x = 50 + Math.random() * (LOGICAL_W - 100);
    y = 50 + Math.random() * (LOGICAL_H - 100);
    const tooClose = ghosts.some(g => distance(x, y, g.x, g.y) < MIN_DISTANCE);
    if (!tooClose) {
      foundSpot = true;
      break;
    }
  }

  if (!foundSpot) {
    x = 50 + Math.random() * (LOGICAL_W - 100);
    y = 50 + Math.random() * (LOGICAL_H - 100);
  }

  ghosts.push({
    x, y,
    found: false,
    jumping: false,
    jumpStart: 0,
    jumpFromX: x,
    jumpFromY: y,
    jumpToX: x,
    jumpToY: y,
    scale: 1,
    visibleUntil: 0,
    cooldownUntil: 0,
  });
  spawnedGhosts += 1;
  lastSpawnTime = currentTime;
}

function updateJump(ghost, currentTime) {
  if (!ghost.jumping) return;
  const duration = 120;
  const elapsed = currentTime - ghost.jumpStart;
  const progress = Math.min(1, elapsed / duration);
  const eased = 1 - Math.pow(1 - progress, 3);

  ghost.x = ghost.jumpFromX + (ghost.jumpToX - ghost.jumpFromX) * eased;
  ghost.y = ghost.jumpFromY + (ghost.jumpToY - ghost.jumpFromY) * eased;

  let scale;
  if (progress < 0.35) {
    scale = 1 + (progress / 0.35) * 2.2;
  } else {
    scale = 3.2 - ((progress - 0.35) / 0.65) * 1.8;
  }
  ghost.scale = Math.max(1, scale);

  if (progress >= 1) {
    ghost.jumping = false;
    ghost.scale = 1;
    ghost.x = ghost.jumpToX;
    ghost.y = ghost.jumpToY;
    if (activeJumpGhost === ghost) activeJumpGhost = null;
  }
}

function triggerGhostJump(ghost, currentTime) {
  const dx0 = pointer.x - ghost.x;
  const dy0 = pointer.y - ghost.y;
  const len = Math.hypot(dx0, dy0);
  const dx = len ? dx0 / len : 0;
  const dy = len ? dy0 / len : 1;
  const jumpDistance = 160;

  ghost.jumping = true;
  ghost.jumpStart = currentTime;
  ghost.jumpFromX = ghost.x;
  ghost.jumpFromY = ghost.y;
  ghost.jumpToX = Math.max(35, Math.min(LOGICAL_W - 35, ghost.x + dx * jumpDistance));
  ghost.jumpToY = Math.max(35, Math.min(LOGICAL_H - 35, ghost.y + dy * jumpDistance));
  ghost.visibleUntil = currentTime + 350;
  ghost.cooldownUntil = currentTime + 1200;
  activeJumpGhost = ghost;
  playGhostSound(1.0);
}

function tryFindGhost() {
  if (state !== "playing" || gameOver) return;
  for (const ghost of ghosts) {
    if (!ghost.found && distance(pointer.x, pointer.y, ghost.x, ghost.y) <= LIGHT_RADIUS) {
      ghost.found = true;
      foundCount += 1;
      playGhostSound(0.7);
      if (foundCount === totalGhosts) gameOver = true;
      break;
    }
  }
}

function update(currentTime) {
  if (state !== "playing" || gameOver) return;
  spawnGhost(currentTime);

  for (const ghost of ghosts) updateJump(ghost, currentTime);

  for (const ghost of ghosts) {
    if (ghost.found) continue;
    const d = distance(pointer.x, pointer.y, ghost.x, ghost.y);
    if (
      d <= LIGHT_RADIUS &&
      activeJumpGhost === null &&
      !ghost.jumping &&
      currentTime >= ghost.cooldownUntil
    ) {
      triggerGhostJump(ghost, currentTime);
    }
  }
}

function drawWelcomeCursor() {
  // Curseur dessiné dans le canvas : il reste visible même si le navigateur
  // masque son curseur natif au-dessus du jeu.
  if (pointer.type === "touch") return;
  ctx.save();
  ctx.translate(pointer.x, pointer.y);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 23);
  ctx.lineTo(6, 17);
  ctx.lineTo(11, 28);
  ctx.lineTo(16, 26);
  ctx.lineTo(11, 15);
  ctx.lineTo(20, 15);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStart() {
  ctx.fillStyle = "rgb(20,20,20)";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  centeredText("Chasse les fantômes !", LOGICAL_W / 2, 140, 40);
  centeredText("Choisissez le nombre de joueurs (1 à 5)", LOGICAL_W / 2, 218, 36);
  centeredText(String(selectedPlayers), LOGICAL_W / 2, 330, 40);
  drawButton(plusRect, "+", 40);
  drawButton(minusRect, "-", 40);
  drawButton(startRect, "START", 40);
  drawWelcomeCursor();
}

function drawPlaying(currentTime) {
  ctx.drawImage(backgroundImg, 0, 0, LOGICAL_W, LOGICAL_H);

  for (const ghost of ghosts) {
    if (ghost.found) continue;
    const d = distance(pointer.x, pointer.y, ghost.x, ghost.y);
    if (ghost.jumping || currentTime < ghost.visibleUntil || d <= LIGHT_RADIUS) {
      const size = GHOST_SIZE * ghost.scale;
      ctx.drawImage(ghostImg, ghost.x - size / 2, ghost.y - size / 2, size, size);
    }
  }

  // Obscurité autour du joueur avec un faisceau jaune chaud et diffus.
  // Le rayon de détection reste identique : seul le rendu lumineux change.
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.86)";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // On découpe progressivement l'obscurité au centre de la lampe.
  ctx.globalCompositeOperation = "destination-out";
  const reveal = ctx.createRadialGradient(
    pointer.x, pointer.y, 0,
    pointer.x, pointer.y, LIGHT_RADIUS
  );
  reveal.addColorStop(0, "rgba(255,255,255,1)");
  reveal.addColorStop(0.55, "rgba(255,255,255,0.92)");
  reveal.addColorStop(0.82, "rgba(255,255,255,0.55)");
  reveal.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = reveal;
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, LIGHT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Teinte jaune de lampe torche par-dessus la zone éclairée.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const warmLight = ctx.createRadialGradient(
    pointer.x, pointer.y, 0,
    pointer.x, pointer.y, LIGHT_RADIUS * 1.12
  );
  warmLight.addColorStop(0, "rgba(255,236,120,0.44)");
  warmLight.addColorStop(0.38, "rgba(255,220,75,0.30)");
  warmLight.addColorStop(0.72, "rgba(255,196,40,0.13)");
  warmLight.addColorStop(1, "rgba(255,188,30,0)");
  ctx.fillStyle = warmLight;
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, LIGHT_RADIUS * 1.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.font = font(24);
  ctx.fillStyle = WHITE;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Fantômes trouvés : ${foundCount}/${totalGhosts}`, 20, 20);

  ctx.drawImage(lampImg, pointer.x - 40, pointer.y - 40, 80, 80);

  if (activeJumpGhost && activeJumpGhost.jumping) {
    const alpha = (20 + Math.random() * 50) / 255;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.90)";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    const w = 500;
    const h = 500;
    ctx.drawImage(victoryImg, (LOGICAL_W - w) / 2, (LOGICAL_H - h) / 2, w, h);

    ctx.font = font(34);
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("Félicitation, tu n'as pas peur des fantômes!", LOGICAL_W / 2, LOGICAL_H - 22);
  }
}

function drawLoading() {
  ctx.fillStyle = "#141414";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  centeredText("Chargement…", LOGICAL_W / 2, LOGICAL_H / 2, 36);
}

function render(currentTime) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (state === "loading") drawLoading();
  else if (state === "start") drawStart();
  else drawPlaying(currentTime);
}

function frame(currentTime) {
  update(currentTime);
  render(currentTime);
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  const p = pointerToLogical(event);
  pointer.x = p.x;
  pointer.y = p.y;
  pointer.down = true;
  pointer.type = event.pointerType || "mouse";
  unlockAudio();

  if (state === "start") {
    // Zone de clic légèrement tolérante pour le tactile, sans modifier le visuel.
    const pad = pointer.type === "touch" ? 22 : 0;
    if (pointInRect(pointer.x, pointer.y, plusRect, pad) && selectedPlayers < 5) selectedPlayers += 1;
    else if (pointInRect(pointer.x, pointer.y, minusRect, pad) && selectedPlayers > 1) selectedPlayers -= 1;
    else if (pointInRect(pointer.x, pointer.y, startRect, pad)) resetGame();
    return;
  }

  tryFindGhost();
}, { passive: false });

canvas.addEventListener("pointermove", event => {
  // Sur l’accueil, on suit aussi la souris afin d’afficher un curseur fiable.
  // En jeu, le tactile ne déplace la lampe que pendant le glissement.
  if (state === "playing" && event.pointerType === "touch" && !pointer.down) return;
  const p = pointerToLogical(event);
  pointer.x = p.x;
  pointer.y = p.y;
  pointer.type = event.pointerType || "mouse";
}, { passive: true });

function releasePointer(event) {
  pointer.down = false;
  try { canvas.releasePointerCapture?.(event.pointerId); } catch {}
}
canvas.addEventListener("pointerup", releasePointer, { passive: true });
canvas.addEventListener("pointercancel", releasePointer, { passive: true });
canvas.addEventListener("contextmenu", event => event.preventDefault());

Promise.all([
  loadImage(paths.background),
  loadImage(paths.ghost),
  loadImage(paths.lamp),
  loadImage(paths.victory),
  document.fonts?.load?.("40px Crow") ?? Promise.resolve(),
]).then(([bg, ghost, lamp, victory]) => {
  backgroundImg = bg;
  ghostImg = ghost;
  lampImg = lamp;
  victoryImg = victory;
  state = "start";
  // Le curseur doit rester visible sur l'écran d'accueil pour sélectionner et démarrer.
  canvas.style.cursor = "default";
}).catch(err => {
  console.error("Erreur de chargement des ressources", err);
});

requestAnimationFrame(frame);
