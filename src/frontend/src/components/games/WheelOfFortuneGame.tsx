import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "spinning" | "result";

const COLOR = "oklch(0.78 0.18 72)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const SEGMENTS = [1, 2, 0, 3, 0, 5, 0, 2, 10, 0, 2, 40];
const SEG_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2c3e50",
  "#e67e22",
  "#2c3e50",
  "#9b59b6",
  "#2c3e50",
  "#27ae60",
  "#f39c12",
  "#2c3e50",
  "#1abc9c",
  "#e91e63",
];

const conicGradient = SEGMENTS.map((_mult, i) => {
  const start = (i * 100) / SEGMENTS.length;
  const end = ((i + 1) * 100) / SEGMENTS.length;
  return `${SEG_COLORS[i]} ${start}% ${end}%`;
}).join(", ");

export default function WheelOfFortuneGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [spinning, setSpinning] = useState(false);
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const [spinDeg, setSpinDeg] = useState(0);
  const [netGain, setNetGain] = useState(0);
  const [resultMsg, setResultMsg] = useState("");

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleSpin = async () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    const resultIdx = Math.floor(Math.random() * SEGMENTS.length);
    const segmentDeg = 360 / SEGMENTS.length;
    const targetDeg =
      spinDeg +
      1800 +
      (SEGMENTS.length - resultIdx) * segmentDeg +
      segmentDeg / 2;

    setSpinning(true);
    setPhase("spinning");
    setSpinDeg(targetDeg);

    await new Promise((r) => setTimeout(r, 3500));

    setSpinning(false);
    setLandedIndex(resultIdx);

    const multiplier = SEGMENTS[resultIdx];
    let net = 0;
    let msg = "";
    if (multiplier > 0) {
      net = betNum * multiplier;
      msg = `${multiplier}x! You win ${net} credits!`;
    } else {
      net = -betNum;
      msg = "LOSE! Better luck next spin.";
    }

    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");

    try {
      const won = net > 0;
      const winAmount = won ? BigInt(net + betNum) : BigInt(0);
      await recordOutcome({
        gameType: GameType.wheelOfFortune,
        bet: BigInt(betNum),
        won,
        winAmount,
      });
      onGameComplete();
      if (won) toast.success(`🎉 ${msg}`);
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
    setLandedIndex(null);
    setNetGain(0);
    setResultMsg("");
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl p-4 flex flex-col items-center gap-4"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: `1px solid ${COLOR}40`,
        }}
      >
        <h3
          className="font-black text-lg tracking-widest"
          style={{ color: COLOR }}
        >
          WHEEL OF FORTUNE
        </h3>

        <div className="relative">
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0 z-10"
            style={{
              top: "-4px",
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: `20px solid ${COLOR}`,
              filter: `drop-shadow(0 0 6px ${COLOR})`,
            }}
          />
          <motion.div
            animate={{ rotate: spinDeg }}
            transition={{ duration: 3.5, ease: [0.17, 0.67, 0.35, 0.99] }}
            className="w-48 h-48 rounded-full overflow-hidden"
            style={{
              background: `conic-gradient(${conicGradient})`,
              border: `4px solid ${COLOR}`,
              boxShadow: `0 0 20px ${COLOR}60`,
            }}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-1">
          {SEGMENTS.map((mult, i) => (
            <div
              key={`seg-${i}-${mult}`}
              className="px-2 py-1 rounded text-xs font-black"
              style={{
                background: landedIndex === i ? COLOR : SEG_COLORS[i],
                color: "white",
                opacity: landedIndex !== null && landedIndex !== i ? 0.5 : 1,
                transform: landedIndex === i ? "scale(1.2)" : "scale(1)",
                transition: "all 0.3s",
                boxShadow: landedIndex === i ? `0 0 12px ${COLOR}` : "none",
              }}
            >
              {mult === 0 ? "LOSE" : `${mult}x`}
            </div>
          ))}
        </div>
      </div>

      {phase === "bet" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: `1px solid ${COLOR}40`,
          }}
        >
          <div className="flex flex-wrap gap-2">
            {QUICK_BETS.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setBet(String(q))}
                className="px-3 py-1 rounded-full text-xs font-black"
                style={{
                  background: betNum === q ? COLOR : "oklch(0.16 0.02 280)",
                  color: betNum === q ? "black" : "oklch(0.65 0.05 280)",
                  border: `1px solid ${betNum === q ? COLOR : "oklch(0.22 0.03 280)"}`,
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSpin}
              disabled={isPending || spinning}
              className="font-black tracking-widest"
              style={{
                background: COLOR,
                color: "black",
                boxShadow: `0 0 12px ${COLOR}60`,
              }}
            >
              SPIN!
            </Button>
          </div>
        </motion.div>
      )}

      {phase === "spinning" && (
        <div className="text-center py-4">
          <p className="font-black tracking-widest" style={{ color: COLOR }}>
            SPINNING...
          </p>
        </div>
      )}

      {phase === "result" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div
            className="rounded-xl p-4 text-center font-black text-lg"
            style={{
              background:
                netGain > 0
                  ? "oklch(0.78 0.18 72 / 0.15)"
                  : "oklch(0.577 0.245 27 / 0.15)",
              color:
                netGain > 0 ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              border: `1px solid ${netGain > 0 ? "oklch(0.78 0.18 72 / 0.5)" : "oklch(0.577 0.245 27 / 0.5)"}`,
            }}
          >
            {resultMsg}
          </div>
          <Button
            onClick={reset}
            className="w-full font-black tracking-widest"
            style={{
              background: COLOR,
              color: "black",
              boxShadow: `0 0 12px ${COLOR}60`,
            }}
          >
            SPIN AGAIN
          </Button>
        </motion.div>
      )}
    </div>
  );
}
