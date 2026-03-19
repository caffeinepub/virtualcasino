import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.68 0.22 150)";
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
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = "oklch(0.15 0.02 280)";
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
    // Food
    ctx.fillStyle = "#ff4466";
    ctx.shadowColor = "#ff4466";
    ctx.shadowBlur = 10;
    ctx.fillRect(g.food.x * CELL + 2, g.food.y * CELL + 2, CELL - 4, CELL - 4);
    ctx.shadowBlur = 0;
    // Snake
    g.snake.forEach((seg, i) => {
      const ratio = 1 - i / g.snake.length;
      ctx.fillStyle =
        i === 0
          ? "#00ff88"
          : `rgba(0,${Math.round(180 * ratio + 75)},${Math.round(100 * ratio)},0.9)`;
      ctx.shadowColor = i === 0 ? "#00ff88" : "transparent";
      ctx.shadowBlur = i === 0 ? 8 : 0;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
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
        // Wall collision
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
          endGame(g.score);
          return;
        }
        // Self collision
        if (g.snake.some((s) => s.x === head.x && s.y === head.y)) {
          endGame(g.score);
          return;
        }
        g.snake.unshift(head);
        if (head.x === g.food.x && head.y === g.food.y) {
          g.score++;
          setScore(g.score);
          g.food = randFood(g.snake);
          // Speed up slightly
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
    <div
      className="rounded-2xl p-6"
      style={{
        background: "oklch(0.11 0.015 280)",
        border: `1px solid ${COLOR}40`,
      }}
    >
      <h2
        className="text-2xl font-black tracking-widest mb-2"
        style={{ color: COLOR }}
      >
        🐍 SNAKE
      </h2>
      <p className="text-sm text-muted-foreground mb-1">
        Eat food to grow. Score 5=1.5x • 10=2x • 20=3x
      </p>

      {phase === "bet" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {QUICK_BETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBet(q.toString())}
                className="px-4 py-2 rounded-lg text-xs font-black"
                style={
                  bet === q.toString()
                    ? { background: COLOR, color: "#fff" }
                    : {
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
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
            className="w-full px-4 py-3 rounded-xl text-lg font-bold bg-secondary border border-border text-foreground"
            data-ocid="snake.bet.input"
          />
          <Button
            onClick={startGame}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.25 290))`,
              color: "#fff",
            }}
            data-ocid="snake.play_button"
          >
            🐍 PLAY FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-3">
          <div className="flex justify-between font-black">
            <span style={{ color: COLOR }}>Score: {score}</span>
            <span className="text-muted-foreground text-xs">
              Arrow keys / WASD to move
            </span>
          </div>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="rounded-xl"
              style={{ maxWidth: "100%", border: `2px solid ${COLOR}40` }}
            />
          </div>
          {/* D-pad */}
          <div className="flex flex-col items-center gap-1 mt-2">
            <Button
              size="sm"
              onClick={() => dpad("UP")}
              className="w-12 h-10 font-black"
              style={{ background: "oklch(0.16 0.025 278)" }}
              data-ocid="snake.up_button"
            >
              ↑
            </Button>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={() => dpad("LEFT")}
                className="w-12 h-10 font-black"
                style={{ background: "oklch(0.16 0.025 278)" }}
                data-ocid="snake.left_button"
              >
                ←
              </Button>
              <Button
                size="sm"
                onClick={() => dpad("DOWN")}
                className="w-12 h-10 font-black"
                style={{ background: "oklch(0.16 0.025 278)" }}
                data-ocid="snake.down_button"
              >
                ↓
              </Button>
              <Button
                size="sm"
                onClick={() => dpad("RIGHT")}
                className="w-12 h-10 font-black"
                style={{ background: "oklch(0.16 0.025 278)" }}
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
            <p className="text-muted-foreground">Score: {score} food eaten</p>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won
                ? `+${winAmount} CREDITS!`
                : score < 5
                  ? "Score 5+ to win!"
                  : "Game over!"}
            </h3>
            <Button
              onClick={() => setPhase("bet")}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="snake.play_again_button"
            >
              PLAY AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
