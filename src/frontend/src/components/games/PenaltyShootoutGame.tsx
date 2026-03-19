import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.68 0.22 150)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const TOTAL_SHOTS = 3;
const WIN_THRESHOLD = 2;
type Phase = "bet" | "shooting" | "result";

const ZONE_LABELS = [
  "Top Left",
  "Top Center",
  "Top Right",
  "Mid Left",
  "Center",
  "Mid Right",
  "Bot Left",
  "Bot Center",
  "Bot Right",
];

export default function PenaltyShootoutGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [score, setScore] = useState(0);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [lastAim, setLastAim] = useState<number | null>(null);
  const [lastKeeper, setLastKeeper] = useState<number | null>(null);
  const [lastGoal, setLastGoal] = useState<boolean | null>(null);
  const [shotLog, setShotLog] = useState<
    { aim: number; keeper: number; goal: boolean }[]
  >([]);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setScore(0);
    setShotsTaken(0);
    setLastAim(null);
    setLastKeeper(null);
    setLastGoal(null);
    setShotLog([]);
    setPhase("shooting");
  };

  const shoot = async (zone: number) => {
    const keeper = Math.floor(Math.random() * 9);
    const goal = keeper !== zone;
    setLastAim(zone);
    setLastKeeper(keeper);
    setLastGoal(goal);
    const newScore = score + (goal ? 1 : 0);
    const newShots = shotsTaken + 1;
    setShotLog((prev) => [...prev, { aim: zone, keeper, goal }]);
    setScore(newScore);
    setShotsTaken(newShots);
    if (newShots >= TOTAL_SHOTS) {
      const didWin = newScore >= WIN_THRESHOLD;
      const win = didWin ? betNum * 2 : 0;
      setTimeout(async () => {
        try {
          await recordOutcome({
            gameType: GameType.penaltyShootout,
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
      }, 800);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a1a0a 0%, #050f05 100%)",
        border: "3px solid #2a6a2a",
        boxShadow: "0 0 30px rgba(0,100,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(180deg, #0d2a0d, #051505)",
          padding: "12px 24px",
          borderBottom: "2px solid #3a8a3a",
          textAlign: "center",
        }}
      >
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "#44ff88",
            textShadow: "0 0 10px #22cc66, 0 0 20px #00aa44",
          }}
        >
          ⚽ PENALTY SHOOTOUT
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-center mb-4" style={{ color: "#88cc88" }}>
          Score {WIN_THRESHOLD}/{TOTAL_SHOTS} shots to win 2x!
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
                          background: "rgba(255,255,255,0.05)",
                          color: "#aaa",
                          border: "1px solid #333",
                        }
                  }
                  data-ocid="penalty.quickbet.button"
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
              data-ocid="penalty.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${COLOR}, #00aa44)`,
                color: "#fff",
                boxShadow: "0 0 20px rgba(68,255,136,0.3)",
              }}
              data-ocid="penalty.play_button"
            >
              ⚽ PLAY FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {phase === "shooting" && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold">
              <span style={{ color: "#44ff88" }}>
                Score: {score}/{shotsTaken}
              </span>
              <span style={{ color: "#aaa" }}>
                Shot {shotsTaken + 1}/{TOTAL_SHOTS}
              </span>
            </div>

            {/* Football pitch */}
            <div
              style={{
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                border: "3px solid #ffffff44",
              }}
            >
              {/* Grass with stripes */}
              <div
                style={{
                  background:
                    "repeating-linear-gradient(180deg, #1a5a1a 0px, #1a5a1a 20px, #1e6a1e 20px, #1e6a1e 40px)",
                  padding: "12px 12px 8px",
                }}
              >
                {/* Goal posts & crossbar */}
                <div
                  style={{
                    position: "relative",
                    marginBottom: 8,
                    height: 40,
                  }}
                >
                  {/* Crossbar */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "5%",
                      right: "5%",
                      height: 5,
                      background: "white",
                      borderRadius: 2,
                      boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                    }}
                  />
                  {/* Left post */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "5%",
                      width: 5,
                      height: "100%",
                      background: "white",
                      borderRadius: 2,
                      boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                    }}
                  />
                  {/* Right post */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: "5%",
                      width: 5,
                      height: "100%",
                      background: "white",
                      borderRadius: 2,
                      boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                    }}
                  />
                  {/* Net lines */}
                  {[20, 35, 50, 65, 80].map((x) => (
                    <div
                      key={x}
                      style={{
                        position: "absolute",
                        top: 5,
                        left: `${x}%`,
                        width: 1,
                        height: "calc(100% - 5px)",
                        background: "rgba(255,255,255,0.25)",
                      }}
                    />
                  ))}
                  {[30, 60, 90].map((y) => (
                    <div
                      key={y}
                      style={{
                        position: "absolute",
                        top: `${y}%`,
                        left: "5%",
                        right: "5%",
                        height: 1,
                        background: "rgba(255,255,255,0.2)",
                      }}
                    />
                  ))}
                  {/* Goalkeeper silhouette */}
                  {lastKeeper !== null && (
                    <motion.div
                      key={`keeper-${lastKeeper}`}
                      initial={{ scaleX: 1.5, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      style={{
                        position: "absolute",
                        top: 2,
                        left: `${7 + (lastKeeper % 3) * 30}%`,
                        fontSize: 22,
                        filter: "brightness(0) invert(0.3)",
                      }}
                    >
                      🧤
                    </motion.div>
                  )}
                </div>

                {/* Penalty spot circle */}
                <div style={{ textAlign: "center", marginBottom: 6 }}>
                  <div
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.6)",
                      boxShadow: "0 0 4px rgba(255,255,255,0.4)",
                    }}
                  />
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      margin: "-4px auto 0",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                {/* Shooting zones grid */}
                <div className="grid grid-cols-3 gap-1">
                  {ZONE_LABELS.map((label, i) => (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                      key={`zone-${i}`}
                      type="button"
                      onClick={() => shoot(i)}
                      className="h-14 rounded font-black text-xs transition-all relative overflow-hidden"
                      style={{
                        background:
                          lastAim === i
                            ? lastGoal
                              ? "rgba(68,255,136,0.6)"
                              : "rgba(255,50,50,0.6)"
                            : "rgba(0,0,0,0.2)",
                        border:
                          lastKeeper === i
                            ? "2px solid #ffd700"
                            : "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                        cursor:
                          shotsTaken >= TOTAL_SHOTS ? "default" : "pointer",
                        backdropFilter: "blur(2px)",
                      }}
                      disabled={shotsTaken >= TOTAL_SHOTS}
                      data-ocid={`penalty.zone.${i + 1}`}
                    >
                      {lastAim === i && (
                        <span style={{ fontSize: 20 }}>
                          {lastGoal ? "⚽" : "🧤"}
                        </span>
                      )}
                      {lastKeeper === i && lastAim !== i && (
                        <span style={{ opacity: 0.6, fontSize: 16 }}>🧤</span>
                      )}
                      {lastAim !== i && lastKeeper !== i && (
                        <span style={{ opacity: 0.4, fontSize: 10 }}>
                          {label}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {lastGoal !== null && (
              <motion.p
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-center text-lg font-black"
                style={{ color: lastGoal ? "#44ff88" : "#ff4444" }}
              >
                {lastGoal ? "⚽ GOAL!" : "🧤 SAVED!"}
              </motion.p>
            )}
            <div className="flex gap-1 justify-center">
              {shotLog.map((s, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                <span key={`shot-${i}`} className="text-xl">
                  {s.goal ? "⚽" : "❌"}
                </span>
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
              <div className="text-6xl">{won ? "🏆" : "😔"}</div>
              <p style={{ color: "#88cc88" }}>
                Final Score: {score}/{TOTAL_SHOTS}
              </p>
              <h3
                className="text-2xl font-black"
                style={{ color: won ? "#ffd700" : "#ff4444" }}
              >
                {won ? `+${winAmount} CREDITS!` : "Not enough goals!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{ background: COLOR, color: "#fff" }}
                data-ocid="penalty.play_again_button"
              >
                SHOOT AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
