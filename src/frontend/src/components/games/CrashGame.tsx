import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.60 0.24 20)";
const QUICK_BETS = [5, 10, 25, 50, 100];
type Phase =
  | "bet"
  | "countdown"
  | "running"
  | "crashed"
  | "cashedout"
  | "result";

export default function CrashGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [multiplier, setMultiplier] = useState(1.0);
  const [cashOutMult, setCashOutMult] = useState(1.0);
  const [countdown, setCountdown] = useState(3);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const multRef = useRef(1.0);
  const crashRef = useRef(2.0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  const clearInt = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
    const crash = 1 + Math.random() * Math.random() * 9;
    crashRef.current = crash;
    setMultiplier(1.0);
    multRef.current = 1.0;
    setCountdown(3);
    setPhase("countdown");
    let cd = 3;
    const cdInterval = setInterval(() => {
      cd--;
      setCountdown(cd);
      if (cd <= 0) {
        clearInterval(cdInterval);
        setPhase("running");
        intervalRef.current = setInterval(() => {
          multRef.current = multRef.current * 1.06;
          setMultiplier(Math.round(multRef.current * 100) / 100);
          if (multRef.current >= crashRef.current) {
            clearInt();
            setPhase("crashed");
            setTimeout(async () => {
              try {
                await recordOutcome({
                  gameType: GameType.crashGame,
                  bet: BigInt(betNum),
                  won: false,
                  winAmount: BigInt(0),
                });
                onGameComplete();
              } catch (e: any) {
                toast.error(e?.message ?? "Error");
              }
              setWon(false);
              setWinAmount(0);
              setPhase("result");
            }, 1000);
          }
        }, 100);
      }
    }, 1000);
  };

  const cashOut = async () => {
    if (phase !== "running") return;
    clearInt();
    const m = multRef.current;
    const win = Math.round(betNum * m);
    setCashOutMult(Math.round(m * 100) / 100);
    setPhase("cashedout");
    try {
      await recordOutcome({
        gameType: GameType.crashGame,
        bet: BigInt(betNum),
        won: true,
        winAmount: BigInt(win),
      });
      onGameComplete();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
    setWon(true);
    setWinAmount(win);
    setPhase("result");
  };

  const multColor =
    multiplier >= 3
      ? "oklch(0.78 0.18 72)"
      : multiplier >= 2
        ? "oklch(0.68 0.22 150)"
        : COLOR;

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
        🚀 CRASH GAME
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Cash out before the rocket crashes!
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
                data-ocid="crash.quickbet.button"
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
            data-ocid="crash.bet.input"
          />
          <Button
            onClick={startGame}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.65 0.22 55))`,
              color: "#fff",
              boxShadow: `0 0 20px ${COLOR}40`,
            }}
            data-ocid="crash.play_button"
          >
            🚀 LAUNCH FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {(phase === "countdown" ||
        phase === "running" ||
        phase === "crashed" ||
        phase === "cashedout") && (
        <div className="space-y-6">
          <div
            className="flex flex-col items-center justify-center py-8 rounded-2xl"
            style={{
              background: "oklch(0.08 0.01 280)",
              border: `2px solid ${phase === "crashed" ? "oklch(0.577 0.245 27)" : phase === "cashedout" ? "oklch(0.78 0.18 72)" : multColor}60`,
            }}
          >
            {phase === "countdown" ? (
              <>
                <div className="text-6xl font-black text-white">
                  {countdown}
                </div>
                <p className="text-muted-foreground mt-2">Get ready...</p>
              </>
            ) : phase === "crashed" ? (
              <>
                <div className="text-5xl">💥</div>
                <div
                  className="text-3xl font-black mt-2"
                  style={{ color: "oklch(0.577 0.245 27)" }}
                >
                  CRASHED!
                </div>
                <div className="text-xl font-bold text-muted-foreground">
                  at {multiplier.toFixed(2)}x
                </div>
              </>
            ) : phase === "cashedout" ? (
              <>
                <div className="text-5xl">💰</div>
                <div
                  className="text-3xl font-black mt-2"
                  style={{ color: "oklch(0.78 0.18 72)" }}
                >
                  CASHED OUT!
                </div>
              </>
            ) : (
              <>
                <div className="text-xl text-muted-foreground mb-2">
                  🚀 Flying...
                </div>
                <motion.div
                  key={Math.floor(multiplier * 10)}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-6xl font-black tabular-nums"
                  style={{
                    color: multColor,
                    textShadow: `0 0 20px ${multColor}`,
                  }}
                >
                  {multiplier.toFixed(2)}x
                </motion.div>
              </>
            )}
          </div>
          {phase === "running" && (
            <Button
              onClick={cashOut}
              className="w-full py-6 font-black tracking-widest text-xl"
              style={{
                background: "oklch(0.78 0.18 72)",
                color: "#000",
                boxShadow: "0 0 30px oklch(0.78 0.18 72 / 0.6)",
              }}
              data-ocid="crash.cashout_button"
            >
              💰 CASH OUT {multiplier.toFixed(2)}x
            </Button>
          )}
        </div>
      )}

      {phase === "result" && (
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4 py-6"
          >
            <div className="text-6xl">{won ? "💰" : "💥"}</div>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won
                ? `+${winAmount} CREDITS at ${cashOutMult.toFixed(2)}x!`
                : "CRASHED! You lost."}
            </h3>
            <Button
              onClick={() => {
                setPhase("bet");
                setMultiplier(1.0);
              }}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="crash.play_again_button"
            >
              LAUNCH AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
