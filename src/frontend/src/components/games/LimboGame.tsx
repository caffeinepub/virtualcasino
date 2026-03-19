import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.55 0.25 290)";
const QUICK_BETS = [5, 10, 25, 50, 100];
type Phase = "bet" | "spinning" | "result";

export default function LimboGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [target, setTarget] = useState(2.0);
  const [displayNum, setDisplayNum] = useState(1.0);
  const [result, setResult] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const winChance = Math.min(95, (1 / target) * 95);

  const handleSpin = async () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setPhase("spinning");

    // Animate spinning number
    let ticks = 0;
    const totalTicks = 20;
    const spinInterval = setInterval(() => {
      ticks++;
      const rnd = 1 + Math.random() * 9;
      setDisplayNum(Math.round(rnd * 100) / 100);
      if (ticks >= totalTicks) {
        clearInterval(spinInterval);
        // Determine actual result
        const didWin = Math.random() * 100 < winChance;
        const finalResult = didWin
          ? target + Math.random() * (10 - target) // land above target
          : 1 + Math.random() * (target - 1.01); // land below target
        const finalRounded = Math.round(finalResult * 100) / 100;
        setDisplayNum(finalRounded);
        setResult(finalRounded);
        const win = didWin ? Math.round(betNum * target) : 0;
        setWon(didWin);
        setWinAmount(win);
        setTimeout(async () => {
          try {
            await recordOutcome({
              gameType: GameType.limbo,
              bet: BigInt(betNum),
              won: didWin,
              winAmount: BigInt(win),
            });
            onGameComplete();
          } catch (e: any) {
            toast.error(e?.message ?? "Error");
          }
          setPhase("result");
        }, 800);
      }
    }, 80);
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
        🌀 LIMBO
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Set a target. Land above it to win!
      </p>

      {phase === "bet" && (
        <div className="space-y-6">
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
                data-ocid="limbo.quickbet.button"
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
            data-ocid="limbo.bet.input"
          />
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-bold text-foreground">
                Target Multiplier
              </span>
              <span className="text-lg font-black" style={{ color: COLOR }}>
                {target.toFixed(2)}x
              </span>
            </div>
            <Slider
              min={1.1}
              max={10}
              step={0.1}
              value={[target]}
              onValueChange={([v]) => setTarget(v)}
              data-ocid="limbo.target.select"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Win Chance:{" "}
                <span className="font-black" style={{ color: COLOR }}>
                  {winChance.toFixed(1)}%
                </span>
              </span>
              <span>
                Payout:{" "}
                <span className="font-black" style={{ color: COLOR }}>
                  {target.toFixed(2)}x
                </span>
              </span>
            </div>
          </div>
          <Button
            onClick={handleSpin}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.70 0.20 190))`,
              color: "#fff",
            }}
            data-ocid="limbo.spin_button"
          >
            🌀 SPIN FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "spinning" && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-muted-foreground">
            Target:{" "}
            <span className="font-black" style={{ color: COLOR }}>
              {target.toFixed(2)}x
            </span>
          </p>
          <motion.div
            key={displayNum}
            initial={{ scale: 1.3, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-black tabular-nums"
            style={{ color: COLOR, textShadow: `0 0 30px ${COLOR}` }}
          >
            {displayNum.toFixed(2)}x
          </motion.div>
          <div
            className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{
              borderColor: `${COLOR} transparent transparent transparent`,
            }}
          />
        </div>
      )}

      {phase === "result" && (
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4 py-6"
          >
            <div
              className="text-5xl font-black tabular-nums"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
                textShadow: `0 0 20px ${won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)"}`,
              }}
            >
              {result.toFixed(2)}x
            </div>
            <p className="text-muted-foreground">
              Target was {target.toFixed(2)}x
            </p>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won ? `+${winAmount} CREDITS!` : "Below target — you lost!"}
            </h3>
            <Button
              onClick={() => setPhase("bet")}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="limbo.play_again_button"
            >
              SPIN AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
