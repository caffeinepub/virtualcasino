import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const _GAME_DURATION = 30000;
const WIN_SCORE = 8;

type Phase = "bet" | "playing" | "result";

interface Enemy {
  id: number;
  x: number;
  y: number;
  size: number;
  hp: number;
  maxHp: number;
  color: string;
  visible: boolean;
  timer: number;
  maxTimer: number;
}

interface Shot {
  id: number;
  x: number;
  y: number;
}

export default function TimeCrisisGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [kills, setKills] = useState(0);
  const [lives, setLives] = useState(3);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const gameRef = useRef<{
    running: boolean;
    kills: number;
    lives: number;
    enemyId: number;
    shotId: number;
    startTime: number;
  }>({
    running: false,
    kills: 0,
    lives: 3,
    enemyId: 0,
    shotId: 0,
    startTime: 0,
  });
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endGame = useCallback(
    async (finalKills: number) => {
      gameRef.current.running = false;
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const didWin = finalKills >= WIN_SCORE;
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.timeCrisis,
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

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    gameRef.current = {
      running: true,
      kills: 0,
      lives: 3,
      enemyId: 0,
      shotId: 0,
      startTime: Date.now(),
    };
    setKills(0);
    setLives(3);
    setEnemies([]);
    setShots([]);
    setTimeLeft(30);
    setPhase("playing");

    const colors = ["#ff4444", "#ff8800", "#aa00ff", "#ff0088"];
    const spawnEnemy = () => {
      if (!gameRef.current.running) return;
      const id = gameRef.current.enemyId++;
      const _speed = 1 + gameRef.current.kills * 0.1;
      const maxTimer = Math.max(1500, 3000 - gameRef.current.kills * 100);
      setEnemies((prev) => [
        ...prev.slice(-8),
        {
          id,
          x: 10 + Math.random() * 80,
          y: 15 + Math.random() * 60,
          size: 32 + Math.random() * 20,
          hp: 1,
          maxHp: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          visible: true,
          timer: maxTimer,
          maxTimer,
        },
      ]);
    };

    spawnRef.current = setInterval(spawnEnemy, 1200 / Math.max(1, 1));
    spawnEnemy();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame(gameRef.current.kills);
          return 0;
        }
        return prev - 1;
      });
      // Decay enemy timers
      setEnemies((prev) =>
        prev
          .map((e) => {
            if (!e.visible) return e;
            const newTimer = e.timer - 1000;
            if (newTimer <= 0) {
              gameRef.current.lives = Math.max(0, gameRef.current.lives - 1);
              setLives(gameRef.current.lives);
              if (gameRef.current.lives <= 0) {
                endGame(gameRef.current.kills);
              }
              return { ...e, visible: false };
            }
            return { ...e, timer: newTimer };
          })
          .filter((e) => e.visible || e.timer > -500),
      );
    }, 1000);
  }, [betNum, balance, endGame]);

  const shoot = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      if (!gameRef.current.running) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      let cx: number;
      let cy: number;
      if ("touches" in e) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else {
        cx = (e as React.MouseEvent).clientX - rect.left;
        cy = (e as React.MouseEvent).clientY - rect.top;
      }
      const px = (cx / rect.width) * 100;
      const py = (cy / rect.height) * 100;
      const shotId = gameRef.current.shotId++;
      setShots((prev) => [...prev, { id: shotId, x: px, y: py }]);
      setTimeout(
        () => setShots((prev) => prev.filter((s) => s.id !== shotId)),
        300,
      );

      setEnemies((prev) =>
        prev.map((e) => {
          if (!e.visible) return e;
          const dx = Math.abs(e.x - px);
          const dy = Math.abs(e.y - py);
          const hitRadius = e.size / 2 / 4;
          if (dx < hitRadius && dy < hitRadius) {
            gameRef.current.kills++;
            setKills(gameRef.current.kills);
            return { ...e, visible: false };
          }
          return e;
        }),
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <ArcadeCabinet title="TIME CRISIS" color="#ff4444">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ff4444", textShadow: "0 0 10px #ff4444" }}
            >
              SHOOT TO SURVIVE
            </div>
            <div className="text-sm opacity-70 mt-1">
              Eliminate {WIN_SCORE} enemies to win 2×
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
                    ? { background: "#ff4444", borderColor: "#ff4444" }
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-red-500"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #ff4444, #aa0000)",
              boxShadow: "0 0 20px #ff444450",
            }}
          >
            🔫 PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="select-none">
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span style={{ color: "#ff4444" }}>
              KILLS: {kills}/{WIN_SCORE}
            </span>
            <span style={{ color: "#ffcc00" }}>TIME: {timeLeft}s</span>
            <span>{"❤️".repeat(lives)}</span>
          </div>
          <div
            className="relative mx-auto cursor-crosshair"
            style={{
              width: 280,
              height: 220,
              background:
                "linear-gradient(180deg, #1a0a0a 0%, #2a1010 60%, #3a2000 100%)",
              border: "2px solid #ff444433",
              overflow: "hidden",
            }}
            onClick={shoot}
            onKeyDown={(e) => {
              if (e.key === "Enter") shoot(e as any);
            }}
            role="presentation"
            onTouchStart={shoot}
          >
            {/* Scenery */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 40,
                background: "#2a1500",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 38,
                left: 20,
                width: 50,
                height: 60,
                background: "#3a2000",
                borderRadius: 4,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 38,
                right: 30,
                width: 40,
                height: 50,
                background: "#3a2000",
                borderRadius: 4,
              }}
            />
            {/* Enemies */}
            <AnimatePresence>
              {enemies
                .filter((e) => e.visible)
                .map((e) => (
                  <motion.div
                    key={e.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    style={{
                      position: "absolute",
                      left: `${e.x}%`,
                      top: `${e.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: e.size,
                      height: e.size,
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 35% 35%, ${e.color}cc, ${e.color}55)`,
                      border: `2px solid ${e.color}`,
                      boxShadow: `0 0 10px ${e.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    🎯
                  </motion.div>
                ))}
            </AnimatePresence>
            {/* Shot effects */}
            <AnimatePresence>
              {shots.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: "absolute",
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#ffcc0088",
                    pointerEvents: "none",
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
          <div className="text-center text-xs opacity-50 mt-2">
            Click/tap to shoot enemies!
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🔫" : "💀"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ffcc00" : "#ff4444" }}
          >
            {won ? "MISSION CLEAR!" : "GAME OVER"}
          </div>
          <div className="text-sm opacity-70">
            Kills: {kills} | Need {WIN_SCORE}
          </div>
          {won && (
            <div style={{ color: "#ffcc00" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button onClick={onGameComplete} style={{ background: "#ff4444" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
