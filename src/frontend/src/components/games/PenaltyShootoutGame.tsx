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
        ⚽ PENALTY SHOOTOUT
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
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
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
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
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.25 290))`,
              color: "#fff",
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
            <span style={{ color: COLOR }}>
              Score: {score}/{shotsTaken}
            </span>
            <span className="text-muted-foreground">
              Shot {shotsTaken + 1}/{TOTAL_SHOTS}
            </span>
          </div>
          {/* Goal grid */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              background: "oklch(0.18 0.08 150)",
              border: `3px solid ${COLOR}`,
              padding: "8px",
            }}
          >
            <p className="text-center text-xs text-muted-foreground mb-2">
              Click a zone to shoot!
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ZONE_LABELS.map((label, i) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                  key={`zone-${i}`}
                  type="button"
                  onClick={() => shoot(i)}
                  className="h-16 rounded-lg font-black text-xs transition-all relative overflow-hidden"
                  style={{
                    background:
                      lastAim === i
                        ? lastGoal
                          ? "oklch(0.68 0.22 150 / 0.8)"
                          : "oklch(0.577 0.245 27 / 0.8)"
                        : "oklch(0.12 0.03 280 / 0.7)",
                    border:
                      lastKeeper === i
                        ? "2px solid oklch(0.88 0.20 72)"
                        : "1px solid oklch(0.22 0.03 275)",
                    color: "#fff",
                    cursor: shotsTaken >= TOTAL_SHOTS ? "default" : "pointer",
                  }}
                  disabled={shotsTaken >= TOTAL_SHOTS}
                  data-ocid={`penalty.zone.${i + 1}`}
                >
                  {lastAim === i && <span>{lastGoal ? "⚽" : "🧤"}</span>}
                  {lastKeeper === i && lastAim !== i && (
                    <span style={{ opacity: 0.5 }}>🧤</span>
                  )}
                  {lastAim !== i && lastKeeper !== i && (
                    <span className="opacity-30">{label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {lastGoal !== null && (
            <motion.p
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-center text-lg font-black"
              style={{ color: lastGoal ? COLOR : "oklch(0.577 0.245 27)" }}
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
            <p className="text-muted-foreground">
              Final Score: {score}/{TOTAL_SHOTS}
            </p>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
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
  );
}
