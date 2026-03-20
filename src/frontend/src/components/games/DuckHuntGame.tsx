import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const TOTAL_ROUNDS = 3;
const DUCKS_PER_ROUND = 3;
const WIN_HITS = 6;

type Phase = "bet" | "playing" | "result";

interface Duck {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  shot: boolean;
  flown: boolean;
}

export default function DuckHuntGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [hits, setHits] = useState(0);
  const [round, setRound] = useState(1);
  const [ducks, setDucks] = useState<Duck[]>([]);
  const [showDog, setShowDog] = useState(false);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(
    null,
  );
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const gameRef = useRef<{
    running: boolean;
    hits: number;
    round: number;
    duckId: number;
    misses: number;
  }>({
    running: false,
    hits: 0,
    round: 1,
    duckId: 0,
    misses: 0,
  });
  const rafRef = useRef<number | null>(null);

  const endGame = useCallback(
    async (finalHits: number) => {
      gameRef.current.running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const didWin = finalHits >= WIN_HITS;
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.duckHunt,
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

  const spawnRound = useCallback((roundNum: number) => {
    const newDucks: Duck[] = [];
    for (let i = 0; i < DUCKS_PER_ROUND; i++) {
      newDucks.push({
        id: gameRef.current.duckId++,
        x: 10 + Math.random() * 80,
        y: 20 + Math.random() * 40,
        vx: (Math.random() > 0.5 ? 1 : -1) * (2 + roundNum * 0.5),
        vy: (Math.random() - 0.5) * 1.5,
        shot: false,
        flown: false,
      });
    }
    setDucks(newDucks);
  }, []);

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    gameRef.current = {
      running: true,
      hits: 0,
      round: 1,
      duckId: 0,
      misses: 0,
    };
    setHits(0);
    setRound(1);
    setShowDog(false);
    setPhase("playing");
    spawnRound(1);

    let lastTime = Date.now();
    const loop = () => {
      if (!gameRef.current.running) return;
      const now = Date.now();
      const dt = (now - lastTime) / 16;
      lastTime = now;

      setDucks((prev) => {
        const updated = prev.map((d) => {
          if (d.shot || d.flown) return d;
          let nx = d.x + d.vx * dt;
          let ny = d.y + d.vy * dt;
          let nvx = d.vx;
          let nvy = d.vy;
          if (nx < 5 || nx > 95) nvx = -nvx;
          if (ny < 5 || ny > 65) nvy = -nvy;
          if (ny > 75) return { ...d, flown: true };
          return { ...d, x: nx, y: ny, vx: nvx, vy: nvy };
        });
        const allDone = updated.every((d) => d.shot || d.flown);
        if (allDone && gameRef.current.running) {
          const misses = updated.filter((d) => d.flown).length;
          if (misses > 0) setShowDog(true);
          const nextRound = gameRef.current.round + 1;
          if (nextRound > TOTAL_ROUNDS) {
            setTimeout(() => endGame(gameRef.current.hits), 800);
          } else {
            gameRef.current.round = nextRound;
            setRound(nextRound);
            setTimeout(() => {
              setShowDog(false);
              spawnRound(nextRound);
            }, 1200);
          }
        }
        return updated;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [betNum, balance, endGame, spawnRound]);

  const shootAt = useCallback(
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
      setCrosshair({ x: px, y: py });
      setTimeout(() => setCrosshair(null), 300);

      setDucks((prev) => {
        let hitOne = false;
        const updated = prev.map((d) => {
          if (d.shot || d.flown || hitOne) return d;
          if (Math.abs(d.x - px) < 6 && Math.abs(d.y - py) < 6) {
            hitOne = true;
            gameRef.current.hits++;
            setHits(gameRef.current.hits);
            return { ...d, shot: true };
          }
          return d;
        });
        return updated;
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <ArcadeCabinet title="DUCK HUNT" color="#ff8800">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ff8800", textShadow: "0 0 10px #ff8800" }}
            >
              SHOOT THE DUCKS
            </div>
            <div className="text-sm opacity-70 mt-1">
              Hit {WIN_HITS} of {TOTAL_ROUNDS * DUCKS_PER_ROUND} ducks to win 2×
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
                    ? { background: "#ff8800", borderColor: "#ff8800" }
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-orange-500"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #ff8800, #ff4400)",
              boxShadow: "0 0 20px #ff880050",
            }}
          >
            🦆 PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="select-none">
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span style={{ color: "#ff8800" }}>
              HITS: {hits}/{WIN_HITS}
            </span>
            <span style={{ color: "#ffcc00" }}>
              ROUND: {round}/{TOTAL_ROUNDS}
            </span>
          </div>
          <div
            className="relative mx-auto cursor-crosshair"
            style={{
              width: 280,
              height: 200,
              overflow: "hidden",
              border: "2px solid #ff880033",
            }}
            onClick={shootAt}
            onKeyDown={(e) => {
              if (e.key === "Enter") shootAt(e as any);
            }}
            role="presentation"
            onTouchStart={shootAt}
          >
            {/* Sky */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, #4488ff 0%, #88ccff 100%)",
              }}
            />
            {/* Clouds */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 20,
                width: 60,
                height: 20,
                background: "white",
                borderRadius: 10,
                opacity: 0.8,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 15,
                right: 30,
                width: 50,
                height: 16,
                background: "white",
                borderRadius: 8,
                opacity: 0.8,
              }}
            />
            {/* Ground */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 40,
                background: "linear-gradient(180deg, #44aa22, #2a7700)",
              }}
            />
            {/* Bushes */}
            {[0.1, 0.4, 0.7].map((p) => (
              <div
                key={p}
                style={{
                  position: "absolute",
                  bottom: 38,
                  left: `${p * 100}%`,
                  width: 50,
                  height: 30,
                  background: "#2a8800",
                  borderRadius: "50% 50% 0 0",
                }}
              />
            ))}
            {/* Ducks */}
            <AnimatePresence>
              {ducks
                .filter((d) => !d.flown)
                .map((d) => (
                  <motion.div
                    key={d.id}
                    style={{
                      position: "absolute",
                      left: `${d.x}%`,
                      top: `${d.y}%`,
                      transform: "translate(-50%,-50%)",
                      fontSize: d.shot ? 20 : 28,
                      filter: d.shot ? "grayscale(1)" : "none",
                    }}
                    animate={d.shot ? { y: 50, opacity: 0 } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    🦆
                  </motion.div>
                ))}
            </AnimatePresence>
            {/* Crosshair */}
            <AnimatePresence>
              {crosshair && (
                <motion.div
                  key="ch"
                  initial={{ scale: 1.5, opacity: 1 }}
                  animate={{ scale: 0.8, opacity: 0.7 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    left: `${crosshair.x}%`,
                    top: `${crosshair.y}%`,
                    transform: "translate(-50%,-50%)",
                    width: 30,
                    height: 30,
                    border: "2px solid #ff0000",
                    borderRadius: "50%",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: "#ff0000",
                      transform: "translateX(-50%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: 0,
                      right: 0,
                      height: 2,
                      background: "#ff0000",
                      transform: "translateY(-50%)",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Dog */}
            <AnimatePresence>
              {showDog && (
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  style={{
                    position: "absolute",
                    bottom: 38,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 32,
                  }}
                >
                  🐕
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="text-center text-xs opacity-50 mt-2">
            Click/tap to shoot ducks!
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🦆" : "🐕"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ffcc00" : "#ff4444" }}
          >
            {won ? "NICE SHOT!" : "MISSED TOO MANY!"}
          </div>
          <div className="text-sm opacity-70">
            Hits: {hits} | Need {WIN_HITS}
          </div>
          {won && (
            <div style={{ color: "#ffcc00" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setPhase("bet");
                setDucks([]);
                setShowDog(false);
              }}
              variant="outline"
            >
              Play Again
            </Button>
            <Button onClick={onGameComplete} style={{ background: "#ff8800" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
