import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.65 0.28 340)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const MULTIPLIERS = [0.2, 0.5, 1, 2, 5, 2, 1, 0.5, 0.2];
const ROWS = 7;
type Phase = "bet" | "playing" | "result";

interface BallStep {
  row: number;
  col: number;
}

export default function PlinkoGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [ballPath, setBallPath] = useState<BallStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [finalSlot, setFinalSlot] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleDrop = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    // Build path: start at col 4 (center of 0-8), each row go left/right
    const path: BallStep[] = [{ row: -1, col: 4 }];
    let col = 4;
    for (let r = 0; r < ROWS; r++) {
      col = Math.random() < 0.5 ? Math.max(0, col - 1) : Math.min(8, col + 1);
      path.push({ row: r, col });
    }
    setBallPath(path);
    setCurrentStep(0);
    setPhase("playing");

    let step = 0;
    const animate = () => {
      step++;
      setCurrentStep(step);
      if (step < path.length - 1) {
        animRef.current = setTimeout(animate, 250);
      } else {
        const slot = path[path.length - 1].col;
        const mult = MULTIPLIERS[slot] ?? 1;
        const didWin = mult > 0;
        const win = Math.round(betNum * mult);
        setFinalSlot(slot);
        setMultiplier(mult);
        setWon(didWin && win >= betNum);
        setWinAmount(win);
        setTimeout(async () => {
          const isWin = win >= betNum;
          try {
            await recordOutcome({
              gameType: GameType.plinko,
              bet: BigInt(betNum),
              won: isWin,
              winAmount: BigInt(win),
            });
            onGameComplete();
          } catch (e: any) {
            toast.error(e?.message ?? "Error");
          }
          setPhase("result");
        }, 500);
      }
    };
    animRef.current = setTimeout(animate, 300);
  };

  const ballPos = ballPath[currentStep] ?? null;

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
        📍 PLINKO
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Drop the ball and watch it bounce!
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
                    ? {
                        background: COLOR,
                        color: "#fff",
                        boxShadow: `0 0 12px ${COLOR}60`,
                      }
                    : {
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
                      }
                }
                data-ocid="plinko.quickbet.button"
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
            data-ocid="plinko.bet.input"
          />
          <Button
            onClick={handleDrop}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.25 290))`,
              color: "#fff",
              boxShadow: `0 0 20px ${COLOR}40`,
            }}
            data-ocid="plinko.drop_button"
          >
            📍 DROP FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-2">
          <div className="relative mx-auto" style={{ width: 300, height: 260 }}>
            {/* Pegs */}
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: r + 3 }, (_, c) => {
                const totalPegs = r + 3;
                const x = ((c + (9 - totalPegs) / 2) / 9) * 300;
                const y = (r + 1) * 30 + 10;
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                    key={`peg-${r}-${c}`}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                      left: x - 6,
                      top: y - 6,
                      background: "oklch(0.55 0.20 290)",
                      boxShadow: "0 0 4px oklch(0.55 0.20 290)",
                    }}
                  />
                );
              }),
            )}
            {/* Ball */}
            {ballPos && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute w-5 h-5 rounded-full z-10"
                style={{
                  left: (ballPos.col / 9) * 300 - 10,
                  top: ballPos.row === -1 ? 0 : (ballPos.row + 1) * 30 + 4,
                  background: "oklch(0.88 0.20 72)",
                  boxShadow: "0 0 8px oklch(0.88 0.20 72)",
                }}
              />
            )}
          </div>
          {/* Slots */}
          <div className="flex gap-1 justify-center">
            {MULTIPLIERS.map((m, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                key={`pmult-${i}`}
                className="flex-1 text-center text-xs font-black py-2 rounded"
                style={{
                  background: finalSlot === i ? COLOR : "oklch(0.16 0.025 278)",
                  color:
                    finalSlot === i
                      ? "#fff"
                      : m >= 2
                        ? COLOR
                        : "oklch(0.60 0.02 270)",
                  boxShadow: finalSlot === i ? `0 0 10px ${COLOR}` : "none",
                }}
              >
                {m}x
              </div>
            ))}
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
            <div className="text-6xl">{won ? "🎉" : "😔"}</div>
            <div className="text-lg font-black text-muted-foreground">
              {multiplier}x multiplier
            </div>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won
                ? `+${winAmount} CREDITS!`
                : winAmount > 0
                  ? `+${winAmount} (partial)`
                  : "ZERO PAYOUT"}
            </h3>
            <Button
              onClick={() => {
                setPhase("bet");
                setBallPath([]);
                setCurrentStep(0);
                setFinalSlot(null);
              }}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="plinko.play_again_button"
            >
              DROP AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
