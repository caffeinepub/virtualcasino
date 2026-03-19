import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣", "⭐", "🔔"];
const QUICK_BETS = [1, 5, 10, 25, 50];

function getPayoutMultiplier(reels: string[]): number {
  const [a, b, c] = reels;
  if (a === "7️⃣" && b === "7️⃣" && c === "7️⃣") return 10;
  if (a === "💎" && b === "💎" && c === "💎") return 7;
  if ((a === "⭐" || a === "🔔") && a === b && b === c) return 5;
  if (a === b && b === c) return 3;
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

function Reel({ symbol, spinning }: { symbol: string; spinning: boolean }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 80,
        height: 100,
        background: "#f5f5f5",
        border: "3px solid #bbb",
        borderRadius: 8,
        boxShadow:
          "inset 0 4px 16px rgba(0,0,0,0.25), inset 0 -4px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* Reel lines */}
      <div
        className="absolute top-[33%] left-0 right-0 h-px"
        style={{ background: "rgba(0,0,0,0.1)" }}
      />
      <div
        className="absolute top-[67%] left-0 right-0 h-px"
        style={{ background: "rgba(0,0,0,0.1)" }}
      />
      {/* Payline highlight */}
      <div
        className="absolute inset-x-0 top-[33%] bottom-[33%]"
        style={{
          background: "rgba(255,215,0,0.1)",
          borderTop: "1px solid rgba(255,215,0,0.4)",
          borderBottom: "1px solid rgba(255,215,0,0.4)",
        }}
      />

      {spinning ? (
        <motion.div
          className="absolute inset-0 flex flex-col items-center"
          animate={{ y: ["-100%", "100%"] }}
          transition={{
            duration: 0.1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          {SYMBOLS.concat(SYMBOLS).map((s, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: spinning animation strip
              key={i}
              className="flex-shrink-0 flex items-center justify-center"
              style={{ height: 50, fontSize: 32 }}
            >
              {s}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={symbol}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          style={{ fontSize: 44 }}
        >
          {symbol}
        </motion.div>
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
  const [leverPulled, setLeverPulled] = useState(false);
  const spinningRef = useRef(false);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const anySpinning = spinning.some(Boolean);

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
    setLeverPulled(true);
    setTimeout(() => setLeverPulled(false), 400);
    setSpinning([true, true, true]);

    const finalSymbols = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    ];

    await new Promise((r) => setTimeout(r, 900));
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

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* MACHINE CABINET */}
      <div
        className="rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
          border: "4px solid #444",
          boxShadow:
            "0 0 0 2px #666, 0 8px 40px rgba(0,0,0,0.8), inset 0 2px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* NEON MARQUEE */}
        <div
          className="px-4 py-3 text-center font-black text-xl tracking-[0.3em] relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0d0d0d, #1a0020)",
            borderBottom: "2px solid #ff00aa",
            color: "#ff00aa",
            textShadow:
              "0 0 10px #ff00aa, 0 0 30px #ff00aa, 0 0 60px #ff00aa80",
          }}
        >
          <span>★ CPM SLOTS ★</span>
        </div>

        {/* CHROME BEZEL WITH REELS */}
        <div className="flex items-center gap-3 p-4">
          {/* LEFT PANEL */}
          <div className="flex-1">
            {/* Reel window */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "linear-gradient(180deg, #333 0%, #222 100%)",
                border: "3px solid #555",
                boxShadow: "inset 0 4px 12px rgba(0,0,0,0.6), 0 2px 0 #777",
              }}
            >
              {/* Payline indicator */}
              <div
                className="text-center text-[10px] font-black tracking-widest mb-2"
                style={{ color: "#ffd700", textShadow: "0 0 8px #ffd700" }}
              >
                ← PAYLINE →
              </div>
              <div className="flex gap-2 justify-center">
                {reels.map((sym, i) => (
                  <Reel // biome-ignore lint/suspicious/noArrayIndexKey: reel positions are fixed
                    key={i}
                    symbol={sym}
                    spinning={spinning[i]}
                  />
                ))}
              </div>
            </div>

            {/* LED DISPLAY */}
            <div
              className="mt-3 rounded-lg px-4 py-2 flex justify-between items-center"
              style={{
                background: "#0a0a0a",
                border: "2px solid #333",
                fontFamily: "monospace",
              }}
            >
              <div>
                <div className="text-[9px] text-green-500/60 tracking-widest">
                  CREDITS
                </div>
                <div
                  className="text-green-400 font-black text-sm"
                  style={{ textShadow: "0 0 6px #00ff00" }}
                >
                  {balance.toString().padStart(6, "0")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-yellow-500/60 tracking-widest">
                  WIN
                </div>
                <div
                  className="text-yellow-400 font-black text-sm"
                  style={{ textShadow: "0 0 6px #ffd700" }}
                >
                  {result && result.win > 0
                    ? String(result.win).padStart(4, "0")
                    : "0000"}
                </div>
              </div>
            </div>
          </div>

          {/* LEVER */}
          <div className="flex flex-col items-center" style={{ width: 28 }}>
            <div
              className="rounded-full"
              style={{
                width: 18,
                height: 18,
                background:
                  "radial-gradient(circle at 35% 35%, #ff4444, #aa0000)",
                border: "2px solid #660000",
                boxShadow: "0 0 8px #ff000060",
              }}
            />
            <motion.div
              animate={
                leverPulled ? { scaleY: 1.2, originY: 0 } : { scaleY: 1 }
              }
              transition={{ duration: 0.2 }}
              style={{
                width: 8,
                height: 80,
                background: "linear-gradient(90deg, #888, #ccc, #888)",
                borderRadius: 4,
                boxShadow: "2px 0 4px rgba(0,0,0,0.5)",
              }}
            />
            <div
              className="rounded-sm"
              style={{
                width: 20,
                height: 10,
                background: "linear-gradient(180deg, #888, #555)",
                border: "1px solid #333",
              }}
            />
          </div>
        </div>

        {/* RESULT DISPLAY */}
        <AnimatePresence>
          {result !== null && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-4 mb-2 py-2 rounded-lg text-center font-black text-sm"
              style={{
                background:
                  result.mult === 0
                    ? "rgba(183,28,28,0.3)"
                    : "rgba(255,215,0,0.2)",
                border: `1px solid ${result.mult === 0 ? "rgba(239,83,80,0.5)" : "rgba(255,215,0,0.6)"}`,
                color: result.mult === 0 ? "#ef5350" : "#ffd700",
                textShadow: result.mult > 0 ? "0 0 8px #ffd700" : "none",
              }}
            >
              {getPayoutLabel(result.mult)}
              {result.win !== 0 && (
                <span className="ml-2 text-xs">
                  ({result.win > 0 ? "+" : ""}
                  {result.win} cr)
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* BET CONTROLS */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2 justify-center flex-wrap">
            {QUICK_BETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBet(q.toString())}
                disabled={anySpinning}
                className="px-3 py-1.5 rounded text-xs font-black transition-all"
                style={
                  bet === q.toString()
                    ? { background: "#ffd700", color: "#1a1a1a" }
                    : {
                        background: "#2a2a2a",
                        color: "#888",
                        border: "1px solid #444",
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
            disabled={anySpinning}
            className="w-full rounded-lg px-3 py-2 text-center font-bold text-sm"
            style={{
              background: "#0a0a0a",
              color: "#ffd700",
              border: "2px solid #333",
              fontFamily: "monospace",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleSpin}
            disabled={anySpinning || isPending}
            className="w-full py-3 rounded-xl font-black tracking-widest text-black text-sm transition-all hover:brightness-110 active:scale-95"
            style={{
              background: anySpinning
                ? "#333"
                : "linear-gradient(180deg, #ffd700, #f5a623)",
              color: anySpinning ? "#666" : "#1a1a1a",
              boxShadow: anySpinning
                ? "none"
                : "0 0 20px rgba(255,215,0,0.4), 0 4px 0 #b8860b",
            }}
          >
            {anySpinning ? "🎰 SPINNING..." : `🎰 SPIN — ${betNum} CREDITS`}
          </button>
        </div>

        {/* COIN TRAY */}
        <div
          className="mx-4 mb-4 rounded-lg py-2 text-center text-[10px] text-gray-600 font-black tracking-widest"
          style={{
            background: "#111",
            border: "2px solid #333",
            boxShadow: "inset 0 4px 8px rgba(0,0,0,0.5)",
          }}
        >
          COIN TRAY
        </div>
      </div>

      {/* PAYTABLE */}
      <div
        className="mt-4 rounded-xl p-3"
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
            ["Any pair", "1×"],
          ].map(([combo, pay]) => (
            <div key={combo} className="flex justify-between">
              <span className="text-muted-foreground">{combo}</span>
              <span className="font-black" style={{ color: "#ffd700" }}>
                {pay}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
