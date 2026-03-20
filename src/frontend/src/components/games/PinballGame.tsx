import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const WIN_SCORE = 500;
const W = 340;
const H = 560;
const BALL_R = 10;
const GRAVITY = 0.35;
const FLIPPER_LEN = 58;

type Phase = "bet" | "playing" | "result";

interface Bumper {
  x: number;
  y: number;
  r: number;
  color: string;
  lit: number;
}

const BUMPERS: Bumper[] = [
  { x: 100, y: 160, r: 22, color: "#ff2288", lit: 0 },
  { x: 240, y: 160, r: 22, color: "#00ccff", lit: 0 },
  { x: 170, y: 110, r: 22, color: "#aa44ff", lit: 0 },
  { x: 120, y: 230, r: 22, color: "#ffcc00", lit: 0 },
  { x: 220, y: 230, r: 22, color: "#00ff88", lit: 0 },
];

export default function PinballGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const rafRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  const gameRef = useRef<{
    bx: number;
    by: number;
    bvx: number;
    bvy: number;
    score: number;
    balls: number;
    launched: boolean;
    running: boolean;
    bumpers: Bumper[];
    leftFlipperAngle: number;
    rightFlipperAngle: number;
    launchPower: number;
    launchCharging: boolean;
  } | null>(null);

  const endGame = useCallback(
    async (didWin: boolean, _finalScore: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const win = didWin ? betNum * 2 : 0;
      try {
        await recordOutcome({
          gameType: GameType.pinball,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
      } catch {
        toast.error("Failed to record outcome");
      }
      setWon(didWin);
      setWinAmount(win);
      setPhase("result");
    },
    [betNum, recordOutcome],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bumpers: Bumper[] = BUMPERS.map((b) => ({ ...b }));

    gameRef.current = {
      bx: W - 28,
      by: H - 120,
      bvx: 0,
      bvy: 0,
      score: 0,
      balls: 3,
      launched: false,
      running: true,
      bumpers,
      leftFlipperAngle: 0.5,
      rightFlipperAngle: Math.PI - 0.5,
      launchPower: 0,
      launchCharging: false,
    };

    const resetBall = () => {
      const g = gameRef.current;
      if (!g) return;
      g.bx = W - 28;
      g.by = H - 120;
      g.bvx = 0;
      g.bvy = 0;
      g.launched = false;
      g.launchPower = 0;
      g.launchCharging = false;
    };

    const draw = () => {
      const g = gameRef.current;
      if (!g) return;

      // Playfield background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a1a0a");
      bg.addColorStop(1, "#061006");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid texture
      ctx.strokeStyle = "rgba(0,80,0,0.12)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < W; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, H);
        ctx.stroke();
      }
      for (let j = 0; j < H; j += 20) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(W, j);
        ctx.stroke();
      }

      // Side gutters
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, 0, 18, H);
      ctx.fillRect(W - 18, 0, 18, H);

      // Score area at top
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(18, 8, W - 36, 38);
      ctx.strokeStyle = "rgba(0,255,100,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, 8, W - 36, 38);
      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`SCORE: ${g.score}`, W / 2, 32);

      // Balls remaining
      for (let b = 0; b < g.balls; b++) {
        ctx.beginPath();
        ctx.arc(30 + b * 22, 25, 7, 0, Math.PI * 2);
        const ballHint = ctx.createRadialGradient(
          28 + b * 22,
          23,
          1,
          30 + b * 22,
          25,
          7,
        );
        ballHint.addColorStop(0, "#fffbe8");
        ballHint.addColorStop(1, "#b0985a");
        ctx.fillStyle = ballHint;
        ctx.fill();
      }

      // Bumpers
      for (const bumper of g.bumpers) {
        // Glow when lit
        if (bumper.lit > 0) {
          ctx.beginPath();
          ctx.arc(bumper.x, bumper.y, bumper.r + 8, 0, Math.PI * 2);
          ctx.fillStyle = bumper.color
            .replace(")", ",0.4)")
            .replace("rgb", "rgba")
            .replace("#", "");
          ctx.shadowBlur = 20;
          ctx.shadowColor = bumper.color;
          ctx.fill();
          ctx.shadowBlur = 0;
          bumper.lit = Math.max(0, bumper.lit - 1);
        }
        // Bumper body
        const bumpGrad = ctx.createRadialGradient(
          bumper.x - 5,
          bumper.y - 5,
          2,
          bumper.x,
          bumper.y,
          bumper.r,
        );
        bumpGrad.addColorStop(0, lighten(bumper.color));
        bumpGrad.addColorStop(1, bumper.color);
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
        ctx.fillStyle = bumpGrad;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Score label
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("100", bumper.x, bumper.y + 4);
      }

      // Flippers
      const leftFx = 60;
      const rightFx = W - 60;
      const flipY = H - 55;

      // Left flipper
      const lAngle = g.leftFlipperAngle;
      ctx.save();
      ctx.translate(leftFx, flipY);
      ctx.rotate(lAngle);
      const lGrad = ctx.createLinearGradient(0, -5, FLIPPER_LEN, 5);
      lGrad.addColorStop(0, "#cccccc");
      lGrad.addColorStop(0.5, "#ffffff");
      lGrad.addColorStop(1, "#888888");
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.roundRect(0, -6, FLIPPER_LEN, 12, 6);
      ctx.fill();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(0,200,255,0.7)";
      ctx.strokeStyle = "rgba(0,200,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Right flipper
      const rAngle = g.rightFlipperAngle;
      ctx.save();
      ctx.translate(rightFx, flipY);
      ctx.rotate(rAngle);
      const rGrad = ctx.createLinearGradient(-FLIPPER_LEN, -5, 0, 5);
      rGrad.addColorStop(0, "#888888");
      rGrad.addColorStop(0.5, "#ffffff");
      rGrad.addColorStop(1, "#cccccc");
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.roundRect(-FLIPPER_LEN, -6, FLIPPER_LEN, 12, 6);
      ctx.fill();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(0,200,255,0.7)";
      ctx.strokeStyle = "rgba(0,200,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Launch spring (right wall area)
      if (!g.launched) {
        ctx.fillStyle = "rgba(255,200,0,0.15)";
        ctx.fillRect(W - 18, H - 140, 18, 100);
        const springH = g.launchPower * 70;
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(W - 14, H - 80, 10, springH);
        ctx.fillStyle = "rgba(255,200,0,0.8)";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SPACE", W - 9, H - 90);
      }

      // Ball
      if (g.by < H) {
        const ballGrad = ctx.createRadialGradient(
          g.bx - 3,
          g.by - 3,
          2,
          g.bx,
          g.by,
          BALL_R,
        );
        ballGrad.addColorStop(0, "#fffbe8");
        ballGrad.addColorStop(0.4, "#f0e8d0");
        ballGrad.addColorStop(1, "#b0985a");
        ctx.beginPath();
        ctx.arc(g.bx, g.by, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = ballGrad;
        ctx.fill();
        ctx.strokeStyle = "rgba(150,120,60,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Controls hint
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Z=Left  X=Right  Space=Launch", W / 2, H - 12);
    };

    const update = () => {
      const g = gameRef.current;
      if (!g || !g.running) return;

      const leftDown = keysRef.current.has("z") || keysRef.current.has("Z");
      const rightDown = keysRef.current.has("x") || keysRef.current.has("X");
      const spaceDown = keysRef.current.has(" ");

      // Flipper angles
      const targetL = leftDown ? -0.45 : 0.5;
      const targetR = rightDown ? Math.PI + 0.45 : Math.PI - 0.5;
      g.leftFlipperAngle += (targetL - g.leftFlipperAngle) * 0.3;
      g.rightFlipperAngle += (targetR - g.rightFlipperAngle) * 0.3;

      // Launch
      if (!g.launched) {
        if (spaceDown) {
          g.launchCharging = true;
          g.launchPower = Math.min(1, g.launchPower + 0.04);
        } else if (g.launchCharging) {
          // Release
          g.launched = true;
          g.bvy = -(g.launchPower * 18 + 6);
          g.bvx = -1.5;
          g.launchPower = 0;
          g.launchCharging = false;
        }
        return;
      }

      // Physics
      g.bvy += GRAVITY;
      g.bx += g.bvx;
      g.by += g.bvy;

      // Wall bounces (within playfield, 18px gutters)
      if (g.bx - BALL_R < 18) {
        g.bx = 18 + BALL_R;
        g.bvx = Math.abs(g.bvx) * 0.8;
      }
      if (g.bx + BALL_R > W - 18) {
        g.bx = W - 18 - BALL_R;
        g.bvx = -Math.abs(g.bvx) * 0.8;
      }
      if (g.by - BALL_R < 50) {
        g.by = 50 + BALL_R;
        g.bvy = Math.abs(g.bvy) * 0.8;
      }

      // Bumper collisions
      for (const bumper of g.bumpers) {
        const dx = g.bx - bumper.x;
        const dy = g.by - bumper.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BALL_R + bumper.r) {
          const nx = dx / dist;
          const ny = dy / dist;
          const speed = Math.sqrt(g.bvx * g.bvx + g.bvy * g.bvy);
          g.bvx = nx * Math.max(speed, 6);
          g.bvy = ny * Math.max(speed, 6);
          g.bx = bumper.x + nx * (BALL_R + bumper.r + 1);
          g.by = bumper.y + ny * (BALL_R + bumper.r + 1);
          g.score += 100;
          bumper.lit = 12;
          setDisplayScore(g.score);
        }
      }

      // Flipper collision helpers
      const leftFx = 60;
      const rightFx = W - 60;
      const flipY = H - 55;

      // Left flipper collision
      if (
        leftDown &&
        g.by > flipY - 20 &&
        g.by < flipY + 20 &&
        g.bx > leftFx - 10 &&
        g.bx < leftFx + FLIPPER_LEN
      ) {
        const hitFrac = (g.bx - leftFx) / FLIPPER_LEN;
        g.bvy = -(12 + hitFrac * 4);
        g.bvx = (hitFrac - 0.5) * 6 + 1;
        g.by = flipY - BALL_R - 6;
      }

      // Right flipper collision
      if (
        rightDown &&
        g.by > flipY - 20 &&
        g.by < flipY + 20 &&
        g.bx > rightFx - FLIPPER_LEN &&
        g.bx < rightFx + 10
      ) {
        const hitFrac = (rightFx - g.bx) / FLIPPER_LEN;
        g.bvy = -(12 + hitFrac * 4);
        g.bvx = (0.5 - hitFrac) * 6 - 1;
        g.by = flipY - BALL_R - 6;
      }

      // Drain detection
      if (g.by > H + BALL_R) {
        g.balls -= 1;
        if (g.balls <= 0) {
          g.running = false;
          endGame(g.score >= WIN_SCORE, g.score);
          return;
        }
        resetBall();
      }
    };

    const loop = () => {
      update();
      draw();
      if (gameRef.current?.running) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (down) keysRef.current.add(e.key);
      else keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));

    // Touch controls
    const handleTouch = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < e.touches.length; i++) {
        const tx = e.touches[i].clientX - rect.left;
        if (tx < W / 2) keysRef.current.add("z");
        else keysRef.current.add("x");
      }
    };
    const handleTouchEnd = () => {
      keysRef.current.delete("z");
      keysRef.current.delete("x");
    };
    canvas.addEventListener("touchstart", handleTouch);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (gameRef.current) gameRef.current.running = false;
      window.removeEventListener("keydown", (e) => onKey(e, true));
      window.removeEventListener("keyup", (e) => onKey(e, false));
      canvas.removeEventListener("touchstart", handleTouch);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [phase, endGame]);

  return (
    <ArcadeCabinet title="PINBALL" color="#aa44ff">
      <div className="flex flex-col items-center gap-4 p-4">
        {/* Points badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-full px-4 py-1 text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #aa44ff, #6600cc)",
            color: "#fff",
            boxShadow: "0 0 12px rgba(170,68,255,0.7)",
          }}
        >
          🎟️ WIN EARNS POINTS!
        </motion.div>

        <AnimatePresence mode="wait">
          {phase === "bet" && (
            <motion.div
              key="bet"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-4 w-full max-w-sm"
            >
              <div className="text-white/70 text-sm">
                Balance:{" "}
                <span className="text-yellow-400 font-bold">
                  {balance.toString()} credits
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 w-full">
                {QUICK_BETS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setBet(String(q))}
                    className="rounded py-2 text-sm font-bold transition-all"
                    style={{
                      background:
                        bet === String(q) ? "#aa44ff" : "rgba(170,68,255,0.15)",
                      color: bet === String(q) ? "#fff" : "#aa44ff",
                      border: "1px solid rgba(170,68,255,0.4)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                className="w-full rounded border px-3 py-2 text-center text-white bg-black/40"
                style={{ borderColor: "rgba(170,68,255,0.4)" }}
                placeholder="Custom bet"
                data-ocid="pinball.input"
              />
              <Button
                onClick={() => {
                  if (betNum <= 0 || BigInt(betNum) > balance) {
                    toast.error("Invalid bet amount");
                    return;
                  }
                  setPhase("playing");
                  setDisplayScore(0);
                }}
                className="w-full font-bold text-lg py-3"
                style={{
                  background: "linear-gradient(135deg, #aa44ff, #6600cc)",
                  color: "#fff",
                }}
                data-ocid="pinball.primary_button"
              >
                LAUNCH! 🕹️
              </Button>
            </motion.div>
          )}

          {phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="text-white/70 text-sm">
                Score:{" "}
                <span className="text-purple-400 font-bold">
                  {displayScore}
                </span>{" "}
                / Need:{" "}
                <span className="text-green-400 font-bold">{WIN_SCORE}</span>
              </div>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="rounded-lg"
                style={{
                  border: "2px solid rgba(170,68,255,0.4)",
                  boxShadow: "0 0 20px rgba(170,68,255,0.3)",
                  touchAction: "none",
                  maxHeight: "55vh",
                }}
              />
              <div className="text-white/50 text-xs text-center">
                Z = Left Flipper · X = Right Flipper · Space = Launch
                <br />
                Mobile: Tap Left / Right side · Tap to launch
              </div>
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div
                className="text-5xl font-black"
                style={{
                  color: won ? "#aa44ff" : "#ff4444",
                  textShadow: `0 0 20px ${won ? "#aa44ff" : "#ff4444"}`,
                }}
              >
                {won ? "🕹️ HIGH SCORE!" : "TILT!"}
              </div>
              <div className="text-white/80">
                Final Score:{" "}
                <span className="text-purple-400 font-bold text-xl">
                  {displayScore}
                </span>
              </div>
              {won && (
                <div className="text-green-400 font-bold text-lg">
                  +{winAmount} credits 🎟️ +POINTS!
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setPhase("bet");
                    setDisplayScore(0);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #aa44ff, #6600cc)",
                    color: "#fff",
                  }}
                  data-ocid="pinball.primary_button"
                >
                  Play Again
                </Button>
                <Button
                  variant="outline"
                  onClick={onGameComplete}
                  data-ocid="pinball.secondary_button"
                >
                  Leave
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ArcadeCabinet>
  );
}

function lighten(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, r + 80);
  const lg = Math.min(255, g + 80);
  const lb = Math.min(255, b + 80);
  return `rgb(${lr},${lg},${lb})`;
}
