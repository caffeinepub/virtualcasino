import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#ffd700";
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

// Rainbow brick colors per row
const BRICK_COLORS = ["#ff2244", "#ff8800", "#ffdd00", "#44ff88", "#4488ff"];
const BRICK_SHADOW = ["#aa0022", "#cc6600", "#ccaa00", "#22bb55", "#2255cc"];

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
  const ballTrailRef = useRef<{ x: number; y: number }[]>([]);
  const gameRef = useRef<{
    px: number;
    bx: number;
    by: number;
    vx: number;
    vy: number;
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

    if (g.mouseX !== null) {
      g.px = Math.max(0, Math.min(W - PADDLE_W, g.mouseX - PADDLE_W / 2));
    } else {
      if (g.keys.has("ArrowLeft") || g.keys.has("a"))
        g.px = Math.max(0, g.px - 6);
      if (g.keys.has("ArrowRight") || g.keys.has("d"))
        g.px = Math.min(W - PADDLE_W, g.px + 6);
    }

    g.bx += g.vx;
    g.by += g.vy;

    if (g.bx - BALL_R <= 0 || g.bx + BALL_R >= W) g.vx *= -1;
    if (g.by - BALL_R <= 0) g.vy *= -1;

    if (g.by + BALL_R >= H) {
      g.lives--;
      setLives(g.lives);
      ballTrailRef.current = [];
      if (g.lives <= 0) {
        endGame(g.score, false);
        return;
      }
      g.bx = W / 2;
      g.by = H - 100;
      g.vx = (Math.random() < 0.5 ? 1 : -1) * 4;
      g.vy = -5;
    }

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

    // Track ball trail
    ballTrailRef.current.push({ x: g.bx, y: g.by });
    if (ballTrailRef.current.length > 8) ballTrailRef.current.shift();

    // Draw
    ctx.fillStyle = "#03030f";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid bg
    ctx.strokeStyle = "rgba(100,100,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Bricks with bevel
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!g.bricks[r][c]) continue;
        const bxd = c * (BRICK_W + BRICK_PAD) + 20;
        const byd = r * (BRICK_H + BRICK_PAD) + 40;
        // Main brick
        ctx.fillStyle = BRICK_COLORS[r] ?? "#fff";
        ctx.shadowColor = BRICK_COLORS[r] ?? "#fff";
        ctx.shadowBlur = 6;
        ctx.fillRect(bxd, byd, BRICK_W, BRICK_H);
        // Top highlight (lighter)
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(bxd, byd, BRICK_W, 3);
        // Bottom shadow (darker)
        ctx.fillStyle = BRICK_SHADOW[r] ?? "#666";
        ctx.fillRect(bxd, byd + BRICK_H - 3, BRICK_W, 3);
      }
    }
    ctx.shadowBlur = 0;

    // Ball trail
    for (let i = 0; i < ballTrailRef.current.length; i++) {
      const t = ballTrailRef.current[i];
      const alpha = (i / ballTrailRef.current.length) * 0.5;
      ctx.fillStyle = `rgba(0,200,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(
        t.x,
        t.y,
        BALL_R * (0.4 + (0.6 * i) / ballTrailRef.current.length),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Ball - chrome with glow
    const ballGrad = ctx.createRadialGradient(
      g.bx - 2,
      g.by - 2,
      1,
      g.bx,
      g.by,
      BALL_R,
    );
    ballGrad.addColorStop(0, "#ffffff");
    ballGrad.addColorStop(0.4, "#88ddff");
    ballGrad.addColorStop(1, "#0088cc");
    ctx.fillStyle = ballGrad;
    ctx.shadowColor = "#00ccff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(g.bx, g.by, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Paddle - metallic chrome
    const paddleGrad = ctx.createLinearGradient(
      g.px,
      H - 50,
      g.px,
      H - 50 + PADDLE_H,
    );
    paddleGrad.addColorStop(0, "#aaddff");
    paddleGrad.addColorStop(0.3, "#ffffff");
    paddleGrad.addColorStop(0.7, "#66aadd");
    paddleGrad.addColorStop(1, "#0066aa");
    ctx.fillStyle = paddleGrad;
    ctx.shadowColor = "#00aaff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(g.px, H - 50, PADDLE_W, PADDLE_H, 4);
    ctx.fill();
    // Cyan neon trim
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 1;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(g.px, H - 50, PADDLE_W, PADDLE_H, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = "rgba(0,0,15,0.75)";
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 12px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 5;
    ctx.fillText(`SCORE: ${g.score}/40`, 8, H - 7);
    ctx.fillStyle = "#ff4444";
    ctx.shadowColor = "#ff4444";
    ctx.fillText(`LIVES: ${"♥ ".repeat(g.lives)}`, W - 90, H - 7);
    ctx.shadowBlur = 0;

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
    ballTrailRef.current = [];
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
    <ArcadeCabinet title="🧱 BREAKOUT" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}90`, fontFamily: "monospace" }}
        >
          BREAK ALL BRICKS TO WIN 2x! MOUSE/TOUCH TO MOVE
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
                          background: "rgba(30,20,0,0.7)",
                          color: `${HEX_COLOR}80`,
                          border: `1px solid ${HEX_COLOR}40`,
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
              className="w-full px-4 py-3 rounded-xl text-lg font-bold text-center"
              style={{
                background: "rgba(20,15,0,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="breakout.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #ff8800)`,
                color: "#000",
                boxShadow: `0 0 20px ${HEX_COLOR}50`,
              }}
              data-ocid="breakout.play_button"
            >
              🧱 PLAY FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-2">
            <div
              className="flex justify-between text-sm font-black"
              style={{ fontFamily: "monospace" }}
            >
              <span style={{ color: HEX_COLOR }}>SCORE: {score}/40</span>
              <span style={{ color: "#ff4444" }}>{"♥ ".repeat(lives)}</span>
            </div>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="rounded-lg"
                style={{
                  maxWidth: "100%",
                  cursor: "none",
                  boxShadow: `0 0 20px ${HEX_COLOR}30`,
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
              <p
                className="text-sm"
                style={{ color: `${HEX_COLOR}80`, fontFamily: "monospace" }}
              >
                BRICKS BROKEN: {score}/40
              </p>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won ? `+${winAmount} CREDITS!` : "BALL LOST! TRY AGAIN."}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{ background: HEX_COLOR, color: "#000" }}
                data-ocid="breakout.play_again_button"
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
