import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#00e87a";
const QUICK_BETS = [5, 10, 25, 50, 100];
const CELL = 20;
const COLS = 20;
const ROWS = 20;
const W = COLS * CELL;
const H = ROWS * CELL;
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Phase = "bet" | "playing" | "result";
interface Point {
  x: number;
  y: number;
}

export default function SnakeGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    snake: Point[];
    food: Point;
    dir: Dir;
    nextDir: Dir;
    score: number;
    running: boolean;
    interval: ReturnType<typeof setInterval> | null;
  } | null>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const randFood = (snake: Point[]): Point => {
    let p: Point;
    do {
      p = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((s) => s.x === p.x && s.y === p.y));
    return p;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // CRT phosphor background
    ctx.fillStyle = "#000d00";
    ctx.fillRect(0, 0, W, H);

    // Scanlines overlay
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, y, W, 2);
    }

    // Grid - faint phosphor green
    ctx.strokeStyle = "rgba(0,80,20,0.3)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }

    // Food - glowing red apple shape
    const fx = g.food.x * CELL + CELL / 2;
    const fy = g.food.y * CELL + CELL / 2;
    ctx.shadowColor = "#ff2244";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff2244";
    ctx.beginPath();
    ctx.arc(fx, fy, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    // apple shine
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    // stem
    ctx.strokeStyle = "#553300";
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(fx, fy - CELL / 2 + 3);
    ctx.lineTo(fx + 2, fy - CELL / 2);
    ctx.stroke();

    // Snake with phosphor glow
    g.snake.forEach((seg, i) => {
      const ratio = 1 - i / g.snake.length;
      if (i === 0) {
        // Head - bright with glow
        ctx.shadowColor = HEX_COLOR;
        ctx.shadowBlur = 12;
        ctx.fillStyle = HEX_COLOR;
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
        // eyes
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#000";
        ctx.fillRect(seg.x * CELL + 4, seg.y * CELL + 4, 3, 3);
        ctx.fillRect(seg.x * CELL + 12, seg.y * CELL + 4, 3, 3);
        ctx.fillStyle = "#fff";
        ctx.fillRect(seg.x * CELL + 5, seg.y * CELL + 5, 1, 1);
        ctx.fillRect(seg.x * CELL + 13, seg.y * CELL + 5, 1, 1);
      } else {
        const g2 = Math.round(100 + 130 * ratio);
        const b = Math.round(40 * ratio);
        ctx.shadowColor = `rgb(0,${g2},${b})`;
        ctx.shadowBlur = i < 3 ? 6 : 0;
        ctx.fillStyle = `rgb(0,${g2},${b})`;
        ctx.fillRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4);
      }
    });
    ctx.shadowBlur = 0;

    // Score HUD - retro LED style
    ctx.fillStyle = "rgba(0,20,0,0.7)";
    ctx.fillRect(0, H - 22, W, 22);
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 13px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 6;
    ctx.fillText(`SCORE: ${g.score.toString().padStart(4, "0")}`, 8, H - 6);
    ctx.fillText("5=1.5x  10=2x  20=3x", W / 2 - 60, H - 6);
    ctx.shadowBlur = 0;
  }, []);

  const endGame = useCallback(
    async (finalScore: number) => {
      if (!gameRef.current) return;
      gameRef.current.running = false;
      if (gameRef.current.interval) {
        clearInterval(gameRef.current.interval);
        gameRef.current.interval = null;
      }
      const mult =
        finalScore >= 20 ? 3 : finalScore >= 10 ? 2 : finalScore >= 5 ? 1.5 : 0;
      const didWin = mult > 0;
      const win = didWin ? Math.round(betNum * mult) : 0;
      setScore(finalScore);
      try {
        await recordOutcome({
          gameType: GameType.snake,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
        onGameComplete();
      } catch (e: any) {
        toast.error(e?.message ?? "Error");
      }
      setWon(didWin);
      setWinAmount(win);
      setPhase("result");
    },
    [betNum, recordOutcome, onGameComplete],
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
    const initSnake: Point[] = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    gameRef.current = {
      snake: initSnake,
      food: randFood(initSnake),
      dir: "RIGHT",
      nextDir: "RIGHT",
      score: 0,
      running: true,
      interval: null,
    };
    setScore(0);
    setPhase("playing");
    setTimeout(() => {
      if (!gameRef.current) return;
      gameRef.current.interval = setInterval(() => {
        const g = gameRef.current;
        if (!g || !g.running) return;
        g.dir = g.nextDir;
        const head = { ...g.snake[0] };
        if (g.dir === "UP") head.y--;
        if (g.dir === "DOWN") head.y++;
        if (g.dir === "LEFT") head.x--;
        if (g.dir === "RIGHT") head.x++;
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
          endGame(g.score);
          return;
        }
        if (g.snake.some((s) => s.x === head.x && s.y === head.y)) {
          endGame(g.score);
          return;
        }
        g.snake.unshift(head);
        if (head.x === g.food.x && head.y === g.food.y) {
          g.score++;
          setScore(g.score);
          g.food = randFood(g.snake);
          if (g.score % 5 === 0 && g.interval) {
            clearInterval(g.interval);
            const newSpeed = Math.max(80, 200 - g.score * 5);
            g.interval = setInterval(() => {
              const gi = gameRef.current;
              if (!gi || !gi.running) return;
              gi.dir = gi.nextDir;
              const h2 = { ...gi.snake[0] };
              if (gi.dir === "UP") h2.y--;
              if (gi.dir === "DOWN") h2.y++;
              if (gi.dir === "LEFT") h2.x--;
              if (gi.dir === "RIGHT") h2.x++;
              if (h2.x < 0 || h2.x >= COLS || h2.y < 0 || h2.y >= ROWS) {
                endGame(gi.score);
                return;
              }
              if (gi.snake.some((s) => s.x === h2.x && s.y === h2.y)) {
                endGame(gi.score);
                return;
              }
              gi.snake.unshift(h2);
              if (h2.x === gi.food.x && h2.y === gi.food.y) {
                gi.score++;
                setScore(gi.score);
                gi.food = randFood(gi.snake);
              } else {
                gi.snake.pop();
              }
              draw();
            }, newSpeed);
          }
        } else {
          g.snake.pop();
        }
        draw();
      }, 200);
    }, 50);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const handleKey = (e: KeyboardEvent) => {
      if (!gameRef.current) return;
      const d = gameRef.current.dir;
      if ((e.key === "ArrowUp" || e.key === "w") && d !== "DOWN")
        gameRef.current.nextDir = "UP";
      if ((e.key === "ArrowDown" || e.key === "s") && d !== "UP")
        gameRef.current.nextDir = "DOWN";
      if ((e.key === "ArrowLeft" || e.key === "a") && d !== "RIGHT")
        gameRef.current.nextDir = "LEFT";
      if ((e.key === "ArrowRight" || e.key === "d") && d !== "LEFT")
        gameRef.current.nextDir = "RIGHT";
      e.preventDefault();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (gameRef.current?.interval) clearInterval(gameRef.current.interval);
    };
  }, []);

  const dpad = (dir: Dir) => {
    if (!gameRef.current) return;
    const d = gameRef.current.dir;
    if (dir === "UP" && d !== "DOWN") gameRef.current.nextDir = "UP";
    if (dir === "DOWN" && d !== "UP") gameRef.current.nextDir = "DOWN";
    if (dir === "LEFT" && d !== "RIGHT") gameRef.current.nextDir = "LEFT";
    if (dir === "RIGHT" && d !== "LEFT") gameRef.current.nextDir = "RIGHT";
  };

  return (
    <ArcadeCabinet title="🐍 SNAKE" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          EAT FOOD TO GROW &mdash; SCORE 5=1.5x &bull; 10=2x &bull; 20=3x
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
                          background: "rgba(0,50,15,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="snake.quickbet.button"
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
                background: "rgba(0,30,10,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="snake.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #00aa55)`,
                color: "#000",
                textShadow: "none",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="snake.play_button"
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
              <span>SCORE: {score.toString().padStart(4, "0")}</span>
              <span className="text-xs" style={{ color: `${HEX_COLOR}70` }}>
                ARROW KEYS / WASD
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
            <div className="flex flex-col items-center gap-1 mt-2">
              <Button
                size="sm"
                onClick={() => dpad("UP")}
                className="w-12 h-10 font-black"
                style={{
                  background: "rgba(0,50,15,0.8)",
                  border: `1px solid ${HEX_COLOR}40`,
                  color: HEX_COLOR,
                }}
                data-ocid="snake.up_button"
              >
                ↑
              </Button>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => dpad("LEFT")}
                  className="w-12 h-10 font-black"
                  style={{
                    background: "rgba(0,50,15,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                  data-ocid="snake.left_button"
                >
                  ←
                </Button>
                <Button
                  size="sm"
                  onClick={() => dpad("DOWN")}
                  className="w-12 h-10 font-black"
                  style={{
                    background: "rgba(0,50,15,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                  data-ocid="snake.down_button"
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  onClick={() => dpad("RIGHT")}
                  className="w-12 h-10 font-black"
                  style={{
                    background: "rgba(0,50,15,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                  data-ocid="snake.right_button"
                >
                  →
                </Button>
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
              <div className="text-6xl">{won ? "🎉" : "💀"}</div>
              <p
                className="text-sm"
                style={{ color: `${HEX_COLOR}80`, fontFamily: "monospace" }}
              >
                SCORE: {score} FOOD EATEN
              </p>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won
                  ? `+${winAmount} CREDITS!`
                  : score < 5
                    ? "SCORE 5+ TO WIN!"
                    : "GAME OVER!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: HEX_COLOR,
                  color: "#000",
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                }}
                data-ocid="snake.play_again_button"
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
