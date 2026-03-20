import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const WIN_TIME = 30; // seconds to survive
const GRID = 40;
const CELL = 7;

type Phase = "bet" | "playing" | "result";
type Dir = { x: number; y: number };

export default function TronGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(WIN_TIME);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    running: boolean;
    trail: { x: number; y: number }[];
    dir: Dir;
    nextDir: Dir;
    aiTrail: { x: number; y: number }[];
    aiDir: Dir;
    aiNextDir: Dir;
    startTime: number;
    won: boolean;
  }>({
    running: false,
    trail: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    aiTrail: [],
    aiDir: { x: -1, y: 0 },
    aiNextDir: { x: -1, y: 0 },
    startTime: 0,
    won: false,
  });
  const animRef = useRef<number | null>(null);
  const lastMoveRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endGame = useCallback(
    async (didWin: boolean) => {
      if (!gameRef.current.running) return;
      gameRef.current.running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.tron,
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

    ctx.fillStyle = "#000010";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "rgba(0, 80, 120, 0.3)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, GRID * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(GRID * CELL, i * CELL);
      ctx.stroke();
    }

    // Draw player trail (cyan)
    for (const seg of g.trail) {
      ctx.fillStyle = "#00ffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 8;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    }
    // Player head
    if (g.trail.length > 0) {
      const head = g.trail[g.trail.length - 1];
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 16;
      ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);
    }
    ctx.shadowBlur = 0;

    // Draw AI trail (red/magenta)
    for (const seg of g.aiTrail) {
      ctx.fillStyle = "#ff0066";
      ctx.shadowColor = "#ff0066";
      ctx.shadowBlur = 8;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    }
    if (g.aiTrail.length > 0) {
      const aiHead = g.aiTrail[g.aiTrail.length - 1];
      ctx.fillStyle = "#ff66aa";
      ctx.shadowColor = "#ff0066";
      ctx.shadowBlur = 16;
      ctx.fillRect(aiHead.x * CELL, aiHead.y * CELL, CELL, CELL);
    }
    ctx.shadowBlur = 0;
  }, []);

  const updateGame = useCallback(
    (timestamp: number) => {
      if (!gameRef.current.running) return;
      const g = gameRef.current;

      if (timestamp - lastMoveRef.current > 120) {
        lastMoveRef.current = timestamp;
        g.dir = g.nextDir;

        const head =
          g.trail.length > 0
            ? g.trail[g.trail.length - 1]
            : { x: 10, y: GRID / 2 };
        const nx = head.x + g.dir.x;
        const ny = head.y + g.dir.y;

        // Check wall collision
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
          endGame(false);
          return;
        }
        // Check self collision
        if (g.trail.some((s) => s.x === nx && s.y === ny)) {
          endGame(false);
          return;
        }
        // Check AI collision
        if (g.aiTrail.some((s) => s.x === nx && s.y === ny)) {
          endGame(false);
          return;
        }
        g.trail.push({ x: nx, y: ny });

        // AI move
        const aiHead =
          g.aiTrail.length > 0
            ? g.aiTrail[g.aiTrail.length - 1]
            : { x: GRID - 10, y: GRID / 2 };
        // AI simple: try to go opposite of player
        const possibleDirs: Dir[] = [
          { x: -1, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: -1 },
          { x: 0, y: 1 },
        ].filter((d) => {
          const ax = aiHead.x + d.x;
          const ay = aiHead.y + d.y;
          if (ax < 0 || ax >= GRID || ay < 0 || ay >= GRID) return false;
          if (g.aiTrail.some((s) => s.x === ax && s.y === ay)) return false;
          if (g.trail.some((s) => s.x === ax && s.y === ay)) return false;
          return true;
        });
        if (possibleDirs.length === 0) {
          endGame(true);
          return;
        }
        const aiD =
          possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        g.aiDir = aiD;
        const anx = aiHead.x + aiD.x;
        const any = aiHead.y + aiD.y;
        g.aiTrail.push({ x: anx, y: any });
      }

      drawGame();
      animRef.current = requestAnimationFrame(updateGame);
    },
    [drawGame, endGame],
  );

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    gameRef.current = {
      running: true,
      trail: [{ x: 10, y: GRID / 2 }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      aiTrail: [{ x: GRID - 10, y: GRID / 2 }],
      aiDir: { x: -1, y: 0 },
      aiNextDir: { x: -1, y: 0 },
      startTime: Date.now(),
      won: false,
    };
    setTimeLeft(WIN_TIME);
    setPhase("playing");
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - gameRef.current.startTime) / 1000;
      const remaining = Math.max(0, WIN_TIME - Math.floor(elapsed));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        endGame(true);
      }
    }, 500);
    lastMoveRef.current = 0;
    animRef.current = requestAnimationFrame(updateGame);
  }, [betNum, balance, endGame, updateGame]);

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        if (g.dir.y !== 1) g.nextDir = { x: 0, y: -1 };
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        if (g.dir.y !== -1) g.nextDir = { x: 0, y: 1 };
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        if (g.dir.x !== 1) g.nextDir = { x: -1, y: 0 };
      } else if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        if (g.dir.x !== -1) g.nextDir = { x: 1, y: 0 };
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSwipe = useCallback((dx: number, dy: number) => {
    const g = gameRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && g.dir.x !== -1) g.nextDir = { x: 1, y: 0 };
      else if (dx < 0 && g.dir.x !== 1) g.nextDir = { x: -1, y: 0 };
    } else {
      if (dy > 0 && g.dir.y !== -1) g.nextDir = { x: 0, y: 1 };
      else if (dy < 0 && g.dir.y !== 1) g.nextDir = { x: 0, y: -1 };
    }
  }, []);

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <ArcadeCabinet title="TRON" color="#00ffff">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#00ffff", textShadow: "0 0 10px #00ffff" }}
            >
              LIGHT CYCLE
            </div>
            <div className="text-sm opacity-70 mt-1">
              Survive {WIN_TIME}s without crashing to win 2× your bet
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
                        background: "#00ffff",
                        borderColor: "#00ffff",
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-cyan-400"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #00ffff, #0088ff)",
              color: "#000",
              boxShadow: "0 0 20px #00ffff50",
            }}
          >
            🏍️ PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div>
          <div className="flex justify-between px-4 py-1 text-sm font-bold">
            <span style={{ color: "#00ffff" }}>⏱ {timeLeft}s</span>
            <span style={{ color: "#ff0066" }}>VS AI</span>
          </div>
          <canvas
            ref={canvasRef}
            width={GRID * CELL}
            height={GRID * CELL}
            style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStart.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={(e) => {
              if (!touchStart.current) return;
              const t = e.changedTouches[0];
              handleSwipe(
                t.clientX - touchStart.current.x,
                t.clientY - touchStart.current.y,
              );
              touchStart.current = null;
            }}
          />
          <div className="flex justify-center gap-2 mt-2 pb-2">
            <div className="flex flex-col gap-1">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleSwipe(0, -30)}
                  style={{
                    width: 36,
                    height: 36,
                    background: "#00ffff22",
                    border: "1px solid #00ffff",
                    borderRadius: 6,
                    color: "#00ffff",
                    fontSize: 16,
                  }}
                >
                  ↑
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleSwipe(-30, 0)}
                  style={{
                    width: 36,
                    height: 36,
                    background: "#00ffff22",
                    border: "1px solid #00ffff",
                    borderRadius: 6,
                    color: "#00ffff",
                    fontSize: 16,
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => handleSwipe(0, 30)}
                  style={{
                    width: 36,
                    height: 36,
                    background: "#00ffff22",
                    border: "1px solid #00ffff",
                    borderRadius: 6,
                    color: "#00ffff",
                    fontSize: 16,
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleSwipe(30, 0)}
                  style={{
                    width: 36,
                    height: 36,
                    background: "#00ffff22",
                    border: "1px solid #00ffff",
                    borderRadius: 6,
                    color: "#00ffff",
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
          <div className="text-4xl">{won ? "🏍️" : "💥"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#00ffff" : "#ff4444" }}
          >
            {won ? "DEREZZED OPPONENT!" : "LINE CROSSED!"}
          </div>
          {won && (
            <div style={{ color: "#00ffff" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button
              onClick={onGameComplete}
              style={{ background: "#00ffff", color: "#000" }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
