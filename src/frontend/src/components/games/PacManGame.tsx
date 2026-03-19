import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#ff44cc";
const QUICK_BETS = [5, 10, 25, 50, 100];
const CELL = 24;
const COLS = 15;
const ROWS = 13;
const W = COLS * CELL;
const H = ROWS * CELL;

const MAZE_TEMPLATE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 2, 1, 1, 1, 2, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 2, 2, 1, 2, 1, 2, 2, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 2, 1, 1, 1, 2, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

type Phase = "bet" | "playing" | "result";
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE";
interface Pos {
  x: number;
  y: number;
}
interface Ghost {
  pos: Pos;
  dir: Dir;
  color: string;
}

function copyMaze() {
  return MAZE_TEMPLATE.map((r) => [...r]);
}
function countDots(maze: number[][]) {
  return maze.flat().filter((c) => c === 0).length;
}
function canMoveFn(maze: number[][], x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  return maze[y][x] !== 1;
}

const DIR_MAP: Record<Dir, Pos> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  NONE: { x: 0, y: 0 },
};
const PAC_ANGLE: Record<Dir, number> = {
  NONE: 0,
  RIGHT: 0,
  LEFT: Math.PI,
  UP: -Math.PI / 2,
  DOWN: Math.PI / 2,
};

// Ghost colors: Blinky=red, Pinky=pink, Inky=cyan, Clyde=orange
const GHOST_COLORS = ["#ff2222", "#ffaacc", "#22ffff", "#ffaa44"];

function drawGhost(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  color: string,
) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  const r = CELL / 2 - 2;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  // Body - rounded top
  ctx.beginPath();
  ctx.arc(cx, cy - 2, r, Math.PI, 0);
  // Wavy bottom
  const wavePts = 3;
  const waveW = (r * 2) / wavePts;
  ctx.lineTo(cx + r, cy + r);
  for (let i = 0; i < wavePts; i++) {
    const wx = cx + r - i * waveW;
    const wy = cy + r;
    ctx.quadraticCurveTo(
      wx - waveW * 0.25,
      wy + (i % 2 === 0 ? 4 : -4),
      wx - waveW * 0.5,
      wy,
    );
  }
  ctx.lineTo(cx - r, cy - 2);
  ctx.closePath();
  ctx.fill();
  // Eyes
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 3, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy - 3, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pupils
  ctx.fillStyle = "#0033ff";
  ctx.beginPath();
  ctx.arc(cx - 3.5, cy - 3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 4.5, cy - 3, 2, 0, Math.PI * 2);
  ctx.fill();
}

export default function PacManGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const gameRef = useRef<{
    maze: number[][];
    pac: Pos;
    pacDir: Dir;
    nextDir: Dir;
    ghosts: Ghost[];
    score: number;
    lives: number;
    running: boolean;
    totalDots: number;
    frame: number;
  } | null>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const endGame = useCallback(
    async (finalScore: number, playerWon: boolean) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (gameRef.current) gameRef.current.running = false;
      const win = playerWon ? Math.round(betNum * 2) : 0;
      setScore(finalScore);
      try {
        await recordOutcome({
          gameType: GameType.pacmanStyle,
          bet: BigInt(betNum),
          won: playerWon,
          winAmount: BigInt(win),
        });
        onGameComplete();
      } catch (e: any) {
        toast.error(e?.message ?? "Error");
      }
      setWon(playerWon);
      setWinAmount(win);
      setPhase("result");
    },
    [betNum, recordOutcome, onGameComplete],
  );

  const loop = useCallback(() => {
    const g = gameRef.current;
    const canvas = canvasRef.current;
    if (!g || !g.running || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    g.frame++;

    if (g.frame % 8 === 0) {
      if (g.nextDir !== "NONE" && g.nextDir !== g.pacDir) {
        const nd = DIR_MAP[g.nextDir];
        if (canMoveFn(g.maze, g.pac.x + nd.x, g.pac.y + nd.y))
          g.pacDir = g.nextDir;
      }
      const d = DIR_MAP[g.pacDir];
      const nx = g.pac.x + d.x;
      const ny = g.pac.y + d.y;
      if (canMoveFn(g.maze, nx, ny)) {
        g.pac = { x: nx, y: ny };
        if (g.maze[ny][nx] === 0) {
          g.maze[ny][nx] = 2;
          g.score += 10;
          setScore(g.score);
          if (g.score >= g.totalDots * 10) {
            endGame(g.score, true);
            return;
          }
        }
      }
    }

    if (g.frame % 16 === 0) {
      for (const ghost of g.ghosts) {
        const dirs: Dir[] = ["UP", "DOWN", "LEFT", "RIGHT"];
        const validDirs = dirs.filter((d) => {
          const p = DIR_MAP[d];
          return (
            canMoveFn(g.maze, ghost.pos.x + p.x, ghost.pos.y + p.y) &&
            !(d === "UP" && ghost.dir === "DOWN") &&
            !(d === "DOWN" && ghost.dir === "UP") &&
            !(d === "LEFT" && ghost.dir === "RIGHT") &&
            !(d === "RIGHT" && ghost.dir === "LEFT")
          );
        });
        if (validDirs.length > 0)
          ghost.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
        const gd = DIR_MAP[ghost.dir];
        const gx = ghost.pos.x + gd.x;
        const gy = ghost.pos.y + gd.y;
        if (canMoveFn(g.maze, gx, gy)) ghost.pos = { x: gx, y: gy };
      }
    }

    for (const ghost of g.ghosts) {
      if (ghost.pos.x === g.pac.x && ghost.pos.y === g.pac.y) {
        g.lives--;
        setLives(g.lives);
        if (g.lives <= 0) {
          endGame(g.score, false);
          return;
        }
        g.pac = { x: 7, y: 9 };
        g.pacDir = "NONE";
      }
    }

    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    // Draw maze
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = g.maze[r][c];
        if (cell === 1) {
          // Blue maze walls with inner glow
          ctx.fillStyle = "#1111cc";
          ctx.shadowColor = "#4444ff";
          ctx.shadowBlur = 3;
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          // Lighter front face
          ctx.fillStyle = "#2233dd";
          ctx.shadowBlur = 0;
          ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, 4);
          ctx.fillRect(c * CELL + 2, r * CELL + 2, 4, CELL - 4);
        } else if (cell === 0) {
          // Dot - white/yellow
          ctx.fillStyle = "#ffffcc";
          ctx.shadowColor = "#ffffcc";
          ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.arc(
            c * CELL + CELL / 2,
            r * CELL + CELL / 2,
            2.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Pac-Man with animated mouth
    const mouthAngle = g.frame % 10 < 5 ? 0.3 : 0.05;
    ctx.fillStyle = "#ffee00";
    ctx.shadowColor = "#ffee00";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(g.pac.x * CELL + CELL / 2, g.pac.y * CELL + CELL / 2);
    ctx.arc(
      g.pac.x * CELL + CELL / 2,
      g.pac.y * CELL + CELL / 2,
      CELL / 2 - 2,
      PAC_ANGLE[g.pacDir] + mouthAngle,
      PAC_ANGLE[g.pacDir] + Math.PI * 2 - mouthAngle,
    );
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = "#000";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(
      g.pac.x * CELL + CELL / 2 + 3,
      g.pac.y * CELL + CELL / 2 - 4,
      2,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Ghosts
    for (let i = 0; i < g.ghosts.length; i++) {
      const ghost = g.ghosts[i];
      drawGhost(
        ctx,
        ghost.pos.x,
        ghost.pos.y,
        GHOST_COLORS[i % GHOST_COLORS.length],
      );
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, H - 20, W, 20);
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 11px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    ctx.fillText(`${g.score}pts`, 4, H - 5);
    ctx.fillStyle = "#ff4444";
    ctx.shadowColor = "#ff4444";
    ctx.fillText(`${"♥ ".repeat(g.lives)}`, W - 50, H - 5);
    ctx.shadowBlur = 0;

    rafRef.current = requestAnimationFrame(loop);
  }, [endGame]);

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    const maze = copyMaze();
    gameRef.current = {
      maze,
      pac: { x: 7, y: 9 },
      pacDir: "NONE",
      nextDir: "NONE",
      ghosts: [
        { pos: { x: 6, y: 5 }, dir: "LEFT", color: GHOST_COLORS[0] },
        { pos: { x: 8, y: 5 }, dir: "RIGHT", color: GHOST_COLORS[1] },
      ],
      score: 0,
      lives: 3,
      running: true,
      totalDots: countDots(maze),
      frame: 0,
    };
    setScore(0);
    setLives(3);
    setPhase("playing");
    setTimeout(loop, 50);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const handleKey = (e: KeyboardEvent) => {
      if (!gameRef.current) return;
      if (e.key === "ArrowUp" || e.key === "w") gameRef.current.nextDir = "UP";
      if (e.key === "ArrowDown" || e.key === "s")
        gameRef.current.nextDir = "DOWN";
      if (e.key === "ArrowLeft" || e.key === "a")
        gameRef.current.nextDir = "LEFT";
      if (e.key === "ArrowRight" || e.key === "d")
        gameRef.current.nextDir = "RIGHT";
      e.preventDefault();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const dpad = (dir: Dir) => {
    if (gameRef.current) gameRef.current.nextDir = dir;
  };

  return (
    <ArcadeCabinet title="👾 PAC-MAN" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}90`, fontFamily: "monospace" }}
        >
          EAT ALL DOTS TO WIN 2x! ARROW KEYS / WASD
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
                          background: "rgba(30,0,20,0.7)",
                          color: `${HEX_COLOR}80`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="pacman.quickbet.button"
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
                background: "rgba(20,0,15,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="pacman.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #8800cc)`,
                color: "#fff",
                boxShadow: `0 0 20px ${HEX_COLOR}50`,
              }}
              data-ocid="pacman.play_button"
            >
              👾 PLAY FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-3">
            <div
              className="flex justify-between text-sm font-black"
              style={{ fontFamily: "monospace" }}
            >
              <span style={{ color: HEX_COLOR }}>SCORE: {score}</span>
              <span style={{ color: "#ff4444" }}>{"♥ ".repeat(lives)}</span>
            </div>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="rounded-lg"
                style={{
                  maxWidth: "100%",
                  boxShadow: `0 0 20px ${HEX_COLOR}30`,
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                size="sm"
                onClick={() => dpad("UP")}
                className="w-12 h-10 font-black"
                style={{
                  background: "rgba(30,0,20,0.8)",
                  border: `1px solid ${HEX_COLOR}40`,
                  color: HEX_COLOR,
                }}
                data-ocid="pacman.up_button"
              >
                ↑
              </Button>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => dpad("LEFT")}
                  className="w-12 h-10 font-black"
                  style={{
                    background: "rgba(30,0,20,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                  data-ocid="pacman.left_button"
                >
                  ←
                </Button>
                <Button
                  size="sm"
                  onClick={() => dpad("DOWN")}
                  className="w-12 h-10 font-black"
                  style={{
                    background: "rgba(30,0,20,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                  data-ocid="pacman.down_button"
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  onClick={() => dpad("RIGHT")}
                  className="w-12 h-10 font-black"
                  style={{
                    background: "rgba(30,0,20,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                  data-ocid="pacman.right_button"
                >
                  →
                </Button>
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
              <div className="text-6xl">{won ? "🎉" : "👻"}</div>
              <p
                className="text-sm"
                style={{ color: `${HEX_COLOR}80`, fontFamily: "monospace" }}
              >
                SCORE: {score} POINTS
              </p>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won ? `+${winAmount} CREDITS!` : "CAUGHT BY A GHOST!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{ background: HEX_COLOR, color: "#fff" }}
                data-ocid="pacman.play_again_button"
              >
                PLAY AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </ArcadeCabinet>
  );
}
