import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "scratching" | "result";

const COLOR = "oklch(0.68 0.22 150)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const SYMBOLS = ["🍒", "🎰", "💎", "⭐", "🎲"];

function generateGrid(): string[] {
  // Weighted random — bias toward no full match
  const grid: string[] = [];
  for (let i = 0; i < 9; i++) {
    grid.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  return grid;
}

function checkWin(grid: string[]): { multiplier: number; label: string } {
  // Check if all 9 same
  if (grid.every((s) => s === grid[0]))
    return { multiplier: 10, label: "ALL SAME — 10x!" };

  // Check rows
  const rows = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
  ];
  for (const row of rows) {
    if (grid[row[0]] === grid[row[1]] && grid[row[1]] === grid[row[2]]) {
      return { multiplier: 3, label: "3 IN A ROW — 3x!" };
    }
  }
  return { multiplier: 0, label: "No match — try again!" };
}

export default function ScratchCardsGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [grid, setGrid] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(new Array(9).fill(false));
  const [netGain, setNetGain] = useState(0);
  const [resultMsg, setResultMsg] = useState("");
  const [gameEnded, setGameEnded] = useState(false);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleStart = () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setGrid(generateGrid());
    setRevealed(new Array(9).fill(false));
    setGameEnded(false);
    setNetGain(0);
    setResultMsg("");
    setPhase("scratching");
  };

  const handleReveal = async (index: number) => {
    if (revealed[index] || gameEnded) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    // Check if all revealed
    if (newRevealed.every(Boolean)) {
      await endGame(newRevealed);
    }
  };

  const handleRevealAll = async () => {
    const allRevealed = new Array(9).fill(true);
    setRevealed(allRevealed);
    await endGame(allRevealed);
  };

  const endGame = async (_revealed: boolean[]) => {
    setGameEnded(true);
    const { multiplier, label } = checkWin(grid);
    const net = multiplier > 0 ? betNum * multiplier - betNum : -betNum;
    setNetGain(net);
    setResultMsg(label);
    setPhase("result");

    try {
      const won = net > 0;
      const winAmount = won ? BigInt(betNum * multiplier) : BigInt(0);
      await recordOutcome({
        gameType: GameType.scratchCards,
        bet: BigInt(betNum),
        won,
        winAmount,
      });
      onGameComplete();
      if (won) toast.success(`🎉 ${label}`);
      else toast.error(label);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
    setGrid([]);
    setRevealed(new Array(9).fill(false));
    setGameEnded(false);
    setNetGain(0);
    setResultMsg("");
  };

  return (
    <div className="space-y-4">
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
          <h3
            className="font-black text-lg tracking-widest text-center"
            style={{ color: COLOR }}
          >
            SCRATCH CARDS
          </h3>
          <p className="text-center text-sm text-muted-foreground">
            Match a row = 3x | All same = 10x
          </p>

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
              onClick={handleStart}
              disabled={isPending}
              className="font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              GET CARD
            </Button>
          </div>
        </motion.div>
      )}

      {(phase === "scratching" || phase === "result") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <h3
              className="font-black tracking-widest text-center"
              style={{ color: COLOR }}
            >
              SCRATCH TO REVEAL
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {grid.map((symbol, i) => (
                <motion.button
                  key={String(i)}
                  onClick={() => handleReveal(i)}
                  whileTap={{ scale: 0.95 }}
                  disabled={revealed[i] || gameEnded}
                  className="h-16 rounded-xl font-black text-2xl relative overflow-hidden"
                  style={{
                    background: revealed[i]
                      ? "oklch(0.16 0.02 280)"
                      : `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.18 150))`,
                    border: `2px solid ${COLOR}40`,
                    cursor: revealed[i] ? "default" : "pointer",
                    boxShadow: revealed[i] ? "none" : `0 0 12px ${COLOR}40`,
                  }}
                >
                  {revealed[i] ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-2xl"
                    >
                      {symbol}
                    </motion.span>
                  ) : (
                    <span className="text-xs font-black tracking-wider text-white/70">
                      SCRATCH
                    </span>
                  )}
                </motion.button>
              ))}
            </div>

            {phase === "scratching" && !gameEnded && (
              <Button
                onClick={handleRevealAll}
                variant="outline"
                className="w-full font-black tracking-wider"
              >
                REVEAL ALL
              </Button>
            )}

            {phase === "result" && (
              <div
                className="rounded-lg p-3 text-center font-black text-lg"
                style={{
                  background:
                    netGain > 0
                      ? "oklch(0.78 0.18 72 / 0.15)"
                      : "oklch(0.577 0.245 27 / 0.15)",
                  color:
                    netGain > 0
                      ? "oklch(0.78 0.18 72)"
                      : "oklch(0.577 0.245 27)",
                  border: `1px solid ${netGain > 0 ? "oklch(0.78 0.18 72 / 0.5)" : "oklch(0.577 0.245 27 / 0.5)"}`,
                }}
              >
                {resultMsg}
              </div>
            )}
          </div>

          {phase === "result" && (
            <Button
              onClick={reset}
              className="w-full font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              NEW CARD
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
