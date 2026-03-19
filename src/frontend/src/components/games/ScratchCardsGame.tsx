import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "scratching" | "result";

const QUICK_BETS = [5, 10, 25, 50, 100];
const SYMBOLS = ["🍒", "🎰", "💎", "⭐", "🎲"];
const SYMBOL_NAMES: Record<string, string> = {
  "🍒": "Cherry",
  "🎰": "Slots",
  "💎": "Diamond",
  "⭐": "Star",
  "🎲": "Dice",
};

function generateGrid(): string[] {
  const grid: string[] = [];
  for (let i = 0; i < 9; i++)
    grid.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  return grid;
}

function checkWin(grid: string[]): { multiplier: number; label: string } {
  if (grid.every((s) => s === grid[0]))
    return { multiplier: 10, label: "ALL 9 SAME — 10x!" };
  const rows = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
  ];
  for (const row of rows) {
    if (grid[row[0]] === grid[row[1]] && grid[row[1]] === grid[row[2]])
      return { multiplier: 3, label: "3 IN A ROW — 3x!" };
  }
  return { multiplier: 0, label: "No match — try again!" };
}

export default function ScratchCardsGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
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
    if (newRevealed.every(Boolean)) await endGame(newRevealed);
  };

  const handleRevealAll = async () => {
    const all = new Array(9).fill(true);
    setRevealed(all);
    await endGame(all);
  };

  const endGame = async (_revealed: boolean[]) => {
    setGameEnded(true);
    const { multiplier, label } = checkWin(grid);
    const net = multiplier > 0 ? betNum * multiplier - betNum : -betNum;
    setNetGain(net);
    setResultMsg(label);
    setPhase("result");
    try {
      const won = multiplier > 0;
      await recordOutcome({
        gameType: GameType.scratchCards,
        bet: BigInt(betNum),
        won,
        winAmount: won ? BigInt(net + betNum) : BigInt(0),
      });
      onGameComplete();
      if (won) toast.success(`🎉 ${label}`);
      else toast.error("No luck this time!");
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
    setGrid([]);
    setRevealed(new Array(9).fill(false));
    setNetGain(0);
    setResultMsg("");
    setGameEnded(false);
  };

  return (
    <div className="space-y-4">
      {/* Game title */}
      <div className="text-center">
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "oklch(0.68 0.22 150)",
            textShadow:
              "0 0 20px oklch(0.6 0.28 150), 0 0 40px oklch(0.5 0.22 150)",
          }}
        >
          SCRATCH CARDS
        </h2>
      </div>

      {phase === "bet" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: "linear-gradient(135deg, #0d1a0d 0%, #051005 100%)",
            border: "2px solid rgba(0,200,100,0.3)",
          }}
        >
          {/* Lottery card preview */}
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "linear-gradient(135deg, #1a6b2e, #0d3a16)",
              border: "4px solid #f5d76e",
              boxShadow: "0 0 20px rgba(245,215,110,0.3)",
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-yellow-300 opacity-70">
                ★★★★★
              </span>
              <span className="text-xs font-black text-yellow-300 opacity-70">
                ★★★★★
              </span>
            </div>
            <p
              className="font-black text-yellow-300 tracking-widest text-sm"
              style={{ textShadow: "0 0 10px rgba(245,215,110,0.8)" }}
            >
              CPM CASINO SCRATCH
            </p>
            <p className="text-xs text-yellow-200 mt-1 opacity-70">
              INSTANT WIN TICKET
            </p>
            {/* Preview scratch squares */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((sqId) => (
                <div
                  key={sqId}
                  className="rounded-lg h-10 flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #c0c0c0, #909090, #c0c0c0)",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
                  }}
                >
                  <span className="text-xs font-black text-gray-600">
                    SCRATCH
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_BETS.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setBet(String(q))}
                className="rounded-full px-4 py-2 text-sm font-black transition-all"
                style={{
                  background:
                    betNum === q
                      ? "oklch(0.55 0.25 150)"
                      : "rgba(0,100,50,0.3)",
                  border: `2px solid ${betNum === q ? "oklch(0.7 0.25 150)" : "rgba(0,200,100,0.3)"}`,
                  color: betNum === q ? "white" : "rgba(100,255,150,0.8)",
                  boxShadow:
                    betNum === q ? "0 0 12px oklch(0.55 0.25 150)" : "none",
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
            className="bg-black/30 border-green-400/30 text-white text-center"
          />
          <Button
            onClick={handleStart}
            disabled={isPending}
            className="w-full font-black tracking-widest py-6"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.25 150), oklch(0.4 0.2 150))",
              border: "2px solid #f5d76e",
              boxShadow: "0 0 24px oklch(0.5 0.25 150)",
            }}
          >
            🎟️ BUY SCRATCH CARD
          </Button>
        </motion.div>
      )}

      {(phase === "scratching" || phase === "result") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-4 space-y-4"
          style={{
            background: "linear-gradient(135deg, #0d1a0d 0%, #051005 100%)",
            border: "2px solid rgba(0,200,100,0.3)",
          }}
        >
          {/* The actual scratch card */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, #1a6b2e, #0d3a16)",
              border: "4px solid #f5d76e",
              boxShadow: "0 0 20px rgba(245,215,110,0.3)",
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-yellow-300">★★★★★</span>
              <p className="font-black text-yellow-300 tracking-widest text-xs">
                CPM CASINO SCRATCH
              </p>
              <span className="text-xs font-black text-yellow-300">★★★★★</span>
            </div>

            {/* Payout table */}
            <div className="flex justify-center gap-3 mb-3">
              <span className="text-xs text-yellow-200 opacity-70">
                3-in-a-row: 3x
              </span>
              <span className="text-xs text-yellow-200 opacity-70">│</span>
              <span className="text-xs text-yellow-200 opacity-70">
                All same: 10x
              </span>
            </div>

            {/* 3x3 grid */}
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, pos) => pos).map((pos) => (
                <motion.button
                  type="button"
                  key={pos}
                  onClick={() => handleReveal(pos)}
                  disabled={revealed[pos] || gameEnded}
                  className="relative rounded-xl overflow-hidden aspect-square flex items-center justify-center"
                  style={{
                    minHeight: 64,
                    cursor: revealed[pos] ? "default" : "pointer",
                  }}
                  whileHover={!revealed[pos] ? { scale: 1.05 } : {}}
                  whileTap={!revealed[pos] ? { scale: 0.95 } : {}}
                >
                  {/* Symbol underneath */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.95)" }}
                  >
                    <span className="text-3xl">{grid[pos]}</span>
                    <span className="text-xs font-bold text-gray-600">
                      {SYMBOL_NAMES[grid[pos]]}
                    </span>
                  </div>

                  {/* Silver scratch overlay */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={
                      revealed[pos]
                        ? { opacity: 0, scale: 1.1 }
                        : { opacity: 1, scale: 1 }
                    }
                    transition={{ duration: 0.3 }}
                    style={{
                      background: revealed[pos]
                        ? "transparent"
                        : "linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 30%, #a0a0a0 50%, #d0d0d0 70%, #b0b0b0 100%)",
                      boxShadow: revealed[pos]
                        ? "none"
                        : "inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    {!revealed[pos] && (
                      <div className="text-center">
                        <span className="text-xs font-black text-gray-500 block">
                          SCRATCH
                        </span>
                        <span className="text-lg">🪙</span>
                      </div>
                    )}
                  </motion.div>
                </motion.button>
              ))}
            </div>

            {/* Scratch all button */}
            {!gameEnded && (
              <Button
                onClick={handleRevealAll}
                disabled={isPending}
                className="w-full mt-3 font-black"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  border: "2px solid #f5d76e",
                  color: "#f5d76e",
                }}
              >
                REVEAL ALL
              </Button>
            )}
          </div>

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
              <Button
                onClick={reset}
                className="mt-2 font-black"
                style={{
                  background: "oklch(0.55 0.25 150)",
                  boxShadow: "0 0 16px oklch(0.5 0.25 150)",
                }}
              >
                BUY ANOTHER
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
