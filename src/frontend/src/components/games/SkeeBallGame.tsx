import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const WIN_SCORE = 80;
const TOTAL_THROWS = 3;

type Phase = "bet" | "playing" | "result";

const RINGS = [
  { pts: 10, color: "#cc4444", r: 140 },
  { pts: 20, color: "#cc8844", r: 112 },
  { pts: 30, color: "#cccc44", r: 84 },
  { pts: 40, color: "#44cc88", r: 56 },
  { pts: 100, color: "#ffd700", r: 28 },
];

export default function SkeeBallGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [throwsLeft, setThrowsLeft] = useState(TOTAL_THROWS);
  const [, setLastRingScore] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const gameRef = useRef<{
    power: number;
    filling: boolean;
    throwing: boolean;
    ballX: number;
    ballY: number;
    ballVY: number;
    score: number;
    throwsLeft: number;
    running: boolean;
    lastRingScore: number | null;
    animFrame: number;
  } | null>(null);

  const rafRef = useRef<number | null>(null);

  const endGame = useCallback(
    async (didWin: boolean, finalScore: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const win = didWin ? betNum * 2 : 0;
      try {
        await recordOutcome({
          gameType: GameType.skeeBall,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
      } catch {
        toast.error("Failed to record outcome");
      }
      setTotalScore(finalScore);
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

    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const ringCenterY = 90;

    gameRef.current = {
      power: 0,
      filling: true,
      throwing: false,
      ballX: CX,
      ballY: H - 30,
      ballVY: 0,
      score: 0,
      throwsLeft: TOTAL_THROWS,
      running: true,
      lastRingScore: null,
      animFrame: 0,
    };

    const draw = () => {
      const g = gameRef.current;
      if (!g || !g.running) return;

      ctx.clearRect(0, 0, W, H);

      // Lane background - dark wood
      const laneGrad = ctx.createLinearGradient(0, 0, W, 0);
      laneGrad.addColorStop(0, "#3a2010");
      laneGrad.addColorStop(0.5, "#5a3820");
      laneGrad.addColorStop(1, "#3a2010");
      ctx.fillStyle = laneGrad;
      ctx.fillRect(0, 0, W, H);

      // Wood grain lines
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < H; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i + Math.sin(i * 0.1) * 2);
        ctx.lineTo(W, i + Math.cos(i * 0.08) * 2);
        ctx.stroke();
      }

      // Ramp at top
      const rampGrad = ctx.createLinearGradient(CX - 80, 140, CX + 80, 180);
      rampGrad.addColorStop(0, "#7a5030");
      rampGrad.addColorStop(0.5, "#c08050");
      rampGrad.addColorStop(1, "#7a5030");
      ctx.fillStyle = rampGrad;
      ctx.beginPath();
      ctx.moveTo(CX - 80, 170);
      ctx.lineTo(CX + 80, 170);
      ctx.lineTo(CX + 50, 140);
      ctx.lineTo(CX - 50, 140);
      ctx.closePath();
      ctx.fill();

      // Scoring rings (concentric, center at ringCenterY)
      for (let i = 0; i < RINGS.length; i++) {
        const ring = RINGS[i];
        // Shadow
        ctx.beginPath();
        ctx.arc(CX, ringCenterY, ring.r + 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fill();
        // Ring
        ctx.beginPath();
        ctx.arc(CX, ringCenterY, ring.r, 0, Math.PI * 2);
        ctx.fillStyle = ring.color;
        ctx.fill();
        // Glow for center
        if (i === RINGS.length - 1) {
          ctx.beginPath();
          ctx.arc(CX, ringCenterY, ring.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,215,0,0.5)";
          ctx.fill();
          // Inner gold highlight
          const goldGrad = ctx.createRadialGradient(
            CX - 5,
            ringCenterY - 5,
            2,
            CX,
            ringCenterY,
            ring.r,
          );
          goldGrad.addColorStop(0, "rgba(255,255,200,0.8)");
          goldGrad.addColorStop(1, "rgba(255,215,0,0)");
          ctx.fillStyle = goldGrad;
          ctx.fill();
        }
        // Label
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${i === RINGS.length - 1 ? 10 : 11}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (i < RINGS.length - 1) {
          ctx.fillText(
            `${ring.pts}`,
            CX + RINGS[i + 1].r + (ring.r - RINGS[i + 1].r) / 2,
            ringCenterY,
          );
        } else {
          ctx.fillText(`${ring.pts}`, CX, ringCenterY);
        }
      }

      // Power meter bar
      if (!g.throwing) {
        const barX = 20;
        const barY = H - 50;
        const barW = W - 40;
        const barH = 16;
        // Background
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        // Fill
        const powerGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        powerGrad.addColorStop(0, "#00ff88");
        powerGrad.addColorStop(0.5, "#ffcc00");
        powerGrad.addColorStop(1, "#ff3300");
        ctx.fillStyle = powerGrad;
        ctx.fillRect(barX, barY, barW * g.power, barH);
        // Border
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
        // Label
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("POWER - CLICK TO THROW", W / 2, H - 60);
      }

      // Ball
      if (!g.throwing || g.ballY >= 0) {
        const ballGrad = ctx.createRadialGradient(
          g.ballX - 6,
          g.ballY - 6,
          2,
          g.ballX,
          g.ballY,
          18,
        );
        ballGrad.addColorStop(0, "#fffbe8");
        ballGrad.addColorStop(0.4, "#f0e8d0");
        ballGrad.addColorStop(1, "#b0985a");
        ctx.beginPath();
        ctx.arc(g.ballX, g.ballY, 18, 0, Math.PI * 2);
        ctx.fillStyle = ballGrad;
        ctx.fill();
        // Shadow
        ctx.beginPath();
        ctx.arc(g.ballX + 4, g.ballY + 4, 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fill();
        // Redraw ball on top of shadow
        ctx.beginPath();
        ctx.arc(g.ballX, g.ballY, 18, 0, Math.PI * 2);
        ctx.fillStyle = ballGrad;
        ctx.fill();
        ctx.strokeStyle = "rgba(150,120,60,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Throws counter
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W - 100, 8, 92, 32);
      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`BALLS: ${g.throwsLeft}`, W - 54, 28);

      // Score display
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(8, 8, 100, 32);
      ctx.fillStyle = "#00ffcc";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`SCORE: ${g.score}`, 58, 28);

      // Last ring score flash
      if (g.lastRingScore !== null) {
        ctx.fillStyle = "rgba(255,215,0,0.95)";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`+${g.lastRingScore}!`, CX, ringCenterY + 40);
      }
    };

    // Power filling
    let powerDir = 1;
    const SPEED = 0.008;

    const throwBall = () => {
      const g = gameRef.current;
      if (!g || g.throwing) return;
      g.throwing = true;
      // Map power to ring: high power (0.8-1.0)=center, medium=middle rings, low=outer
      const power = g.power;
      let ringIdx: number;
      if (power > 0.9)
        ringIdx = 4; // 100
      else if (power > 0.75)
        ringIdx = 3; // 40
      else if (power > 0.6)
        ringIdx = 2; // 30
      else if (power > 0.45)
        ringIdx = 1; // 20
      else ringIdx = 0; // 10
      // Small randomness
      ringIdx = Math.max(
        0,
        Math.min(
          4,
          ringIdx + (Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0),
        ),
      );
      const pts = RINGS[ringIdx].pts;

      // Animate ball
      const targetY = ringCenterY;
      const startY = g.ballY;
      const totalFrames = 30;
      let frame = 0;

      const animThrow = () => {
        const g2 = gameRef.current;
        if (!g2 || !g2.running) return;
        frame++;
        g2.ballY = startY + (targetY - startY) * (frame / totalFrames);
        draw();
        if (frame < totalFrames) {
          rafRef.current = requestAnimationFrame(animThrow);
        } else {
          // Land
          g2.score += pts;
          g2.lastRingScore = pts;
          g2.throwsLeft -= 1;
          setThrowsLeft(g2.throwsLeft);
          setTotalScore(g2.score);
          setLastRingScore(pts);
          draw();

          // Clear ring score after delay, then reset ball
          setTimeout(() => {
            if (!gameRef.current) return;
            gameRef.current.lastRingScore = null;
            if (gameRef.current.throwsLeft <= 0) {
              const finalScore = gameRef.current.score;
              gameRef.current.running = false;
              endGame(finalScore >= WIN_SCORE, finalScore);
              return;
            }
            // Reset ball
            gameRef.current.ballY = canvasRef.current
              ? canvasRef.current.height - 30
              : 270;
            gameRef.current.ballX = canvasRef.current
              ? canvasRef.current.width / 2
              : 200;
            gameRef.current.throwing = false;
            gameRef.current.power = 0;
            powerDir = 1;
            startLoop();
          }, 900);
        }
      };
      rafRef.current = requestAnimationFrame(animThrow);
    };

    const startLoop = () => {
      const loop = () => {
        const g = gameRef.current;
        if (!g || !g.running || g.throwing) return;
        g.power += SPEED * powerDir;
        if (g.power >= 1) {
          g.power = 1;
          powerDir = -1;
        }
        if (g.power <= 0) {
          g.power = 0;
          powerDir = 1;
        }
        draw();
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    };

    const handleClick = () => {
      const g = gameRef.current;
      if (!g || g.throwing) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      throwBall();
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleClick);
    startLoop();

    return () => {
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchstart", handleClick);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (gameRef.current) gameRef.current.running = false;
    };
  }, [phase, endGame]);

  return (
    <ArcadeCabinet title="SKEE-BALL" color="#ffaa00">
      <div className="flex flex-col items-center gap-4 p-4">
        {/* Points badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-full px-4 py-1 text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #ffd700, #ff8c00)",
            color: "#1a0a00",
            boxShadow: "0 0 12px rgba(255,165,0,0.7)",
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
                        bet === String(q) ? "#ffaa00" : "rgba(255,170,0,0.15)",
                      color: bet === String(q) ? "#1a0a00" : "#ffaa00",
                      border: "1px solid rgba(255,170,0,0.4)",
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
                style={{ borderColor: "rgba(255,170,0,0.4)" }}
                placeholder="Custom bet"
                data-ocid="skeebal.input"
              />
              <Button
                onClick={() => {
                  if (betNum <= 0 || BigInt(betNum) > balance) {
                    toast.error("Invalid bet amount");
                    return;
                  }
                  setPhase("playing");
                  setTotalScore(0);
                  setThrowsLeft(TOTAL_THROWS);
                  setLastRingScore(null);
                }}
                className="w-full font-bold text-lg py-3"
                style={{
                  background: "linear-gradient(135deg, #ffaa00, #ff6600)",
                  color: "#1a0a00",
                }}
                data-ocid="skeeball.primary_button"
              >
                ROLL! 🎳
              </Button>
            </motion.div>
          )}

          {phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="text-white/70 text-sm">
                Throw {TOTAL_THROWS - throwsLeft + 1} of {TOTAL_THROWS} — Score:{" "}
                <span className="text-yellow-400 font-bold">{totalScore}</span>{" "}
                / Need:{" "}
                <span className="text-green-400 font-bold">{WIN_SCORE}</span>
              </div>
              <canvas
                ref={canvasRef}
                width={400}
                height={300}
                className="rounded-lg cursor-pointer"
                style={{
                  border: "2px solid rgba(255,170,0,0.4)",
                  boxShadow: "0 0 20px rgba(255,120,0,0.3)",
                  touchAction: "none",
                }}
              />
              <div className="text-white/50 text-xs">
                Click / tap the lane to throw!
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
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: `0 0 20px ${won ? "#ffd700" : "#ff4444"}`,
                }}
              >
                {won ? "🎳 STRIKE!" : "GUTTER BALL"}
              </div>
              <div className="text-white/80">
                Final Score:{" "}
                <span className="text-yellow-400 font-bold text-xl">
                  {totalScore}
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
                    setTotalScore(0);
                    setThrowsLeft(TOTAL_THROWS);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #ffaa00, #ff6600)",
                    color: "#1a0a00",
                  }}
                  data-ocid="skeeball.primary_button"
                >
                  Play Again
                </Button>
                <Button
                  variant="outline"
                  onClick={onGameComplete}
                  data-ocid="skeeball.secondary_button"
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
