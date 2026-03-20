import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const DISTANCE = 100;
const WIN_TIME = 12; // seconds
const W = 280;
const H = 180;

type Phase = "bet" | "playing" | "result";

export default function TrackAndFieldGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [_progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [_finished, setFinished] = useState(false);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    running: boolean;
    progress: number;
    speed: number;
    lastKey: string;
    startTime: number;
    finishTime: number | null;
    legPhase: number;
    tick: number;
  }>({
    running: false,
    progress: 0,
    speed: 0,
    lastKey: "",
    startTime: 0,
    finishTime: null,
    legPhase: 0,
    tick: 0,
  });
  const animRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endGame = useCallback(
    async (didWin: boolean, finalTime: number) => {
      if (!gameRef.current.running) return;
      gameRef.current.running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      setElapsed(Number(finalTime.toFixed(2)));
      setFinished(true);
      try {
        await recordOutcome({
          gameType: GameType.trackAndField,
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

    // Sky
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, W, H * 0.5);

    // Stands
    ctx.fillStyle = "#cc4444";
    ctx.fillRect(0, 20, W, H * 0.3);
    // Stand rows
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#aa2222" : "#dd5555";
      ctx.fillRect(0, 20 + i * 15, W, 12);
      // People dots
      for (let j = 0; j < W; j += 8) {
        ctx.fillStyle = ["#ffeecc", "#ffcc88", "#aa6644", "#eeeeee"][
          Math.floor(Math.random() * 4)
        ];
        ctx.beginPath();
        ctx.arc(j + 4, 26 + i * 15, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Track
    ctx.fillStyle = "#cc8844";
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    // Lane lines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    for (let lane = 0; lane < 3; lane++) {
      const ly = H * 0.55 + (lane + 1) * ((H * 0.45) / 4);
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(W, ly);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Progress bar background
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(10, H - 28, W - 20, 16);
    ctx.fillStyle = "#44ff88";
    ctx.shadowColor = "#44ff88";
    ctx.shadowBlur = 8;
    ctx.fillRect(10, H - 28, (W - 20) * (g.progress / DISTANCE), 16);
    ctx.shadowBlur = 0;
    // Finish line marker
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W - 10, H - 28);
    ctx.lineTo(W - 10, H - 12);
    ctx.stroke();

    // Finish line on track
    const finishX = W - 20;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(finishX, H * 0.55);
    ctx.lineTo(finishX, H);
    ctx.stroke();
    // Checkered pattern
    for (let ck = 0; ck < 8; ck++) {
      ctx.fillStyle = ck % 2 === 0 ? "#ffffff" : "#000000";
      ctx.fillRect(finishX, H * 0.55 + ck * 8, 6, 8);
      ctx.fillStyle = ck % 2 === 0 ? "#000000" : "#ffffff";
      ctx.fillRect(finishX + 6, H * 0.55 + ck * 8, 6, 8);
    }

    // Runner position on track
    const runnerX = 20 + (W - 60) * (g.progress / DISTANCE);
    const runnerY = H * 0.65;

    // Runner sprite (animated legs)
    const legAngle = Math.sin(g.legPhase) * 15;
    ctx.save();
    ctx.translate(runnerX, runnerY);
    // Body
    ctx.fillStyle = "#ff2244";
    ctx.fillRect(-5, -22, 10, 14);
    // Head
    ctx.fillStyle = "#ffcc99";
    ctx.beginPath();
    ctx.arc(0, -27, 6, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.strokeStyle = "#1a1a44";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(legAngle / 2, 0);
    ctx.lineTo(legAngle, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-legAngle / 2, 0);
    ctx.lineTo(-legAngle, 10);
    ctx.stroke();
    ctx.restore();

    // HUD timer
    const now =
      g.finishTime !== null ? g.finishTime : (Date.now() - g.startTime) / 1000;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, 20);
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`⏱ ${now.toFixed(2)}s / ${WIN_TIME}s`, 8, 14);
    ctx.textAlign = "right";
    ctx.fillStyle = "#44ff88";
    ctx.fillText(`${Math.floor(g.progress)}m / ${DISTANCE}m`, W - 8, 14);
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameRef.current.running) return;
    const g = gameRef.current;
    g.tick++;

    // Decelerate
    g.speed = Math.max(0, g.speed - 0.04);
    g.progress = Math.min(DISTANCE, g.progress + g.speed);
    if (g.speed > 0.1) g.legPhase += g.speed * 0.5;

    setProgress(Math.floor(g.progress));

    if (g.progress >= DISTANCE) {
      const finalTime = (Date.now() - g.startTime) / 1000;
      g.finishTime = finalTime;
      endGame(finalTime <= WIN_TIME, finalTime);
      return;
    }

    // Timeout check
    const elapsed = (Date.now() - g.startTime) / 1000;
    if (elapsed > WIN_TIME + 5) {
      endGame(false, elapsed);
      return;
    }

    drawGame();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawGame, endGame]);

  const handleKey = useCallback((key: string) => {
    const g = gameRef.current;
    if (!g.running) return;
    const expected = g.lastKey === "a" ? "d" : "a";
    if (key === expected) {
      g.speed = Math.min(3, g.speed + 0.5);
      g.lastKey = key;
    } else if (key === "a" && g.lastKey === "") {
      g.speed = Math.min(3, g.speed + 0.3);
      g.lastKey = "a";
    }
  }, []);

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    gameRef.current = {
      running: true,
      progress: 0,
      speed: 0,
      lastKey: "",
      startTime: Date.now(),
      finishTime: null,
      legPhase: 0,
      tick: 0,
    };
    setProgress(0);
    setElapsed(0);
    setFinished(false);
    setPhase("playing");
    animRef.current = requestAnimationFrame(gameLoop);
    timerRef.current = setInterval(() => {
      const t = (Date.now() - gameRef.current.startTime) / 1000;
      setElapsed(Number(t.toFixed(1)));
    }, 100);
  }, [betNum, balance, gameLoop]);

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "ArrowLeft") {
        e.preventDefault();
        handleKey("a");
      } else if (e.key === "d" || e.key === "ArrowRight") {
        e.preventDefault();
        handleKey("d");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleKey]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <ArcadeCabinet title="TRACK & FIELD" color="#44dd44">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#44dd44", textShadow: "0 0 10px #44dd44" }}
            >
              100m DASH!
            </div>
            <div className="text-sm opacity-70 mt-1">
              Rapidly alternate A & D (or ←/→) to sprint. Beat {WIN_TIME}s to
              win 2×!
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
                        background: "#44dd44",
                        borderColor: "#44dd44",
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-green-400"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #44dd44, #228822)",
              color: "#000",
              boxShadow: "0 0 20px #44dd4450",
            }}
          >
            🏃 PLAY FOR {betNum} CREDITS
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
              onClick={() => handleKey("a")}
              style={{
                width: 80,
                height: 50,
                background: "#44dd4422",
                border: "2px solid #44dd44",
                borderRadius: 8,
                color: "#44dd44",
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              A ←
            </button>
            <div
              className="flex flex-col items-center justify-center text-xs"
              style={{ color: "#44dd44" }}
            >
              <div>TAP</div>
              <div>ALTERNATE</div>
              <div>FAST!</div>
            </div>
            <button
              type="button"
              onClick={() => handleKey("d")}
              style={{
                width: 80,
                height: 50,
                background: "#44dd4422",
                border: "2px solid #44dd44",
                borderRadius: 8,
                color: "#44dd44",
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              D →
            </button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🏅" : "😓"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#44dd44" : "#ff4444" }}
          >
            {won ? "NEW RECORD!" : "TOO SLOW!"}
          </div>
          <div className="text-sm opacity-70">
            Time: {elapsed}s (need &lt;{WIN_TIME}s)
          </div>
          {won && (
            <div style={{ color: "#44dd44" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button
              onClick={onGameComplete}
              style={{ background: "#44dd44", color: "#000" }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
