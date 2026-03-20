import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 280;
const H = 180;
const COLS = 8;
const ROWS = 5;
const BUBBLE_R = 14;
const COLORS = ["#ff4444", "#4488ff", "#44cc44", "#ffff44", "#ff88ff"];

type Bubble = { color: string } | null;
type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
} | null;
type Phase = "bet" | "playing" | "result";

export default function PuzzleBobbleGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({
    running: false,
    grid: [] as Bubble[][],
    projectile: null as Projectile,
    nextColor: COLORS[0],
    angle: 90,
    shotsLeft: 20,
    startTime: 0,
    tick: 0,
  });
  const animRef = useRef<number | null>(null);

  const initGrid = useCallback(() => {
    const grid: Bubble[][] = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = {
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
      }
    }
    return grid;
  }, []);

  const getBubblePos = useCallback(
    (row: number, col: number) => ({
      x: 20 + col * BUBBLE_R * 2 + (row % 2 === 1 ? BUBBLE_R : 0),
      y: 25 + row * BUBBLE_R * 1.7,
    }),
    [],
  );

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
          gameType: GameType.puzzleBobble,
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

  const popMatches = useCallback(
    (grid: Bubble[][], row: number, col: number, color: string) => {
      const visited = new Set<string>();
      const toRemove: [number, number][] = [];
      const dfs = (r: number, c: number) => {
        const key = `${r},${c}`;
        if (visited.has(key)) return;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        if (!grid[r][c] || grid[r][c]!.color !== color) return;
        visited.add(key);
        toRemove.push([r, c]);
        const neighbors =
          r % 2 === 0
            ? [
                [-1, -1],
                [-1, 0],
                [0, -1],
                [0, 1],
                [1, -1],
                [1, 0],
              ]
            : [
                [-1, 0],
                [-1, 1],
                [0, -1],
                [0, 1],
                [1, 0],
                [1, 1],
              ];
        for (const [dr, dc] of neighbors) dfs(r + dr, c + dc);
      };
      dfs(row, col);
      if (toRemove.length >= 3) {
        for (const [r, c] of toRemove) grid[r][c] = null;
        return toRemove.length;
      }
      return 0;
    },
    [],
  );

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0a2e");
    bg.addColorStop(1, "#1a0a3a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 15; i++) {
      ctx.fillRect((i * 67 + 13) % W, (i * 43) % (H * 0.4), 1.5, 1.5);
    }

    // Grid bubbles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = g.grid[r]?.[c];
        if (!b) continue;
        const { x, y } = getBubblePos(r, c);
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 1, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Shine
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fill();
      }
    }

    // Projectile
    if (g.projectile) {
      ctx.beginPath();
      ctx.arc(g.projectile.x, g.projectile.y, BUBBLE_R - 1, 0, Math.PI * 2);
      ctx.fillStyle = g.projectile.color;
      ctx.shadowColor = g.projectile.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Launcher
    const launcherX = W / 2;
    const launcherY = H - 15;
    const rad = ((g.angle - 90) * Math.PI) / 180;
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(launcherX, launcherY);
    ctx.lineTo(launcherX + Math.cos(rad) * 30, launcherY + Math.sin(rad) * 30);
    ctx.stroke();
    // Aim dotted line
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(launcherX, launcherY);
    ctx.lineTo(launcherX + Math.cos(rad) * 80, launcherY + Math.sin(rad) * 80);
    ctx.stroke();
    ctx.setLineDash([]);
    // Next bubble preview
    ctx.beginPath();
    ctx.arc(launcherX, launcherY, BUBBLE_R - 1, 0, Math.PI * 2);
    ctx.fillStyle = g.nextColor;
    ctx.shadowColor = g.nextColor;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, H - 15, W, 15);
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SHOTS: ${g.shotsLeft}`, 5, H - 4);
    ctx.textAlign = "center";
    ctx.fillStyle = "#44ff88";
    ctx.fillText("◀ AIM ▶  SPACE=FIRE", W / 2, H - 4);
  }, [getBubblePos]);

  const shoot = useCallback(() => {
    const g = gameRef.current;
    if (g.projectile || g.shotsLeft <= 0) return;
    const rad = ((g.angle - 90) * Math.PI) / 180;
    g.projectile = {
      x: W / 2,
      y: H - 15,
      vx: Math.cos(rad) * 7,
      vy: Math.sin(rad) * 7,
      color: g.nextColor,
    };
    g.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    g.shotsLeft--;
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameRef.current.running) return;
    const g = gameRef.current;
    g.tick++;

    if (g.projectile) {
      g.projectile.x += g.projectile.vx;
      g.projectile.y += g.projectile.vy;
      // Wall bounce
      if (g.projectile.x < BUBBLE_R || g.projectile.x > W - BUBBLE_R)
        g.projectile.vx *= -1;
      // Top wall or grid hit
      let hit = g.projectile.y < BUBBLE_R + 10;
      let hitRow = -1;
      if (!hit) {
        for (let r = 0; r < ROWS && !hit; r++) {
          for (let c = 0; c < COLS && !hit; c++) {
            if (!g.grid[r]?.[c]) continue;
            const { x, y } = getBubblePos(r, c);
            const dx = g.projectile.x - x;
            const dy = g.projectile.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < BUBBLE_R * 2 - 2) {
              hit = true;
              hitRow = r;
            }
          }
        }
      }
      if (hit) {
        // Place bubble
        let placed = false;
        if (hitRow >= 0) {
          // Try to snap to nearby empty
          const nearRow = hitRow > 0 ? hitRow - 1 : 0;
          for (let c = 0; c < COLS && !placed; c++) {
            if (!g.grid[nearRow]?.[c]) {
              g.grid[nearRow][c] = { color: g.projectile.color };
              placed = true;
              popMatches(g.grid, nearRow, c, g.projectile.color);
            }
          }
        }
        if (!placed) {
          g.grid[0][0] = { color: g.projectile.color };
        }
        g.projectile = null;
        // Check win: all grid empty
        const remaining = g.grid.flat().filter(Boolean).length;
        if (remaining === 0) {
          endGame(true);
          return;
        }
        if (g.shotsLeft <= 0) {
          endGame(false);
          return;
        }
      }
      // Bottom miss
      if (g.projectile && g.projectile.y > H) {
        g.projectile = null;
        if (g.shotsLeft <= 0) {
          endGame(false);
          return;
        }
      }
    }

    drawGame();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawGame, endGame, getBubblePos, popMatches]);

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    gameRef.current = {
      running: true,
      grid: initGrid(),
      projectile: null,
      nextColor: COLORS[Math.floor(Math.random() * COLORS.length)],
      angle: 90,
      shotsLeft: 20,
      startTime: Date.now(),
      tick: 0,
    };
    setPhase("playing");
    animRef.current = requestAnimationFrame(gameLoop);
  }, [betNum, balance, gameLoop, initGrid]);

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.key === "ArrowLeft" || e.key === "a")
        g.angle = Math.max(30, g.angle - 4);
      if (e.key === "ArrowRight" || e.key === "d")
        g.angle = Math.min(150, g.angle + 4);
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [phase, shoot]);

  useEffect(
    () => () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  return (
    <ArcadeCabinet title="PUZZLE BOBBLE" color="#ff88ff">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ff88ff", textShadow: "0 0 10px #ff88ff" }}
            >
              POP BUBBLES!
            </div>
            <div className="text-sm opacity-70 mt-1">
              Aim with ←/→, fire with Space. Match 3+ of the same color to
              clear. Empty the board to win 2×!
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
                    ? {
                        background: "#ff88ff",
                        borderColor: "#ff88ff",
                        color: "#000",
                      }
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-pink-400"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #ff88ff, #cc22cc)",
              color: "#000",
              boxShadow: "0 0 20px #ff88ff50",
            }}
          >
            🫧 PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}
      {phase === "playing" && (
        <div>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
          />
          <div className="flex justify-center gap-3 pb-2 mt-2">
            <button
              type="button"
              onClick={() => {
                gameRef.current.angle = Math.max(30, gameRef.current.angle - 8);
              }}
              style={{
                width: 70,
                height: 44,
                background: "#ff88ff11",
                border: "2px solid #ff88ff",
                borderRadius: 8,
                color: "#ff88ff",
                fontSize: 18,
              }}
            >
              ◀ AIM
            </button>
            <button
              type="button"
              onClick={shoot}
              style={{
                width: 80,
                height: 44,
                background: "#ff88ff33",
                border: "2px solid #ff88ff",
                borderRadius: 8,
                color: "#ff88ff",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              FIRE!
            </button>
            <button
              type="button"
              onClick={() => {
                gameRef.current.angle = Math.min(
                  150,
                  gameRef.current.angle + 8,
                );
              }}
              style={{
                width: 70,
                height: 44,
                background: "#ff88ff11",
                border: "2px solid #ff88ff",
                borderRadius: 8,
                color: "#ff88ff",
                fontSize: 18,
              }}
            >
              AIM ▶
            </button>
          </div>
        </div>
      )}
      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🎉" : "😢"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ff88ff" : "#ff4444" }}
          >
            {won ? "CLEARED!" : "OUT OF SHOTS!"}
          </div>
          {won && (
            <div style={{ color: "#ff88ff" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button
              onClick={onGameComplete}
              style={{ background: "#ff88ff", color: "#000" }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
