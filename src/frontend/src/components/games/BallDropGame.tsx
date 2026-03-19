import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.55 0.25 290)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const SLOT_MULTS = [0, 1, 2, 3, 2, 1, 0];
const BUMPERS = 5;
type Phase = "bet" | "dropping" | "result";

export default function BallDropGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [ballCol, setBallCol] = useState(3);
  const [ballRow, setBallRow] = useState(0);
  const [finalSlot, setFinalSlot] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleDrop = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    let col = 3;
    setBallRow(0);
    setBallCol(col);
    setFinalSlot(null);
    setPhase("dropping");

    let row = 0;
    const drop = () => {
      row++;
      col = Math.random() < 0.5 ? Math.max(0, col - 1) : Math.min(6, col + 1);
      setBallRow(row);
      setBallCol(col);
      if (row < BUMPERS) {
        setTimeout(drop, 300);
      } else {
        const slot = col;
        const mult = SLOT_MULTS[slot] ?? 0;
        const didWin = mult > 0;
        const win = Math.round(betNum * mult);
        setFinalSlot(slot);
        setTimeout(async () => {
          try {
            await recordOutcome({
              gameType: GameType.ballDrop,
              bet: BigInt(betNum),
              won: didWin,
              winAmount: BigInt(win),
            });
            onGameComplete();
          } catch (e: any) {
            toast.error(e?.message ?? "Error");
          }
          setWon(didWin);
          setWinAmount(win);
          setPhase("result");
        }, 500);
      }
    };
    setTimeout(drop, 300);
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "oklch(0.11 0.015 280)",
        border: `1px solid ${COLOR}40`,
      }}
    >
      <h2
        className="text-2xl font-black tracking-widest mb-2"
        style={{ color: COLOR }}
      >
        🎱 BALL DROP
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Drop the ball through bumpers to a prize slot!
      </p>

      {phase === "bet" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {QUICK_BETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBet(q.toString())}
                className="px-4 py-2 rounded-lg text-xs font-black"
                style={
                  bet === q.toString()
                    ? { background: COLOR, color: "#fff" }
                    : {
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
                      }
                }
                data-ocid="balldrop.quickbet.button"
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
            className="w-full px-4 py-3 rounded-xl text-lg font-bold bg-secondary border border-border text-foreground"
            data-ocid="balldrop.bet.input"
          />
          <Button
            onClick={handleDrop}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.70 0.20 190))`,
              color: "#fff",
            }}
            data-ocid="balldrop.drop_button"
          >
            🎱 DROP FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "dropping" && (
        <div className="relative mx-auto" style={{ width: 280, height: 320 }}>
          {/* Track walls */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              border: `2px solid ${COLOR}40`,
              background: "oklch(0.08 0.01 280)",
            }}
          />
          {/* Bumpers */}
          {Array.from({ length: BUMPERS }, (_, r) =>
            Array.from({ length: 3 }, (_, c) => {
              const x = (c + 1) * (280 / 4);
              const y = (r + 1) * (280 / 7);
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                  key={`bumper-${r}-${c}`}
                  className="absolute w-4 h-4 rounded-full"
                  style={{
                    left: x - 8,
                    top: y - 8,
                    background: COLOR,
                    boxShadow: `0 0 6px ${COLOR}`,
                  }}
                />
              );
            }),
          )}
          {/* Ball */}
          <motion.div
            animate={{
              left: (ballCol / 6) * 250 + 10,
              top: (ballRow / (BUMPERS + 1)) * 290 + 10,
            }}
            transition={{ duration: 0.25 }}
            className="absolute w-6 h-6 rounded-full z-10"
            style={{
              background: "oklch(0.88 0.20 72)",
              boxShadow: "0 0 10px oklch(0.88 0.20 72)",
            }}
          />
          {/* Slots */}
          <div className="absolute bottom-2 left-0 right-0 flex">
            {SLOT_MULTS.map((m, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                key={`slot-${i}`}
                className="flex-1 text-center text-xs font-black py-1 rounded"
                style={{
                  background: finalSlot === i ? COLOR : "oklch(0.16 0.025 278)",
                  color:
                    finalSlot === i
                      ? "#fff"
                      : m > 0
                        ? COLOR
                        : "oklch(0.40 0.02 270)",
                }}
              >
                {m}x
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4 py-6"
          >
            <div className="text-6xl">{won ? "🎉" : "😔"}</div>
            <div className="text-lg font-bold text-muted-foreground">
              Landed on {finalSlot !== null ? SLOT_MULTS[finalSlot] : 0}x
            </div>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won ? `+${winAmount} CREDITS!` : "Zero payout slot!"}
            </h3>
            <Button
              onClick={() => setPhase("bet")}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="balldrop.play_again_button"
            >
              DROP AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
