import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.55 0.25 290)";
const QUICK_BETS = [5, 10, 25, 50, 100];
type Phase = "bet" | "spinning" | "result";

export default function LimboGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [target, setTarget] = useState(2.0);
  const [displayNum, setDisplayNum] = useState(1.0);
  const [result, setResult] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [beamAngle, setBeamAngle] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const winChance = Math.min(95, (1 / target) * 95);

  const handleSpin = async () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setPhase("spinning");
    let ticks = 0;
    const totalTicks = 20;
    const spinInterval = setInterval(() => {
      ticks++;
      const rnd = 1 + Math.random() * 9;
      setDisplayNum(Math.round(rnd * 100) / 100);
      setBeamAngle((prev) => (prev + 18) % 360);
      if (ticks >= totalTicks) {
        clearInterval(spinInterval);
        const didWin = Math.random() * 100 < winChance;
        const finalResult = didWin
          ? target + Math.random() * (10 - target)
          : 1 + Math.random() * (target - 1.01);
        const finalRounded = Math.round(finalResult * 100) / 100;
        setDisplayNum(finalRounded);
        setResult(finalRounded);
        const win = didWin ? Math.round(betNum * target) : 0;
        setWon(didWin);
        setWinAmount(win);
        setTimeout(async () => {
          try {
            await recordOutcome({
              gameType: GameType.limbo,
              bet: BigInt(betNum),
              won: didWin,
              winAmount: BigInt(win),
            });
            onGameComplete();
          } catch (e: any) {
            toast.error(e?.message ?? "Error");
          }
          setPhase("result");
        }, 800);
      }
    }, 80);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a0015 0%, #050008 100%)",
        border: "2px solid #4400aa",
        boxShadow: "0 0 40px rgba(100,0,200,0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(180deg, #1a0030, #0d0020)",
          padding: "12px 24px",
          borderBottom: "2px solid #6600ff",
          textAlign: "center",
        }}
      >
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "#cc44ff",
            textShadow: "0 0 10px #9900ff, 0 0 30px #6600aa",
          }}
        >
          🌀 LIMBO
        </h2>
      </div>

      <div className="p-6">
        {/* Disco floor background */}
        <div
          style={{
            position: "relative",
            background:
              "repeating-conic-gradient(#1a0030 0% 25%, #220040 0% 50%)",
            backgroundSize: "20px 20px",
            borderRadius: 8,
            padding: 4,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(100,0,200,0.1), rgba(0,200,255,0.05))",
            }}
          />
          <p
            className="text-xs text-center relative z-10"
            style={{ color: "#cc88ff", padding: "4px 0" }}
          >
            Set a target. Land above it to win!
          </p>
        </div>

        {phase === "bet" && (
          <div className="space-y-6">
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
                  data-ocid="limbo.quickbet.button"
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
              data-ocid="limbo.bet.input"
            />
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-bold text-foreground">
                  Target Multiplier
                </span>
                <span
                  className="text-lg font-black"
                  style={{ color: "#cc44ff", textShadow: "0 0 8px #9900ff" }}
                >
                  {target.toFixed(2)}x
                </span>
              </div>
              <Slider
                min={1.1}
                max={10}
                step={0.1}
                value={[target]}
                onValueChange={([v]) => setTarget(v)}
                data-ocid="limbo.target.select"
              />
              <div
                className="flex justify-between text-xs"
                style={{ color: "#888" }}
              >
                <span>
                  Win Chance:{" "}
                  <span className="font-black" style={{ color: "#cc44ff" }}>
                    {winChance.toFixed(1)}%
                  </span>
                </span>
                <span>
                  Payout:{" "}
                  <span className="font-black" style={{ color: "#00ccff" }}>
                    {target.toFixed(2)}x
                  </span>
                </span>
              </div>
            </div>
            <Button
              onClick={handleSpin}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: "linear-gradient(135deg, #9900ff, #00ccff)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(150,0,255,0.5)",
              }}
              data-ocid="limbo.spin_button"
            >
              🌀 SPIN FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {phase === "spinning" && (
          <div
            className="flex flex-col items-center justify-center py-8 space-y-4 relative"
            style={{
              background: "radial-gradient(circle, #1a0030 0%, #050008 70%)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Light beam */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                width: 3,
                height: "100%",
                background:
                  "linear-gradient(180deg, transparent, rgba(200,100,255,0.4), transparent)",
                transform: `translateX(-50%) rotate(${beamAngle}deg)`,
                transformOrigin: "50% 0",
                pointerEvents: "none",
              }}
            />
            {/* Neon arc ring */}
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: "50%",
                border: "3px solid #9900ff",
                boxShadow:
                  "0 0 20px #9900ff, 0 0 40px #6600aa, inset 0 0 20px rgba(150,0,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle, rgba(100,0,200,0.2), transparent)",
                position: "relative",
                zIndex: 1,
              }}
            >
              <motion.div
                key={displayNum}
                initial={{ scale: 1.3, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-black tabular-nums"
                style={{
                  color: "#cc44ff",
                  textShadow: "0 0 20px #9900ff",
                  fontFamily: "monospace",
                }}
              >
                {displayNum.toFixed(2)}x
              </motion.div>
            </div>
            <p style={{ color: "#cc88ff" }}>
              Target:{" "}
              <span className="font-black" style={{ color: "#00ccff" }}>
                {target.toFixed(2)}x
              </span>
            </p>
          </div>
        )}

        {phase === "result" && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-6"
            >
              <div
                className="text-5xl font-black tabular-nums"
                style={{
                  color: won ? "#00ccff" : "#ff3366",
                  textShadow: `0 0 20px ${won ? "#00ccff" : "#ff3366"}`,
                }}
              >
                {result.toFixed(2)}x
              </div>
              <p style={{ color: "#888" }}>Target was {target.toFixed(2)}x</p>
              <h3
                className="text-2xl font-black"
                style={{ color: won ? "#ffd700" : "#ff3366" }}
              >
                {won ? `+${winAmount} CREDITS!` : "Below target — you lost!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: "linear-gradient(135deg, #9900ff, #00ccff)",
                  color: "#fff",
                }}
                data-ocid="limbo.play_again_button"
              >
                SPIN AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
