import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "spinning" | "result";

const GOLD = "oklch(0.78 0.18 72)";
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
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
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
    setPhase("spinning");
    setSpinDeg(targetDeg);
    await new Promise((r) => setTimeout(r, 3500));
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
      {/* Neon marquee title */}
      <div className="text-center relative">
        <div
          className="inline-block px-6 py-2 rounded-full"
          style={{
            background: "rgba(0,0,0,0.8)",
            border: "2px solid oklch(0.78 0.18 72)",
            boxShadow:
              "0 0 30px oklch(0.7 0.25 72), 0 0 60px oklch(0.5 0.2 72)",
          }}
        >
          <h2
            className="text-xl font-black tracking-widest"
            style={{
              color: GOLD,
              textShadow: `0 0 20px ${GOLD}, 0 0 40px ${GOLD}`,
            }}
          >
            WHEEL OF FORTUNE
          </h2>
        </div>
        {/* Marquee dots */}
        <div className="flex justify-center gap-1.5 mt-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(
            (dotId) => (
              <motion.div
                key={dotId}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  delay: dotId * 0.1,
                  duration: 1.5,
                }}
                className="w-2 h-2 rounded-full"
                style={{ background: dotId % 2 === 0 ? "#f39c12" : "#e74c3c" }}
              />
            ),
          )}
        </div>
      </div>

      {/* The Wheel */}
      <div
        className="relative flex justify-center items-center"
        style={{ height: 240 }}
      >
        {/* Outer chrome ring */}
        <div
          className="absolute"
          style={{
            width: 240,
            height: 240,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #e8e8e8, #a0a0a0, #d0d0d0, #707070, #c0c0c0)",
            boxShadow:
              "0 0 0 4px #888, 0 8px 32px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.5)",
          }}
        />

        {/* Spinning wheel */}
        <motion.div
          animate={{ rotate: spinDeg }}
          transition={{ duration: 3.5, ease: [0.17, 0.67, 0.3, 0.99] }}
          className="absolute"
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: `conic-gradient(${conicGradient})`,
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.4)",
          }}
        >
          {/* Segment labels */}
          {SEGMENTS.map((mult, segIdx) => {
            const angle =
              (segIdx / SEGMENTS.length) * 360 + 180 / SEGMENTS.length;
            const rad = (angle * Math.PI) / 180;
            const r = 80;
            const x = 110 + r * Math.sin(rad);
            const y = 110 - r * Math.cos(rad);
            return (
              <div
                key={`seg-${segIdx}-${SEG_COLORS[segIdx]}`}
                className="absolute font-black text-white text-xs"
                style={{
                  left: x,
                  top: y,
                  transform: "translate(-50%,-50%)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                }}
              >
                {mult === 0 ? "✕" : `${mult}x`}
              </div>
            );
          })}
        </motion.div>

        {/* Brass hub center */}
        <div
          className="absolute z-20 rounded-full"
          style={{
            width: 40,
            height: 40,
            background:
              "linear-gradient(135deg, #d4af37 0%, #f5d76e 40%, #d4af37 70%, #8b6914 100%)",
            border: "3px solid #b8860b",
            boxShadow:
              "0 0 12px rgba(212,175,55,0.6), inset 0 2px 4px rgba(255,255,255,0.5)",
          }}
        />

        {/* Pointer triangle */}
        <div
          className="absolute z-30"
          style={{ top: 2, left: "50%", transform: "translateX(-50%)" }}
        >
          <motion.div
            animate={
              landedIndex !== null
                ? {
                    filter: ["brightness(1)", "brightness(2)", "brightness(1)"],
                  }
                : {}
            }
            transition={{ repeat: 3, duration: 0.4 }}
          >
            <svg
              width="24"
              height="32"
              viewBox="0 0 24 32"
              aria-label="pointer"
            >
              <title>Pointer</title>
              <polygon
                points="12,0 24,28 0,28"
                fill="#e74c3c"
                stroke="#c0392b"
                strokeWidth="2"
              />
              <polygon points="12,4 20,24 4,24" fill="#ff6b6b" />
            </svg>
          </motion.div>
        </div>

        {/* Spokes */}
        {SEGMENTS.map((_seg, spokeIdx) => {
          const angle = (spokeIdx / SEGMENTS.length) * 360;
          return (
            <div
              key={`spoke-${angle}`}
              className="absolute z-10"
              style={{
                width: 2,
                height: 100,
                top: 60,
                left: "50%",
                marginLeft: -1,
                background: "rgba(255,255,255,0.25)",
                transformOrigin: "center bottom",
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
        })}
      </div>

      {/* Bet controls */}
      {phase !== "spinning" && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: "rgba(10,10,20,0.95)",
            border: `1px solid ${GOLD}40`,
          }}
        >
          {phase === "result" && landedIndex !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-4 text-center space-y-1"
              style={{
                background:
                  netGain > 0 ? "rgba(0,100,40,0.6)" : "rgba(120,0,0,0.6)",
                border: `2px solid ${netGain > 0 ? "rgba(0,255,100,0.4)" : "rgba(255,0,0,0.4)"}`,
              }}
            >
              <p
                className="text-xs font-bold"
                style={{ color: "rgba(255,215,0,0.7)" }}
              >
                LANDED ON:{" "}
                {SEGMENTS[landedIndex] === 0
                  ? "LOSE"
                  : `${SEGMENTS[landedIndex]}x`}
              </p>
              <p
                className="font-black text-2xl"
                style={{ color: netGain > 0 ? "#4ade80" : "#f87171" }}
              >
                {netGain > 0 ? `+${netGain}` : netGain} CREDITS
              </p>
              <p className="text-sm text-white/70">{resultMsg}</p>
            </motion.div>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_BETS.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setBet(String(q))}
                className="rounded-full px-4 py-2 text-sm font-black transition-all"
                style={{
                  background: betNum === q ? GOLD : "rgba(255,215,0,0.1)",
                  border: `2px solid ${betNum === q ? GOLD : "rgba(255,215,0,0.3)"}`,
                  color: betNum === q ? "#1a0a00" : GOLD,
                  boxShadow: betNum === q ? `0 0 12px ${GOLD}` : "none",
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
            className="bg-black/30 border-yellow-400/30 text-white text-center"
          />
          {phase === "result" ? (
            <Button
              onClick={reset}
              className="w-full font-black tracking-widest py-6"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, oklch(0.65 0.2 72))`,
                color: "#1a0a00",
                boxShadow: `0 0 24px ${GOLD}`,
              }}
            >
              SPIN AGAIN
            </Button>
          ) : (
            <Button
              onClick={handleSpin}
              disabled={isPending}
              className="w-full font-black tracking-widest py-6"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, oklch(0.65 0.2 72))`,
                color: "#1a0a00",
                boxShadow: `0 0 24px ${GOLD}`,
              }}
            >
              SPIN THE WHEEL!
            </Button>
          )}
        </div>
      )}

      {phase === "spinning" && (
        <div className="text-center py-4">
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1 }}
            className="font-black tracking-widest text-lg"
            style={{ color: GOLD }}
          >
            SPINNING...
          </motion.p>
        </div>
      )}
    </div>
  );
}
