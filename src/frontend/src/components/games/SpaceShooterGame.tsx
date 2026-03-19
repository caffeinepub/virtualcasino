import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.62 0.22 240)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 360;
const H = 500;
type Phase = "bet" | "playing" | "result";

interface Entity {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
}
interface Bullet extends Entity {
  vy: number;
}
interface Enemy extends Entity {
  vx: number;
  vy: number;
}

const ENEMY_ROWS = 3;
const ENEMY_COLS = 8;

function makeEnemies(): Enemy[] {
  const enemies: Enemy[] = [];
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      enemies.push({
        x: 30 + c * 40,
        y: 30 + r * 40,
        w: 28,
        h: 20,
        alive: true,
        vx: 1,
        vy: 0,
      });
    }
  }
  return enemies;
}

export default function SpaceShooterGame({
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
    player: { x: number; y: number };
    bullets: Bullet[];
    enemies: Enemy[];
    score: number;
    lives: number;
    running: boolean;
    keys: Set<string>;
    shootCooldown: number;
    enemyDir: number;
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
          gameType: GameType.spaceShooter,
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

    if (g.keys.has("ArrowLeft") || g.keys.has("a"))
      g.player.x = Math.max(0, g.player.x - 4);
    if (g.keys.has("ArrowRight") || g.keys.has("d"))
      g.player.x = Math.min(W - 30, g.player.x + 4);
    if ((g.keys.has(" ") || g.keys.has("ArrowUp")) && g.shootCooldown <= 0) {
      g.bullets.push({
        x: g.player.x + 11,
        y: g.player.y,
        w: 4,
        h: 12,
        alive: true,
        vy: -8,
      });
      g.shootCooldown = 15;
    }
    if (g.shootCooldown > 0) g.shootCooldown--;

    g.bullets = g.bullets.filter((b) => b.alive && b.y > -20);
    for (const b of g.bullets) {
      b.y += b.vy;
    }

    let hitWall = false;
    const aliveEnemies = g.enemies.filter((e) => e.alive);
    for (const e of aliveEnemies) {
      e.x += g.enemyDir * 1.5;
      if (e.x <= 0 || e.x + e.w >= W) hitWall = true;
    }
    if (hitWall) {
      g.enemyDir *= -1;
      for (const e of aliveEnemies) {
        e.y += 15;
      }
    }

    if (aliveEnemies.some((e) => e.y + e.h >= H - 60)) {
      endGame(g.score, false);
      return;
    }

    for (const b of g.bullets) {
      for (const e of g.enemies) {
        if (!e.alive || !b.alive) continue;
        if (
          b.x < e.x + e.w &&
          b.x + b.w > e.x &&
          b.y < e.y + e.h &&
          b.y + b.h > e.y
        ) {
          e.alive = false;
          b.alive = false;
          g.score++;
          setScore(g.score);
        }
      }
    }

    if (!g.enemies.some((e) => e.alive)) {
      endGame(g.score, true);
      return;
    }

    if (Math.random() < 0.008 && aliveEnemies.length > 0) {
      const shooter =
        aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      if (Math.abs(shooter.x - g.player.x) < 50) {
        g.lives--;
        setLives(g.lives);
        if (g.lives <= 0) {
          endGame(g.score, false);
          return;
        }
      }
    }

    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 37 + g.score * 2) % W, (i * 53 + g.score) % H, 1, 1);
    }
    ctx.fillStyle = "#00aaff";
    ctx.shadowColor = "#00aaff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(g.player.x + 15, g.player.y);
    ctx.lineTo(g.player.x, g.player.y + 30);
    ctx.lineTo(g.player.x + 30, g.player.y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffff00";
    ctx.shadowColor = "#ffff00";
    ctx.shadowBlur = 6;
    for (const b of g.bullets.filter((b2) => b2.alive)) {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.shadowBlur = 0;
    for (const e of g.enemies.filter((e2) => e2.alive)) {
      ctx.fillStyle = "#ff4488";
      ctx.shadowColor = "#ff4488";
      ctx.shadowBlur = 6;
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 0;
      ctx.font = "12px monospace";
      ctx.fillText("👾", e.x + 4, e.y + 14);
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Score: ${g.score}`, 10, H - 10);
    ctx.fillText(`Lives: ${"❤".repeat(g.lives)}`, W - 100, H - 10);

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
    gameRef.current = {
      player: { x: W / 2 - 15, y: H - 60 },
      bullets: [],
      enemies: makeEnemies(),
      score: 0,
      lives: 3,
      running: true,
      keys: new Set(),
      shootCooldown: 0,
      enemyDir: 1,
    };
    setScore(0);
    setLives(3);
    setPhase("playing");
    setTimeout(loop, 50);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      gameRef.current?.keys.add(e.key);
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      gameRef.current?.keys.delete(e.key);
    };
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

  const mobileShoot = () => {
    if (gameRef.current) {
      gameRef.current.bullets.push({
        x: gameRef.current.player.x + 11,
        y: gameRef.current.player.y,
        w: 4,
        h: 12,
        alive: true,
        vy: -8,
      });
    }
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "oklch(0.11 0.015 280)",
        border: `1px solid ${COLOR}40`,
      }}
    >
      <h2
        className="text-2xl font-black tracking-widest mb-2"
        style={{ color: COLOR }}
      >
        🚀 SPACE SHOOTER
      </h2>
      <p className="text-sm text-muted-foreground mb-1">
        Destroy all aliens to win 2x! Arrows + Space to play.
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
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
                      }
                }
                data-ocid="shooter.quickbet.button"
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
            data-ocid="shooter.bet.input"
          />
          <Button
            onClick={startGame}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.25 290))`,
              color: "#fff",
            }}
            data-ocid="shooter.play_button"
          >
            🚀 LAUNCH FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-black">
            <span style={{ color: COLOR }}>Score: {score}</span>
            <span>{"❤".repeat(lives)}</span>
          </div>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="rounded-xl"
              style={{ maxWidth: "100%", border: `2px solid ${COLOR}40` }}
            />
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              onPointerDown={() => {
                if (gameRef.current) gameRef.current.keys.add("ArrowLeft");
              }}
              onPointerUp={() => {
                if (gameRef.current) gameRef.current.keys.delete("ArrowLeft");
              }}
              className="w-16 h-10 font-black"
              style={{ background: "oklch(0.16 0.025 278)" }}
              data-ocid="shooter.left_button"
            >
              ←
            </Button>
            <Button
              size="sm"
              onClick={mobileShoot}
              className="w-20 h-10 font-black"
              style={{ background: "oklch(0.60 0.24 20)" }}
              data-ocid="shooter.fire_button"
            >
              🔥 FIRE
            </Button>
            <Button
              size="sm"
              onPointerDown={() => {
                if (gameRef.current) gameRef.current.keys.add("ArrowRight");
              }}
              onPointerUp={() => {
                if (gameRef.current) gameRef.current.keys.delete("ArrowRight");
              }}
              className="w-16 h-10 font-black"
              style={{ background: "oklch(0.16 0.025 278)" }}
              data-ocid="shooter.right_button"
            >
              →
            </Button>
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
            <div className="text-6xl">{won ? "🎆" : "💥"}</div>
            <p className="text-muted-foreground">Enemies destroyed: {score}</p>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won
                ? `+${winAmount} CREDITS!`
                : "Invasion successful — you lost!"}
            </h3>
            <Button
              onClick={() => setPhase("bet")}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="shooter.play_again_button"
            >
              PLAY AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
