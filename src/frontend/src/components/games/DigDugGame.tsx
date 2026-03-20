import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#ffaa00";
const QUICK_BETS = [5, 10, 25, 50, 100];
const COLS = 15;
const ROWS = 12;
const CELL = 32;
const W = COLS * CELL;
const H = ROWS * CELL;
type Phase = "bet" | "playing" | "result";

interface Enemy {
  col: number;
  row: number;
  alive: boolean;
  vx: number;
  vy: number;
  inflated: number;
}
interface Tunnel {
  col: number;
  row: number;
}
interface Pump {
  x: number;
  y: number;
  dx: number;
  dy: number;
  alive: boolean;
  target: Enemy | null;
  charge: number;
}

export default function DigDugGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const rafRef = useRef<number | null>(null);

  const gameRef = useRef<{
    player: { col: number; row: number; dir: string; pumping: boolean };
    enemies: Enemy[];
    tunnels: Tunnel[];
    pump: Pump | null;
    running: boolean;
    score: number;
    tick: number;
    moveTick: number;
  } | null>(null);

  const keysRef = useRef<Set<string>>(new Set());

  const endGame = useCallback(
    async (didWin: boolean) => {
      if (!gameRef.current) return;
      gameRef.current.running = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const win = didWin ? betNum * 2 : 0;
      try {
        await recordOutcome({
          gameType: GameType.digDug,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
        onGameComplete();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
      setWon(didWin);
      setWinAmount(win);
      setPhase("result");
    },
    [betNum, recordOutcome, onGameComplete],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Earth background
    ctx.fillStyle = "#3a1a00";
    ctx.fillRect(0, 0, W, H);

    // Sky strip
    ctx.fillStyle = "#1a0060";
    ctx.fillRect(0, 0, W, CELL);

    // Dirt texture
    ctx.fillStyle = "#5a2800";
    for (let c = 0; c < COLS; c++) {
      for (let r = 1; r < ROWS; r++) {
        if ((c + r) % 3 !== 0) {
          ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
        }
      }
    }

    // Tunnels (cleared dirt)
    ctx.fillStyle = "#1a0a00";
    for (const t of g.tunnels) {
      ctx.fillRect(t.col * CELL + 1, t.row * CELL + 1, CELL - 2, CELL - 2);
    }

    // Enemies (Pookas - round red enemies)
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const x = e.col * CELL + CELL / 2;
      const y = e.row * CELL + CELL / 2;
      const r = (CELL / 2 - 2) * (1 + e.inflated * 0.15);
      const color = e.inflated > 2 ? "#ff4400" : "#ff0000";
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = e.inflated > 0 ? 8 : 4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Goggles
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x - 5, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 5, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x - 5, y - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 5, y - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      // Inflation indicator
      if (e.inflated > 0) {
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 1;
        ctx.shadowColor = "#ffff00";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y, r + 2, 0, (e.inflated / 5) * Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Pump beam
    if (g.pump?.alive) {
      const p = g.pump;
      ctx.strokeStyle = HEX_COLOR;
      ctx.lineWidth = 3;
      ctx.shadowColor = HEX_COLOR;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      const px = g.player.col * CELL + CELL / 2;
      const py = g.player.row * CELL + CELL / 2;
      ctx.moveTo(px, py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Player
    const plx = g.player.col * CELL + CELL / 2;
    const ply = g.player.row * CELL + CELL / 2;
    ctx.fillStyle = "#00aaff";
    ctx.shadowColor = "#00aaff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(plx, ply, CELL / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    // Helmet
    ctx.fillStyle = "#ff4400";
    ctx.shadowColor = "#ff4400";
    ctx.beginPath();
    ctx.arc(plx, ply - 3, CELL / 2 - 8, Math.PI, 0);
    ctx.fill();
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 12px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    const alive = g.enemies.filter((e) => e.alive).length;
    ctx.fillText(`SCORE: ${g.score}`, 4, 20);
    ctx.fillText(`ENEMIES: ${alive}`, W / 2 - 30, 20);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g || !g.running) return;
    const keys = keysRef.current;
    g.tick++;

    // Player movement every 6 ticks
    if (g.tick % 6 === 0) {
      let nc = g.player.col;
      let nr = g.player.row;
      if (keys.has("ArrowLeft")) {
        nc--;
        g.player.dir = "left";
      } else if (keys.has("ArrowRight")) {
        nc++;
        g.player.dir = "right";
      } else if (keys.has("ArrowUp")) {
        nr--;
        g.player.dir = "up";
      } else if (keys.has("ArrowDown")) {
        nr++;
        g.player.dir = "down";
      }
      if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
        g.player.col = nc;
        g.player.row = nr;
        // Dig tunnel
        if (!g.tunnels.some((t) => t.col === nc && t.row === nr)) {
          g.tunnels.push({ col: nc, row: nr });
        }
      }
    }

    // Pump action
    if (keys.has(" ") && !g.pump) {
      const dirs: Record<string, [number, number]> = {
        right: [1, 0],
        left: [-1, 0],
        up: [0, -1],
        down: [0, 1],
      };
      const [dx, dy] = dirs[g.player.dir] ?? [1, 0];
      g.pump = {
        x: g.player.col * CELL + CELL / 2 + (dx * CELL) / 2,
        y: g.player.row * CELL + CELL / 2 + (dy * CELL) / 2,
        dx,
        dy,
        alive: true,
        target: null,
        charge: 0,
      };
    }

    // Move pump
    if (g.pump?.alive) {
      g.pump.x += g.pump.dx * 4;
      g.pump.y += g.pump.dy * 4;
      g.pump.charge++;
      if (g.pump.charge > 30) {
        g.pump.alive = false;
        g.pump = null;
      } else {
        // Hit enemy
        for (const e of g.enemies) {
          if (!e.alive) continue;
          const ex = e.col * CELL + CELL / 2;
          const ey = e.row * CELL + CELL / 2;
          if (
            g.pump &&
            Math.abs(g.pump.x - ex) < CELL &&
            Math.abs(g.pump.y - ey) < CELL
          ) {
            e.inflated++;
            g.pump.alive = false;
            g.pump = null;
            if (e.inflated >= 5) {
              e.alive = false;
              g.score += 200;
            }
            break;
          }
        }
      }
    }
    if (!keys.has(" ") && g.pump) {
      g.pump.alive = false;
      g.pump = null;
    }

    // Enemy movement every 20 ticks, only through tunnels
    if (g.tick % 20 === 0) {
      for (const e of g.enemies) {
        if (!e.alive) continue;
        // Move toward player through tunnels
        const dc = g.player.col - e.col;
        const dr = g.player.row - e.row;
        const dirs: [number, number][] = [];
        if (dc > 0) dirs.push([1, 0]);
        else if (dc < 0) dirs.push([-1, 0]);
        if (dr > 0) dirs.push([0, 1]);
        else if (dr < 0) dirs.push([0, -1]);
        for (const [dc2, dr2] of dirs) {
          const nc = e.col + dc2;
          const nr = e.row + dr2;
          if (
            nc >= 0 &&
            nc < COLS &&
            nr >= 0 &&
            nr < ROWS &&
            g.tunnels.some((t) => t.col === nc && t.row === nr)
          ) {
            e.col = nc;
            e.row = nr;
            break;
          }
        }
        // Deflate slowly
        if (e.inflated > 0 && g.tick % 40 === 0) e.inflated--;
        // Catch player
        if (e.col === g.player.col && e.row === g.player.row) {
          endGame(false);
          return;
        }
      }
    }

    // Win check
    if (g.enemies.every((e) => !e.alive)) {
      endGame(true);
      return;
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, endGame]);

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    const enemies: Enemy[] = [];
    for (let i = 0; i < 6; i++) {
      enemies.push({
        col: 2 + Math.floor(Math.random() * (COLS - 4)),
        row: 2 + Math.floor(Math.random() * (ROWS - 4)),
        alive: true,
        vx: 0,
        vy: 0,
        inflated: 0,
      });
    }
    gameRef.current = {
      player: {
        col: Math.floor(COLS / 2),
        row: 0,
        dir: "right",
        pumping: false,
      },
      enemies,
      tunnels: [{ col: Math.floor(COLS / 2), row: 0 }],
      pump: null,
      running: true,
      score: 0,
      tick: 0,
      moveTick: 0,
    };
    setPhase("playing");
    setTimeout(() => {
      rafRef.current = requestAnimationFrame(gameLoop);
    }, 50);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (
        [" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      )
        e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const handleTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const tx = (e.touches[0].clientX - rect.left) * (W / rect.width);
    const ty = (e.touches[0].clientY - rect.top) * (H / rect.height);
    const dc = tx < W / 2 ? -1 : 1;
    const dr = ty < H / 2 ? -1 : 1;
    const nc = g.player.col + dc;
    const nr = g.player.row + dr;
    if (nc >= 0 && nc < COLS) g.player.col = nc;
    if (nr >= 0 && nr < ROWS) g.player.row = nr;
  };

  const handleTap = () => {
    const g = gameRef.current;
    if (!g || g.pump) return;
    const dirs: Record<string, [number, number]> = {
      right: [1, 0],
      left: [-1, 0],
      up: [0, -1],
      down: [0, 1],
    };
    const [dx, dy] = dirs[g.player.dir] ?? [1, 0];
    g.pump = {
      x: g.player.col * CELL + CELL / 2 + (dx * CELL) / 2,
      y: g.player.row * CELL + CELL / 2 + (dy * CELL) / 2,
      dx,
      dy,
      alive: true,
      target: null,
      charge: 0,
    };
  };

  return (
    <ArcadeCabinet title="⛏️ DIG DUG" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          DIG TUNNELS · INFLATE ALL ENEMIES TO WIN 2x
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
                          background: "rgba(20,10,0,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="digdug.quickbet.button"
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
                background: "rgba(15,8,0,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="digdug.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #cc6600)`,
                color: "#000",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="digdug.play_button"
            >
              INSERT COIN &mdash; PLAY FOR {bet}
            </Button>
          </div>
        )}
        {phase === "playing" && (
          <div className="space-y-3">
            <div
              className="text-xs text-center font-black"
              style={{ fontFamily: "monospace", color: `${HEX_COLOR}80` }}
            >
              ARROW KEYS MOVE/DIG · HOLD SPACE PUMP · TAP MOBILE
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
                onTouchMove={handleTouch}
                onTouchStart={handleTap}
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
              <div className="text-6xl">{won ? "🎉" : "💀"}</div>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won ? `+${winAmount} CREDITS!` : "CAUGHT!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: HEX_COLOR,
                  color: "#000",
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                }}
                data-ocid="digdug.play_again_button"
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
