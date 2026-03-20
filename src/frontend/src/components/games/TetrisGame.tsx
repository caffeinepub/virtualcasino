import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#00d4ff";
const QUICK_BETS = [5, 10, 25, 50, 100];
const COLS = 10;
const ROWS = 20;
const CELL = 22;
const W = COLS * CELL;
const H = ROWS * CELL;
type Phase = "bet" | "playing" | "result";

const TETROMINOES: { shape: number[][]; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: "#00ffff" }, // I
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#ffff00",
  }, // O
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "#aa00ff",
  }, // T
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "#00ff00",
  }, // S
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "#ff0000",
  }, // Z
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "#0000ff",
  }, // J
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "#ff8800",
  }, // L
];

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, c) => shape.map((row) => row[c]).reverse());
}

function emptyBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function collides(
  board: number[][],
  shape: number[][],
  x: number,
  y: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = y + r;
      const nc = x + c;
      if (nr >= ROWS || nc < 0 || nc >= COLS) return true;
      if (nr >= 0 && board[nr][nc]) return true;
    }
  }
  return false;
}

export default function TetrisGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const gameRef = useRef<{
    board: number[][];
    colors: string[][];
    piece: { shape: number[][]; color: string; x: number; y: number } | null;
    score: number;
    lines: number;
    running: boolean;
    interval: ReturnType<typeof setInterval> | null;
    speed: number;
  } | null>(null);

  const spawnPiece = () => {
    const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    return {
      shape: t.shape,
      color: t.color,
      x: Math.floor(COLS / 2) - 1,
      y: 0,
    };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(0,100,150,0.2)";
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, H);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(W, r * CELL);
      ctx.stroke();
    }

    // Board cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g.board[r][c]) {
          const col = g.colors[r][c];
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 4;
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 4);
        }
      }
    }
    ctx.shadowBlur = 0;

    // Active piece
    if (g.piece) {
      const { shape, color, x, y } = g.piece;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            ctx.fillRect(
              (x + c) * CELL + 1,
              (y + r) * CELL + 1,
              CELL - 2,
              CELL - 2,
            );
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.fillRect((x + c) * CELL + 1, (y + r) * CELL + 1, CELL - 2, 4);
            ctx.fillStyle = color;
          }
        }
      }
      ctx.shadowBlur = 0;
    }

    // HUD
    ctx.fillStyle = "rgba(0,10,20,0.8)";
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 11px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    ctx.fillText(`SCORE: ${g.score}`, 6, H - 7);
    ctx.fillText(`LINES: ${g.lines}`, W / 2 - 20, H - 7);
    ctx.shadowBlur = 0;
  }, []);

  const endGame = useCallback(
    async (finalScore: number) => {
      if (!gameRef.current) return;
      gameRef.current.running = false;
      if (gameRef.current.interval) {
        clearInterval(gameRef.current.interval);
        gameRef.current.interval = null;
      }
      const mult =
        finalScore >= 200
          ? 3
          : finalScore >= 100
            ? 2
            : finalScore >= 50
              ? 1.5
              : 0;
      const didWin = mult > 0;
      const win = didWin ? Math.round(betNum * mult) : 0;
      setScore(finalScore);
      try {
        await recordOutcome({
          gameType: GameType.tetris,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
        onGameComplete();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error recording outcome");
      }
      setWon(didWin);
      setWinAmount(win);
      setPhase("result");
    },
    [betNum, recordOutcome, onGameComplete],
  );

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    gameRef.current = {
      board: emptyBoard(),
      colors: Array.from({ length: ROWS }, () =>
        Array(COLS).fill(""),
      ) as string[][],
      piece: spawnPiece(),
      score: 0,
      lines: 0,
      running: true,
      interval: null,
      speed: 800,
    };
    setScore(0);
    setPhase("playing");
    setTimeout(() => {
      if (!gameRef.current) return;
      const tick = () => {
        const g = gameRef.current;
        if (!g || !g.running || !g.piece) return;
        const { piece, board } = g;
        if (!collides(board, piece.shape, piece.x, piece.y + 1)) {
          piece.y++;
        } else {
          // Lock piece
          for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
              if (piece.shape[r][c]) {
                const nr = piece.y + r;
                if (nr < 0) {
                  endGame(g.score);
                  return;
                }
                board[nr][piece.x + c] = 1;
                (g.colors as string[][])[nr][piece.x + c] = piece.color;
              }
            }
          }
          // Clear lines
          let cleared = 0;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every((v) => v === 1)) {
              board.splice(r, 1);
              (g.colors as string[][]).splice(r, 1);
              board.unshift(Array(COLS).fill(0));
              (g.colors as string[][]).unshift(Array(COLS).fill(""));
              cleared++;
              r++;
            }
          }
          if (cleared > 0) {
            g.lines += cleared;
            g.score += cleared * 10 * cleared;
            setScore(g.score);
            // Speed up every 10 lines
            if (g.interval && g.lines % 10 === 0) {
              clearInterval(g.interval);
              g.speed = Math.max(100, g.speed - 50);
              g.interval = setInterval(tick, g.speed);
            }
          }
          g.piece = spawnPiece();
          if (collides(board, g.piece.shape, g.piece.x, g.piece.y)) {
            endGame(g.score);
            return;
          }
        }
        draw();
      };
      gameRef.current.interval = setInterval(tick, 800);
    }, 50);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g || !g.piece) return;
      const { piece, board } = g;
      if (e.key === "ArrowLeft") {
        if (!collides(board, piece.shape, piece.x - 1, piece.y)) piece.x--;
      } else if (e.key === "ArrowRight") {
        if (!collides(board, piece.shape, piece.x + 1, piece.y)) piece.x++;
      } else if (e.key === "ArrowDown") {
        if (!collides(board, piece.shape, piece.x, piece.y + 1)) piece.y++;
      } else if (e.key === "ArrowUp") {
        const rotated = rotate(piece.shape);
        if (!collides(board, rotated, piece.x, piece.y)) piece.shape = rotated;
      } else if (e.key === " ") {
        while (!collides(board, piece.shape, piece.x, piece.y + 1)) piece.y++;
      } else {
        return;
      }
      e.preventDefault();
      draw();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, draw]);

  useEffect(
    () => () => {
      if (gameRef.current?.interval) clearInterval(gameRef.current.interval);
    },
    [],
  );

  const mobileAction = (action: string) => {
    const g = gameRef.current;
    if (!g || !g.piece) return;
    const { piece, board } = g;
    if (
      action === "left" &&
      !collides(board, piece.shape, piece.x - 1, piece.y)
    )
      piece.x--;
    else if (
      action === "right" &&
      !collides(board, piece.shape, piece.x + 1, piece.y)
    )
      piece.x++;
    else if (action === "rotate") {
      const r = rotate(piece.shape);
      if (!collides(board, r, piece.x, piece.y)) piece.shape = r;
    } else if (
      action === "down" &&
      !collides(board, piece.shape, piece.x, piece.y + 1)
    )
      piece.y++;
    draw();
  };

  return (
    <ArcadeCabinet title="🟦 TETRIS" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          STACK BLOCKS &mdash; 50pts=1.5x &bull; 100pts=2x &bull; 200pts=3x
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
                      ? { background: HEX_COLOR, color: "#000" }
                      : {
                          background: "rgba(0,30,50,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="tetris.quickbet.button"
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
                background: "rgba(0,20,40,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="tetris.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #0088aa)`,
                color: "#000",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="tetris.play_button"
            >
              INSERT COIN &mdash; PLAY FOR {bet}
            </Button>
          </div>
        )}
        {phase === "playing" && (
          <div className="space-y-3">
            <div
              className="flex justify-between font-black"
              style={{ fontFamily: "monospace", color: HEX_COLOR }}
            >
              <span>SCORE: {score}</span>
              <span className="text-xs" style={{ color: `${HEX_COLOR}70` }}>
                ← ↑ → ↓ SPACE
              </span>
            </div>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="rounded-lg"
                style={{
                  maxWidth: "100%",
                  boxShadow: `0 0 20px ${HEX_COLOR}40`,
                }}
              />
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {(["left", "rotate", "right", "down"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => mobileAction(a)}
                  className="w-11 h-10 rounded font-black text-sm"
                  style={{
                    background: "rgba(0,30,50,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                >
                  {a === "left"
                    ? "←"
                    : a === "rotate"
                      ? "↻"
                      : a === "right"
                        ? "→"
                        : "↓"}
                </button>
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
              <div className="text-6xl">{won ? "🎉" : "💀"}</div>
              <p
                className="text-sm"
                style={{ color: `${HEX_COLOR}80`, fontFamily: "monospace" }}
              >
                SCORE: {score} PTS
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
                  : score < 50
                    ? "SCORE 50+ TO WIN!"
                    : "GAME OVER!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: HEX_COLOR,
                  color: "#000",
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                }}
                data-ocid="tetris.play_again_button"
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
