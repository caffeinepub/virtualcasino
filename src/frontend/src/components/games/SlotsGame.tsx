import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣", "⭐", "🔔"];
const COLOR = "oklch(0.65 0.28 340)";
const QUICK_BETS = [1, 5, 10, 25, 50];

function getPayoutMultiplier(reels: string[]): number {
  const [a, b, c] = reels;
  if (a === "7️⃣" && b === "7️⃣" && c === "7️⃣") return 10;
  if (a === "💎" && b === "💎" && c === "💎") return 7;
  if ((a === "⭐" || a === "🔔") && a === b && b === c) return 5;
  if (a === b && b === c) return 3; // three matching fruit
  if (a === "7️⃣" && b === "7️⃣") return 2;
  if (b === "7️⃣" && c === "7️⃣") return 2;
  if (a === "7️⃣" && c === "7️⃣") return 2;
  if (a === b) return 1;
  if (b === c) return 1;
  if (a === c) return 1;
  return 0;
}

function getPayoutLabel(mult: number): string {
  if (mult === 0) return "No win";
  if (mult === 1) return "Break even";
  return `${mult}× win!`;
}

function Reel({
  symbol,
  spinning,
  stopped,
}: {
  symbol: string;
  spinning: boolean;
  stopped: boolean;
}) {
  return (
    <div
      className="w-20 h-24 rounded-xl flex items-center justify-center overflow-hidden relative"
      style={{
        background: "oklch(0.09 0.012 280)",
        border: `2px solid ${stopped && !spinning ? COLOR : "oklch(0.22 0.03 275)"}`,
        boxShadow: stopped && !spinning ? `0 0 16px ${COLOR}50` : "none",
      }}
    >
      {spinning ? (
        <motion.div
          animate={{ y: ["-100%", "100%"] }}
          transition={{
            duration: 0.12,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="flex flex-col items-center"
        >
          {SYMBOLS.concat(SYMBOLS).map((s, i) => (
            <div
              key={s + String(i)}
              className="text-4xl h-24 flex items-center justify-center"
            >
              {s}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.span
          key={symbol}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="text-5xl"
        >
          {symbol}
        </motion.span>
      )}
    </div>
  );
}

export default function SlotsGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [reels, setReels] = useState(["🎰", "🎰", "🎰"]);
  const [spinning, setSpinning] = useState([false, false, false]);
  const [bet, setBet] = useState("5");
  const [result, setResult] = useState<{ mult: number; win: number } | null>(
    null,
  );
  const spinningRef = useRef(false);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleSpin = async () => {
    if (spinningRef.current) return;
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    spinningRef.current = true;
    setResult(null);
    setSpinning([true, true, true]);

    const finalSymbols = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    ];

    // Stop reels one by one
    await new Promise((r) => setTimeout(r, 800));
    setSpinning([false, true, true]);
    setReels([finalSymbols[0], "🎰", "🎰"]);

    await new Promise((r) => setTimeout(r, 600));
    setSpinning([false, false, true]);
    setReels([finalSymbols[0], finalSymbols[1], "🎰"]);

    await new Promise((r) => setTimeout(r, 600));
    setSpinning([false, false, false]);
    setReels(finalSymbols);

    const mult = getPayoutMultiplier(finalSymbols);
    const winAmount = betNum * mult;
    const netGain = winAmount - betNum;
    setResult({ mult, win: netGain });
    spinningRef.current = false;

    try {
      const won = mult > 0;
      await recordOutcome({
        gameType: GameType.slots,
        bet: BigInt(betNum),
        won,
        winAmount: BigInt(winAmount),
      });
      onGameComplete();
      if (mult === 0) toast.error(`No match. Lost ${betNum} credits.`);
      else if (mult === 1) toast("Break even! Bet returned.");
      else toast.success(`🎰 ${mult}× win! +${netGain} credits!`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const anySpinning = spinning.some(Boolean);

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="font-display font-black text-xl tracking-widest"
          style={{ color: COLOR, textShadow: `0 0 12px ${COLOR}` }}
        >
          SLOTS
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">BALANCE</span>
          <span className="font-black text-gold">{balance.toString()}</span>
        </div>
      </div>

      {/* Cabinet */}
      <div
        className="rounded-2xl p-6"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.14 0.03 290), oklch(0.09 0.015 280))",
          border: `2px solid ${COLOR}60`,
          boxShadow: `0 0 30px ${COLOR}20, inset 0 1px 0 oklch(1 0 0 / 0.05)`,
        }}
      >
        {/* Screen */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: "oklch(0.07 0.01 280)",
            border: `1px solid ${COLOR}40`,
            boxShadow: `inset 0 0 20px ${COLOR}15`,
          }}
        >
          <div className="flex gap-3 justify-center">
            <Reel
              key="left"
              symbol={reels[0]}
              spinning={spinning[0]}
              stopped={!spinning[0]}
            />
            <Reel
              key="center"
              symbol={reels[1]}
              spinning={spinning[1]}
              stopped={!spinning[1]}
            />
            <Reel
              key="right"
              symbol={reels[2]}
              spinning={spinning[2]}
              stopped={!spinning[2]}
            />
          </div>

          {/* Payline indicator */}
          <div
            className="mt-2 h-0.5 mx-4"
            style={{
              background: `linear-gradient(90deg, transparent, ${COLOR}, transparent)`,
              opacity: 0.6,
            }}
          />
        </div>

        {/* Result */}
        <AnimatePresence>
          {result !== null && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center mb-4"
              data-ocid="slots.result.panel"
            >
              <p
                className="font-black text-2xl"
                style={{
                  color:
                    result.mult === 0
                      ? "oklch(0.577 0.245 27)"
                      : "oklch(0.78 0.18 72)",
                }}
              >
                {getPayoutLabel(result.mult)}
              </p>
              {result.mult > 0 && (
                <p className="text-sm text-muted-foreground">
                  {result.win >= 0 ? "+" : ""}
                  {result.win} credits
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bet controls */}
        <div className="space-y-3">
          <div className="flex gap-2 justify-center flex-wrap">
            {QUICK_BETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBet(q.toString())}
                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                style={
                  bet === q.toString()
                    ? {
                        background: COLOR,
                        color: "#fff",
                        boxShadow: `0 0 10px ${COLOR}60`,
                      }
                    : {
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
                      }
                }
                disabled={anySpinning}
                data-ocid="slots.quickbet.button"
              >
                {q}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min="1"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            disabled={anySpinning}
            className="bg-secondary border-border text-foreground font-bold text-center"
            data-ocid="slots.bet.input"
          />
          <Button
            onClick={handleSpin}
            disabled={anySpinning || isPending}
            className="w-full py-5 font-black tracking-widest text-white text-lg"
            style={{
              background: anySpinning
                ? "oklch(0.22 0.04 280)"
                : `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.25 290))`,
              boxShadow: anySpinning ? "none" : `0 0 25px ${COLOR}50`,
            }}
            data-ocid="slots.spin.button"
          >
            {anySpinning ? "🎰 SPINNING..." : `🎰 SPIN — ${betNum} CREDITS`}
          </Button>
        </div>
      </div>

      {/* Payout table */}
      <div
        className="rounded-xl p-3"
        style={{
          background: "oklch(0.10 0.012 280)",
          border: "1px solid oklch(0.16 0.02 280)",
        }}
      >
        <p className="text-xs font-black tracking-wider text-muted-foreground mb-2">
          PAYTABLE
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {[
            ["7️⃣ 7️⃣ 7️⃣", "10×"],
            ["💎 💎 💎", "7×"],
            ["⭐/🔔 × 3", "5×"],
            ["Fruit × 3", "3×"],
            ["7️⃣ 7️⃣ any", "2×"],
            ["Any pair", "1× (push)"],
          ].map(([combo, pay]) => (
            <div key={combo} className="flex justify-between">
              <span className="text-muted-foreground">{combo}</span>
              <span className="text-gold font-black">{pay}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
