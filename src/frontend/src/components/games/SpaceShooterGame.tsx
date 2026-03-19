import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#00aaff";
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
  type: number;
}

const ENEMY_ROWS = 3;
const ENEMY_COLS = 8;

function makeEnemies(): Enemy[] {
  const enemies: Enemy[] = [];
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      enemies.push({
        x: 25 + c * 40,
        y: 25 + r * 40,
        w: 28,
        h: 20,
        alive: true,
        vx: 1,
        vy: 0,
        type: r,
      });
    }
  }
  return enemies;
}

// Draw pixel-art style alien based on type
function drawAlien(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  type: number,
) {
  const colors = ["#ff4488", "#ff8844", "#aa44ff"];
  const c = colors[type % 3];
  ctx.fillStyle = c;
  ctx.shadowColor = c;
  ctx.shadowBlur = 8;
  // Body
  ctx.fillRect(x + 6, y + 2, w - 12, h - 6);
  // Head dome
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 4, 7, Math.PI, 0);
  ctx.fill();
  // Legs
  ctx.fillRect(x + 2, y + h - 6, 5, 6);
  ctx.fillRect(x + w - 7, y + h - 6, 5, 6);
  // Middle leg
  ctx.fillRect(x + w / 2 - 2, y + h - 4, 4, 4);
  // Eyes
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 0;
  ctx.fillRect(x + 7, y + 5, 4, 4);
  ctx.fillRect(x + w - 11, y + 5, 4, 4);
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 8, y + 6, 2, 2);
  ctx.fillRect(x + w - 10, y + 6, 2, 2);
  ctx.shadowBlur = 0;
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Cyan fighter ship
  ctx.shadowColor = "#00eeff";
  ctx.shadowBlur = 14;
  // Main hull
  ctx.fillStyle = "#00bbdd";
  ctx.beginPath();
  ctx.moveTo(x + 15, y);
  ctx.lineTo(x + 28, y + 28);
  ctx.lineTo(x + 20, y + 24);
  ctx.lineTo(x + 10, y + 24);
  ctx.lineTo(x + 2, y + 28);
  ctx.closePath();
  ctx.fill();
  // Cockpit
  ctx.fillStyle = "#88ffff";
  ctx.beginPath();
  ctx.arc(x + 15, y + 12, 5, 0, Math.PI * 2);
  ctx.fill();
  // Wings
  ctx.fillStyle = "#0088aa";
  ctx.fillRect(x, y + 20, 8, 6);
  ctx.fillRect(x + 22, y + 20, 8, 6);
  // Engine glow
  ctx.fillStyle = "rgba(0,200,255,0.6)";
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 10;
  ctx.fillRect(x + 10, y + 28, 10, 4);
  ctx.shadowBlur = 0;
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
    explosions: { x: number; y: number; r: number; life: number }[];
    enemies: Enemy[];
    score: number;
    lives: number;
    running: boolean;
    keys: Set<string>;
    shootCooldown: number;
    enemyDir: number;
    starLayers: { x: number; y: number; s: number; sp: number }[][];
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
    g.frame++;

    // Player movement
    if (g.keys.has("ArrowLeft") || g.keys.has("a"))
      g.player.x = Math.max(0, g.player.x - 4);
    if (g.keys.has("ArrowRight") || g.keys.has("d"))
      g.player.x = Math.min(W - 30, g.player.x + 4);
    if ((g.keys.has(" ") || g.keys.has("ArrowUp")) && g.shootCooldown <= 0) {
      g.bullets.push({
        x: g.player.x + 11,
        y: g.player.y,
        w: 4,
        h: 14,
        alive: true,
        vy: -9,
      });
      g.shootCooldown = 15;
    }
    if (g.shootCooldown > 0) g.shootCooldown--;

    g.bullets = g.bullets.filter((b) => b.alive && b.y > -20);
    for (const b of g.bullets) b.y += b.vy;

    // Scroll stars
    for (const layer of g.starLayers) {
      for (const star of layer) {
        star.y += star.sp;
        if (star.y > H) star.y = 0;
      }
    }

    let hitWall = false;
    const aliveEnemies = g.enemies.filter((e) => e.alive);
    for (const e of aliveEnemies) {
      e.x += g.enemyDir * 1.5;
      if (e.x <= 0 || e.x + e.w >= W) hitWall = true;
    }
    if (hitWall) {
      g.enemyDir *= -1;
      for (const e of aliveEnemies) e.y += 15;
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
          // Add explosion
          g.explosions.push({
            x: e.x + e.w / 2,
            y: e.y + e.h / 2,
            r: 0,
            life: 20,
          });
        }
      }
    }

    // Update explosions
    g.explosions = g.explosions.filter((ex) => ex.life > 0);
    for (const ex of g.explosions) {
      ex.r += 2;
      ex.life--;
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

    // Draw deep space background
    ctx.fillStyle = "#000008";
    ctx.fillRect(0, 0, W, H);

    // Stars - 3 layers
    const starColors = [
      "rgba(255,255,255,0.3)",
      "rgba(200,220,255,0.5)",
      "rgba(255,255,255,0.8)",
    ];
    for (let li = 0; li < g.starLayers.length; li++) {
      ctx.fillStyle = starColors[li];
      for (const star of g.starLayers[li]) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Explosions
    for (const ex of g.explosions) {
      const alpha = ex.life / 20;
      const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.r);
      grad.addColorStop(0, `rgba(255,220,0,${alpha})`);
      grad.addColorStop(0.5, `rgba(255,100,0,${alpha * 0.6})`);
      grad.addColorStop(1, "rgba(255,50,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const e of g.enemies.filter((e2) => e2.alive)) {
      drawAlien(ctx, e.x, e.y, e.w, e.h, e.type);
    }

    // Player bullets - neon cyan laser
    for (const b of g.bullets.filter((b2) => b2.alive)) {
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      grad.addColorStop(0, "rgba(0,255,255,0)");
      grad.addColorStop(0.3, "rgba(0,200,255,1)");
      grad.addColorStop(1, "rgba(150,255,255,1)");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;
    }

    // Player ship
    drawPlayer(ctx, g.player.x, g.player.y);

    // HUD
    ctx.fillStyle = "rgba(0,0,20,0.7)";
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 12px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 5;
    ctx.fillText(`SCORE: ${g.score.toString().padStart(3, "0")}`, 8, H - 7);
    ctx.fillStyle = "#ff4444";
    ctx.shadowColor = "#ff4444";
    ctx.fillText(`LIVES: ${"♥ ".repeat(g.lives)}`, W - 100, H - 7);
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

    // Generate star layers
    const starLayers = [
      Array.from({ length: 40 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 0.5,
        sp: 0.3,
      })),
      Array.from({ length: 25 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 1,
        sp: 0.7,
      })),
      Array.from({ length: 10 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 1.5,
        sp: 1.2,
      })),
    ];

    gameRef.current = {
      player: { x: W / 2 - 15, y: H - 70 },
      bullets: [],
      explosions: [],
      enemies: makeEnemies(),
      score: 0,
      lives: 3,
      running: true,
      keys: new Set(),
      shootCooldown: 0,
      enemyDir: 1,
      starLayers,
      frame: 0,
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
        h: 14,
        alive: true,
        vy: -9,
      });
    }
  };

  return (
    <ArcadeCabinet title="🚀 SPACE SHOOTER" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}90`, fontFamily: "monospace" }}
        >
          DESTROY ALL ALIENS TO WIN 2x! ARROWS + SPACE
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
                          background: "rgba(0,20,50,0.7)",
                          color: `${HEX_COLOR}80`,
                          border: `1px solid ${HEX_COLOR}40`,
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
              className="w-full px-4 py-3 rounded-xl text-lg font-bold text-center"
              style={{
                background: "rgba(0,10,30,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="shooter.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #0055aa)`,
                color: "#fff",
                boxShadow: `0 0 20px ${HEX_COLOR}50`,
              }}
              data-ocid="shooter.play_button"
            >
              🚀 LAUNCH FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-2">
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
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                onPointerDown={() => gameRef.current?.keys.add("ArrowLeft")}
                onPointerUp={() => gameRef.current?.keys.delete("ArrowLeft")}
                className="w-16 h-10 font-black"
                style={{
                  background: "rgba(0,20,50,0.8)",
                  border: `1px solid ${HEX_COLOR}40`,
                  color: HEX_COLOR,
                }}
                data-ocid="shooter.left_button"
              >
                ←
              </Button>
              <Button
                size="sm"
                onClick={mobileShoot}
                className="w-20 h-10 font-black"
                style={{
                  background: "linear-gradient(135deg,#ff4400,#ff8800)",
                  color: "#fff",
                }}
                data-ocid="shooter.fire_button"
              >
                🔥 FIRE
              </Button>
              <Button
                size="sm"
                onPointerDown={() => gameRef.current?.keys.add("ArrowRight")}
                onPointerUp={() => gameRef.current?.keys.delete("ArrowRight")}
                className="w-16 h-10 font-black"
                style={{
                  background: "rgba(0,20,50,0.8)",
                  border: `1px solid ${HEX_COLOR}40`,
                  color: HEX_COLOR,
                }}
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
              <p
                className="text-sm"
                style={{ color: `${HEX_COLOR}80`, fontFamily: "monospace" }}
              >
                ENEMIES DESTROYED: {score}
              </p>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won ? `+${winAmount} CREDITS!` : "INVASION SUCCESSFUL!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{ background: HEX_COLOR, color: "#000" }}
                data-ocid="shooter.play_again_button"
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
