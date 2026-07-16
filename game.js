const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const pointSound = new Audio('sounds/point.mp3');
const dieSound = new Audio('sounds/die.mp3');

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_HEIGHT = 64;

const GRAVITY = 0.35;
const FLAP_VELOCITY = -6.5;
const MAX_FALL_SPEED = 8;

const PIPE_WIDTH = 52;
const PIPE_GAP = 120;
const PIPE_SPEED = 2;
const PIPE_INTERVAL = 90;

const PIXEL = 4;

const BIRD_FRAMES = [
  [
    '.YYYYYY.',
    'YYYYYYYY',
    'YYYWBYYY',
    'YYYYYYYY',
    'OYYYYYYY',
    '.OOYYYY.',
    '..OOYY..',
    '...OO...',
  ],
  [
    '.YYYYYY.',
    'YYYYYYYY',
    'YYYWBYYY',
    'OYYYYYYY',
    'OOYYYYYY',
    '.OYYYY..',
    '..OYY...',
    '....O...',
  ],
];

const BIRD_COLORS = {
  Y: '#fbd93a',
  O: '#f2711c',
  W: '#ffffff',
  B: '#2b2b2b',
};

const BIRD_SIZE = BIRD_FRAMES[0].length * PIXEL;

const STATE = {
  START: 'start',
  READY: 'ready',
  PLAY: 'play',
  GAMEOVER: 'gameover',
};

let state = STATE.START;
let score = 0;
let frameCount = 0;
let wingFrame = 0;
let wingTimer = 0;
let idleTimer = 0;

const bird = {
  x: 80,
  y: HEIGHT / 2,
  vy: 0,
};

let pipes = [];
let gameOverTimer = 0;

function resetGame() {
  bird.y = HEIGHT / 2;
  bird.vy = 0;
  pipes = [];
  score = 0;
  frameCount = 0;
}

function spawnPipe() {
  const margin = 40;
  const gapY = margin + Math.random() * (HEIGHT - GROUND_HEIGHT - margin * 2 - PIPE_GAP) + PIPE_GAP / 2;
  pipes.push({ x: WIDTH, gapY, passed: false });
}

function flap() {
  bird.vy = FLAP_VELOCITY;
}

function handleInput() {
  if (state === STATE.START) {
    resetGame();
    state = STATE.READY;
  } else if (state === STATE.READY) {
    state = STATE.PLAY;
    flap();
  } else if (state === STATE.PLAY) {
    flap();
  } else if (state === STATE.GAMEOVER) {
    if (gameOverTimer > 15) {
      resetGame();
      state = STATE.START;
    }
  }
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleInput();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleInput();
  }
});

function updatePlay() {
  bird.vy = Math.min(bird.vy + GRAVITY, MAX_FALL_SPEED);
  bird.y += bird.vy;

  if (bird.y - BIRD_SIZE / 2 < 0) {
    bird.y = BIRD_SIZE / 2;
    bird.vy = 0;
  }

  frameCount++;
  if (frameCount % PIPE_INTERVAL === 0) {
    spawnPipe();
  }

  for (const pipe of pipes) {
    pipe.x -= PIPE_SPEED;
    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score++;
      playSound(pointSound);
    }
  }
  pipes = pipes.filter((p) => p.x + PIPE_WIDTH > 0);

  if (checkCollision()) {
    state = STATE.GAMEOVER;
    gameOverTimer = 0;
    playSound(dieSound);
  }
}

function checkCollision() {
  const birdTop = bird.y - BIRD_SIZE / 2;
  const birdBottom = bird.y + BIRD_SIZE / 2;
  const birdLeft = bird.x - BIRD_SIZE / 2;
  const birdRight = bird.x + BIRD_SIZE / 2;

  if (birdBottom >= HEIGHT - GROUND_HEIGHT) {
    return true;
  }

  for (const pipe of pipes) {
    const withinX = birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH;
    if (!withinX) continue;
    const gapTop = pipe.gapY - PIPE_GAP / 2;
    const gapBottom = pipe.gapY + PIPE_GAP / 2;
    if (birdTop < gapTop || birdBottom > gapBottom) {
      return true;
    }
  }
  return false;
}

function updateWingAnimation() {
  wingTimer++;
  if (wingTimer % 8 === 0) {
    wingFrame = (wingFrame + 1) % BIRD_FRAMES.length;
  }
}

function drawBackground() {
  ctx.fillStyle = '#4ec0ca';
  ctx.fillRect(0, 0, WIDTH, HEIGHT - GROUND_HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  drawCloud(40, 80);
  drawCloud(200, 50);
  drawCloud(260, 130);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const buildingBaseY = HEIGHT - GROUND_HEIGHT;
  let bx = 0;
  let seed = 7;
  while (bx < WIDTH) {
    seed = (seed * 31 + 17) % 97;
    const bw = 24 + (seed % 20);
    const bh = 30 + (seed % 60);
    ctx.fillRect(bx, buildingBaseY - bh, bw, bh);
    bx += bw + 6;
  }
}

function drawCloud(cx, cy) {
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.arc(cx + 16, cy + 4, 18, 0, Math.PI * 2);
  ctx.arc(cx - 16, cy + 6, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  const groundY = HEIGHT - GROUND_HEIGHT;
  ctx.fillStyle = '#ded895';
  ctx.fillRect(0, groundY, WIDTH, GROUND_HEIGHT);

  const stripeH = 14;
  ctx.fillStyle = '#58a35a';
  ctx.fillRect(0, groundY, WIDTH, stripeH);
  ctx.fillStyle = '#4f8a4f';
  const stripeW = 16;
  const offset = (frameCount * PIPE_SPEED) % (stripeW * 2);
  for (let x = -stripeW * 2 + offset; x < WIDTH; x += stripeW * 2) {
    ctx.fillRect(x, groundY, stripeW, stripeH);
  }
  ctx.fillStyle = '#3d6e3f';
  ctx.fillRect(0, groundY, WIDTH, 3);
}

function drawPipe(pipe) {
  const gapTop = pipe.gapY - PIPE_GAP / 2;
  const gapBottom = pipe.gapY + PIPE_GAP / 2;
  const capHeight = 20;
  const capOverhang = 4;

  ctx.fillStyle = '#73bf2e';
  ctx.strokeStyle = '#4f8a24';
  ctx.lineWidth = 3;

  ctx.fillRect(pipe.x, 0, PIPE_WIDTH, gapTop);
  ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, gapTop);
  ctx.fillRect(pipe.x - capOverhang, gapTop - capHeight, PIPE_WIDTH + capOverhang * 2, capHeight);
  ctx.strokeRect(pipe.x - capOverhang, gapTop - capHeight, PIPE_WIDTH + capOverhang * 2, capHeight);

  const bottomHeight = HEIGHT - GROUND_HEIGHT - gapBottom;
  ctx.fillRect(pipe.x, gapBottom, PIPE_WIDTH, bottomHeight);
  ctx.strokeRect(pipe.x, gapBottom, PIPE_WIDTH, bottomHeight);
  ctx.fillRect(pipe.x - capOverhang, gapBottom, PIPE_WIDTH + capOverhang * 2, capHeight);
  ctx.strokeRect(pipe.x - capOverhang, gapBottom, PIPE_WIDTH + capOverhang * 2, capHeight);
}

function drawPipes() {
  for (const pipe of pipes) {
    drawPipe(pipe);
  }
}

function drawBird() {
  const sprite = BIRD_FRAMES[wingFrame];
  const originX = bird.x - BIRD_SIZE / 2;
  const originY = bird.y - BIRD_SIZE / 2;

  const angle = Math.max(-0.4, Math.min(0.9, bird.vy / 10));
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(angle);
  ctx.translate(-bird.x, -bird.y);

  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const ch = sprite[row][col];
      if (ch === '.') continue;
      ctx.fillStyle = BIRD_COLORS[ch];
      ctx.fillRect(originX + col * PIXEL, originY + row * PIXEL, PIXEL, PIXEL);
    }
  }
  ctx.restore();
}

function drawOutlinedText(text, x, y, size, fillColor) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size / 6;
  ctx.strokeStyle = '#4a3b1e';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

function drawButton(x, y, w, h, label) {
  ctx.fillStyle = '#f2711c';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  drawOutlinedText(label, x + w / 2, y + h / 2, 18, '#ffffff');
}

function drawScore() {
  drawOutlinedText(String(score), WIDTH / 2, 50, 32, '#ffffff');
}

function drawStartScreen() {
  drawOutlinedText('Flappy Bird', WIDTH / 2, 140, 28, '#fbd93a');
  drawButton(WIDTH / 2 - 70, 260, 140, 44, 'START');
}

function drawReadyScreen() {
  drawScore();
  drawOutlinedText('Get Ready', WIDTH / 2, 140, 26, '#fbd93a');
  drawOutlinedText('TAP', WIDTH / 2, 220, 18, '#ffffff');
}

function drawGameOverScreen() {
  drawOutlinedText('Game Over', WIDTH / 2, 140, 26, '#fbd93a');

  const panelW = 220;
  const panelH = 100;
  const panelX = WIDTH / 2 - panelW / 2;
  const panelY = 190;
  ctx.fillStyle = '#ded895';
  ctx.strokeStyle = '#4a3b1e';
  ctx.lineWidth = 3;
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#4a3b1e';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCORE', panelX + 20, panelY + 35);
  ctx.textAlign = 'right';
  ctx.fillText(String(score), panelX + panelW - 20, panelY + 35);

  drawButton(WIDTH / 2 - 70, panelY + panelH + 30, 140, 40, 'RESTART');
}

function render() {
  drawBackground();
  drawPipes();
  drawGround();
  drawBird();

  if (state === STATE.START) {
    drawStartScreen();
  } else if (state === STATE.READY) {
    drawReadyScreen();
  } else if (state === STATE.PLAY) {
    drawScore();
  } else if (state === STATE.GAMEOVER) {
    drawGameOverScreen();
  }
}

function update() {
  updateWingAnimation();

  if (state === STATE.START) {
    idleTimer++;
    bird.y = 190 + Math.sin(idleTimer / 15) * 8;
  } else if (state === STATE.READY) {
    bird.y = HEIGHT / 2 + Math.sin(frameCount / 10) * 6;
    frameCount++;
  } else if (state === STATE.PLAY) {
    updatePlay();
  } else if (state === STATE.GAMEOVER) {
    gameOverTimer++;
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
