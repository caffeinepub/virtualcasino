import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "pick" | "drawn" | "result";

const COLOR = "oklch(0.62 0.22 240)";
const QUICK_BETS = [5, 10, 25, 50, 100];

const PAYOUT_TABLE: Record<number, Record<number, number>> = {
  1: { 1: 3 },
  2: { 2: 5 },
  3: { 3: 20 },
  4: { 3: 3, 4: 50 },
  5: { 3: 3, 4: 10, 5: 100 },
  6: { 3: 3, 4: 5, 5: 30, 6: 200 },
  7: { 4: 3, 5: 10, 6: 50, 7: 500 },
  8: { 5: 5, 6: 20, 7: 100, 8: 800 },
  9: { 5: 3, 6: 10, 7: 50, 8: 200, 9: 1000 },
  10: { 5: 2, 6: 5, 7: 20, 8: 100, 9: 500, 10: 2000 },
};

function getMultiplier(picks: number, matches: number): number {
  const table = PAYOUT_TABLE[picks];
  if (!table) return 0;
  let best = 0;
  for (const [threshold, mult] of Object.entries(table)) {
    if (matches >= Number.parseInt(threshold, 10)) best = mult;
  }
  return best;
}

export default function KenoGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [bet, setBet] = useState("10");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drawn, setDrawn] = useState<Set<number>>(new Set());
  const [netGain, setNetGain] = useState(0);
  const [resultMsg, setResultMsg] = useState("");

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const toggleNumber = (n: number) => {
    if (phase !== "pick") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
      } else if (next.size < 10) {
        next.add(n);
      } else {
        toast.error("Max 10 numbers!");
      }
      return next;
    });
  };

  const handleDraw = async () => {
    if (selected.size === 0) {
      toast.error("Select at least 1 number");
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
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const drawnNums = new Set(shuffled.slice(0, 20));
    setDrawn(drawnNums);
    setPhase("drawn");
    const matchCount = [...selected].filter((n) => drawnNums.has(n)).length;
    const multiplier = getMultiplier(selected.size, matchCount);
    const net = multiplier > 0 ? betNum * multiplier - betNum : -betNum;
    setNetGain(net);
    setResultMsg(
      multiplier > 0
        ? `${matchCount} matches — ${multiplier}x! +${betNum * multiplier - betNum} credits!`
        : `${matchCount} match${matchCount !== 1 ? "es" : ""} — not enough to win.`,
    );
    setPhase("result");
    try {
      const won = multiplier > 0;
      await recordOutcome({
        gameType: GameType.keno,
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
    setPhase("pick");
    setSelected(new Set());
    setDrawn(new Set());
    setNetGain(0);
    setResultMsg("");
  };

  return (
    <div className="space-y-4">
      {/* Neon Keno sign */}
      <div className="text-center">
        <div
          className="inline-block px-8 py-2 rounded"
          style={{
            background: "rgba(0,0,30,0.95)",
            border: "3px solid oklch(0.62 0.22 240)",
            boxShadow:
              "0 0 30px oklch(0.55 0.28 240), 0 0 60px oklch(0.4 0.2 240)",
          }}
        >
          <h2
            className="text-3xl font-black tracking-widest"
            style={{
              color: COLOR,
              textShadow: `0 0 20px ${COLOR}, 0 0 40px ${COLOR}`,
            }}
          >
            KENO
          </h2>
        </div>
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
          Pick up to 10 numbers — 20 balls drawn
        </p>
      </div>

      {/* Casino display panel */}
      <div
        className="rounded-2xl p-4 space-y-4"
        style={{
          background: "linear-gradient(180deg, #05050f 0%, #0a0a1e 100%)",
          border: "2px solid rgba(50,100,200,0.4)",
          boxShadow: "inset 0 0 40px rgba(30,60,180,0.1)",
        }}
      >
        {/* Stats row */}
        <div className="flex justify-center gap-4 text-center">
          <div
            className="rounded-lg px-3 py-1"
            style={{
              background: "rgba(30,60,180,0.3)",
              border: "1px solid rgba(50,100,200,0.4)",
            }}
          >
            <p className="text-xs" style={{ color: "rgba(100,150,255,0.7)" }}>
              PICKED
            </p>
            <p className="font-black" style={{ color: COLOR }}>
              {selected.size}/10
            </p>
          </div>
          <div
            className="rounded-lg px-3 py-1"
            style={{
              background: "rgba(30,60,180,0.3)",
              border: "1px solid rgba(50,100,200,0.4)",
            }}
          >
            <p className="text-xs" style={{ color: "rgba(100,150,255,0.7)" }}>
              DRAWN
            </p>
            <p className="font-black" style={{ color: "#4ade80" }}>
              {drawn.size}
            </p>
          </div>
          <div
            className="rounded-lg px-3 py-1"
            style={{
              background: "rgba(30,60,180,0.3)",
              border: "1px solid rgba(50,100,200,0.4)",
            }}
          >
            <p className="text-xs" style={{ color: "rgba(100,150,255,0.7)" }}>
              MATCHES
            </p>
            <p className="font-black" style={{ color: "#f5d76e" }}>
              {[...selected].filter((n) => drawn.has(n)).length}
            </p>
          </div>
        </div>

        {/* 80-number ball grid */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(10, 1fr)" }}
        >
          {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => {
            const isSel = selected.has(n);
            const isDrawn = drawn.has(n);
            const isMatch = isSel && isDrawn;
            return (
              <motion.button
                type="button"
                key={n}
                onClick={() => toggleNumber(n)}
                animate={isDrawn && !isSel ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.4 }}
                className="rounded-full aspect-square flex items-center justify-center font-black text-xs transition-all"
                style={{
                  fontSize: "9px",
                  background: isMatch
                    ? "radial-gradient(circle, #f5d76e, #e67e22)"
                    : isDrawn
                      ? "radial-gradient(circle, #4ade80, #16a34a)"
                      : isSel
                        ? `radial-gradient(circle, ${COLOR}, oklch(0.45 0.2 240))`
                        : "radial-gradient(circle at 30% 30%, #2a2a4a, #151528)",
                  border: isMatch
                    ? "2px solid #f39c12"
                    : isDrawn
                      ? "1px solid #22c55e"
                      : isSel
                        ? `2px solid ${COLOR}`
                        : "1px solid rgba(50,100,200,0.3)",
                  color:
                    isMatch || isDrawn || isSel
                      ? "white"
                      : "rgba(150,180,255,0.7)",
                  boxShadow: isMatch
                    ? "0 0 8px #f39c12"
                    : isDrawn
                      ? "0 0 6px #22c55e"
                      : isSel
                        ? `0 0 8px ${COLOR}`
                        : "none",
                  cursor: phase === "pick" ? "pointer" : "default",
                }}
              >
                {n}
              </motion.button>
            );
          })}
        </div>

        {/* Drawn balls display */}
        {drawn.size > 0 && (
          <div className="space-y-1">
            <p
              className="text-xs font-black tracking-wider"
              style={{ color: "rgba(100,150,255,0.7)" }}
            >
              DRAWN BALLS:
            </p>
            <div className="flex flex-wrap gap-1">
              {[...drawn]
                .sort((a, b) => a - b)
                .map((n) => (
                  <motion.div
                    key={n}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="rounded-full w-7 h-7 flex items-center justify-center font-black text-xs"
                    style={{
                      background: selected.has(n)
                        ? "radial-gradient(circle, #f5d76e, #e67e22)"
                        : "radial-gradient(circle, #4ade80, #16a34a)",
                      color: "white",
                      fontSize: "9px",
                      boxShadow: selected.has(n)
                        ? "0 0 8px #f39c12"
                        : "0 0 6px #22c55e",
                    }}
                  >
                    {n}
                  </motion.div>
                ))}
            </div>
          </div>
        )}

        {/* Bet input and controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          {QUICK_BETS.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => setBet(String(q))}
              disabled={phase !== "pick"}
              className="rounded-full px-3 py-1.5 text-sm font-black transition-all"
              style={{
                background: betNum === q ? COLOR : "rgba(50,100,200,0.2)",
                border: `2px solid ${betNum === q ? COLOR : "rgba(50,100,200,0.4)"}`,
                color: betNum === q ? "white" : "rgba(100,150,255,0.8)",
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
          disabled={phase !== "pick"}
          placeholder="Custom bet"
          className="bg-black/30 border-blue-400/30 text-white text-center"
        />

        {/* Result banner */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-4 text-center space-y-2"
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
          </motion.div>
        )}

        {phase === "pick" ? (
          <Button
            onClick={handleDraw}
            disabled={isPending || selected.size === 0}
            className="w-full font-black tracking-widest py-6"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.45 0.2 240))`,
              boxShadow: `0 0 24px ${COLOR}`,
            }}
          >
            DRAW BALLS!
          </Button>
        ) : (
          <Button
            onClick={reset}
            className="w-full font-black tracking-widest py-6"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.45 0.2 240))`,
              boxShadow: `0 0 24px ${COLOR}`,
            }}
          >
            PLAY AGAIN
          </Button>
        )}
      </div>
    </div>
  );
}
