import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 280;
const H = 220;
const TILE = 14;
const COLS = Math.floor(W / TILE);

const INGREDIENTS = ["🥬", "🍔", "🧀", "🍅"];
const FLOORS = [2, 5, 9, 13];

type Phase = "bet" | "playing" | "result";

interface Enemy {
  id: number;
  x: number;
  y: number;
  dir: number;
  floor: number;
  stunned: number;
}

interface Ingredient {
  col: number;
  floor: number;
  type: string;
  dropped: number; // 0=on floor, >0 = falling
  done: boolean;
}

export default function BurgerTimeGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [_lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    running: boolean;
    player: { x: number; y: number; floor: number };
    enemies: Enemy[];
    ingredients: Ingredient[];
    lives: number;
    score: number;
    completedBurgers: number;
    pepper: number;
    eid: number;
    tick: number;
  }>({
    running: false,
    player: { x: 4, y: FLOORS[0], floor: 0 },
    enemies: [],
    ingredients: [],
    lives: 3,
    score: 0,
    completedBurgers: 0,
    pepper: 3,
    eid: 0,
    tick: 0,
  });
  const animRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

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
          gameType: GameType.burgerTime,
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

    // Background - kitchen look
    ctx.fillStyle = "#1a0a00";
    ctx.fillRect(0, 0, W, H);

    // Draw floors
    for (const f of FLOORS) {
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(0, f * TILE, W, 3);
      // Floor planks
      ctx.strokeStyle = "#5D2E0C";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, f * TILE);
        ctx.lineTo(x, f * TILE + 3);
        ctx.stroke();
      }
    }

    // Draw ladders
    for (let f = 0; f < FLOORS.length - 1; f++) {
      const lx = (COLS / 2) * TILE;
      const y1 = FLOORS[f] * TILE;
      const y2 = FLOORS[f + 1] * TILE;
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx - 4, y1);
      ctx.lineTo(lx - 4, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx + 4, y1);
      ctx.lineTo(lx + 4, y2);
      ctx.stroke();
      for (let ry = y1; ry < y2; ry += 8) {
        ctx.beginPath();
        ctx.moveTo(lx - 4, ry);
        ctx.lineTo(lx + 4, ry);
        ctx.stroke();
      }
    }

    // Draw ingredients
    for (const ing of g.ingredients) {
      if (ing.done) continue;
      const iy = (ing.floor + ing.dropped / 8) * TILE - TILE;
      ctx.font = `${TILE}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(ing.type, ing.col * TILE + TILE / 2, iy + TILE - 1);
    }

    // Draw enemies
    for (const e of g.enemies) {
      const ex = e.x * TILE;
      const ey = FLOORS[e.floor] * TILE - TILE;
      ctx.font = "13px serif";
      ctx.textAlign = "center";
      if (e.stunned > 0) {
        ctx.globalAlpha = 0.5;
      }
      ctx.fillText("🌭", ex + TILE / 2, ey + TILE - 1);
      ctx.globalAlpha = 1;
    }

    // Draw player (chef)
    const px = g.player.x * TILE;
    const py = FLOORS[g.player.floor] * TILE - TILE;
    ctx.font = "14px serif";
    ctx.textAlign = "center";
    ctx.fillText("👨‍🍳", px + TILE / 2, py + TILE - 1);

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, 14);
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${g.score}`, 4, 11);
    ctx.textAlign = "center";
    ctx.fillText("❤️".repeat(g.lives), W / 2, 11);
    ctx.textAlign = "right";
    ctx.fillText(`🍔 ${g.completedBurgers}/1`, W - 4, 11);
  }, []);

  const gameLoop = useCallback(
    (_timestamp: number) => {
      if (!gameRef.current.running) return;
      const g = gameRef.current;
      g.tick++;

      // Player movement
      if (g.tick % 6 === 0) {
        if (keysRef.current.has("ArrowLeft") && g.player.x > 0) g.player.x--;
        if (keysRef.current.has("ArrowRight") && g.player.x < COLS - 2)
          g.player.x++;
        if (keysRef.current.has("ArrowUp") && g.player.floor > 0)
          g.player.floor--;
        if (
          keysRef.current.has("ArrowDown") &&
          g.player.floor < FLOORS.length - 1
        )
          g.player.floor++;
      }

      // Ingredient collision
      for (const ing of g.ingredients) {
        if (ing.done) continue;
        if (
          ing.floor === g.player.floor &&
          Math.abs(ing.col - g.player.x) <= 1
        ) {
          ing.dropped = Math.min(ing.dropped + 1, 8);
          if (ing.dropped >= 8) {
            ing.done = true;
            g.completedBurgers++;
            g.score += 50;
            setScore(g.score);
            if (g.completedBurgers >= 1) {
              endGame(true);
              return;
            }
          }
        }
      }

      // Enemy spawning
      if (g.tick % 120 === 0 && g.enemies.length < 4) {
        const eid = g.eid++;
        g.enemies.push({
          id: eid,
          x: COLS - 2,
          y: FLOORS[0],
          dir: -1,
          floor: 0,
          stunned: 0,
        });
      }

      // Enemy movement
      if (g.tick % 20 === 0) {
        for (const e of g.enemies) {
          if (e.stunned > 0) {
            e.stunned--;
            continue;
          }
          e.x += e.dir;
          if (e.x <= 0 || e.x >= COLS - 2) {
            e.dir *= -1;
            if (e.floor < FLOORS.length - 1 && Math.random() < 0.3) e.floor++;
            else if (e.floor > 0 && Math.random() < 0.3) e.floor--;
          }
          // Check player collision
          if (e.floor === g.player.floor && Math.abs(e.x - g.player.x) < 1) {
            g.lives--;
            setLives(g.lives);
            g.player.x = 4;
            g.player.floor = 0;
            if (g.lives <= 0) {
              endGame(false);
              return;
            }
          }
        }
      }

      drawGame();
      animRef.current = requestAnimationFrame(gameLoop);
    },
    [drawGame, endGame],
  );

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    const ingredients: Ingredient[] = INGREDIENTS.map((type, i) => ({
      col: 3 + i * 3,
      floor: Math.floor(i / 2) + 1,
      type,
      dropped: 0,
      done: false,
    }));
    gameRef.current = {
      running: true,
      player: { x: 4, y: FLOORS[0], floor: 0 },
      enemies: [],
      ingredients,
      lives: 3,
      score: 0,
      completedBurgers: 0,
      pepper: 3,
      eid: 0,
      tick: 0,
    };
    setLives(3);
    setScore(0);
    setPhase("playing");
    animRef.current = requestAnimationFrame(gameLoop);
  }, [betNum, balance, gameLoop]);

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      e.preventDefault();
      keysRef.current.add(e.key);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <ArcadeCabinet title="BURGER TIME" color="#ff8c00">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ff8c00", textShadow: "0 0 10px #ff8c00" }}
            >
              MAKE THE BURGER!
            </div>
            <div className="text-sm opacity-70 mt-1">
              Walk over all 4 ingredients before losing 3 lives to win 2×
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
                    ? { background: "#ff8c00", borderColor: "#ff8c00" }
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-orange-500"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #ff8c00, #ff4400)",
              boxShadow: "0 0 20px #ff8c0050",
            }}
          >
            🍔 PLAY FOR {betNum} CREDITS
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
          <div className="flex justify-center gap-2 pb-2">
            <div className="flex flex-col gap-1 items-center mt-1">
              <button
                type="button"
                onClick={() => {
                  gameRef.current.player.floor = Math.max(
                    0,
                    gameRef.current.player.floor - 1,
                  );
                }}
                style={{
                  width: 36,
                  height: 36,
                  background: "#ff8c0022",
                  border: "1px solid #ff8c00",
                  borderRadius: 6,
                  color: "#ff8c00",
                  fontSize: 16,
                }}
              >
                ↑
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    gameRef.current.player.x = Math.max(
                      0,
                      gameRef.current.player.x - 1,
                    );
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    background: "#ff8c0022",
                    border: "1px solid #ff8c00",
                    borderRadius: 6,
                    color: "#ff8c00",
                    fontSize: 16,
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gameRef.current.player.floor = Math.min(
                      FLOORS.length - 1,
                      gameRef.current.player.floor + 1,
                    );
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    background: "#ff8c0022",
                    border: "1px solid #ff8c00",
                    borderRadius: 6,
                    color: "#ff8c00",
                    fontSize: 16,
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gameRef.current.player.x = Math.min(
                      COLS - 2,
                      gameRef.current.player.x + 1,
                    );
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    background: "#ff8c0022",
                    border: "1px solid #ff8c00",
                    borderRadius: 6,
                    color: "#ff8c00",
                    fontSize: 16,
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🍔" : "💀"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ffcc00" : "#ff4444" }}
          >
            {won ? "BURGER COMPLETE!" : "GAME OVER"}
          </div>
          <div className="text-sm opacity-70">Score: {score}</div>
          {won && (
            <div style={{ color: "#ff8c00" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button onClick={onGameComplete} style={{ background: "#ff8c00" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
