import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const QUICK_BETS = [5, 10, 25, 50, 100];

// European roulette number order around the wheel
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

type BetType = { label: string; numbers: number[]; payout: number };

const OUTSIDE_BETS: BetType[] = [
  { label: "RED", numbers: [...RED_NUMBERS], payout: 1 },
  {
    label: "BLACK",
    numbers: [
      2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
    ],
    payout: 1,
  },
  {
    label: "ODD",
    numbers: [
      1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35,
    ],
    payout: 1,
  },
  {
    label: "EVEN",
    numbers: [
      2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36,
    ],
    payout: 1,
  },
  {
    label: "1-18",
    numbers: Array.from({ length: 18 }, (_, i) => i + 1),
    payout: 1,
  },
  {
    label: "19-36",
    numbers: Array.from({ length: 18 }, (_, i) => i + 19),
    payout: 1,
  },
  {
    label: "1ST 12",
    numbers: Array.from({ length: 12 }, (_, i) => i + 1),
    payout: 2,
  },
  {
    label: "2ND 12",
    numbers: Array.from({ length: 12 }, (_, i) => i + 13),
    payout: 2,
  },
  {
    label: "3RD 12",
    numbers: Array.from({ length: 12 }, (_, i) => i + 25),
    payout: 2,
  },
];

export default function RouletteGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [bet, setBet] = useState("10");
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [straightUp, setStraightUp] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    number: number;
    win: number;
    msg: string;
  } | null>(null);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleSpin = async () => {
    if (!selectedBet && straightUp === null) {
      toast.error("Select a bet first");
      return;
    }
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    setSpinning(true);
    setResult(null);
    const spinDeg = 1440 + Math.random() * 360;
    setWheelAngle((prev) => prev + spinDeg);
    setBallAngle((prev) => prev - spinDeg * 1.5);
    await new Promise((r) => setTimeout(r, 2500));

    const landed = Math.floor(Math.random() * 37);
    setSpinning(false);

    let win = 0;
    let msg = "";
    if (straightUp !== null && straightUp === landed) {
      win = betNum * 35;
      msg = `${landed} — Straight up wins! +${win} credits!`;
    } else if (selectedBet?.numbers.includes(landed)) {
      win = betNum * (selectedBet?.payout ?? 1);
      msg = `${landed} — ${selectedBet?.label} wins! +${win} credits!`;
    } else {
      win = -betNum;
      msg = `${landed} — ${landed === 0 ? "Zero!" : ""} You lost ${betNum} credits.`;
    }

    setResult({ number: landed, win, msg });

    try {
      const won = win > 0;
      await recordOutcome({
        gameType: GameType.roulette,
        bet: BigInt(betNum),
        won,
        winAmount: BigInt(won ? win + betNum : 0),
      });
      onGameComplete();
      if (win > 0) toast.success(`🎰 ${msg}`);
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const numberColor = (n: number) =>
    n === 0 ? "#2e7d32" : RED_NUMBERS.has(n) ? "#b71c1c" : "#1a1a1a";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* WHEEL */}
      <div
        className="rounded-2xl p-4 flex flex-col items-center gap-4"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, #1b5e20 0%, #0d3b10 70%, #071a08 100%)",
          border: "8px solid #3e2208",
          boxShadow: "0 0 0 3px #8d5524, 0 8px 40px rgba(0,0,0,0.7)",
        }}
      >
        {/* SVG WHEEL */}
        <div className="relative" style={{ width: 220, height: 220 }}>
          {/* Outer ring */}
          <svg
            width="220"
            height="220"
            viewBox="-110 -110 220 220"
            className="absolute inset-0"
            aria-label="Roulette wheel"
          >
            <title>Roulette Wheel</title>
            {/* Wood surround */}
            <circle r="108" fill="#5d3a1a" stroke="#8d5524" strokeWidth="3" />
            <circle r="100" fill="#3e2208" stroke="#8d5524" strokeWidth="2" />
            {/* Wheel segments */}
            <motion.g
              animate={{ rotate: wheelAngle }}
              transition={{
                duration: spinning ? 2.5 : 0.3,
                ease: spinning ? [0.1, 0.8, 0.3, 1] : "easeOut",
              }}
            >
              {WHEEL_ORDER.map((num, i) => {
                const angle = (i / WHEEL_ORDER.length) * 360 - 90;
                const a1 = ((angle - 180 / WHEEL_ORDER.length) * Math.PI) / 180;
                const a2 = ((angle + 180 / WHEEL_ORDER.length) * Math.PI) / 180;
                const r1 = 95;
                const r2 = 55;
                const x1 = Math.cos(a1) * r1;
                const y1 = Math.sin(a1) * r1;
                const x2 = Math.cos(a2) * r1;
                const y2 = Math.sin(a2) * r1;
                const x3 = Math.cos(a2) * r2;
                const y3 = Math.sin(a2) * r2;
                const x4 = Math.cos(a1) * r2;
                const y4 = Math.sin(a1) * r2;
                const fill =
                  num === 0
                    ? "#2e7d32"
                    : RED_NUMBERS.has(num)
                      ? "#c62828"
                      : "#1a1a1a";
                const mid = (angle * Math.PI) / 180;
                const tx = Math.cos(mid) * 73;
                const ty = Math.sin(mid) * 73;
                return (
                  <g key={num}>
                    <path
                      d={`M${x1},${y1} A${r1},${r1} 0 0,1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 0,0 ${x4},${y4} Z`}
                      fill={fill}
                      stroke="#888"
                      strokeWidth="0.5"
                    />
                    <text
                      x={tx}
                      y={ty}
                      fill="white"
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${angle + 90}, ${tx}, ${ty})`}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}
              {/* Inner felt circle */}
              <circle r="53" fill="#1b5e20" stroke="#43a047" strokeWidth="2" />
              <circle r="42" fill="#0d3b10" stroke="#2e7d32" strokeWidth="1" />
            </motion.g>

            {/* Ball */}
            <motion.circle
              r="6"
              fill="#f5f5f5"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
              animate={{ rotate: ballAngle }}
              cx="82"
              cy="0"
              transform={`rotate(${ballAngle})`}
              transition={{
                duration: spinning ? 2.5 : 0.3,
                ease: spinning ? [0.05, 0.9, 0.3, 1] : "easeOut",
              }}
            />

            {/* Center pin */}
            <circle r="8" fill="#c8a84b" stroke="#8d5524" strokeWidth="2" />
            <circle r="4" fill="#ffd700" />
          </svg>

          {/* Pointer */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "16px solid #ffd700",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            }}
          />

          {/* Result number display */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-white"
                style={{
                  background: numberColor(result.number),
                  border: "3px solid #ffd700",
                  boxShadow: "0 0 16px rgba(255,215,0,0.6)",
                }}
              >
                {result.number}
              </div>
            </motion.div>
          )}
        </div>

        {spinning && (
          <div className="text-sm font-black tracking-widest text-white/60 animate-pulse">
            SPINNING...
          </div>
        )}
      </div>

      {/* BETTING MAT */}
      <div
        className="rounded-2xl p-4"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, #1b5e20 0%, #0d3b10 100%)",
          border: "4px solid #3e2208",
          boxShadow: "0 0 0 2px #8d5524",
        }}
      >
        {/* Number grid */}
        <div className="mb-3">
          <button
            type="button"
            className="w-full text-center py-2 rounded mb-1 cursor-pointer font-black text-sm transition-all"
            onClick={() => {
              setStraightUp(0);
              setSelectedBet(null);
            }}
            style={{
              background: straightUp === 0 ? "rgba(255,215,0,0.3)" : "#2e7d32",
              border:
                straightUp === 0
                  ? "2px solid #ffd700"
                  : "1px solid rgba(255,255,255,0.2)",
              color: "white",
            }}
          >
            0
          </button>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(12, 1fr)" }}
          >
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setStraightUp(n);
                  setSelectedBet(null);
                }}
                className="py-1.5 rounded text-xs font-black text-white transition-all hover:brightness-125"
                style={{
                  background:
                    straightUp === n ? "rgba(255,215,0,0.4)" : numberColor(n),
                  border:
                    straightUp === n
                      ? "2px solid #ffd700"
                      : "1px solid rgba(255,255,255,0.15)",
                  fontSize: 10,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Outside bets */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          {OUTSIDE_BETS.map((ob) => (
            <button
              key={ob.label}
              type="button"
              onClick={() => {
                setSelectedBet(ob);
                setStraightUp(null);
              }}
              className="py-2 rounded text-xs font-black text-white transition-all hover:brightness-125"
              style={{
                background:
                  selectedBet?.label === ob.label
                    ? "rgba(255,215,0,0.3)"
                    : ob.label === "RED"
                      ? "#b71c1c"
                      : ob.label === "BLACK"
                        ? "#1a1a1a"
                        : "rgba(0,0,0,0.3)",
                border:
                  selectedBet?.label === ob.label
                    ? "2px solid #ffd700"
                    : "1px solid rgba(255,255,255,0.2)",
              }}
            >
              {ob.label}
            </button>
          ))}
        </div>

        {/* Selected bet display */}
        {(selectedBet || straightUp !== null) && (
          <div className="text-center text-xs text-white/60 mb-2">
            Bet:{" "}
            <span className="font-black text-white">
              {straightUp !== null
                ? `${straightUp} straight up (35:1)`
                : `${selectedBet?.label} (${selectedBet?.payout}:1)`}
            </span>
          </div>
        )}
      </div>

      {/* RESULT */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 text-center font-black"
            style={{
              background:
                result.win > 0 ? "rgba(27,94,32,0.4)" : "rgba(183,28,28,0.4)",
              border: `1px solid ${result.win > 0 ? "rgba(102,187,106,0.5)" : "rgba(239,83,80,0.5)"}`,
              color: result.win > 0 ? "#a5d6a7" : "#ef9a9a",
            }}
          >
            {result.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTROLS */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: "1px solid oklch(0.20 0.03 280)",
        }}
      >
        <div className="flex gap-2 flex-wrap justify-center">
          {QUICK_BETS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setBet(String(q))}
              className="px-3 py-1.5 rounded-lg text-xs font-black transition-all"
              style={
                betNum === q
                  ? { background: "#c8a84b", color: "#1a1a1a" }
                  : {
                      background: "oklch(0.16 0.02 280)",
                      color: "#aaa",
                      border: "1px solid oklch(0.22 0.03 280)",
                    }
              }
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
          className="w-full rounded-lg px-3 py-2 text-center font-bold"
          style={{
            background: "oklch(0.09 0.01 280)",
            color: "#c8a84b",
            border: "1px solid oklch(0.22 0.03 280)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleSpin}
          disabled={spinning || isPending}
          className="w-full py-4 rounded-xl font-black tracking-widest transition-all hover:brightness-110"
          style={{
            background: spinning ? "#333" : "#c8a84b",
            color: spinning ? "#666" : "#1a1a1a",
            boxShadow: spinning ? "none" : "0 0 24px rgba(200,168,75,0.4)",
          }}
        >
          {spinning ? "SPINNING..." : "🎰 SPIN"}
        </button>
      </div>
    </div>
  );
}
