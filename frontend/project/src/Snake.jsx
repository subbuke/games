import { useEffect, useRef, useState, useCallback } from "react";

const COLS = 21, ROWS = 21, CELL = 20, TICK = 300;

function rnd(n) { return Math.floor(Math.random() * n); }

function placeFood(snake) {
  let p;
  do { p = { x: rnd(COLS), y: rnd(ROWS) }; }
  while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

export default function Snake() {
  const canvasRef = useRef(null);
  const game = useRef({
    snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 15, y: 10 },
    status: "idle",
    score: 0,
  });
  const timerRef = useRef(null);
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(0);
  const [status, setStatus] = useState("idle");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const g = game.current;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(canvas.width, y * CELL); ctx.stroke();
    }

    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    g.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#4ade80" : `hsl(${140 - i * 2}, 70%, ${45 - i * 0.3}%)`;
      ctx.beginPath();
      ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 7 : 5);
      ctx.fill();
    });

    if (g.status === "over" || g.status === "idle" || g.status === "paused") {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.fillStyle = g.status === "over" ? "#f87171" : "#4ade80";
      ctx.font = "bold 22px monospace";
      ctx.fillText(g.status === "over" ? "GAME OVER" : g.status === "paused" ? "PAUSED" : "SNAKE", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = "#9ca3af";
      ctx.font = "13px monospace";
      ctx.fillText(g.status === "over" ? `Score: ${g.score}` : "Press Start", canvas.width / 2, canvas.height / 2 + 16);
    }
  }, []);

  const tick = useCallback(() => {
    const g = game.current;
    if (g.status !== "running") return;
    g.dir = g.nextDir;
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };

    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || g.snake.some(s => s.x === head.x && s.y === head.y)) {
      g.status = "over";
      setStatus("over");
      draw();
      return;
    }

    g.snake.unshift(head);
    if (head.x === g.food.x && head.y === g.food.y) {
      g.score++;
      setScore(g.score);
      setHi(h => Math.max(h, g.score));
      g.food = placeFood(g.snake);
    } else {
      g.snake.pop();
    }
    draw();
  }, [draw]);

  const start = useCallback(() => {
    const g = game.current;
    if (g.status === "idle" || g.status === "over") {
      g.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      g.dir = { x: 1, y: 0 };
      g.nextDir = { x: 1, y: 0 };
      g.food = placeFood(g.snake);
      g.score = 0;
      setScore(0);
    }
    g.status = "running";
    setStatus("running");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(tick, TICK);
    draw();
  }, [tick, draw]);

  const pause = useCallback(() => {
    const g = game.current;
    if (g.status === "running") {
      g.status = "paused";
      setStatus("paused");
    } else if (g.status === "paused") {
      g.status = "running";
      setStatus("running");
    }
    draw();
  }, [draw]);

  useEffect(() => {
    game.current.food = placeFood(game.current.snake);
    draw();

    const handleKey = (e) => {
      const dirs = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        KeyW: { x: 0, y: -1 }, KeyS: { x: 0, y: 1 },
        KeyA: { x: -1, y: 0 }, KeyD: { x: 1, y: 0 },
      };
      if (e.code === "KeyP") { pause(); return; }
      const d = dirs[e.code];
      if (d) {
        e.preventDefault();
        const g = game.current;
        if (d.x !== -g.dir.x || d.y !== -g.dir.y) g.nextDir = d;
        if (g.status === "idle" || g.status === "over") start();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [draw, pause, start]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem" }}>
      <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem", fontSize: 14 }}>
        <span>Score: <strong>{score}</strong></span>
        <span>Best: <strong>{hi}</strong></span>
        <span style={{ color: "#6b7280" }}>{status === "running" ? "Running" : status === "paused" ? "Paused" : status === "over" ? "Game Over" : "Ready"}</span>
      </div>
      <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} style={{ border: "1px solid #333", borderRadius: 8 }} />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button onClick={start}>▶ Start</button>
        <button onClick={pause}>⏸ Pause</button>
        <button onClick={() => { game.current.status = "idle"; setStatus("idle"); if (timerRef.current) clearInterval(timerRef.current); draw(); }}>↺ Reset</button>
      </div>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: "0.5rem" }}>Arrow keys or WASD to move · P to pause</p>
    </div>
  );
}