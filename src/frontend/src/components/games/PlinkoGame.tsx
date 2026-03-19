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

const BUCKET_COLORS: Record<
  number,
  { bg: string; glow: string; label: string }
> = {
  0.2: {
    bg: "linear-gradient(180deg, #555, #333)",
    glow: "#888",
    label: "grey",
  },
  0.5: {
    bg: "linear-gradient(180deg, #1a5a8a, #0d3a5a)",
    glow: "#4af",
    label: "blue",
  },
  1: {
    bg: "linear-gradient(180deg, #1a6a2a, #0d4a1a)",
    glow: "#4f8",
    label: "green",
  },
  2: {
    bg: "linear-gradient(180deg, #8a6a00, #5a4400)",
    glow: "#fd0",
    label: "yellow",
  },
  5: {
    bg: "linear-gradient(180deg, #8a1a00, #5a0d00)",
    glow: "#f44",
    label: "red",
  },
};

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
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1a0a0a 0%, #0d0505 100%)",
        border: "4px solid #4a2a1a",
        boxShadow: "0 0 40px rgba(0,0,0,0.9)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(180deg, #2a1000, #1a0800)",
          padding: "12px 24px",
          borderBottom: "2px solid #5a3a1a",
          textAlign: "center",
        }}
      >
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "#ff6688",
            textShadow: "0 0 10px #ff3366, 0 0 30px #ff0044",
          }}
        >
          📍 PLINKO
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-center mb-4" style={{ color: "#aaa" }}>
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
                          background: "rgba(255,255,255,0.05)",
                          color: "#aaa",
                          border: "1px solid #333",
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
          <div className="space-y-3">
            {/* Wooden-frame board */}
            <div
              style={{
                background: "linear-gradient(180deg, #1a0a2e 0%, #0d0520 100%)",
                border: "6px solid #5a3010",
                borderRadius: 8,
                boxShadow:
                  "inset 0 0 30px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6)",
                padding: 8,
                position: "relative",
              }}
            >
              <div
                className="relative mx-auto"
                style={{ width: 300, height: 240 }}
              >
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
                        className="absolute rounded-full"
                        style={{
                          left: x - 7,
                          top: y - 7,
                          width: 14,
                          height: 14,
                          background:
                            "radial-gradient(circle at 35% 30%, #ffffff, #c0c0c0 40%, #808080 70%, #404040)",
                          boxShadow:
                            "0 2px 4px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.6)",
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
                    className="absolute z-10 rounded-full"
                    style={{
                      left: (ballPos.col / 9) * 300 - 10,
                      top: ballPos.row === -1 ? 0 : (ballPos.row + 1) * 30 + 4,
                      width: 20,
                      height: 20,
                      background:
                        "radial-gradient(circle at 35% 30%, #ffe566, #ff9900 50%, #cc6600)",
                      boxShadow:
                        "0 0 10px rgba(255,180,0,0.8), 0 2px 6px rgba(0,0,0,0.5)",
                    }}
                  />
                )}
              </div>
              {/* Prize buckets */}
              <div className="flex gap-1 px-1">
                {MULTIPLIERS.map((m, i) => {
                  const bkt = BUCKET_COLORS[m] ?? BUCKET_COLORS[0.2];
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                      key={`pmult-${i}`}
                      className="flex-1 text-center text-xs font-black py-2 rounded-b-md"
                      style={{
                        background:
                          finalSlot === i ? bkt.bg : "rgba(0,0,0,0.5)",
                        color: finalSlot === i ? "#fff" : bkt.glow,
                        border: `1px solid ${bkt.glow}44`,
                        borderTop: `3px solid ${bkt.glow}`,
                        boxShadow:
                          finalSlot === i ? `0 0 12px ${bkt.glow}` : "none",
                        transition: "all 0.3s",
                      }}
                    >
                      {m}x
                    </div>
                  );
                })}
              </div>
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
              <div className="text-lg font-black" style={{ color: "#aaa" }}>
                {multiplier}x multiplier
              </div>
              <h3
                className="text-2xl font-black"
                style={{ color: won ? "#ffd700" : "#e55" }}
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
    </div>
  );
}
