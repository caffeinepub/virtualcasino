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

function RealisticDie({ n, rolling }: { n: number; rolling?: boolean }) {
  const dots = [
    [],
    [[50, 50]],
    [
      [28, 28],
      [72, 72],
    ],
    [
      [28, 28],
      [50, 50],
      [72, 72],
    ],
    [
      [28, 28],
      [72, 28],
      [28, 72],
      [72, 72],
    ],
    [
      [28, 28],
      [72, 28],
      [50, 50],
      [28, 72],
      [72, 72],
    ],
    [
      [28, 28],
      [72, 28],
      [28, 50],
      [72, 50],
      [28, 72],
      [72, 72],
    ],
  ];
  return (
    <motion.div
      animate={rolling ? { rotateX: [0, 360], rotateY: [0, 360] } : {}}
      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.3 }}
      style={{ perspective: "400px" }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-20 h-20 drop-shadow-2xl"
        aria-label={`Die ${n}`}
      >
        <title>Die face {n}</title>
        {/* 3D effect layers */}
        <rect x="4" y="4" width="92" height="92" rx="16" fill="#d4a846" />
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="16"
          fill="url(#diceGrad)"
          stroke="#b8860b"
          strokeWidth="2"
        />
        <defs>
          <radialGradient id="diceGrad" cx="30%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#fff9e6" />
            <stop offset="60%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#d4a432" />
          </radialGradient>
        </defs>
        {/* Inset shadow */}
        <rect
          x="5"
          y="5"
          width="90"
          height="90"
          rx="15"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
        />
        {(dots[n] ?? []).map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx + 0.5} cy={cy + 0.5} r="7" fill="rgba(0,0,0,0.25)" />
            <circle cx={cx} cy={cy} r="7" fill="#1a0a00" />
          </g>
        ))}
      </svg>
    </motion.div>
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
}: { balance: bigint; onGameComplete: () => void }) {
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

  return (
    <div className="space-y-4">
      {/* Neon title */}
      <div className="text-center">
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: COLOR,
            textShadow: `0 0 20px ${COLOR}, 0 0 40px ${COLOR}`,
          }}
        >
          SIC BO
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Shake the dome — predict the dice total
        </p>
      </div>

      <AnimatePresence mode="wait">
        {phase === "bet" && (
          <motion.div
            key="bet"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "linear-gradient(180deg, #0d0d1a 0%, #130820 100%)",
              border: "1px solid rgba(200,0,100,0.3)",
              boxShadow: "inset 0 0 60px rgba(200,0,100,0.05)",
            }}
          >
            {/* Glass dome illustration */}
            <div className="flex justify-center">
              <svg
                width="160"
                height="90"
                viewBox="0 0 160 90"
                aria-label="Sic Bo shaker dome"
              >
                <title>Sic Bo dome</title>
                {/* Dome glass */}
                <ellipse
                  cx="80"
                  cy="80"
                  rx="75"
                  ry="20"
                  fill="rgba(100,200,255,0.08)"
                  stroke="rgba(100,200,255,0.3)"
                  strokeWidth="1.5"
                />
                <path
                  d="M 5 80 Q 5 10 80 10 Q 155 10 155 80"
                  fill="rgba(100,200,255,0.05)"
                  stroke="rgba(100,200,255,0.4)"
                  strokeWidth="2"
                />
                {/* Shine */}
                <path
                  d="M 25 60 Q 30 20 60 15"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Dice inside */}
                {[35, 80, 125].map((x) => (
                  <g key={x} transform={`translate(${x - 12}, 48)`}>
                    <rect
                      width="24"
                      height="24"
                      rx="4"
                      fill="#fef3c7"
                      stroke="#b8860b"
                      strokeWidth="1"
                    />
                    <circle cx="12" cy="12" r="4" fill="#1a0a00" />
                  </g>
                ))}
              </svg>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_BETS.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setBet(String(q))}
                  className="rounded-full px-3 py-1.5 text-sm font-bold transition-all"
                  style={{
                    background: betNum === q ? COLOR : "rgba(200,0,100,0.15)",
                    border: `1px solid ${betNum === q ? COLOR : "rgba(200,0,100,0.3)"}`,
                    color: betNum === q ? "white" : COLOR,
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
              className="bg-black/30 border-white/20 text-white"
            />

            {/* Casino-style betting grid */}
            <div>
              <p
                className="text-xs font-black mb-2 tracking-widest"
                style={{ color: "rgba(255,215,0,0.7)" }}
              >
                SELECT YOUR BET
              </p>
              {/* Main bets row */}
              <div className="grid grid-cols-3 gap-1 mb-2">
                {[
                  "big" as BetType,
                  "small" as BetType,
                  "anyTriple" as BetType,
                ].map((opt) => {
                  const isSel =
                    JSON.stringify(opt) === JSON.stringify(selectedBet);
                  return (
                    <button
                      type="button"
                      key={String(opt)}
                      onClick={() => setSelectedBet(opt)}
                      className="rounded-lg py-2 text-xs font-black transition-all"
                      style={{
                        background: isSel ? COLOR : "rgba(200,0,100,0.15)",
                        border: `1.5px solid ${isSel ? COLOR : "rgba(200,0,100,0.4)"}`,
                        color: isSel ? "white" : COLOR,
                        boxShadow: isSel ? `0 0 12px ${COLOR}` : "none",
                      }}
                    >
                      <span className="block">{betLabel(opt)}</span>
                      <span className="text-xs opacity-70">
                        {betPayout(opt)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Totals grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((v) => {
                  const opt: BetType = { type: "total", value: v };
                  const isSel =
                    JSON.stringify(opt) === JSON.stringify(selectedBet);
                  return (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setSelectedBet(opt)}
                      className="rounded py-1 text-xs font-black transition-all"
                      style={{
                        background: isSel ? COLOR : "rgba(200,0,100,0.1)",
                        border: `1px solid ${isSel ? COLOR : "rgba(200,0,100,0.3)"}`,
                        color: isSel ? "white" : "rgba(255,100,150,0.9)",
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              {/* Triple grid */}
              <div className="grid grid-cols-6 gap-1">
                {[1, 2, 3, 4, 5, 6].map((v) => {
                  const opt: BetType = { type: "specificTriple", value: v };
                  const isSel =
                    JSON.stringify(opt) === JSON.stringify(selectedBet);
                  return (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setSelectedBet(opt)}
                      className="rounded py-1 text-xs font-black transition-all"
                      style={{
                        background: isSel
                          ? "oklch(0.7 0.25 60)"
                          : "rgba(200,100,0,0.15)",
                        border: `1px solid ${isSel ? "oklch(0.7 0.25 60)" : "rgba(200,100,0,0.3)"}`,
                        color: isSel ? "white" : "rgba(255,180,50,0.9)",
                      }}
                    >
                      ×{v}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleRoll}
              disabled={isPending}
              className="w-full font-black tracking-widest py-6"
              style={{
                background: `linear-gradient(135deg, ${COLOR}, oklch(0.5 0.25 340))`,
                boxShadow: `0 0 24px ${COLOR}`,
              }}
            >
              🎲 SHAKE THE DOME!
            </Button>
          </motion.div>
        )}

        {(phase === "rolling" || phase === "result") && (
          <motion.div
            key="rolling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-6 space-y-6 text-center"
            style={{
              background: "linear-gradient(180deg, #0d0d1a 0%, #130820 100%)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <h3
              className="font-black text-lg tracking-widest"
              style={{ color: COLOR }}
            >
              {phase === "rolling" ? "🎲 SHAKING DOME..." : "RESULT"}
            </h3>

            {/* Dome animation */}
            <motion.div
              animate={phase === "rolling" ? { rotate: [-5, 5, -5] } : {}}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.15 }}
              className="relative mx-auto"
              style={{ width: 200, height: 100 }}
            >
              <svg
                width="200"
                height="100"
                viewBox="0 0 200 100"
                aria-label="Shaking dome"
              >
                <title>Shaking dome</title>
                <ellipse
                  cx="100"
                  cy="90"
                  rx="95"
                  ry="20"
                  fill="rgba(100,200,255,0.1)"
                  stroke="rgba(100,200,255,0.4)"
                  strokeWidth="2"
                />
                <path
                  d="M 5 90 Q 5 10 100 10 Q 195 10 195 90"
                  fill="rgba(100,200,255,0.06)"
                  stroke="rgba(100,200,255,0.5)"
                  strokeWidth="2.5"
                />
                <path
                  d="M 30 70 Q 35 20 70 14"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                {([0, 1, 2] as const).map((i) => (
                  <RealisticDie
                    key={i}
                    n={(phase === "rolling" ? animDice : dice)[i]}
                    rolling={phase === "rolling"}
                  />
                ))}
              </div>
            </motion.div>

            {phase === "result" && (
              <>
                <p
                  className="text-sm font-bold"
                  style={{ color: "rgba(255,215,0,0.8)" }}
                >
                  Your bet: {betLabel(selectedBet)} @ {betPayout(selectedBet)}
                </p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl p-4 space-y-2"
                  style={{
                    background:
                      netGain >= 0 ? "rgba(0,100,40,0.6)" : "rgba(120,0,0,0.6)",
                    border: `2px solid ${netGain >= 0 ? "rgba(0,255,100,0.4)" : "rgba(255,0,0,0.4)"}`,
                  }}
                >
                  <p
                    className="font-black text-2xl"
                    style={{ color: netGain >= 0 ? "#4ade80" : "#f87171" }}
                  >
                    {netGain >= 0 ? `+${netGain}` : netGain} CREDITS
                  </p>
                  <p className="text-sm text-white/70">{resultMsg}</p>
                  <Button
                    onClick={reset}
                    className="mt-2 font-black"
                    style={{
                      background: COLOR,
                      boxShadow: `0 0 16px ${COLOR}`,
                    }}
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
