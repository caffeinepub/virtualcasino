import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#00ffcc";
const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 400;
const H = 500;
type Phase = "bet" | "playing" | "result";

interface Vec2 {
  x: number;
  y: number;
}
interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alive: boolean;
  points: number[][];
}
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  life: number;
}
interface AsteroidGameState {
  ship: { x: number; y: number; angle: number; vx: number; vy: number };
  asteroids: Asteroid[];
  bullets: Bullet[];
  stars: Vec2[];
  running: boolean;
  invincible: number;
  lives: number;
  score: number;
  wave: number;
}

function randAsteroid(size: number): Asteroid {
  const r = size;
  const pts: number[][] = [];
  const sides = 7 + Math.floor(Math.random() * 4);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const dist = r * (0.7 + Math.random() * 0.3);
    pts.push([Math.cos(angle) * dist, Math.sin(angle) * dist]);
  }
  return {
    x: Math.random() * W,
    y: Math.random() * H * 0.4,
    vx: (Math.random() - 0.5) * 2,
    vy: Math.random() * 1.5 + 0.5,
    r,
    alive: true,
    points: pts,
  };
}

function doSpawnWave(g: AsteroidGameState) {
  const count = 4 + g.wave;
  g.asteroids = Array.from({ length: count }, () =>
    randAsteroid(20 + Math.random() * 15),
  );
  for (const a of g.asteroids) {
    if (Math.abs(a.x - W / 2) < 60 && Math.abs(a.y - H / 2) < 60) {
      a.y = Math.random() * 80;
    }
  }
}

export default function AsteroidsGame({
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
  const gameRef = useRef<AsteroidGameState | null>(null);
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
          gameType: GameType.asteroids,
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

    ctx.fillStyle = "#000008";
    ctx.fillRect(0, 0, W, H);

    for (const s of g.stars) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(s.x, s.y, 1, 1);
    }

    ctx.strokeStyle = HEX_COLOR;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    for (const a of g.asteroids) {
      if (!a.alive) continue;
      const pts = a.points;
      ctx.beginPath();
      ctx.moveTo(a.x + pts[0][0], a.y + pts[0][1]);
      for (let i = 1; i < pts.length; i++)
        ctx.lineTo(a.x + pts[i][0], a.y + pts[i][1]);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 6;
    for (const b of g.bullets) {
      if (b.alive) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (g.invincible <= 0 || Math.floor(g.invincible / 4) % 2 === 0) {
      const { x, y, angle } = g.ship;
      ctx.strokeStyle = "#00d4ff";
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16);
      ctx.lineTo(
        x + Math.cos(angle + 2.4) * 12,
        y + Math.sin(angle + 2.4) * 12,
      );
      ctx.lineTo(
        x + Math.cos(angle + Math.PI) * 6,
        y + Math.sin(angle + Math.PI) * 6,
      );
      ctx.lineTo(
        x + Math.cos(angle - 2.4) * 12,
        y + Math.sin(angle - 2.4) * 12,
      );
      ctx.closePath();
      ctx.stroke();
      if (keysRef.current.has("ArrowUp")) {
        ctx.strokeStyle = "#ff6600";
        ctx.shadowColor = "#ff6600";
        ctx.beginPath();
        ctx.moveTo(
          x + Math.cos(angle + 2.6) * 10,
          y + Math.sin(angle + 2.6) * 10,
        );
        ctx.lineTo(
          x + Math.cos(angle + Math.PI) * (12 + Math.random() * 8),
          y + Math.sin(angle + Math.PI) * (12 + Math.random() * 8),
        );
        ctx.lineTo(
          x + Math.cos(angle - 2.6) * 10,
          y + Math.sin(angle - 2.6) * 10,
        );
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 12px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    ctx.fillText(`SCORE: ${g.score}`, 8, 20);
    ctx.fillText(`LIVES: ${"\u2666".repeat(g.lives)}`, W / 2 - 30, 20);
    ctx.fillText(`WAVE ${g.wave}`, W - 70, 20);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g || !g.running) return;
    const keys = keysRef.current;

    if (keys.has("ArrowLeft")) g.ship.angle -= 0.06;
    if (keys.has("ArrowRight")) g.ship.angle += 0.06;
    if (keys.has("ArrowUp")) {
      g.ship.vx += Math.cos(g.ship.angle) * 0.2;
      g.ship.vy += Math.sin(g.ship.angle) * 0.2;
    }
    g.ship.vx *= 0.98;
    g.ship.vy *= 0.98;
    const spd = Math.sqrt(g.ship.vx ** 2 + g.ship.vy ** 2);
    if (spd > 6) {
      g.ship.vx = (g.ship.vx / spd) * 6;
      g.ship.vy = (g.ship.vy / spd) * 6;
    }
    g.ship.x = (g.ship.x + g.ship.vx + W) % W;
    g.ship.y = (g.ship.y + g.ship.vy + H) % H;
    if (g.invincible > 0) g.invincible--;

    for (const a of g.asteroids) {
      if (!a.alive) continue;
      a.x = (a.x + a.vx + W) % W;
      a.y = (a.y + a.vy + H) % H;
    }
    for (const b of g.bullets) {
      if (!b.alive) continue;
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || b.life <= 0)
        b.alive = false;
    }
    for (const b of g.bullets) {
      if (!b.alive) continue;
      for (const a of g.asteroids) {
        if (!a.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.sqrt(dx * dx + dy * dy) < a.r) {
          b.alive = false;
          a.alive = false;
          g.score += a.r > 25 ? 20 : 50;
        }
      }
    }
    if (g.invincible <= 0) {
      for (const a of g.asteroids) {
        if (!a.alive) continue;
        const dx = g.ship.x - a.x;
        const dy = g.ship.y - a.y;
        if (Math.sqrt(dx * dx + dy * dy) < a.r + 10) {
          g.lives--;
          g.invincible = 120;
          if (g.lives <= 0) {
            endGame(false);
            return;
          }
          break;
        }
      }
    }
    if (g.asteroids.every((a) => !a.alive)) {
      g.wave++;
      if (g.wave > 3) {
        endGame(true);
        return;
      }
      doSpawnWave(g);
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
    const g: AsteroidGameState = {
      ship: { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 },
      asteroids: [],
      bullets: [],
      stars: Array.from({ length: 80 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
      })),
      running: true,
      invincible: 60,
      lives: 3,
      score: 0,
      wave: 1,
    };
    doSpawnWave(g);
    gameRef.current = g;
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
    const shoot = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      const g = gameRef.current;
      if (!g) return;
      g.bullets.push({
        x: g.ship.x + Math.cos(g.ship.angle) * 16,
        y: g.ship.y + Math.sin(g.ship.angle) * 16,
        vx: Math.cos(g.ship.angle) * 8 + g.ship.vx,
        vy: Math.sin(g.ship.angle) * 8 + g.ship.vy,
        alive: true,
        life: 60,
      });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keydown", shoot);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keydown", shoot);
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
    if (tx < W / 3) g.ship.angle -= 0.1;
    else if (tx > (W * 2) / 3) g.ship.angle += 0.1;
    else {
      g.ship.vx += Math.cos(g.ship.angle) * 0.4;
      g.ship.vy += Math.sin(g.ship.angle) * 0.4;
    }
  };

  const handleTap = () => {
    const g = gameRef.current;
    if (!g) return;
    g.bullets.push({
      x: g.ship.x + Math.cos(g.ship.angle) * 16,
      y: g.ship.y + Math.sin(g.ship.angle) * 16,
      vx: Math.cos(g.ship.angle) * 8 + g.ship.vx,
      vy: Math.sin(g.ship.angle) * 8 + g.ship.vy,
      alive: true,
      life: 60,
    });
  };

  return (
    <ArcadeCabinet title="\u2604\ufe0f ASTEROIDS" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          CLEAR 3 WAVES TO WIN 2x &middot; 3 LIVES
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
                          background: "rgba(0,20,15,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="asteroids.quickbet.button"
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
                background: "rgba(0,15,10,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="asteroids.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #00aa88)`,
                color: "#000",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="asteroids.play_button"
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
              &larr; &rarr; ROTATE &bull; &uarr; THRUST &bull; SPACE SHOOT
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
                {won ? `+${winAmount} CREDITS!` : "SHIP DESTROYED!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: HEX_COLOR,
                  color: "#000",
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                }}
                data-ocid="asteroids.play_again_button"
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
