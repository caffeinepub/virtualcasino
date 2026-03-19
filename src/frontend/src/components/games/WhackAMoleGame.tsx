import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.60 0.24 20)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const GAME_DURATION = 30;
const WIN_SCORE = 8;
const HOLES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
type Phase = "bet" | "playing" | "result";

export default function WhackAMoleGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [activeMoles, setActiveMoles] = useState<Set<number>>(new Set());
  const [hitMoles, setHitMoles] = useState<Set<number>>(new Set());
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (moleIntervalRef.current) clearInterval(moleIntervalRef.current);
    },
    [],
  );

  const stopAll = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (moleIntervalRef.current) {
      clearInterval(moleIntervalRef.current);
      moleIntervalRef.current = null;
    }
  };

  const endGame = async () => {
    stopAll();
    const finalScore = scoreRef.current;
    const didWin = finalScore >= WIN_SCORE;
    const win = didWin ? betNum * 2 : 0;
    try {
      await recordOutcome({
        gameType: GameType.whackAMole,
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
  };

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setActiveMoles(new Set());
    setHitMoles(new Set());
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    moleIntervalRef.current = setInterval(() => {
      const count = Math.floor(Math.random() * 3) + 1;
      const holes = new Set<number>();
      while (holes.size < count) holes.add(Math.floor(Math.random() * 9));
      setActiveMoles(holes);
      setHitMoles(new Set());
      setTimeout(() => setActiveMoles(new Set()), 1200);
    }, 1500);
  };

  const whack = (i: number) => {
    if (!activeMoles.has(i) || hitMoles.has(i)) return;
    setHitMoles((prev) => new Set([...prev, i]));
    setActiveMoles((prev) => {
      const n = new Set(prev);
      n.delete(i);
      return n;
    });
    scoreRef.current += 1;
    setScore((s) => s + 1);
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
        🔨 WHACK-A-MOLE
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Whack {WIN_SCORE}+ moles in {GAME_DURATION} seconds to win 2x!
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
                data-ocid="whack.quickbet.button"
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
            data-ocid="whack.bet.input"
          />
          <Button
            onClick={startGame}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.65 0.22 55))`,
              color: "#fff",
            }}
            data-ocid="whack.play_button"
          >
            🔨 PLAY FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-4">
          <div className="flex justify-between font-black">
            <span style={{ color: COLOR }}>Score: {score}</span>
            <span className={timeLeft <= 10 ? "text-red-400" : "text-white"}>
              ⏱ {timeLeft}s
            </span>
            <span className="text-muted-foreground">Need: {WIN_SCORE}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {HOLES.map((i) => (
              <button
                key={`hole-${i}`}
                type="button"
                onClick={() => whack(i)}
                className="relative overflow-hidden aspect-square rounded-2xl flex items-center justify-center"
                style={{
                  background: "oklch(0.18 0.05 60)",
                  border: "2px solid oklch(0.28 0.08 50)",
                  cursor: activeMoles.has(i) ? "pointer" : "default",
                }}
                data-ocid={`whack.hole.${i + 1}`}
              >
                <AnimatePresence>
                  {activeMoles.has(i) && (
                    <motion.div
                      key="mole"
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 40, opacity: 0 }}
                      className="text-4xl select-none"
                    >
                      🐭
                    </motion.div>
                  )}
                  {hitMoles.has(i) && (
                    <motion.div
                      key="hit"
                      initial={{ scale: 1.5, opacity: 1 }}
                      animate={{ scale: 0, opacity: 0 }}
                      className="absolute text-3xl"
                    >
                      💥
                    </motion.div>
                  )}
                </AnimatePresence>
                {!activeMoles.has(i) && !hitMoles.has(i) && (
                  <div
                    className="w-8 h-4 rounded-full"
                    style={{ background: "oklch(0.12 0.03 60)" }}
                  />
                )}
              </button>
            ))}
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "oklch(0.16 0.025 278)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(timeLeft / GAME_DURATION) * 100}%`,
                background: timeLeft <= 10 ? "oklch(0.577 0.245 27)" : COLOR,
              }}
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
            <div className="text-6xl">{won ? "🏆" : "😔"}</div>
            <p className="text-muted-foreground">
              Final score: {score} moles whacked
            </p>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won
                ? `+${winAmount} CREDITS!`
                : `Need ${WIN_SCORE}, got ${score}`}
            </h3>
            <Button
              onClick={() => setPhase("bet")}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="whack.play_again_button"
            >
              PLAY AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
