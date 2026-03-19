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
  // Find highest matching payout threshold
  let best = 0;
  for (const [threshold, mult] of Object.entries(table)) {
    if (matches >= Number.parseInt(threshold, 10)) best = mult;
  }
  return best;
}

export default function KenoGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
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

    // Draw 20 random numbers from 1-80
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
        : `${matchCount} matches — no win. -${betNum} credits.`,
    );
    setPhase("result");

    try {
      const won = net > 0;
      const winAmount = won ? BigInt(betNum * multiplier) : BigInt(0);
      await recordOutcome({
        gameType: GameType.keno,
        bet: BigInt(betNum),
        won,
        winAmount,
      });
      onGameComplete();
      if (won) toast.success(`🎉 ${matchCount} matches!`);
      else toast.error(`${matchCount} matches — no win.`);
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
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: `1px solid ${COLOR}40`,
        }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="font-black text-lg tracking-widest"
            style={{ color: COLOR }}
          >
            KENO
          </h3>
          <span className="text-sm text-muted-foreground">
            {selected.size}/10 selected
          </span>
        </div>

        {/* Number grid 10x8 */}
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => {
            const isSelected = selected.has(n);
            const isDrawn = drawn.has(n);
            const isMatch = isSelected && isDrawn;
            return (
              <motion.button
                key={n}
                onClick={() => toggleNumber(n)}
                whileTap={{ scale: 0.9 }}
                disabled={phase !== "pick"}
                className="aspect-square rounded text-xs font-black transition-all"
                style={{
                  background: isMatch
                    ? "oklch(0.78 0.18 72)"
                    : isDrawn
                      ? "oklch(0.577 0.245 27 / 0.6)"
                      : isSelected
                        ? COLOR
                        : "oklch(0.16 0.02 280)",
                  color:
                    isSelected || isDrawn ? "white" : "oklch(0.55 0.05 280)",
                  border: `1px solid ${isMatch ? "oklch(0.78 0.18 72)" : isSelected ? COLOR : "oklch(0.20 0.03 280)"}`,
                  boxShadow: isMatch
                    ? "0 0 8px oklch(0.78 0.18 72)"
                    : isSelected
                      ? `0 0 6px ${COLOR}`
                      : "none",
                  fontSize: "10px",
                }}
              >
                {n}
              </motion.button>
            );
          })}
        </div>

        {phase === "result" && (
          <div
            className="rounded-lg p-3 text-center font-black"
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
        )}
      </div>

      {phase === "pick" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 space-y-3"
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
                  color: betNum === q ? "white" : "oklch(0.65 0.05 280)",
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
              onClick={handleDraw}
              disabled={isPending || selected.size === 0}
              className="font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              DRAW!
            </Button>
          </div>
        </motion.div>
      )}

      {phase === "result" && (
        <Button
          onClick={reset}
          className="w-full font-black tracking-widest"
          style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
        >
          PLAY AGAIN
        </Button>
      )}
    </div>
  );
}
