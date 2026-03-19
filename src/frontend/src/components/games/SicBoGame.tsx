import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "rolling" | "result";

const COLOR = "oklch(0.65 0.28 340)";
const QUICK_BETS = [5, 10, 25, 50, 100];

type BetType =
  | "big"
  | "small"
  | "anyTriple"
  | { type: "total"; value: number }
  | { type: "specificTriple"; value: number };

const TOTAL_PAYOUTS: Record<number, number> = {
  4: 6,
  17: 6,
  5: 10,
  16: 10,
  6: 8,
  15: 8,
  7: 12,
  14: 12,
  8: 14,
  13: 14,
  9: 16,
  12: 16,
  10: 18,
  11: 18,
};

function diceFace(n: number) {
  const dots = [
    [],
    [[50, 50]],
    [
      [25, 25],
      [75, 75],
    ],
    [
      [25, 25],
      [50, 50],
      [75, 75],
    ],
    [
      [25, 25],
      [75, 25],
      [25, 75],
      [75, 75],
    ],
    [
      [25, 25],
      [75, 25],
      [50, 50],
      [25, 75],
      [75, 75],
    ],
    [
      [25, 25],
      [75, 25],
      [25, 50],
      [75, 50],
      [25, 75],
      [75, 75],
    ],
  ];
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-16 h-16"
      aria-label={`Dice showing ${n}`}
    >
      <title>Dice face {n}</title>
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="14"
        fill="white"
        stroke={COLOR}
        strokeWidth="3"
      />
      {(dots[n] ?? []).map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" fill={COLOR} />
      ))}
    </svg>
  );
}

function betLabel(betType: BetType): string {
  if (betType === "big") return "Big (11-17)";
  if (betType === "small") return "Small (4-10)";
  if (betType === "anyTriple") return "Any Triple";
  if (typeof betType === "object" && betType.type === "total")
    return `Total ${betType.value}`;
  if (typeof betType === "object" && betType.type === "specificTriple")
    return `Triple ${betType.value}s`;
  return "";
}

function betPayout(betType: BetType): string {
  if (betType === "big" || betType === "small") return "1:1";
  if (betType === "anyTriple") return "24:1";
  if (typeof betType === "object" && betType.type === "total")
    return `${TOTAL_PAYOUTS[betType.value] ?? 1}:1`;
  if (typeof betType === "object" && betType.type === "specificTriple")
    return "150:1";
  return "";
}

export default function SicBoGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [selectedBet, setSelectedBet] = useState<BetType>("big");
  const [dice, setDice] = useState<[number, number, number]>([1, 1, 1]);
  const [animDice, setAnimDice] = useState<[number, number, number]>([1, 1, 1]);
  const [resultMsg, setResultMsg] = useState("");
  const [netGain, setNetGain] = useState(0);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  useEffect(() => {
    return () => {
      if (rollTimer.current) clearInterval(rollTimer.current);
    };
  }, []);

  const handleRoll = async () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    setPhase("rolling");
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    const finalDice: [number, number, number] = [d1, d2, d3];

    let count = 0;
    rollTimer.current = setInterval(() => {
      setAnimDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
      count++;
      if (count >= 15) {
        clearInterval(rollTimer.current!);
        setAnimDice(finalDice);
        setDice(finalDice);
        resolveResult(finalDice);
      }
    }, 80);
  };

  const resolveResult = async (finalDice: [number, number, number]) => {
    const total = finalDice[0] + finalDice[1] + finalDice[2];
    const isTriple =
      finalDice[0] === finalDice[1] && finalDice[1] === finalDice[2];

    let payout = 0;
    let won = false;

    if (selectedBet === "big") {
      if (total >= 11 && total <= 17 && !isTriple) {
        payout = 1;
        won = true;
      }
    } else if (selectedBet === "small") {
      if (total >= 4 && total <= 10 && !isTriple) {
        payout = 1;
        won = true;
      }
    } else if (selectedBet === "anyTriple") {
      if (isTriple) {
        payout = 24;
        won = true;
      }
    } else if (
      typeof selectedBet === "object" &&
      selectedBet.type === "total"
    ) {
      if (total === selectedBet.value) {
        payout = TOTAL_PAYOUTS[total] ?? 1;
        won = true;
      }
    } else if (
      typeof selectedBet === "object" &&
      selectedBet.type === "specificTriple"
    ) {
      if (isTriple && finalDice[0] === selectedBet.value) {
        payout = 150;
        won = true;
      }
    }

    const net = won ? betNum * payout : -betNum;
    setNetGain(net);
    setResultMsg(
      won
        ? `🎲 Total: ${total}${isTriple ? " (Triple!)" : ""} — You win ${net} credits!`
        : `🎲 Total: ${total}${isTriple ? " (Triple!)" : ""} — You lose ${betNum} credits.`,
    );
    setPhase("result");

    try {
      await recordOutcome({
        gameType: GameType.sicBo,
        bet: BigInt(betNum),
        won,
        winAmount: won ? BigInt(net + betNum) : BigInt(0),
      });
      onGameComplete();
      if (won) toast.success(`🎉 ${net} credits!`);
      else toast.error(`Lost ${betNum} credits.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
    setDice([1, 1, 1]);
    setAnimDice([1, 1, 1]);
    setResultMsg("");
    setNetGain(0);
  };

  const betOptions: BetType[] = [
    "big",
    "small",
    "anyTriple",
    ...([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as number[]).map(
      (v): BetType => ({ type: "total", value: v }),
    ),
    ...([1, 2, 3, 4, 5, 6] as number[]).map(
      (v): BetType => ({ type: "specificTriple", value: v }),
    ),
  ];

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {phase === "bet" && (
          <motion.div
            key="bet"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <h3
              className="font-black text-lg tracking-widest text-center"
              style={{ color: COLOR }}
            >
              SIC BO
            </h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_BETS.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setBet(String(q))}
                  className="rounded px-3 py-1.5 text-sm font-bold transition-all"
                  style={{
                    background: betNum === q ? COLOR : "oklch(0.16 0.02 280)",
                    border: `1px solid ${betNum === q ? COLOR : "oklch(0.25 0.03 280)"}`,
                    color: betNum === q ? "white" : "oklch(0.65 0.05 280)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <Input
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              type="number"
              min={1}
              placeholder="Custom bet"
              className="bg-transparent border-white/20 text-white"
            />
            <div>
              <p
                className="text-sm font-bold mb-2"
                style={{ color: "oklch(0.65 0.05 280)" }}
              >
                SELECT BET
              </p>
              <div className="flex flex-wrap gap-1.5">
                {betOptions.map((opt) => {
                  const isSelected =
                    JSON.stringify(opt) === JSON.stringify(selectedBet);
                  return (
                    <button
                      type="button"
                      key={JSON.stringify(opt)}
                      onClick={() => setSelectedBet(opt)}
                      className="rounded px-2 py-1 text-xs font-bold transition-all"
                      style={{
                        background: isSelected ? COLOR : "oklch(0.16 0.02 280)",
                        border: `1px solid ${isSelected ? COLOR : "oklch(0.25 0.03 280)"}`,
                        color: isSelected ? "white" : "oklch(0.65 0.05 280)",
                      }}
                    >
                      {betLabel(opt)} {betPayout(opt)}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              onClick={handleRoll}
              disabled={isPending}
              className="w-full font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 20px ${COLOR}60` }}
            >
              ROLL DICE
            </Button>
          </motion.div>
        )}

        {(phase === "rolling" || phase === "result") && (
          <motion.div
            key="rolling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-5 space-y-5 text-center"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <h3 className="font-black text-lg" style={{ color: COLOR }}>
              🎲 {phase === "rolling" ? "ROLLING..." : "RESULT"}
            </h3>
            <div className="flex justify-center gap-4">
              {([0, 1, 2] as const).map((diceIdx) => {
                const d = (phase === "rolling" ? animDice : dice)[diceIdx];
                return (
                  <motion.div
                    key={`dice-pos-${diceIdx}`}
                    animate={phase === "rolling" ? { rotate: [0, 360] } : {}}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      duration: 0.3,
                    }}
                  >
                    {diceFace(d)}
                  </motion.div>
                );
              })}
            </div>
            {phase === "result" && (
              <>
                <p
                  className="text-sm font-bold"
                  style={{ color: "oklch(0.65 0.05 280)" }}
                >
                  Your bet: {betLabel(selectedBet)} @ {betPayout(selectedBet)}
                </p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg p-4 space-y-2"
                  style={{
                    background:
                      netGain >= 0
                        ? "oklch(0.15 0.08 150)"
                        : "oklch(0.15 0.08 20)",
                  }}
                >
                  <p
                    className="font-black text-lg"
                    style={{
                      color:
                        netGain >= 0
                          ? "oklch(0.75 0.2 150)"
                          : "oklch(0.75 0.2 20)",
                    }}
                  >
                    {netGain >= 0 ? `+${netGain}` : netGain} CREDITS
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.75 0.05 280)" }}
                  >
                    {resultMsg}
                  </p>
                  <Button
                    onClick={reset}
                    className="mt-2 font-black"
                    style={{ background: COLOR }}
                  >
                    ROLL AGAIN
                  </Button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
