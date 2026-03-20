import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const ROWS = 6;
const WIN_SCORE = 200;

type Phase = "bet" | "playing" | "result";

function buildPyramid() {
  const cubes: { row: number; col: number; colored: boolean }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= r; c++) {
      cubes.push({ row: r, col: c, colored: false });
    }
  }
  return cubes;
}

function getCubePos(row: number, col: number) {
  const baseX = 140;
  const baseY = 20;
  const tileW = 36;
  const tileH = 20;
  const x = baseX + (col - row / 2) * tileW;
  const y = baseY + row * (tileH + 4);
  return { x, y };
}

interface Enemy {
  id: number;
  row: number;
  col: number;
  type: "snake" | "ball";
  moveTimer: number;
}

export default function QbertGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [cubes, setCubes] = useState(buildPyramid);
  const [player, setPlayer] = useState({ row: 0, col: 0 });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [died, setDied] = useState(false);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const gameRef = useRef<{
    running: boolean;
    score: number;
    lives: number;
    enemyId: number;
    player: { row: number; col: number };
  }>({
    running: false,
    score: 0,
    lives: 3,
    enemyId: 0,
    player: { row: 0, col: 0 },
  });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endGame = useCallback(
    async (finalScore: number) => {
      gameRef.current.running = false;
      if (tickRef.current) clearInterval(tickRef.current);
      const didWin = finalScore >= WIN_SCORE;
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.qbert,
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
      toast.error("Invalid bet");
      return;
    }
    const initialCubes = buildPyramid();
    initialCubes[0].colored = true;
    gameRef.current = {
      running: true,
      score: 10,
      lives: 3,
      enemyId: 0,
      player: { row: 0, col: 0 },
    };
    setCubes(initialCubes);
    setPlayer({ row: 0, col: 0 });
    setEnemies([]);
    setLives(3);
    setScore(10);
    setDied(false);
    setPhase("playing");

    tickRef.current = setInterval(() => {
      if (!gameRef.current.running) return;
      // Spawn enemy occasionally
      if (Math.random() < 0.3 && gameRef.current.enemyId < 5) {
        const id = gameRef.current.enemyId++;
        setEnemies((prev) => [
          ...prev,
          {
            id,
            row: 0,
            col: 0,
            type: Math.random() > 0.5 ? "snake" : "ball",
            moveTimer: 0,
          },
        ]);
      }
      // Move enemies
      setEnemies((prev) =>
        prev
          .map((e) => {
            const t = e.moveTimer + 1;
            if (t >= 3) {
              const nr = e.row + 1;
              const nc = e.col + (Math.random() > 0.5 ? 1 : 0);
              if (nr >= ROWS) return null as any;
              // Check if enemy hits player
              if (
                nr === gameRef.current.player.row &&
                nc === gameRef.current.player.col
              ) {
                gameRef.current.lives--;
                setLives(gameRef.current.lives);
                setDied(true);
                setTimeout(() => setDied(false), 600);
                if (gameRef.current.lives <= 0) {
                  endGame(gameRef.current.score);
                }
              }
              return { ...e, row: nr, col: nc, moveTimer: 0 };
            }
            return { ...e, moveTimer: t };
          })
          .filter(Boolean),
      );
    }, 600);
  }, [betNum, balance, endGame]);

  const move = useCallback(
    (dr: number, dc: number) => {
      if (!gameRef.current.running) return;
      setPlayer((prev) => {
        const nr = prev.row + dr;
        const nc = prev.col + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc > nr) {
          // Fell off
          gameRef.current.lives--;
          setLives(gameRef.current.lives);
          if (gameRef.current.lives <= 0) {
            endGame(gameRef.current.score);
          }
          setDied(true);
          setTimeout(() => setDied(false), 600);
          return { row: 0, col: 0 };
        }
        gameRef.current.player = { row: nr, col: nc };
        setCubes((cubesPrev) => {
          const idx = cubesPrev.findIndex((c) => c.row === nr && c.col === nc);
          if (idx < 0) return cubesPrev;
          if (!cubesPrev[idx].colored) {
            const updated = cubesPrev.map((c, i) =>
              i === idx ? { ...c, colored: true } : c,
            );
            gameRef.current.score += 10;
            setScore(gameRef.current.score);
            if (updated.every((c) => c.colored)) {
              gameRef.current.score += 100;
              setScore(gameRef.current.score);
              if (gameRef.current.score >= WIN_SCORE)
                endGame(gameRef.current.score);
              // New level - reset cubes
              const fresh = buildPyramid();
              fresh[0].colored = true;
              return fresh;
            }
            return updated;
          }
          return cubesPrev;
        });
        return { row: nr, col: nc };
      });
    },
    [endGame],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        move(-1, -1);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        move(1, 1);
      } else if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        move(-1, 0);
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        move(1, 0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, move]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const playerPos = getCubePos(player.row, player.col);

  return (
    <ArcadeCabinet title="Q*BERT" color="#ff8800">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ff8800", textShadow: "0 0 10px #ff8800" }}
            >
              HOP THE PYRAMID
            </div>
            <div className="text-sm opacity-70 mt-1">
              Score {WIN_SCORE} pts to win 2× your bet
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
                    ? { background: "#ff8800", borderColor: "#ff8800" }
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-orange-500"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #ff8800, #ff4400)",
              boxShadow: "0 0 20px #ff880050",
            }}
          >
            🟠 PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div>
          <div className="flex justify-between px-4 py-1 text-sm font-bold">
            <span style={{ color: "#ff8800" }}>SCORE: {score}</span>
            <span>{"❤️".repeat(lives)}</span>
          </div>
          <div
            className="relative mx-auto"
            style={{ width: 280, height: 200, overflow: "visible" }}
          >
            <svg
              width={280}
              height={200}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <title>Q*bert Pyramid</title>
              {cubes.map((c) => {
                const { x, y } = getCubePos(c.row, c.col);
                const tw = 36;
                const th = 20;
                // Isometric cube top face
                const pts = [
                  `${x},${y}`,
                  `${x + tw / 2},${y + th / 2}`,
                  `${x},${y + th}`,
                  `${x - tw / 2},${y + th / 2}`,
                ].join(" ");
                const fill = c.colored ? "#ff8800" : "#334455";
                const stroke = c.colored ? "#ffaa44" : "#556677";
                return (
                  <g key={`${c.row}-${c.col}`}>
                    {/* Left face */}
                    <polygon
                      points={`${x - tw / 2},${y + th / 2} ${x},${y + th} ${x},${y + th + 12} ${x - tw / 2},${y + th / 2 + 12}`}
                      fill={c.colored ? "#cc6600" : "#223344"}
                      stroke={stroke}
                      strokeWidth={0.5}
                    />
                    {/* Right face */}
                    <polygon
                      points={`${x + tw / 2},${y + th / 2} ${x},${y + th} ${x},${y + th + 12} ${x + tw / 2},${y + th / 2 + 12}`}
                      fill={c.colored ? "#dd7700" : "#2a3d4d"}
                      stroke={stroke}
                      strokeWidth={0.5}
                    />
                    {/* Top face */}
                    <polygon
                      points={pts}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={1}
                    />
                  </g>
                );
              })}
              {/* Enemies */}
              {enemies.map((e) => {
                const ep = getCubePos(e.row, e.col);
                return (
                  <text
                    key={e.id}
                    x={ep.x}
                    y={ep.y - 4}
                    textAnchor="middle"
                    fontSize={16}
                  >
                    {e.type === "snake" ? "🐍" : "🔴"}
                  </text>
                );
              })}
              {/* Player */}
              <AnimatePresence>
                <motion.text
                  key={`${player.row}-${player.col}`}
                  x={playerPos.x}
                  y={playerPos.y - 4}
                  textAnchor="middle"
                  fontSize={20}
                  animate={died ? { opacity: [1, 0, 1] } : {}}
                >
                  🟠
                </motion.text>
              </AnimatePresence>
            </svg>
          </div>
          {/* Touch controls */}
          <div className="flex flex-col items-center gap-1 mt-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(-1, 0)}
                style={{
                  width: 40,
                  height: 40,
                  background: "#ff880033",
                  border: "1px solid #ff8800",
                  borderRadius: 6,
                  color: "#ff8800",
                  fontSize: 18,
                }}
              >
                ↖
              </button>
              <button
                type="button"
                onClick={() => move(-1, -1)}
                style={{
                  width: 40,
                  height: 40,
                  background: "#ff880033",
                  border: "1px solid #ff8800",
                  borderRadius: 6,
                  color: "#ff8800",
                  fontSize: 18,
                }}
              >
                ↗
              </button>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(1, 0)}
                style={{
                  width: 40,
                  height: 40,
                  background: "#ff880033",
                  border: "1px solid #ff8800",
                  borderRadius: 6,
                  color: "#ff8800",
                  fontSize: 18,
                }}
              >
                ↙
              </button>
              <button
                type="button"
                onClick={() => move(1, 1)}
                style={{
                  width: 40,
                  height: 40,
                  background: "#ff880033",
                  border: "1px solid #ff8800",
                  borderRadius: 6,
                  color: "#ff8800",
                  fontSize: 18,
                }}
              >
                ↘
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🟠" : "💀"}</div>
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
                setCubes(buildPyramid());
              }}
              variant="outline"
            >
              Play Again
            </Button>
            <Button onClick={onGameComplete} style={{ background: "#ff8800" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
