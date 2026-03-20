import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#44ff44";
const QUICK_BETS = [5, 10, 25, 50, 100];
const CELL = 42;
const COLS = 7;
const ROWS = 10;
const W = COLS * CELL;
const H = ROWS * CELL;
type Phase = "bet" | "playing" | "result";

interface Car {
  x: number;
  y: number;
  w: number;
  color: string;
  speed: number;
}
interface Log {
  x: number;
  y: number;
  w: number;
  speed: number;
}

export default function FroggerGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [lives, setLives] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const rafRef = useRef<number | null>(null);

  const gameRef = useRef<{
    frog: { x: number; y: number };
    cars: Car[];
    logs: Log[];
    lives: number;
    running: boolean;
    deathAnim: number;
  } | null>(null);

  const endGame = useCallback(
    async (didWin: boolean) => {
      if (!gameRef.current) return;
      gameRef.current.running = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const win = didWin ? betNum * 2 : 0;
      try {
        await recordOutcome({
          gameType: GameType.frogger,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
        onGameComplete();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
      setWon(didWin);
      setWinAmount(win);
      setPhase("result");
    },
    [betNum, recordOutcome, onGameComplete],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Row colors
    for (let r = 0; r < ROWS; r++) {
      if (r === 0) ctx.fillStyle = "#005500";
      else if (r >= 1 && r <= 4) ctx.fillStyle = r % 2 === 0 ? "#333" : "#444";
      else if (r === 5) ctx.fillStyle = "#556633";
      else ctx.fillStyle = "#003366";
      ctx.fillRect(0, r * CELL, W, CELL);
    }

    // Road lane markings
    for (let r = 1; r <= 4; r++) {
      ctx.fillStyle = "#ffffff30";
      ctx.fillRect(0, r * CELL + CELL / 2 - 1, W, 2);
    }

    // River waves
    for (let r = 6; r <= 9; r++) {
      ctx.strokeStyle = "#0055aa40";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath();
        ctx.arc(x + 10, r * CELL + CELL / 2, 8, Math.PI, 0);
        ctx.stroke();
      }
    }

    // Goal zone lily pads
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#00aa00";
      ctx.beginPath();
      ctx.ellipse(50 + i * 100, CELL / 2, 30, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cars
    for (const c of g.cars) {
      ctx.fillStyle = c.color;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(c.x, c.y * CELL + 6, c.w, CELL - 12);
      ctx.fillStyle = "rgba(150,220,255,0.6)";
      ctx.fillRect(c.x + 4, c.y * CELL + 9, c.w / 3, 8);
      ctx.shadowBlur = 0;
    }

    // Logs
    for (const l of g.logs) {
      ctx.fillStyle = "#8B4513";
      ctx.shadowColor = "#8B4513";
      ctx.shadowBlur = 2;
      ctx.fillRect(l.x, l.y * CELL + 8, l.w, CELL - 16);
      ctx.fillStyle = "#A0522D";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(l.x + i * (l.w / 3), l.y * CELL + 8, 4, CELL - 16);
      }
      ctx.shadowBlur = 0;
    }

    // Frog
    const fx = g.frog.x * CELL + CELL / 2;
    const fy = g.frog.y * CELL + CELL / 2;
    if (g.deathAnim > 0) {
      ctx.fillStyle = "#ff4400";
      ctx.font = "bold 20px monospace";
      ctx.fillText("💥", fx - 12, fy + 8);
    } else {
      ctx.fillStyle = HEX_COLOR;
      ctx.shadowColor = HEX_COLOR;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#002200";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(fx - 5, fy - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fx + 5, fy - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.strokeStyle = HEX_COLOR;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx - 12, fy + 4);
      ctx.lineTo(fx - 6, fy + 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx + 12, fy + 4);
      ctx.lineTo(fx + 6, fy + 10);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 12px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    ctx.fillText(`LIVES: ${"❤️".repeat(g.lives)}`, 4, H - 4);
    ctx.fillText("REACH TOP 3x", W - 110, H - 4);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g || !g.running) return;

    if (g.deathAnim > 0) {
      g.deathAnim--;
      draw();
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Move cars
    for (const c of g.cars) {
      c.x += c.speed;
      if (c.speed > 0 && c.x > W + 20) c.x = -c.w;
      if (c.speed < 0 && c.x + c.w < -20) c.x = W + 20;
    }

    // Move logs
    for (const l of g.logs) {
      l.x += l.speed;
      if (l.speed > 0 && l.x > W + 20) l.x = -l.w;
      if (l.speed < 0 && l.x + l.w < -20) l.x = W + 20;
    }

    // Frog on log
    const fry = g.frog.y;
    if (fry >= 6 && fry <= 9) {
      const fx = g.frog.x * CELL + CELL / 2;
      const onLog = g.logs.some(
        (l) => l.y === fry && fx > l.x && fx < l.x + l.w,
      );
      if (!onLog) {
        g.lives--;
        setLives(g.lives);
        if (g.lives <= 0) {
          endGame(false);
          return;
        }
        g.frog = { x: 3, y: 9 };
        g.deathAnim = 30;
      } else {
        const log = g.logs.find(
          (l) => l.y === fry && fx > l.x && fx < l.x + l.w,
        )!;
        g.frog.x += log.speed / CELL;
        if (g.frog.x < 0 || g.frog.x >= COLS) {
          g.lives--;
          setLives(g.lives);
          if (g.lives <= 0) {
            endGame(false);
            return;
          }
          g.frog = { x: 3, y: 9 };
          g.deathAnim = 30;
        }
      }
    }

    // Car collision
    if (fry >= 1 && fry <= 4) {
      const fx = g.frog.x * CELL;
      const hit = g.cars.some(
        (c) => c.y === fry && fx + 8 < c.x + c.w && fx + CELL - 8 > c.x,
      );
      if (hit) {
        g.lives--;
        setLives(g.lives);
        if (g.lives <= 0) {
          endGame(false);
          return;
        }
        g.frog = { x: 3, y: 9 };
        g.deathAnim = 30;
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, endGame]);

  const moveFrog = useCallback(
    (dir: string) => {
      const g = gameRef.current;
      if (!g || !g.running || g.deathAnim > 0) return;
      const { frog } = g;
      if (dir === "up" && frog.y > 0) frog.y--;
      else if (dir === "down" && frog.y < ROWS - 1) frog.y++;
      else if (dir === "left" && frog.x > 0) frog.x--;
      else if (dir === "right" && frog.x < COLS - 1) frog.x++;
      if (frog.y === 0) {
        g.lives++;
        setLives(g.lives);
        if (g.lives >= 3) {
          endGame(true);
          return;
        }
        g.frog = { x: 3, y: 9 };
      }
    },
    [endGame],
  );

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    const cars: Car[] = [
      { x: 30, y: 1, w: 50, color: "#ff3300", speed: 2 },
      { x: 160, y: 1, w: 50, color: "#ff6600", speed: 2 },
      { x: 10, y: 2, w: 60, color: "#4488ff", speed: -1.5 },
      { x: 150, y: 2, w: 60, color: "#2266dd", speed: -1.5 },
      { x: 50, y: 3, w: 45, color: "#ffcc00", speed: 2.5 },
      { x: 180, y: 3, w: 45, color: "#ffaa00", speed: 2.5 },
      { x: 20, y: 4, w: 55, color: "#ff2288", speed: -2 },
      { x: 160, y: 4, w: 55, color: "#cc0066", speed: -2 },
    ];
    const logs: Log[] = [
      { x: 20, y: 6, w: 80, speed: 1.2 },
      { x: 180, y: 6, w: 80, speed: 1.2 },
      { x: 0, y: 7, w: 100, speed: -1.5 },
      { x: 160, y: 7, w: 100, speed: -1.5 },
      { x: 30, y: 8, w: 70, speed: 1 },
      { x: 180, y: 8, w: 70, speed: 1 },
      { x: 10, y: 9, w: 90, speed: -1.8 },
    ];
    gameRef.current = {
      frog: { x: 3, y: 9 },
      cars,
      logs,
      lives: 0,
      running: true,
      deathAnim: 0,
    };
    setLives(0);
    setPhase("playing");
    setTimeout(() => {
      rafRef.current = requestAnimationFrame(gameLoop);
    }, 50);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        moveFrog("up");
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        moveFrog("down");
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        moveFrog("left");
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        moveFrog("right");
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, moveFrog]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <ArcadeCabinet title="🐸 FROGGER" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          REACH THE TOP 3 TIMES TO WIN 2x
        </p>
        {phase === "bet" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap justify-center">
              {QUICK_BETS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setBet(q.toString())}
                  className="px-4 py-2 rounded-lg text-xs font-black"
                  style={
                    bet === q.toString()
                      ? { background: HEX_COLOR, color: "#000" }
                      : {
                          background: "rgba(0,30,0,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="frogger.quickbet.button"
                >
                  {q}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-lg font-bold text-center"
              style={{
                background: "rgba(0,20,0,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="frogger.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #228822)`,
                color: "#000",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="frogger.play_button"
            >
              INSERT COIN &mdash; PLAY FOR {bet}
            </Button>
          </div>
        )}
        {phase === "playing" && (
          <div className="space-y-3">
            <div
              className="flex justify-between font-black"
              style={{ fontFamily: "monospace", color: HEX_COLOR }}
            >
              <span>LIVES: {lives}/3</span>
              <span className="text-xs" style={{ color: `${HEX_COLOR}70` }}>
                ARROW KEYS
              </span>
            </div>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="rounded-lg"
                style={{
                  maxWidth: "100%",
                  boxShadow: `0 0 20px ${HEX_COLOR}40`,
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => moveFrog("up")}
                className="w-12 h-10 rounded font-black"
                style={{
                  background: "rgba(0,40,0,0.8)",
                  border: `1px solid ${HEX_COLOR}40`,
                  color: HEX_COLOR,
                }}
              >
                ↑
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveFrog("left")}
                  className="w-12 h-10 rounded font-black"
                  style={{
                    background: "rgba(0,40,0,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveFrog("down")}
                  className="w-12 h-10 rounded font-black"
                  style={{
                    background: "rgba(0,40,0,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => moveFrog("right")}
                  className="w-12 h-10 rounded font-black"
                  style={{
                    background: "rgba(0,40,0,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}
        {phase === "result" && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-6"
            >
              <div className="text-6xl">{won ? "🎉" : "🐸"}</div>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won ? `+${winAmount} CREDITS!` : "SQUASHED!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: HEX_COLOR,
                  color: "#000",
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                }}
                data-ocid="frogger.play_again_button"
              >
                PLAY AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </ArcadeCabinet>
  );
}
