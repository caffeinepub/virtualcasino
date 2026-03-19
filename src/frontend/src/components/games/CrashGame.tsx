import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.60 0.24 20)";
const QUICK_BETS = [5, 10, 25, 50, 100];
type Phase =
  | "bet"
  | "countdown"
  | "running"
  | "crashed"
  | "cashedout"
  | "result";

function Starfield() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.7 + 0.3,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default function CrashGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [multiplier, setMultiplier] = useState(1.0);
  const [cashOutMult, setCashOutMult] = useState(1.0);
  const [countdown, setCountdown] = useState(3);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [rocketY, setRocketY] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const multRef = useRef(1.0);
  const crashRef = useRef(2.0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  const clearInt = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    const crash = 1 + Math.random() * Math.random() * 9;
    crashRef.current = crash;
    setMultiplier(1.0);
    multRef.current = 1.0;
    setRocketY(0);
    setCountdown(3);
    setPhase("countdown");
    let cd = 3;
    const cdInterval = setInterval(() => {
      cd--;
      setCountdown(cd);
      if (cd <= 0) {
        clearInterval(cdInterval);
        setPhase("running");
        intervalRef.current = setInterval(() => {
          multRef.current = multRef.current * 1.06;
          const m = Math.round(multRef.current * 100) / 100;
          setMultiplier(m);
          setRocketY(Math.min(85, (m - 1) * 12));
          if (multRef.current >= crashRef.current) {
            clearInt();
            setPhase("crashed");
            setTimeout(async () => {
              try {
                await recordOutcome({
                  gameType: GameType.crashGame,
                  bet: BigInt(betNum),
                  won: false,
                  winAmount: BigInt(0),
                });
                onGameComplete();
              } catch (e: any) {
                toast.error(e?.message ?? "Error");
              }
              setWon(false);
              setWinAmount(0);
              setPhase("result");
            }, 1000);
          }
        }, 100);
      }
    }, 1000);
  };

  const cashOut = async () => {
    if (phase !== "running") return;
    clearInt();
    const m = multRef.current;
    const win = Math.round(betNum * m);
    setCashOutMult(Math.round(m * 100) / 100);
    setPhase("cashedout");
    try {
      await recordOutcome({
        gameType: GameType.crashGame,
        bet: BigInt(betNum),
        won: true,
        winAmount: BigInt(win),
      });
      onGameComplete();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
    setWon(true);
    setWinAmount(win);
    setPhase("result");
  };

  const multColor =
    multiplier >= 3 ? "#ffd700" : multiplier >= 2 ? "#44ff88" : "#ff6644";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#050510",
        border: "2px solid #1a1a3a",
        boxShadow: "0 0 40px rgba(0,0,0,0.9)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(180deg, #0a0020, #050010)",
          padding: "12px 24px",
          borderBottom: "2px solid #1a0a3a",
          textAlign: "center",
        }}
      >
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "#ff4422",
            textShadow: "0 0 10px #ff2200, 0 0 30px #ff4400",
          }}
        >
          🚀 CRASH GAME
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-center mb-4" style={{ color: "#888" }}>
          Cash out before the rocket crashes!
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
                  data-ocid="crash.quickbet.button"
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
              data-ocid="crash.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${COLOR}, oklch(0.65 0.22 55))`,
                color: "#fff",
                boxShadow: `0 0 20px ${COLOR}40`,
              }}
              data-ocid="crash.play_button"
            >
              🚀 LAUNCH FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {(phase === "countdown" ||
          phase === "running" ||
          phase === "crashed" ||
          phase === "cashedout") && (
          <div className="space-y-6">
            {/* Space viewport */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background:
                  "radial-gradient(ellipse at center bottom, #0a0a2e 0%, #020208 70%)",
                border: `2px solid ${phase === "crashed" ? "#ff2200" : phase === "cashedout" ? "#44ff88" : multColor}44`,
                height: 240,
              }}
            >
              <Starfield />
              {/* Graph line */}
              {phase === "running" && (
                <svg
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <defs>
                    <linearGradient id="graphGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#44ff88" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#44ff88" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${240} Q ${200} ${240 - rocketY * 2} ${300} ${240 - rocketY * 2.5}`}
                    fill="none"
                    stroke="url(#graphGrad)"
                    strokeWidth="2"
                  />
                </svg>
              )}
              {/* Rocket */}
              {(phase === "running" || phase === "countdown") && (
                <motion.div
                  animate={{ bottom: `${rocketY + 10}%`, right: "20%" }}
                  style={{ position: "absolute", fontSize: 32 }}
                >
                  🚀
                </motion.div>
              )}
              {/* Center display */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {phase === "countdown" ? (
                  <>
                    <div className="text-6xl font-black text-white">
                      {countdown}
                    </div>
                    <p style={{ color: "#888" }}>Get ready...</p>
                  </>
                ) : phase === "crashed" ? (
                  <>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: [0.5, 2, 1], opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      style={{ fontSize: 60 }}
                    >
                      💥
                    </motion.div>
                    <div
                      className="text-3xl font-black"
                      style={{
                        color: "#ff2200",
                        textShadow: "0 0 20px #ff2200",
                      }}
                    >
                      CRASHED!
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{ color: "#888" }}
                    >
                      at {multiplier.toFixed(2)}x
                    </div>
                  </>
                ) : phase === "cashedout" ? (
                  <>
                    <div style={{ fontSize: 48 }}>💰</div>
                    <div
                      className="text-3xl font-black"
                      style={{ color: "#44ff88" }}
                    >
                      CASHED OUT!
                    </div>
                  </>
                ) : (
                  <motion.div
                    key={Math.floor(multiplier * 10)}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-6xl font-black tabular-nums"
                    style={{
                      color: multColor,
                      textShadow: `0 0 20px ${multColor}`,
                      fontFamily: "monospace",
                    }}
                  >
                    {multiplier.toFixed(2)}x
                  </motion.div>
                )}
              </div>
            </div>
            {phase === "running" && (
              <Button
                onClick={cashOut}
                className="w-full py-6 font-black tracking-widest text-xl"
                style={{
                  background: "linear-gradient(135deg, #44ff88, #22cc66)",
                  color: "#000",
                  boxShadow: "0 0 30px rgba(68,255,136,0.6)",
                }}
                data-ocid="crash.cashout_button"
              >
                💰 CASH OUT {multiplier.toFixed(2)}x
              </Button>
            )}
          </div>
        )}

        {phase === "result" && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-6"
            >
              <div className="text-6xl">{won ? "💰" : "💥"}</div>
              <h3
                className="text-2xl font-black"
                style={{ color: won ? "#ffd700" : "#ff2200" }}
              >
                {won
                  ? `+${winAmount} CREDITS at ${cashOutMult.toFixed(2)}x!`
                  : "CRASHED! You lost."}
              </h3>
              <Button
                onClick={() => {
                  setPhase("bet");
                  setMultiplier(1.0);
                  setRocketY(0);
                }}
                className="font-black"
                style={{ background: COLOR, color: "#fff" }}
                data-ocid="crash.play_again_button"
              >
                LAUNCH AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
