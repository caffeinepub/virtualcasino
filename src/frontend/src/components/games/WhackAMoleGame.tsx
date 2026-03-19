import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#ff6622";
const QUICK_BETS = [5, 10, 25, 50, 100];
const GAME_DURATION = 30;
const WIN_SCORE = 8;
const HOLES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
type Phase = "bet" | "playing" | "result";

export default function WhackAMoleGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [activeMoles, setActiveMoles] = useState<Set<number>>(new Set());
  const [hitMoles, setHitMoles] = useState<Set<number>>(new Set());
  const [hitFlash, setHitFlash] = useState<Set<number>>(new Set());
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (moleIntervalRef.current) clearInterval(moleIntervalRef.current);
    },
    [],
  );

  const stopAll = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (moleIntervalRef.current) {
      clearInterval(moleIntervalRef.current);
      moleIntervalRef.current = null;
    }
  };

  const endGame = async () => {
    stopAll();
    const finalScore = scoreRef.current;
    const didWin = finalScore >= WIN_SCORE;
    const win = didWin ? betNum * 2 : 0;
    try {
      await recordOutcome({
        gameType: GameType.whackAMole,
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
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setActiveMoles(new Set());
    setHitMoles(new Set());
    setHitFlash(new Set());
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    moleIntervalRef.current = setInterval(() => {
      const count = Math.floor(Math.random() * 3) + 1;
      const holes = new Set<number>();
      while (holes.size < count) holes.add(Math.floor(Math.random() * 9));
      setActiveMoles(holes);
      setHitMoles(new Set());
      setTimeout(() => setActiveMoles(new Set()), 1200);
    }, 1500);
  };

  const whack = (i: number) => {
    if (!activeMoles.has(i) || hitMoles.has(i)) return;
    setHitMoles((prev) => new Set([...prev, i]));
    setActiveMoles((prev) => {
      const n = new Set(prev);
      n.delete(i);
      return n;
    });
    setHitFlash((prev) => new Set([...prev, i]));
    setTimeout(
      () =>
        setHitFlash((prev) => {
          const n = new Set(prev);
          n.delete(i);
          return n;
        }),
      400,
    );
    scoreRef.current += 1;
    setScore((s) => s + 1);
  };

  const timerPct = (timeLeft / GAME_DURATION) * 100;

  return (
    <ArcadeCabinet title="🔨 WHACK-A-MOLE" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}90`, fontFamily: "monospace" }}
        >
          WHACK {WIN_SCORE}+ MOLES IN {GAME_DURATION}s TO WIN 2x!
        </p>

        {phase === "bet" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap justify-center">
              {QUICK_BETS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setBet(q.toString())}
                  className="px-4 py-2 rounded-lg text-xs font-black"
                  style={
                    bet === q.toString()
                      ? { background: HEX_COLOR, color: "#fff" }
                      : {
                          background: "rgba(40,15,0,0.7)",
                          color: `${HEX_COLOR}80`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="whack.quickbet.button"
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
              className="w-full px-4 py-3 rounded-xl text-lg font-bold text-center"
              style={{
                background: "rgba(25,10,0,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="whack.bet.input"
            />
            <button
              type="button"
              onClick={startGame}
              className="w-full py-4 rounded-xl font-black tracking-widest text-white"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #cc4400)`,
                boxShadow: `0 0 20px ${HEX_COLOR}50`,
                fontFamily: "monospace",
                fontSize: "14px",
              }}
              data-ocid="whack.play_button"
            >
              🔨 PLAY FOR {bet} CREDITS
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span
                className="font-black text-lg"
                style={{ color: HEX_COLOR, fontFamily: "monospace" }}
              >
                SCORE: {score}
              </span>
              <span
                className={`font-black text-lg ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}
                style={{ fontFamily: "monospace" }}
              >
                ⏱ {timeLeft}s
              </span>
              <span
                className="text-sm"
                style={{ color: `${HEX_COLOR}80`, fontFamily: "monospace" }}
              >
                NEED: {WIN_SCORE}
              </span>
            </div>

            {/* Wooden carnival board */}
            <div
              className="rounded-xl p-4 relative"
              style={{
                background:
                  "linear-gradient(145deg, #5c3010 0%, #7a4020 30%, #6b3818 60%, #4e2808 100%)",
                border: "3px solid #3a1e06",
                boxShadow:
                  "inset 0 2px 8px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              {/* Wood grain lines */}
              <div className="absolute inset-0 rounded-xl overflow-hidden opacity-20 pointer-events-none">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="absolute w-full h-px"
                    style={{
                      top: `${10 + i * 12}%`,
                      background: "rgba(0,0,0,0.4)",
                      transform: `rotate(${i % 2 === 0 ? 0.3 : -0.2}deg)`,
                    }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 relative z-10">
                {HOLES.map((i) => (
                  <button
                    key={`hole-${i}`}
                    type="button"
                    onClick={() => whack(i)}
                    className="relative overflow-hidden flex items-end justify-center"
                    style={{
                      height: "90px",
                      cursor: activeMoles.has(i) ? "pointer" : "default",
                    }}
                    data-ocid={`whack.hole.${i + 1}`}
                  >
                    {/* Dirt hole */}
                    <div
                      className="absolute bottom-0 w-full"
                      style={{
                        height: "36px",
                        background:
                          "radial-gradient(ellipse at center, #1a0a00 30%, #2d1204 60%, #3d1a08 100%)",
                        borderRadius: "50%",
                        border: "2px solid #200900",
                        boxShadow: "inset 0 4px 10px rgba(0,0,0,0.8)",
                      }}
                    />
                    <AnimatePresence>
                      {activeMoles.has(i) && (
                        <motion.div
                          key="mole"
                          initial={{ y: 50, scaleY: 0.3 }}
                          animate={{ y: 0, scaleY: 1 }}
                          exit={{ y: 50, scaleY: 0.3 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 20,
                          }}
                          className="absolute bottom-3 flex flex-col items-center"
                          style={{ transformOrigin: "bottom center" }}
                        >
                          {/* Mole head - CSS drawn */}
                          <div className="relative">
                            {/* Head */}
                            <div
                              className="w-14 h-14 rounded-full relative"
                              style={{
                                background:
                                  "radial-gradient(circle at 35% 30%, #7a5030 0%, #5c3a1a 50%, #3d2510 100%)",
                                border: "2px solid #2d1a0a",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                              }}
                            >
                              {/* Eyes */}
                              <div
                                className="absolute flex gap-2"
                                style={{
                                  top: "22%",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                }}
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    background:
                                      "radial-gradient(circle at 35% 30%, #444, #111)",
                                    border: "1px solid #000",
                                  }}
                                >
                                  <div
                                    className="w-1 h-1 rounded-full bg-white absolute"
                                    style={{ top: "10%", left: "10%" }}
                                  />
                                </div>
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    background:
                                      "radial-gradient(circle at 35% 30%, #444, #111)",
                                    border: "1px solid #000",
                                  }}
                                >
                                  <div
                                    className="w-1 h-1 rounded-full bg-white absolute"
                                    style={{ top: "10%", left: "10%" }}
                                  />
                                </div>
                              </div>
                              {/* Snout */}
                              <div
                                className="absolute"
                                style={{
                                  bottom: "18%",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                }}
                              >
                                <div
                                  className="w-8 h-5 rounded-full"
                                  style={{
                                    background:
                                      "radial-gradient(circle at 40% 35%, #ffaaaa 0%, #e08080 60%, #cc6060 100%)",
                                    border: "1px solid #aa4444",
                                  }}
                                >
                                  {/* Nostrils */}
                                  <div
                                    className="absolute flex gap-1"
                                    style={{
                                      top: "20%",
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                    }}
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-900" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-900" />
                                  </div>
                                </div>
                              </div>
                              {/* Ears */}
                              <div
                                className="absolute w-4 h-4 rounded-full"
                                style={{
                                  top: "-4px",
                                  left: "-2px",
                                  background: "#4a2810",
                                  border: "1px solid #2d1a08",
                                }}
                              />
                              <div
                                className="absolute w-4 h-4 rounded-full"
                                style={{
                                  top: "-4px",
                                  right: "-2px",
                                  background: "#4a2810",
                                  border: "1px solid #2d1a08",
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Hit flash - star burst */}
                    <AnimatePresence>
                      {hitFlash.has(i) && (
                        <motion.div
                          key="hit"
                          initial={{ scale: 0.5, opacity: 1 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.35 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                        >
                          <div className="text-3xl">⭐</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                ))}
              </div>
            </div>

            {/* Timer bar */}
            <div
              className="rounded-full overflow-hidden h-3"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: `1px solid ${HEX_COLOR}40`,
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${timerPct}%`,
                  background:
                    timeLeft <= 10
                      ? "linear-gradient(90deg, #ff2200, #ff6600)"
                      : `linear-gradient(90deg, ${HEX_COLOR}, #ffaa44)`,
                  boxShadow: `0 0 8px ${timeLeft <= 10 ? "#ff4400" : HEX_COLOR}`,
                  transition: "width 1s linear, background 0.5s",
                }}
              />
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
              <p
                className="text-sm"
                style={{ color: `${HEX_COLOR}80`, fontFamily: "monospace" }}
              >
                FINAL SCORE: {score} MOLES WHACKED
              </p>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won
                  ? `+${winAmount} CREDITS!`
                  : `NEED ${WIN_SCORE}, GOT ${score}`}
              </h3>
              <button
                type="button"
                onClick={() => setPhase("bet")}
                className="px-8 py-3 rounded-xl font-black text-white"
                style={{
                  background: HEX_COLOR,
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                  fontFamily: "monospace",
                }}
                data-ocid="whack.play_again_button"
              >
                PLAY AGAIN
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </ArcadeCabinet>
  );
}
