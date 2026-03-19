import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.78 0.18 72)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 360;
const H = 480;
const PADDLE_W = 80;
const PADDLE_H = 12;
const BALL_R = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_W = 40;
const BRICK_H = 18;
const BRICK_PAD = 4;
type Phase = "bet" | "playing" | "result";

const BRICK_COLORS = ["#ff4488", "#ff8844", "#ffcc00", "#44ff88", "#4488ff"];

export default function BreakoutGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const gameRef = useRef<{
    px: number; // paddle x
    bx: number;
    by: number; // ball
    vx: number;
    vy: number; // ball velocity
    bricks: boolean[][];
    score: number;
    lives: number;
    running: boolean;
    keys: Set<string>;
    mouseX: number | null;
  } | null>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const makeBricks = () =>
    Array.from({ length: BRICK_ROWS }, () => Array(BRICK_COLS).fill(true));

  const endGame = useCallback(
    async (finalScore: number, playerWon: boolean) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (gameRef.current) gameRef.current.running = false;
      const win = playerWon ? Math.round(betNum * 2) : 0;
      setScore(finalScore);
      try {
        await recordOutcome({
          gameType: GameType.breakout,
          bet: BigInt(betNum),
          won: playerWon,
          winAmount: BigInt(win),
        });
        onGameComplete();
      } catch (e: any) {
        toast.error(e?.message ?? "Error");
      }
      setWon(playerWon);
      setWinAmount(win);
      setPhase("result");
    },
    [betNum, recordOutcome, onGameComplete],
  );

  const loop = useCallback(() => {
    const g = gameRef.current;
    const canvas = canvasRef.current;
    if (!g || !g.running || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Move paddle
    if (g.mouseX !== null) {
      g.px = Math.max(0, Math.min(W - PADDLE_W, g.mouseX - PADDLE_W / 2));
    } else {
      if (g.keys.has("ArrowLeft") || g.keys.has("a"))
        g.px = Math.max(0, g.px - 6);
      if (g.keys.has("ArrowRight") || g.keys.has("d"))
        g.px = Math.min(W - PADDLE_W, g.px + 6);
    }

    // Move ball
    g.bx += g.vx;
    g.by += g.vy;

    // Wall bounces
    if (g.bx - BALL_R <= 0 || g.bx + BALL_R >= W) g.vx *= -1;
    if (g.by - BALL_R <= 0) g.vy *= -1;

    // Ball falls out
    if (g.by + BALL_R >= H) {
      g.lives--;
      setLives(g.lives);
      if (g.lives <= 0) {
        endGame(g.score, false);
        return;
      }
      g.bx = W / 2;
      g.by = H - 100;
      g.vx = (Math.random() < 0.5 ? 1 : -1) * 4;
      g.vy = -5;
    }

    // Paddle collision
    if (
      g.by + BALL_R >= H - 50 &&
      g.by + BALL_R <= H - 50 + PADDLE_H + 4 &&
      g.bx >= g.px &&
      g.bx <= g.px + PADDLE_W
    ) {
      g.vy = -Math.abs(g.vy);
      const hitPos = (g.bx - g.px) / PADDLE_W;
      g.vx = (hitPos - 0.5) * 10;
    }

    // Brick collisions
    let remaining = 0;
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!g.bricks[r][c]) continue;
        remaining++;
        const bx = c * (BRICK_W + BRICK_PAD) + 20;
        const by = r * (BRICK_H + BRICK_PAD) + 40;
        if (
          g.bx + BALL_R > bx &&
          g.bx - BALL_R < bx + BRICK_W &&
          g.by + BALL_R > by &&
          g.by - BALL_R < by + BRICK_H
        ) {
          g.bricks[r][c] = false;
          g.score++;
          setScore(g.score);
          remaining--;
          g.vy *= -1;
          if (remaining <= 0) {
            endGame(g.score, true);
            return;
          }
        }
      }
    }

    // Draw
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, W, H);
    // Bricks
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!g.bricks[r][c]) continue;
        const bxd = c * (BRICK_W + BRICK_PAD) + 20;
        const byd = r * (BRICK_H + BRICK_PAD) + 40;
        ctx.fillStyle = BRICK_COLORS[r] ?? "#fff";
        ctx.shadowColor = BRICK_COLORS[r] ?? "#fff";
        ctx.shadowBlur = 4;
        ctx.fillRect(bxd, byd, BRICK_W, BRICK_H);
      }
    }
    ctx.shadowBlur = 0;
    // Paddle
    ctx.fillStyle = "#00aaff";
    ctx.shadowColor = "#00aaff";
    ctx.shadowBlur = 10;
    ctx.fillRect(g.px, H - 50, PADDLE_W, PADDLE_H);
    ctx.shadowBlur = 0;
    // Ball
    ctx.beginPath();
    ctx.arc(g.bx, g.by, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`Score: ${g.score}`, 10, H - 5);
    ctx.fillText(`Lives: ${"❤".repeat(g.lives)}`, W - 90, H - 5);

    rafRef.current = requestAnimationFrame(loop);
  }, [endGame]);

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    gameRef.current = {
      px: W / 2 - PADDLE_W / 2,
      bx: W / 2,
      by: H - 120,
      vx: 4,
      vy: -5,
      bricks: makeBricks(),
      score: 0,
      lives: 3,
      running: true,
      keys: new Set(),
      mouseX: null,
    };
    setScore(0);
    setLives(3);
    setPhase("playing");
    setTimeout(loop, 50);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      gameRef.current?.keys.add(e.key);
    };
    const up = (e: KeyboardEvent) => {
      gameRef.current?.keys.delete(e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = W / rect.width;
    if (gameRef.current)
      gameRef.current.mouseX = (e.clientX - rect.left) * scaleX;
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = W / rect.width;
    if (gameRef.current)
      gameRef.current.mouseX = (e.touches[0].clientX - rect.left) * scaleX;
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
        🧱 BREAKOUT
      </h2>
      <p className="text-sm text-muted-foreground mb-1">
        Break all bricks to win 2x! Mouse/touch or arrow keys to move.
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
                    ? { background: COLOR, color: "#000" }
                    : {
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
                      }
                }
                data-ocid="breakout.quickbet.button"
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
            data-ocid="breakout.bet.input"
          />
          <Button
            onClick={startGame}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.65 0.22 55))`,
              color: "#000",
            }}
            data-ocid="breakout.play_button"
          >
            🧱 PLAY FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-black">
            <span style={{ color: COLOR }}>Score: {score}/40</span>
            <span>{"❤".repeat(lives)}</span>
          </div>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="rounded-xl"
              style={{
                maxWidth: "100%",
                border: `2px solid ${COLOR}40`,
                cursor: "none",
              }}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
            />
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
            <div className="text-6xl">{won ? "🎉" : "⚱"}</div>
            <p className="text-muted-foreground">Bricks broken: {score}/40</p>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won ? `+${winAmount} CREDITS!` : "Ball lost! Try again."}
            </h3>
            <Button
              onClick={() => setPhase("bet")}
              className="font-black"
              style={{ background: COLOR, color: "#000" }}
              data-ocid="breakout.play_again_button"
            >
              PLAY AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
