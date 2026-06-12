#!/usr/bin/env node

// ╔══════════════════════════════════════╗
// ║        SNAKE GAME — Node.js          ║
// ║   Terminal-based, no dependencies    ║
// ╚══════════════════════════════════════╝

const readline = require("readline");

// ── Configuration ──────────────────────────────────────────────
const WIDTH = 30;
const HEIGHT = 20;
const TICK_MS = 130;

// Symbols
const SYM_HEAD  = "●";
const SYM_BODY  = "○";
const SYM_FOOD  = "★";
const SYM_EMPTY = " ";

// ANSI helpers
const ESC        = "\x1b[";
const RESET      = "\x1b[0m";
const BOLD       = "\x1b[1m";
const hide_cursor = "\x1b[?25l";
const show_cursor = "\x1b[?25h";
const clear_screen = "\x1b[2J\x1b[H";

const color = (code) => `\x1b[${code}m`;
const GREEN   = color("32");
const BRIGHT_GREEN = color("92");
const YELLOW  = color("93");
const CYAN    = color("96");
const RED     = color("91");
const GRAY    = color("90");
const WHITE   = color("97");
const BG_BLACK = color("40");

// ── State ───────────────────────────────────────────────────────
let snake, direction, nextDirection, food, score, highScore, gameOver, paused;

function randomPos() {
  return {
    x: Math.floor(Math.random() * WIDTH),
    y: Math.floor(Math.random() * HEIGHT),
  };
}

function placeFood() {
  let pos;
  do {
    pos = randomPos();
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function init() {
  snake = [
    { x: 14, y: 10 },
    { x: 13, y: 10 },
    { x: 12, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  paused = false;
  placeFood();
}

// ── Rendering ───────────────────────────────────────────────────
function moveTo(row, col) {
  return `${ESC}${row};${col}H`;
}

function drawBorder() {
  const top    = "╔" + "═".repeat(WIDTH * 2) + "╗";
  const bottom = "╚" + "═".repeat(WIDTH * 2) + "╝";
  process.stdout.write(moveTo(1, 1) + CYAN + BOLD + top + RESET);
  for (let r = 0; r < HEIGHT; r++) {
    process.stdout.write(moveTo(r + 2, 1) + CYAN + BOLD + "║" + RESET);
    process.stdout.write(moveTo(r + 2, WIDTH * 2 + 2) + CYAN + BOLD + "║" + RESET);
  }
  process.stdout.write(moveTo(HEIGHT + 2, 1) + CYAN + BOLD + bottom + RESET);
}

function drawCell(x, y, char, clr) {
  // Each cell is 2 chars wide for a squarish look
  const col = x * 2 + 2;
  const row = y + 2;
  process.stdout.write(moveTo(row, col) + clr + BOLD + char + " " + RESET);
}

function drawHUD() {
  const row = HEIGHT + 3;
  process.stdout.write(moveTo(row, 1));
  process.stdout.write(
    WHITE + BOLD +
    ` Score: ${YELLOW}${score}${WHITE}   ` +
    `High Score: ${YELLOW}${highScore}${WHITE}   ` +
    GRAY + "[← ↑ → ↓] Move  [P] Pause  [R] Restart  [Q] Quit" +
    RESET
  );
}

function draw() {
  // Clear board area
  for (let r = 0; r < HEIGHT; r++) {
    for (let c = 0; c < WIDTH; c++) {
      drawCell(c, r, SYM_EMPTY, "");
    }
  }

  // Food
  drawCell(food.x, food.y, SYM_FOOD, YELLOW);

  // Snake body
  for (let i = snake.length - 1; i >= 1; i--) {
    drawCell(snake[i].x, snake[i].y, SYM_BODY, GREEN);
  }

  // Snake head
  drawCell(snake[0].x, snake[0].y, SYM_HEAD, BRIGHT_GREEN);

  drawHUD();

  if (paused) {
    const msg = "  ⏸  PAUSED — Press P to resume  ";
    const col = Math.floor((WIDTH * 2 - msg.length) / 2) + 2;
    process.stdout.write(
      moveTo(Math.floor(HEIGHT / 2) + 2, col) +
      CYAN + BOLD + msg + RESET
    );
  }

  if (gameOver) {
    const lines = [
      "  ╔══════════════════════╗  ",
      "  ║      GAME  OVER      ║  ",
      `  ║   Score: ${String(score).padEnd(4)}          ║  `,
      "  ║  Press R to restart  ║  ",
      "  ║  Press Q to quit     ║  ",
      "  ╚══════════════════════╝  ",
    ];
    const startRow = Math.floor((HEIGHT - lines.length) / 2) + 2;
    lines.forEach((line, i) => {
      const col = Math.floor((WIDTH * 2 - line.length) / 2) + 2;
      process.stdout.write(
        moveTo(startRow + i, col) + RED + BOLD + line + RESET
      );
    });
  }
}

// ── Game Logic ──────────────────────────────────────────────────
function tick() {
  if (gameOver || paused) return;

  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  // Wall collision
  if (head.x < 0 || head.x >= WIDTH || head.y < 0 || head.y >= HEIGHT) {
    endGame();
    return;
  }

  // Self collision
  if (snake.some((s) => s.x === head.x && s.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    if (score > highScore) highScore = score;
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  gameOver = true;
  draw();
}

// ── Input ────────────────────────────────────────────────────────
function setupInput() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  process.stdin.on("keypress", (_, key) => {
    if (!key) return;

    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      cleanup();
      process.exit(0);
    }

    if (key.name === "r") {
      init();
      drawBorder();
      draw();
      return;
    }

    if (key.name === "p") {
      paused = !paused;
      draw();
      return;
    }

    if (gameOver || paused) return;

    const dirs = {
      up:    { x: 0,  y: -1 },
      down:  { x: 0,  y:  1 },
      left:  { x: -1, y:  0 },
      right: { x: 1,  y:  0 },
    };

    const d = dirs[key.name];
    if (d) {
      // Prevent 180° reversal
      if (d.x !== -direction.x || d.y !== -direction.y) {
        nextDirection = d;
      }
    }
  });
}

// ── Cleanup ──────────────────────────────────────────────────────
function cleanup() {
  process.stdout.write(show_cursor);
  process.stdout.write(clear_screen);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(); });

// ── Bootstrap ────────────────────────────────────────────────────
function main() {
  highScore = 0;
  process.stdout.write(hide_cursor);
  process.stdout.write(clear_screen);

  // Title screen
  const title = [
    "",
    "  ███████╗███╗   ██╗ █████╗ ██╗  ██╗███████╗",
    "  ██╔════╝████╗  ██║██╔══██╗██║ ██╔╝██╔════╝",
    "  ███████╗██╔██╗ ██║███████║█████╔╝ █████╗  ",
    "  ╚════██║██║╚██╗██║██╔══██║██╔═██╗ ██╔══╝  ",
    "  ███████║██║ ╚████║██║  ██║██║  ██╗███████╗",
    "  ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝",
    "",
    `  ${GRAY}Use arrow keys to move  |  P = pause  |  Q = quit${GREEN}`,
    "",
    `  ${YELLOW}Press any arrow key to start...${GREEN}`,
  ];

  title.forEach((line, i) => {
    process.stdout.write(moveTo(i + 3, 1) + GREEN + BOLD + line + RESET + "\n");
  });

  // Wait for first keypress to start
  const startListener = (_, key) => {
    if (!key) return;
    if (["up","down","left","right"].includes(key.name) || key.name === "r") {
      process.stdin.removeListener("keypress", startListener);
      process.stdout.write(clear_screen);
      init();
      drawBorder();
      draw();
      setInterval(tick, TICK_MS);
    }
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      cleanup();
      process.exit(0);
    }
  };

  process.stdin.on("keypress", startListener);
  setupInput();
}

main();
