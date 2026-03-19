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

const SLOT_STYLES: Record<number, { bg: string; color: string; glow: string }> =
  {
    0: {
      bg: "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
      color: "#666",
      glow: "transparent",
    },
    1: {
      bg: "linear-gradient(180deg, #0a2a5a, #061a3a)",
      color: "#44aaff",
      glow: "rgba(68,170,255,0.5)",
    },
    2: {
      bg: "linear-gradient(180deg, #4a3a00, #2a2000)",
      color: "#ffdd00",
      glow: "rgba(255,220,0,0.5)",
    },
    3: {
      bg: "linear-gradient(180deg, #5a3a00, #3a2000)",
      color: "#ffd700",
      glow: "rgba(255,215,0,0.8)",
    },
  };

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
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a0015 0%, #050008 100%)",
        border: "3px solid #4a2a7a",
        boxShadow: "0 0 40px rgba(100,0,200,0.3)",
      }}
    >
      {/* LED panel header */}
      <div
        style={{
          background: "linear-gradient(180deg, #1a0030, #0d0020)",
          borderBottom: "3px solid #6600ff",
          padding: "12px 24px",
          textAlign: "center",
        }}
      >
        <div className="flex justify-center gap-2 mb-1">
          {[...Array(16)].map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: decorative
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background:
                  i % 3 === 0 ? "#ff00ff" : i % 3 === 1 ? "#00ffff" : "#ff8800",
                boxShadow:
                  i % 3 === 0
                    ? "0 0 4px #ff00ff"
                    : i % 3 === 1
                      ? "0 0 4px #00ffff"
                      : "0 0 4px #ff8800",
              }}
            />
          ))}
        </div>
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "#00ccff",
            textShadow: "0 0 10px #0088ff, 0 0 30px #0044aa",
            fontFamily: "monospace",
          }}
        >
          🎱 BALL DROP
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-center mb-4" style={{ color: "#aa88cc" }}>
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
                      ? {
                          background: COLOR,
                          color: "#fff",
                          boxShadow: `0 0 12px ${COLOR}60`,
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          color: "#aaa",
                          border: "1px solid #333",
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
                background: "linear-gradient(135deg, #9900ff, #00ccff)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(100,0,200,0.4)",
              }}
              data-ocid="balldrop.drop_button"
            >
              🎱 DROP FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {phase === "dropping" && (
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 320,
              margin: "0 auto",
            }}
          >
            {/* Chrome cabinet frame */}
            <div
              style={{
                background: "linear-gradient(180deg, #0a0020 0%, #050010 100%)",
                border: "4px solid #3a1a6a",
                borderRadius: 12,
                padding: 12,
                position: "relative",
                overflow: "hidden",
                boxShadow: "inset 0 0 30px rgba(0,0,0,0.8)",
              }}
            >
              {/* Glass overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 8,
                  background:
                    "linear-gradient(135deg, rgba(100,150,255,0.04) 0%, transparent 50%, rgba(100,150,255,0.02) 100%)",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              />
              {/* Chrome side rails */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 4,
                  bottom: 0,
                  width: 8,
                  background: "linear-gradient(90deg, #333, #888, #555, #222)",
                  borderRadius: "4px 0 0 4px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 4,
                  bottom: 0,
                  width: 8,
                  background: "linear-gradient(90deg, #222, #555, #888, #333)",
                  borderRadius: "0 4px 4px 0",
                }}
              />

              <div
                style={{
                  position: "relative",
                  height: 320,
                  marginLeft: 12,
                  marginRight: 12,
                }}
              >
                {/* Bumpers */}
                {Array.from({ length: BUMPERS }, (_, r) =>
                  Array.from({ length: 3 }, (_, c) => {
                    const x = (c + 1) * (280 / 4);
                    const y = (r + 1) * (280 / 7);
                    const isNeonPink = (r + c) % 2 === 0;
                    return (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                        key={`bumper-${r}-${c}`}
                        className="absolute rounded-full"
                        style={{
                          left: x - 10,
                          top: y - 10,
                          width: 20,
                          height: 20,
                          background: isNeonPink
                            ? "radial-gradient(circle at 35% 35%, #ff88ff, #cc00cc 50%, #880088)"
                            : "radial-gradient(circle at 35% 35%, #88ffff, #00aacc 50%, #006688)",
                          boxShadow: isNeonPink
                            ? "0 0 8px #ff00ff, 0 0 16px rgba(255,0,255,0.4)"
                            : "0 0 8px #00ffff, 0 0 16px rgba(0,255,255,0.4)",
                          border: "1px solid rgba(255,255,255,0.3)",
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
                  className="absolute rounded-full z-10"
                  style={{
                    width: 22,
                    height: 22,
                    background:
                      "radial-gradient(circle at 35% 30%, #ffe566, #ffaa00 50%, #cc6600)",
                    boxShadow:
                      "0 0 12px rgba(255,180,0,0.9), 0 2px 8px rgba(0,0,0,0.6)",
                  }}
                />
                {/* Prize slots */}
                <div className="absolute bottom-0 left-0 right-0 flex gap-1">
                  {SLOT_MULTS.map((m, i) => {
                    const style = SLOT_STYLES[m] ?? SLOT_STYLES[0];
                    return (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                        key={`slot-${i}`}
                        className="flex-1 text-center text-xs font-black py-2 rounded"
                        style={{
                          background:
                            finalSlot === i ? style.bg : "rgba(0,0,0,0.6)",
                          color: style.color,
                          border: `1px solid ${finalSlot === i ? style.color : "rgba(255,255,255,0.1)"}`,
                          boxShadow:
                            finalSlot === i ? `0 0 12px ${style.glow}` : "none",
                          transition: "all 0.3s",
                        }}
                      >
                        {m}x
                      </div>
                    );
                  })}
                </div>
              </div>
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
              <div className="text-lg font-bold" style={{ color: "#aa88cc" }}>
                Landed on {finalSlot !== null ? SLOT_MULTS[finalSlot] : 0}x
              </div>
              <h3
                className="text-2xl font-black"
                style={{ color: won ? "#ffd700" : "#ff4466" }}
              >
                {won ? `+${winAmount} CREDITS!` : "Zero payout slot!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: "linear-gradient(135deg, #9900ff, #00ccff)",
                  color: "#fff",
                }}
                data-ocid="balldrop.play_again_button"
              >
                DROP AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
