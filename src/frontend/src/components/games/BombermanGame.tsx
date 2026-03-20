import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const COLS = 13;
const ROWS = 11;
const CELL = 22;
const W = COLS * CELL;
const H = ROWS * CELL;
const BOMB_TIMER = 180; // ticks
const BLAST_RADIUS = 2;
const WIN_ENEMIES = 3;

type Phase = "bet" | "playing" | "result";
type TileType = "empty" | "wall" | "block";

interface Bomb {
  id: number;
  x: number;
  y: number;
  timer: number;
}

interface Blast {
  id: number;
  tiles: { x: number; y: number }[];
  timer: number;
}

interface BEnemy {
  id: number;
  x: number;
  y: number;
  dir: { x: number; y: number };
  dead: boolean;
}

function buildGrid(): TileType[][] {
  const g: TileType[][] = [];
  for (let r = 0; r < ROWS; r++) {
    g[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1)
        g[r][c] = "wall";
      else if (r % 2 === 0 && c % 2 === 0) g[r][c] = "wall";
      else if ((r <= 2 && c <= 2) || (r >= ROWS - 3 && c >= COLS - 3))
        g[r][c] = "empty"; // safe spawn
      else g[r][c] = Math.random() < 0.4 ? "block" : "empty";
    }
  }
  return g;
}

export default function BombermanGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [enemiesLeft, setEnemiesLeft] = useState(WIN_ENEMIES);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    running: boolean;
    player: { x: number; y: number };
    grid: TileType[][];
    bombs: Bomb[];
    blasts: Blast[];
    enemies: BEnemy[];
    tick: number;
    bId: number;
    blastId: number;
    eId: number;
    alive: boolean;
  }>({
    running: false,
    player: { x: 1, y: 1 },
    grid: [],
    bombs: [],
    blasts: [],
    enemies: [],
    tick: 0,
    bId: 0,
    blastId: 0,
    eId: 0,
    alive: true,
  });
  const animRef = useRef<number | null>(null);

  const endGame = useCallback(
    async (didWin: boolean) => {
      if (!gameRef.current.running) return;
      gameRef.current.running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.bomberman,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
      } catch (e) {
        console.error(e);
      }
      setPhase("result");
    },
    [betNum, recordOutcome],
  );

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    ctx.fillStyle = "#0a0010";
    ctx.fillRect(0, 0, W, H);

    // Draw grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        const tile = g.grid[r]?.[c];
        if (tile === "wall") {
          ctx.fillStyle = "#330066";
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = "#660099";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
          // Neon glow edge
          ctx.shadowColor = "#9900ff";
          ctx.shadowBlur = 4;
          ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
          ctx.shadowBlur = 0;
        } else if (tile === "block") {
          ctx.fillStyle = "#554400";
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = "#887700";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
          // Brick lines
          ctx.strokeStyle = "#443300";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y + CELL / 2);
          ctx.lineTo(x + CELL, y + CELL / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + CELL / 2, y);
          ctx.lineTo(x + CELL / 2, y + CELL);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#050008";
          ctx.fillRect(x, y, CELL, CELL);
          // Subtle grid lines
          ctx.strokeStyle = "#1a0030";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL, CELL);
        }
      }
    }

    // Draw blasts
    for (const blast of g.blasts) {
      for (const t of blast.tiles) {
        ctx.fillStyle = `rgba(255, 100, 0, ${blast.timer / 40})`;
        ctx.shadowColor = "#ff6600";
        ctx.shadowBlur = 10;
        ctx.fillRect(t.x * CELL + 2, t.y * CELL + 2, CELL - 4, CELL - 4);
        ctx.shadowBlur = 0;
      }
    }

    // Draw bombs
    for (const b of g.bombs) {
      const pulse = Math.sin(g.tick * 0.2) * 0.2 + 0.8;
      ctx.font = `${14 * pulse}px serif`;
      ctx.textAlign = "center";
      ctx.fillText("💣", b.x * CELL + CELL / 2, b.y * CELL + CELL - 2);
    }

    // Draw enemies
    for (const e of g.enemies) {
      if (e.dead) continue;
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.fillText("👾", e.x * CELL + CELL / 2, e.y * CELL + CELL - 2);
    }

    // Draw player
    if (g.alive) {
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "😄",
        g.player.x * CELL + CELL / 2,
        g.player.y * CELL + CELL - 2,
      );
    } else {
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "💀",
        g.player.x * CELL + CELL / 2,
        g.player.y * CELL + CELL - 2,
      );
    }
  }, []);

  const placeBomb = useCallback(() => {
    const g = gameRef.current;
    if (!g.running || !g.alive) return;
    if (g.bombs.some((b) => b.x === g.player.x && b.y === g.player.y)) return;
    g.bombs.push({
      id: g.bId++,
      x: g.player.x,
      y: g.player.y,
      timer: BOMB_TIMER,
    });
  }, []);

  const movePlayer = useCallback((dx: number, dy: number) => {
    const g = gameRef.current;
    if (!g.running || !g.alive) return;
    const nx = g.player.x + dx;
    const ny = g.player.y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    const tile = g.grid[ny]?.[nx];
    if (tile === "wall" || tile === "block") return;
    if (g.bombs.some((b) => b.x === nx && b.y === ny)) return;
    g.player.x = nx;
    g.player.y = ny;
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameRef.current.running) return;
    const g = gameRef.current;
    g.tick++;

    // Update bombs
    for (const bomb of g.bombs) {
      bomb.timer--;
      if (bomb.timer <= 0) {
        // Explode
        const tiles: { x: number; y: number }[] = [{ x: bomb.x, y: bomb.y }];
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          for (let r = 1; r <= BLAST_RADIUS; r++) {
            const tx = bomb.x + dx * r;
            const ty = bomb.y + dy * r;
            if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) break;
            const tile = g.grid[ty]?.[tx];
            if (tile === "wall") break;
            tiles.push({ x: tx, y: ty });
            if (tile === "block") {
              g.grid[ty][tx] = "empty";
              break;
            }
          }
        }
        g.blasts.push({ id: g.blastId++, tiles, timer: 40 });
        // Check player in blast
        if (
          g.alive &&
          tiles.some((t) => t.x === g.player.x && t.y === g.player.y)
        ) {
          g.alive = false;
          setTimeout(() => endGame(false), 500);
        }
        // Check enemies in blast
        for (const e of g.enemies) {
          if (!e.dead && tiles.some((t) => t.x === e.x && t.y === e.y)) {
            e.dead = true;
            const remaining = g.enemies.filter((en) => !en.dead).length;
            setEnemiesLeft(remaining);
            if (remaining === 0) {
              endGame(true);
              return;
            }
          }
        }
      }
    }
    g.bombs = g.bombs.filter((b) => b.timer > 0);

    // Update blasts
    g.blasts = g.blasts
      .map((b) => ({ ...b, timer: b.timer - 1 }))
      .filter((b) => b.timer > 0);

    // Move enemies
    if (g.tick % 40 === 0) {
      for (const e of g.enemies) {
        if (e.dead) continue;
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];
        const valid = dirs.filter((d) => {
          const nx = e.x + d.x;
          const ny = e.y + d.y;
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
          const t = g.grid[ny]?.[nx];
          return t === "empty";
        });
        if (valid.length > 0) {
          const d = valid[Math.floor(Math.random() * valid.length)];
          e.x += d.x;
          e.y += d.y;
        }
        // Enemy touches player
        if (g.alive && e.x === g.player.x && e.y === g.player.y) {
          g.alive = false;
          setTimeout(() => endGame(false), 500);
        }
      }
    }

    drawGame();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawGame, endGame]);

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    const grid = buildGrid();
    const enemies: BEnemy[] = [
      { id: 0, x: COLS - 2, y: 1, dir: { x: -1, y: 0 }, dead: false },
      { id: 1, x: 1, y: ROWS - 2, dir: { x: 1, y: 0 }, dead: false },
      { id: 2, x: COLS - 2, y: ROWS - 2, dir: { x: -1, y: 0 }, dead: false },
    ];
    gameRef.current = {
      running: true,
      player: { x: 1, y: 1 },
      grid,
      bombs: [],
      blasts: [],
      enemies,
      tick: 0,
      bId: 0,
      blastId: 0,
      eId: 3,
      alive: true,
    };
    setEnemiesLeft(WIN_ENEMIES);
    setPhase("playing");
    animRef.current = requestAnimationFrame(gameLoop);
  }, [betNum, balance, gameLoop]);

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        movePlayer(0, -1);
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        movePlayer(0, 1);
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        movePlayer(-1, 0);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        movePlayer(1, 0);
      } else if (e.key === " ") {
        e.preventDefault();
        placeBomb();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, movePlayer, placeBomb]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <ArcadeCabinet title="BOMBERMAN" color="#cc44ff">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#cc44ff", textShadow: "0 0 10px #cc44ff" }}
            >
              BOMB THE MAZE!
            </div>
            <div className="text-sm opacity-70 mt-1">
              Clear all 3 enemies with bombs to win 2×. Arrow keys + Space to
              bomb.
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK_BETS.map((b) => (
              <Button
                key={b}
                size="sm"
                variant={bet === String(b) ? "default" : "outline"}
                onClick={() => setBet(String(b))}
                style={
                  bet === String(b)
                    ? { background: "#cc44ff", borderColor: "#cc44ff" }
                    : {}
                }
              >
                {b}
              </Button>
            ))}
          </div>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-purple-400"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #cc44ff, #8800cc)",
              boxShadow: "0 0 20px #cc44ff50",
            }}
          >
            💣 PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div>
          <div className="flex justify-between px-3 py-1 text-xs font-bold">
            <span style={{ color: "#cc44ff" }}>👾 {enemiesLeft} LEFT</span>
            <span style={{ color: "#ffaa00" }}>SPACE = BOMB</span>
          </div>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
          />
          <div className="flex flex-col items-center gap-1 pb-2 mt-1">
            <button
              type="button"
              onClick={() => movePlayer(0, -1)}
              style={{
                width: 36,
                height: 36,
                background: "#cc44ff22",
                border: "1px solid #cc44ff",
                borderRadius: 6,
                color: "#cc44ff",
                fontSize: 16,
              }}
            >
              ↑
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => movePlayer(-1, 0)}
                style={{
                  width: 36,
                  height: 36,
                  background: "#cc44ff22",
                  border: "1px solid #cc44ff",
                  borderRadius: 6,
                  color: "#cc44ff",
                  fontSize: 16,
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => movePlayer(0, 1)}
                style={{
                  width: 36,
                  height: 36,
                  background: "#cc44ff22",
                  border: "1px solid #cc44ff",
                  borderRadius: 6,
                  color: "#cc44ff",
                  fontSize: 16,
                }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => movePlayer(1, 0)}
                style={{
                  width: 36,
                  height: 36,
                  background: "#cc44ff22",
                  border: "1px solid #cc44ff",
                  borderRadius: 6,
                  color: "#cc44ff",
                  fontSize: 16,
                }}
              >
                →
              </button>
            </div>
            <button
              type="button"
              onClick={placeBomb}
              style={{
                width: 80,
                height: 36,
                background: "#ff440044",
                border: "2px solid #cc44ff",
                borderRadius: 6,
                color: "#cc44ff",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >
              💣 BOMB
            </button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "💣" : "💀"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ffcc00" : "#ff4444" }}
          >
            {won ? "BLASTED THEM ALL!" : "GAME OVER"}
          </div>
          {won && (
            <div style={{ color: "#cc44ff" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button onClick={onGameComplete} style={{ background: "#cc44ff" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
