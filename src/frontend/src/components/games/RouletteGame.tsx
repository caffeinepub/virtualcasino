import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function getNumberColor(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

const COLOR = "oklch(0.60 0.24 20)";

type BetKey = string;

interface BetInfo {
  label: string;
  payout: number; // multiplier (win this times bet)
  numbers: number[];
}

function getBetInfo(key: BetKey): BetInfo {
  if (/^\d+$/.test(key)) {
    const n = Number.parseInt(key, 10);
    return { label: key, payout: 35, numbers: [n] };
  }
  switch (key) {
    case "red":
      return { label: "Red", payout: 1, numbers: [...RED_NUMBERS] };
    case "black":
      return {
        label: "Black",
        payout: 1,
        numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter(
          (n) => !RED_NUMBERS.has(n),
        ),
      };
    case "odd":
      return {
        label: "Odd",
        payout: 1,
        numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter(
          (n) => n % 2 !== 0,
        ),
      };
    case "even":
      return {
        label: "Even",
        payout: 1,
        numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter(
          (n) => n % 2 === 0,
        ),
      };
    case "1-18":
      return {
        label: "1-18",
        payout: 1,
        numbers: Array.from({ length: 18 }, (_, i) => i + 1),
      };
    case "19-36":
      return {
        label: "19-36",
        payout: 1,
        numbers: Array.from({ length: 18 }, (_, i) => i + 19),
      };
    case "1st12":
      return {
        label: "1st 12",
        payout: 2,
        numbers: Array.from({ length: 12 }, (_, i) => i + 1),
      };
    case "2nd12":
      return {
        label: "2nd 12",
        payout: 2,
        numbers: Array.from({ length: 12 }, (_, i) => i + 13),
      };
    case "3rd12":
      return {
        label: "3rd 12",
        payout: 2,
        numbers: Array.from({ length: 12 }, (_, i) => i + 25),
      };
    case "col1":
      return {
        label: "Col 1",
        payout: 2,
        numbers: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
      };
    case "col2":
      return {
        label: "Col 2",
        payout: 2,
        numbers: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
      };
    case "col3":
      return {
        label: "Col 3",
        payout: 2,
        numbers: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
      };
    default:
      return { label: key, payout: 1, numbers: [] };
  }
}

const CHIP_VALUES = [1, 5, 10, 25, 50];

function NumberCell({
  n,
  bets,
  onBet,
  winningNumber,
}: {
  n: number;
  bets: Map<string, number>;
  onBet: (key: string) => void;
  winningNumber: number | null;
}) {
  const color = getNumberColor(n);
  const bet = bets.get(n.toString()) ?? 0;
  const isWinner = winningNumber === n;

  return (
    <button
      type="button"
      onClick={() => onBet(n.toString())}
      className="relative w-9 h-9 rounded text-xs font-black transition-all hover:scale-110"
      style={{
        background:
          color === "green"
            ? "oklch(0.45 0.18 145)"
            : color === "red"
              ? "oklch(0.48 0.22 25)"
              : "oklch(0.18 0.02 270)",
        border: isWinner
          ? "2px solid oklch(0.78 0.18 72)"
          : "1px solid oklch(0.25 0.04 280)",
        boxShadow: isWinner ? "0 0 12px oklch(0.78 0.18 72 / 0.8)" : "none",
        color: "white",
      }}
      data-ocid="roulette.number.button"
    >
      {n}
      {bet > 0 && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-black flex items-center justify-center"
          style={{
            background: "oklch(0.78 0.18 72)",
            color: "#000",
            fontSize: 9,
          }}
        >
          {bet}
        </span>
      )}
    </button>
  );
}

export default function RouletteGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [bets, setBets] = useState<Map<string, number>>(new Map());
  const [chipValue, setChipValue] = useState(5);
  const [spinning, setSpinning] = useState(false);
  const [winNumber, setWinNumber] = useState<number | null>(null);
  const [spinDisplay, setSpinDisplay] = useState<number | null>(null);
  const [winnings, setWinnings] = useState<number | null>(null);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();

  const totalBet = Array.from(bets.values()).reduce((a, b) => a + b, 0);

  const addBet = (key: string) => {
    if (spinning) return;
    setBets((prev) => {
      const next = new Map(prev);
      next.set(key, (next.get(key) ?? 0) + chipValue);
      return next;
    });
  };

  const clearBets = () => setBets(new Map());

  const handleSpin = async () => {
    if (totalBet < 1) {
      toast.error("Place at least 1 credit in bets");
      return;
    }
    if (BigInt(totalBet) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    setSpinning(true);
    setWinNumber(null);
    setWinnings(null);

    // Rapid spin animation
    const result = Math.floor(Math.random() * 37); // 0-36
    let elapsed = 0;
    const interval = setInterval(() => {
      setSpinDisplay(Math.floor(Math.random() * 37));
      elapsed += 120;
      if (elapsed >= 3000) {
        clearInterval(interval);
        setSpinDisplay(result);
        setWinNumber(result);
        finalize(result);
      }
    }, 120);
  };

  const finalize = async (result: number) => {
    let totalWin = 0;
    for (const [key, amount] of bets.entries()) {
      const info = getBetInfo(key);
      if (info.numbers.includes(result)) {
        totalWin += amount * (info.payout + 1); // return bet + winnings
      }
    }

    const netGain = totalWin - totalBet;
    setWinnings(netGain);
    setSpinning(false);

    try {
      const won = totalWin > 0;
      await recordOutcome({
        gameType: GameType.roulette,
        bet: BigInt(totalBet),
        won,
        winAmount: BigInt(totalWin),
      });
      onGameComplete();
      if (won)
        toast.success(`🎡 ${result} wins! You gained ${netGain} credits!`);
      else
        toast.error(`${result} — no winning bets. Lost ${totalBet} credits.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  // Number grid: col by col
  const columns = Array.from({ length: 12 }, (_, col) => [
    col * 3 + 3,
    col * 3 + 2,
    col * 3 + 1,
  ]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="font-display font-black text-xl tracking-widest"
          style={{ color: COLOR, textShadow: `0 0 12px ${COLOR}` }}
        >
          ROULETTE
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            BET: <span className="text-gold font-black">{totalBet}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            BAL:{" "}
            <span className="text-gold font-black">{balance.toString()}</span>
          </span>
        </div>
      </div>

      {/* Spin display */}
      <AnimatePresence>
        {spinDisplay !== null && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center py-4"
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center font-black text-4xl"
              style={{
                background:
                  spinDisplay === 0
                    ? "oklch(0.45 0.18 145)"
                    : RED_NUMBERS.has(spinDisplay)
                      ? "oklch(0.48 0.22 25)"
                      : "oklch(0.18 0.02 270)",
                border: `3px solid ${COLOR}`,
                boxShadow: spinning
                  ? `0 0 30px ${COLOR}, 0 0 60px ${COLOR}50`
                  : winNumber !== null
                    ? "0 0 30px oklch(0.78 0.18 72), 0 0 60px oklch(0.78 0.18 72 / 0.4)"
                    : "none",
                color: "white",
              }}
              data-ocid="roulette.result.panel"
            >
              {spinDisplay}
            </div>
            {winNumber !== null && winnings !== null && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 font-black text-lg"
                style={{
                  color:
                    winnings > 0
                      ? "oklch(0.78 0.18 72)"
                      : "oklch(0.577 0.245 27)",
                }}
              >
                {winnings > 0
                  ? `+${winnings} credits!`
                  : `Lost ${totalBet} credits`}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chip selector */}
      <div
        className="rounded-xl p-3"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: "1px solid oklch(0.18 0.025 280)",
        }}
      >
        <p className="text-xs text-muted-foreground mb-2 font-bold tracking-wider">
          SELECT CHIP
        </p>
        <div className="flex gap-2">
          {CHIP_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setChipValue(v)}
              className="w-10 h-10 rounded-full font-black text-sm transition-all"
              style={{
                background:
                  chipValue === v
                    ? "oklch(0.78 0.18 72)"
                    : "oklch(0.20 0.03 278)",
                color: chipValue === v ? "#000" : "oklch(0.60 0.02 270)",
                border:
                  chipValue === v
                    ? "2px solid white"
                    : "2px solid oklch(0.25 0.04 280)",
                boxShadow:
                  chipValue === v
                    ? "0 0 10px oklch(0.78 0.18 72 / 0.6)"
                    : "none",
              }}
              data-ocid="roulette.chip.button"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Betting grid */}
      <div
        className="rounded-xl p-3 overflow-x-auto"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: `1px solid ${COLOR}30`,
        }}
      >
        <div className="flex gap-1 min-w-max">
          {/* Zero */}
          <button
            type="button"
            onClick={() => addBet("0")}
            className="w-9 h-28 rounded font-black text-sm flex items-center justify-center"
            style={{
              background: "oklch(0.45 0.18 145)",
              border:
                winNumber === 0
                  ? "2px solid oklch(0.78 0.18 72)"
                  : "1px solid oklch(0.25 0.04 280)",
              color: "white",
              writingMode: "vertical-rl",
            }}
            data-ocid="roulette.zero.button"
          >
            0 {(bets.get("0") ?? 0) > 0 ? `(${bets.get("0")})` : ""}
          </button>

          {/* Number grid - 3 rows */}
          <div className="flex gap-0.5">
            {columns.map((col, ci) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable column order
              <div key={ci} className="flex flex-col gap-0.5">
                {col.map((n) => (
                  <NumberCell
                    key={n}
                    n={n}
                    bets={bets}
                    onBet={addBet}
                    winningNumber={winNumber}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Column bets */}
          <div className="flex flex-col gap-0.5 justify-between">
            {["col3", "col2", "col1"].map((key) => {
              const b = bets.get(key) ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => addBet(key)}
                  className="w-12 h-9 rounded text-xs font-black"
                  style={{
                    background: "oklch(0.20 0.04 120)",
                    border: "1px solid oklch(0.35 0.08 140)",
                    color: "oklch(0.7 0.18 140)",
                  }}
                  data-ocid="roulette.outside.button"
                >
                  2:1{b > 0 ? ` (${b})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dozen bets */}
        <div className="flex gap-0.5 mt-0.5 ml-10">
          {["1st12", "2nd12", "3rd12"].map((key) => {
            const info = getBetInfo(key);
            const b = bets.get(key) ?? 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => addBet(key)}
                className="flex-1 h-8 rounded text-xs font-black"
                style={{
                  background: "oklch(0.16 0.025 278)",
                  border: "1px solid oklch(0.25 0.04 280)",
                  color: "oklch(0.70 0.02 270)",
                }}
                data-ocid="roulette.dozen.button"
              >
                {info.label}
                {b > 0 ? ` (${b})` : ""}
              </button>
            );
          })}
        </div>

        {/* Outside bets row */}
        <div className="flex gap-0.5 mt-0.5 ml-10">
          {["1-18", "even", "red", "black", "odd", "19-36"].map((key) => {
            const info = getBetInfo(key);
            const b = bets.get(key) ?? 0;
            const isRed = key === "red";
            const isBlack = key === "black";
            return (
              <button
                key={key}
                type="button"
                onClick={() => addBet(key)}
                className="flex-1 h-8 rounded text-xs font-black"
                style={{
                  background: isRed
                    ? "oklch(0.48 0.22 25)"
                    : isBlack
                      ? "oklch(0.18 0.02 270)"
                      : "oklch(0.16 0.025 278)",
                  border: `1px solid ${
                    isRed
                      ? "oklch(0.577 0.245 27)"
                      : isBlack
                        ? "oklch(0.35 0.02 270)"
                        : "oklch(0.25 0.04 280)"
                  }`,
                  color: isRed || isBlack ? "white" : "oklch(0.70 0.02 270)",
                }}
                data-ocid="roulette.outside.button"
              >
                {info.label}
                {b > 0 ? ` (${b})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={clearBets}
          disabled={spinning || bets.size === 0}
          variant="outline"
          className="flex-1 font-black tracking-wider"
          data-ocid="roulette.clear.button"
        >
          CLEAR BETS
        </Button>
        <Button
          onClick={handleSpin}
          disabled={spinning || isPending || totalBet === 0}
          className="flex-[2] py-4 font-black tracking-widest text-white"
          style={{
            background: spinning ? "oklch(0.25 0.04 280)" : COLOR,
            boxShadow: spinning ? "none" : `0 0 20px ${COLOR}50`,
          }}
          data-ocid="roulette.spin.button"
        >
          {spinning ? "SPINNING..." : `🎡 SPIN (bet: ${totalBet})`}
        </Button>
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
          PAYOUTS
        </p>
        <div className="grid grid-cols-3 gap-1 text-xs">
          {[
            ["Straight (single)", "35:1"],
            ["Red / Black", "1:1"],
            ["Odd / Even", "1:1"],
            ["1-18 / 19-36", "1:1"],
            ["Dozen", "2:1"],
            ["Column", "2:1"],
          ].map(([name, pay]) => (
            <div key={name} className="flex justify-between gap-1">
              <span className="text-muted-foreground">{name}</span>
              <span className="text-gold font-black">{pay}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
