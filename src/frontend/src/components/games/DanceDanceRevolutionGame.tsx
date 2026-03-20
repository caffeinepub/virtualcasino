import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const BPM = 120;
const BEAT_MS = (60 / BPM) * 1000;
const ARROW_KEYS = ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"];
const ARROW_LABELS = ["←", "↓", "↑", "→"];
const ARROW_COLORS = ["#ff00aa", "#00aaff", "#aa00ff", "#00ffaa"];
const GAME_DURATION = 30000;
const WIN_SCORE = 50;

type Phase = "bet" | "playing" | "result";

interface Note {
  id: number;
  col: number;
  y: number;
  hit: boolean;
  missed: boolean;
}

export default function DanceDanceRevolutionGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [feedback, setFeedback] = useState<{
    col: number;
    text: string;
    id: number;
  } | null>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const gameRef = useRef<{
    running: boolean;
    noteId: number;
    beatCount: number;
    score: number;
    combo: number;
    startTime: number;
  }>({
    running: false,
    noteId: 0,
    beatCount: 0,
    score: 0,
    combo: 0,
    startTime: 0,
  });
  const rafRef = useRef<number | null>(null);
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endGame = useCallback(
    async (finalScore: number) => {
      gameRef.current.running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
      const didWin = finalScore >= WIN_SCORE;
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.danceDanceRevolution,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
      } catch (e) {
        console.error(e);
      }
      setPhase("result");
    },
    [betNum, recordOutcome],
  );

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet amount");
      return;
    }
    gameRef.current = {
      running: true,
      noteId: 0,
      beatCount: 0,
      score: 0,
      combo: 0,
      startTime: Date.now(),
    };
    setScore(0);
    setCombo(0);
    setNotes([]);
    setPhase("playing");

    const spawnNote = () => {
      if (!gameRef.current.running) return;
      const col = Math.floor(Math.random() * 4);
      const id = gameRef.current.noteId++;
      setNotes((prev) => [
        ...prev,
        { id, col, y: 0, hit: false, missed: false },
      ]);
    };

    beatTimerRef.current = setInterval(spawnNote, BEAT_MS * 0.75);

    let lastTime = Date.now();
    const loop = () => {
      if (!gameRef.current.running) return;
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;
      const elapsed = now - gameRef.current.startTime;

      setNotes((prev) => {
        const updated = prev
          .map((n) => {
            if (n.hit || n.missed) return n;
            const newY = n.y + dt * 0.25;
            if (newY > 110) {
              gameRef.current.combo = 0;
              setCombo(0);
              return { ...n, y: newY, missed: true };
            }
            return { ...n, y: newY };
          })
          .filter((n) => !(n.missed && n.y > 120));
        return updated;
      });

      if (elapsed >= GAME_DURATION) {
        endGame(gameRef.current.score);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    setTimeout(() => endGame(gameRef.current.score), GAME_DURATION + 200);
  }, [betNum, balance, endGame]);

  const pressArrow = useCallback((col: number) => {
    if (!gameRef.current.running) return;
    let hit = false;
    setNotes((prev) => {
      const updated = [...prev];
      for (let i = 0; i < updated.length; i++) {
        const n = updated[i];
        if (n.col === col && !n.hit && !n.missed && n.y >= 75 && n.y <= 105) {
          updated[i] = { ...n, hit: true };
          hit = true;
          break;
        }
      }
      return updated;
    });
    if (hit) {
      gameRef.current.combo++;
      const pts = 10 + gameRef.current.combo * 2;
      gameRef.current.score += pts;
      setScore(gameRef.current.score);
      setCombo(gameRef.current.combo);
      const fbId = Date.now();
      setFeedback({
        col,
        text: gameRef.current.combo > 5 ? "PERFECT!" : "GOOD!",
        id: fbId,
      });
      setTimeout(() => setFeedback((f) => (f?.id === fbId ? null : f)), 400);
    } else {
      gameRef.current.combo = 0;
      setCombo(0);
      setFeedback({ col, text: "MISS", id: Date.now() });
      setTimeout(() => setFeedback(null), 300);
    }
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const idx = ARROW_KEYS.indexOf(e.key);
      if (idx >= 0) {
        e.preventDefault();
        pressArrow(idx);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, pressArrow]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, []);

  return (
    <ArcadeCabinet title="DANCE DANCE REVOLUTION" color="#ff00aa">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ff00aa", textShadow: "0 0 10px #ff00aa" }}
            >
              DANCE TO WIN
            </div>
            <div className="text-sm opacity-70 mt-1">
              Hit {WIN_SCORE} points to win 2× your bet
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK_BETS.map((b) => (
              <Button
                key={b}
                size="sm"
                variant={bet === String(b) ? "default" : "outline"}
                onClick={() => setBet(String(b))}
                style={
                  bet === String(b)
                    ? { background: "#ff00aa", borderColor: "#ff00aa" }
                    : {}
                }
              >
                {b}
              </Button>
            ))}
          </div>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-pink-500"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #ff00aa, #aa00ff)",
              boxShadow: "0 0 20px #ff00aa50",
            }}
          >
            🎵 PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="select-none" style={{ userSelect: "none" }}>
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span style={{ color: "#ff00aa" }}>SCORE: {score}</span>
            <span style={{ color: "#ffcc00" }}>COMBO: {combo}</span>
            <span style={{ color: "#00ffaa" }}>BEAT IT!</span>
          </div>
          {/* Game field */}
          <div
            className="relative mx-auto"
            style={{
              width: 220,
              height: 340,
              background: "#0a0010",
              border: "2px solid #ff00aa33",
              overflow: "hidden",
            }}
          >
            {/* Lane lines */}
            {[0, 1, 2, 3].map((c) => (
              <div
                key={c}
                style={{
                  position: "absolute",
                  left: c * 55,
                  top: 0,
                  width: 55,
                  height: "100%",
                  borderRight: c < 3 ? "1px solid #ffffff11" : "none",
                }}
              />
            ))}
            {/* Target zones */}
            {[0, 1, 2, 3].map((c) => (
              <div
                key={c}
                style={{
                  position: "absolute",
                  left: c * 55 + 7,
                  top: 290,
                  width: 41,
                  height: 41,
                  borderRadius: 6,
                  border: `2px solid ${ARROW_COLORS[c]}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  color: `${ARROW_COLORS[c]}66`,
                }}
              >
                {ARROW_LABELS[c]}
              </div>
            ))}
            {/* Notes */}
            {notes
              .filter((n) => !n.missed)
              .map((n) => (
                <motion.div
                  key={n.id}
                  style={{
                    position: "absolute",
                    left: n.col * 55 + 7,
                    top: `${n.y}%`,
                    width: 41,
                    height: 38,
                    borderRadius: 6,
                    background: n.hit ? "#ffffff44" : ARROW_COLORS[n.col],
                    boxShadow: n.hit
                      ? "none"
                      : `0 0 12px ${ARROW_COLORS[n.col]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    color: "#fff",
                    fontWeight: "bold",
                    opacity: n.hit ? 0 : 1,
                  }}
                >
                  {ARROW_LABELS[n.col]}
                </motion.div>
              ))}
            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -20 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    position: "absolute",
                    left: feedback.col * 55 + 2,
                    top: 260,
                    width: 50,
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: "bold",
                    color: feedback.text === "MISS" ? "#ff4444" : "#ffcc00",
                  }}
                >
                  {feedback.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Touch buttons */}
          <div className="flex gap-1 justify-center mt-3 px-2">
            {[0, 1, 2, 3].map((c) => (
              <button
                type="button"
                key={c}
                onPointerDown={() => pressArrow(c)}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 8,
                  background: `${ARROW_COLORS[c]}33`,
                  border: `2px solid ${ARROW_COLORS[c]}`,
                  color: ARROW_COLORS[c],
                  fontSize: 22,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {ARROW_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🎵" : "😔"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ffcc00" : "#ff4444" }}
          >
            {won ? "YOU WIN!" : "GAME OVER"}
          </div>
          <div className="text-sm opacity-70">
            Score: {score} | Need {WIN_SCORE}
          </div>
          {won && (
            <div style={{ color: "#ffcc00" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setPhase("bet");
                setNotes([]);
              }}
              variant="outline"
            >
              Play Again
            </Button>
            <Button onClick={onGameComplete} style={{ background: "#ff00aa" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
