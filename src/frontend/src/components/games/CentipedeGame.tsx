import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#88ff00";
const QUICK_BETS = [5, 10, 25, 50, 100];
const COLS = 16;
const ROWS = 18;
const CELL = 24;
const W = COLS * CELL;
const H = ROWS * CELL;
type Phase = "bet" | "playing" | "result";

interface Segment {
  col: number;
  row: number;
  alive: boolean;
}
interface Mushroom {
  col: number;
  row: number;
  hp: number;
}
interface Bullet {
  x: number;
  y: number;
  alive: boolean;
}

function buildCentipede(wave: number): Segment[] {
  const segs: Segment[] = [];
  const len = 8 + wave * 2;
  for (let i = 0; i < len; i++) segs.push({ col: i, row: 0, alive: true });
  return segs;
}

export default function CentipedeGame({
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
    player: { x: number; y: number };
    centipede: Segment[];
    mushrooms: Mushroom[];
    bullets: Bullet[];
    centiDir: number;
    centiTick: number;
    running: boolean;
    score: number;
    shootCooldown: number;
    wave: number;
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
          gameType: GameType.centipede,
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

    ctx.fillStyle = "#010a00";
    ctx.fillRect(0, 0, W, H);

    for (const m of g.mushrooms) {
      const x = m.col * CELL;
      const y = m.row * CELL;
      const alpha = m.hp / 4;
      ctx.fillStyle = `rgba(255,80,0,${alpha})`;
      ctx.shadowColor = "#ff5000";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(180,60,0,${alpha})`;
      ctx.fillRect(x + CELL / 2 - 3, y + CELL / 2, 6, CELL / 2 - 2);
    }

    for (const seg of g.centipede) {
      if (!seg.alive) continue;
      const x = seg.col * CELL + CELL / 2;
      const y = seg.row * CELL + CELL / 2;
      ctx.fillStyle = HEX_COLOR;
      ctx.shadowColor = HEX_COLOR;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x - 4, y - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 4, y - 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 6;
    for (const b of g.bullets) {
      if (b.alive) ctx.fillRect(b.x - 2, b.y, 4, 8);
    }

    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 10;
    const px = g.player.x;
    const py = g.player.y;
    ctx.beginPath();
    ctx.moveTo(px, py - 14);
    ctx.lineTo(px - 10, py + 6);
    ctx.lineTo(px - 4, py + 2);
    ctx.lineTo(px, py + 8);
    ctx.lineTo(px + 4, py + 2);
    ctx.lineTo(px + 10, py + 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 11px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    const alive = g.centipede.filter((s) => s.alive).length;
    ctx.fillText(`SCORE: ${g.score}`, 4, 14);
    ctx.fillText(`LEFT: ${alive}`, W / 2 - 20, 14);
    ctx.fillText(`WAVE ${g.wave}`, W - 60, 14);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g || !g.running) return;
    const keys = keysRef.current;

    if (keys.has("ArrowLeft") && g.player.x > CELL) g.player.x -= 3;
    if (keys.has("ArrowRight") && g.player.x < W - CELL) g.player.x += 3;
    if (keys.has("ArrowUp") && g.player.y > H * 0.65) g.player.y -= 3;
    if (keys.has("ArrowDown") && g.player.y < H - CELL) g.player.y += 3;

    if (keys.has(" ") && g.shootCooldown <= 0) {
      g.bullets.push({ x: g.player.x, y: g.player.y - 16, alive: true });
      g.shootCooldown = 10;
    }
    if (g.shootCooldown > 0) g.shootCooldown--;

    for (const b of g.bullets) {
      if (!b.alive) continue;
      b.y -= 8;
      if (b.y < 0) {
        b.alive = false;
        continue;
      }
      for (const m of g.mushrooms) {
        if (
          Math.abs(b.x - (m.col * CELL + CELL / 2)) < CELL / 2 &&
          Math.abs(b.y - (m.row * CELL + CELL / 2)) < CELL / 2
        ) {
          m.hp--;
          b.alive = false;
          if (m.hp <= 0) g.mushrooms.splice(g.mushrooms.indexOf(m), 1);
          break;
        }
      }
      for (const seg of g.centipede) {
        if (!seg.alive) continue;
        const sx = seg.col * CELL + CELL / 2;
        const sy = seg.row * CELL + CELL / 2;
        if (Math.abs(b.x - sx) < CELL / 2 && Math.abs(b.y - sy) < CELL / 2) {
          seg.alive = false;
          b.alive = false;
          g.score += 10;
          if (g.mushrooms.length < 40)
            g.mushrooms.push({ col: seg.col, row: seg.row, hp: 4 });
          break;
        }
      }
    }

    g.centiTick++;
    const speed = Math.max(4, 12 - g.wave);
    if (g.centiTick >= speed) {
      g.centiTick = 0;
      const alive = g.centipede.filter((s) => s.alive);
      if (alive.length === 0) {
        g.wave++;
        if (g.wave > 3) {
          endGame(true);
          return;
        }
        g.centipede = buildCentipede(g.wave);
      } else {
        const head = alive[0];
        let nextCol = head.col + g.centiDir;
        const blocked =
          nextCol < 0 ||
          nextCol >= COLS ||
          g.mushrooms.some((m) => m.col === nextCol && m.row === head.row);
        if (blocked) {
          nextCol = head.col;
          head.row += 1;
          g.centiDir *= -1;
        }
        for (let i = alive.length - 1; i > 0; i--) {
          alive[i].col = alive[i - 1].col;
          alive[i].row = alive[i - 1].row;
        }
        head.col = nextCol;
        const headX = head.col * CELL + CELL / 2;
        const headY = head.row * CELL + CELL / 2;
        if (
          Math.abs(headX - g.player.x) < CELL &&
          Math.abs(headY - g.player.y) < CELL
        ) {
          endGame(false);
          return;
        }
        if (head.row >= ROWS) {
          endGame(false);
          return;
        }
      }
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
    const mushrooms: Mushroom[] = [];
    for (let i = 0; i < 20; i++) {
      mushrooms.push({
        col: Math.floor(Math.random() * COLS),
        row: 1 + Math.floor(Math.random() * (ROWS - 5)),
        hp: 4,
      });
    }
    gameRef.current = {
      player: { x: W / 2, y: H - CELL * 2 },
      centipede: buildCentipede(1),
      mushrooms,
      bullets: [],
      centiDir: 1,
      centiTick: 0,
      running: true,
      score: 0,
      shootCooldown: 0,
      wave: 1,
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
    if (tx < W / 2) g.player.x = Math.max(CELL, g.player.x - 6);
    else g.player.x = Math.min(W - CELL, g.player.x + 6);
  };

  const handleTap = () => {
    const g = gameRef.current;
    if (!g || g.shootCooldown > 0) return;
    g.bullets.push({ x: g.player.x, y: g.player.y - 16, alive: true });
    g.shootCooldown = 10;
  };

  return (
    <ArcadeCabinet title="\ud83d\udc1b CENTIPEDE" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          CLEAR 3 WAVES TO WIN 2x
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
                          background: "rgba(5,15,0,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="centipede.quickbet.button"
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
                background: "rgba(2,10,0,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="centipede.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #55aa00)`,
                color: "#000",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="centipede.play_button"
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
              ARROW KEYS MOVE &bull; SPACE SHOOT &bull; TAP L/R MOBILE
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
              <div className="text-6xl">
                {won ? "\ud83c\udf89" : "\ud83d\udca5"}
              </div>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won ? `+${winAmount} CREDITS!` : "EXTERMINATED!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: HEX_COLOR,
                  color: "#000",
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                }}
                data-ocid="centipede.play_again_button"
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
