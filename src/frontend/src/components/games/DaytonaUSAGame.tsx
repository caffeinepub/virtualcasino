import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 280;
const H = 180;
const LAPS = 3;
const LAP_DIST = 1000;
const WIN_TIME = 45; // seconds

type Phase = "bet" | "playing" | "result";

export default function DaytonaUSAGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({
    running: false,
    speed: 0,
    maxSpeed: 8,
    curve: 0,
    roadOffset: 0,
    lap: 1,
    lapDist: 0,
    startTime: 0,
    steer: 0,
    carX: W / 2,
    finishTime: null as number | null,
    obstacles: [] as { x: number; z: number; color: string }[],
    tick: 0,
  });
  const animRef = useRef<number | null>(null);
  const keysRef = useRef({ left: false, right: false, accel: false });

  const endGame = useCallback(
    async (didWin: boolean, finalTime: number) => {
      if (!gameRef.current.running) return;
      gameRef.current.running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      setElapsed(Number(finalTime.toFixed(1)));
      try {
        await recordOutcome({
          gameType: GameType.daytonaUSA,
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

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, "#1a1a3e");
    sky.addColorStop(1, "#4a2080");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.55);

    // Stars
    ctx.fillStyle = "#ffffff";
    for (let s = 0; s < 20; s++) {
      const sx = (s * 137 + g.tick * 0.5) % W;
      const sy = (s * 53) % (H * 0.4);
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Billboard
    ctx.fillStyle = "#cc2222";
    ctx.fillRect(W - 70, 20, 60, 30);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DAYTONA", W - 40, 32);
    ctx.fillText("500", W - 40, 44);

    // Road pseudo-3D
    const horizon = H * 0.55;
    for (let y = 0; y < H - horizon; y++) {
      const z = y / (H - horizon);
      const roadW = 30 + z * (W - 60);
      const roadX = (W - roadW) / 2 + g.curve * (1 - z) * 20;
      const isDark = Math.floor((y + g.roadOffset * z) / 20) % 2 === 0;
      ctx.fillStyle = isDark ? "#333344" : "#444455";
      ctx.fillRect(roadX, horizon + y, roadW, 1);
      // White lane lines
      if (Math.floor((y + g.roadOffset * z) / 10) % 4 === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(W / 2 - 2, horizon + y, 4, 2);
      }
      // Grass
      ctx.fillStyle = isDark ? "#116611" : "#228822";
      ctx.fillRect(0, horizon + y, roadX, 1);
      ctx.fillRect(roadX + roadW, horizon + y, W - roadX - roadW, 1);
    }

    // Curb stripes
    for (let y = 0; y < H - horizon; y += 10) {
      const z = y / (H - horizon);
      const roadW = 30 + z * (W - 60);
      const roadX = (W - roadW) / 2 + g.curve * (1 - z) * 20;
      ctx.fillStyle = y % 20 === 0 ? "#ff2222" : "#ffffff";
      ctx.fillRect(roadX, horizon + y, 8, 5);
      ctx.fillRect(roadX + roadW - 8, horizon + y, 8, 5);
    }

    // Player car
    const carX = g.carX;
    const carY = H - 35;
    ctx.fillStyle = "#ffaa00";
    ctx.fillRect(carX - 14, carY, 28, 18);
    ctx.fillStyle = "#cc6600";
    ctx.fillRect(carX - 10, carY - 6, 20, 10);
    ctx.fillStyle = "#88ccff";
    ctx.fillRect(carX - 7, carY - 4, 14, 6);
    ctx.fillStyle = "#111111";
    ctx.fillRect(carX - 14, carY + 12, 8, 6);
    ctx.fillRect(carX + 6, carY + 12, 8, 6);

    // Exhaust flames if accelerating
    if (keysRef.current.accel && g.speed > 2) {
      ctx.fillStyle = "#ff6600";
      ctx.fillRect(carX - 4, carY + 18, 8, 4 + Math.random() * 6);
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, 18);
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    const now =
      g.finishTime !== null ? g.finishTime : (Date.now() - g.startTime) / 1000;
    ctx.fillText(`LAP ${g.lap}/${LAPS}  ⏱ ${now.toFixed(1)}s`, 5, 13);
    ctx.textAlign = "right";
    ctx.fillStyle = "#44ff88";
    ctx.fillText(`SPD ${Math.round(g.speed * 20)}km/h`, W - 5, 13);
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameRef.current.running) return;
    const g = gameRef.current;
    const keys = keysRef.current;
    g.tick++;

    if (keys.accel) g.speed = Math.min(g.maxSpeed, g.speed + 0.12);
    else g.speed = Math.max(0, g.speed - 0.05);

    if (keys.left) g.carX = Math.max(60, g.carX - 3);
    if (keys.right) g.carX = Math.min(W - 60, g.carX + 3);

    // Road curve oscillates
    g.curve = Math.sin(g.tick * 0.02) * 0.8;
    g.roadOffset += g.speed;

    g.lapDist += g.speed;
    if (g.lapDist >= LAP_DIST) {
      g.lapDist = 0;
      g.lap++;
      if (g.lap > LAPS) {
        const finalTime = (Date.now() - g.startTime) / 1000;
        g.finishTime = finalTime;
        endGame(finalTime <= WIN_TIME, finalTime);
        return;
      }
    }

    const elapsed = (Date.now() - g.startTime) / 1000;
    if (elapsed > WIN_TIME + 10) {
      endGame(false, elapsed);
      return;
    }

    drawGame();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawGame, endGame]);

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    gameRef.current = {
      running: true,
      speed: 0,
      maxSpeed: 8,
      curve: 0,
      roadOffset: 0,
      lap: 1,
      lapDist: 0,
      startTime: Date.now(),
      steer: 0,
      carX: W / 2,
      finishTime: null,
      obstacles: [],
      tick: 0,
    };
    setElapsed(0);
    setPhase("playing");
    animRef.current = requestAnimationFrame(gameLoop);
  }, [betNum, balance, gameLoop]);

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = true;
      if (e.key === "ArrowUp" || e.key === " ") {
        e.preventDefault();
        keysRef.current.accel = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d")
        keysRef.current.right = false;
      if (e.key === "ArrowUp" || e.key === " ") keysRef.current.accel = false;
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
      if (animRef.current) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  const btnStyle = (active: boolean) => ({
    width: 70,
    height: 50,
    background: active ? "#ffaa0033" : "#ffaa0011",
    border: "2px solid #ffaa00",
    borderRadius: 8,
    color: "#ffaa00",
    fontSize: 18,
    fontWeight: "bold" as const,
  });

  return (
    <ArcadeCabinet title="DAYTONA USA" color="#ffaa00">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ffaa00", textShadow: "0 0 10px #ffaa00" }}
            >
              RACE TO WIN!
            </div>
            <div className="text-sm opacity-70 mt-1">
              Hold ↑ to accelerate, ←/→ to steer. Complete {LAPS} laps in{" "}
              {WIN_TIME}s to win 2×!
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
                        background: "#ffaa00",
                        borderColor: "#ffaa00",
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-yellow-400"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #ffaa00, #cc6600)",
              color: "#000",
              boxShadow: "0 0 20px #ffaa0050",
            }}
          >
            🏎️ RACE FOR {betNum} CREDITS
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
          <div className="flex justify-center gap-2 pb-2 mt-2">
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.left = true;
              }}
              onPointerUp={() => {
                keysRef.current.left = false;
              }}
              style={btnStyle(false)}
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.accel = true;
              }}
              onPointerUp={() => {
                keysRef.current.accel = false;
              }}
              style={{ ...btnStyle(false), width: 90, fontSize: 14 }}
            >
              ⛽ GAS
            </button>
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.right = true;
              }}
              onPointerUp={() => {
                keysRef.current.right = false;
              }}
              style={btnStyle(false)}
            >
              ▶
            </button>
          </div>
        </div>
      )}
      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🏆" : "💨"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ffaa00" : "#ff4444" }}
          >
            {won ? "CHECKERED FLAG!" : "OUT OF TIME!"}
          </div>
          <div className="text-sm opacity-70">
            Time: {elapsed}s (need &lt;{WIN_TIME}s)
          </div>
          {won && (
            <div style={{ color: "#ffaa00" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button
              onClick={onGameComplete}
              style={{ background: "#ffaa00", color: "#000" }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
