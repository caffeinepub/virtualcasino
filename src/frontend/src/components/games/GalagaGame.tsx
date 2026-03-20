import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#ff6600";
const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 400;
const H = 500;
type Phase = "bet" | "playing" | "result";

interface Entity {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
}
interface Bullet {
  x: number;
  y: number;
  vy: number;
  alive: boolean;
}

export default function GalagaGame({
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
    aliens: Entity[];
    playerBullets: Bullet[];
    alienBullets: Bullet[];
    alienDir: number;
    alienSpeed: number;
    running: boolean;
    shootCooldown: number;
    alienShootTimer: number;
    stars: { x: number; y: number; b: number }[];
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
          gameType: GameType.galaga,
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

    // Stars
    for (const s of g.stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.b})`;
      ctx.fillRect(s.x, s.y, 1, 1);
    }

    // Aliens
    for (const a of g.aliens) {
      if (!a.alive) continue;
      ctx.fillStyle = HEX_COLOR;
      ctx.shadowColor = HEX_COLOR;
      ctx.shadowBlur = 6;
      // Bug-like alien body
      ctx.beginPath();
      ctx.ellipse(
        a.x + a.w / 2,
        a.y + a.h / 2,
        a.w / 2,
        a.h / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#000";
      ctx.shadowBlur = 0;
      ctx.fillRect(a.x + 6, a.y + 6, 4, 4);
      ctx.fillRect(a.x + a.w - 10, a.y + 6, 4, 4);
      // Wings
      ctx.fillStyle = `${HEX_COLOR}80`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + a.h / 2);
      ctx.lineTo(a.x - 8, a.y + 4);
      ctx.lineTo(a.x, a.y + 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(a.x + a.w, a.y + a.h / 2);
      ctx.lineTo(a.x + a.w + 8, a.y + 4);
      ctx.lineTo(a.x + a.w, a.y + 4);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Player bullets
    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 6;
    for (const b of g.playerBullets) {
      if (b.alive) ctx.fillRect(b.x - 2, b.y, 4, 12);
    }
    // Alien bullets
    ctx.fillStyle = "#ff0044";
    ctx.shadowColor = "#ff0044";
    for (const b of g.alienBullets) {
      if (b.alive) ctx.fillRect(b.x - 2, b.y, 4, 10);
    }
    ctx.shadowBlur = 0;

    // Player ship
    const px = g.player.x;
    const py = H - 50;
    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 20, py + 35);
    ctx.lineTo(px - 8, py + 28);
    ctx.lineTo(px, py + 32);
    ctx.lineTo(px + 8, py + 28);
    ctx.lineTo(px + 20, py + 35);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // HUD
    const alive = g.aliens.filter((a) => a.alive).length;
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 12px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    ctx.fillText(`ALIENS: ${alive}/20`, 8, 20);
    ctx.fillText("DESTROY ALL TO WIN 2x", W / 2 - 72, 20);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g || !g.running) return;

    // Move player
    if (keysRef.current.has("ArrowLeft") && g.player.x > 20) g.player.x -= 4;
    if (keysRef.current.has("ArrowRight") && g.player.x < W - 20)
      g.player.x += 4;

    // Shoot
    if (keysRef.current.has(" ") && g.shootCooldown <= 0) {
      g.playerBullets.push({ x: g.player.x, y: H - 55, vy: -10, alive: true });
      g.shootCooldown = 12;
    }
    if (g.shootCooldown > 0) g.shootCooldown--;

    // Move aliens
    let hitWall = false;
    for (const a of g.aliens) {
      if (!a.alive) continue;
      a.x += g.alienDir * g.alienSpeed;
      if (a.x <= 0 || a.x + a.w >= W) hitWall = true;
      if (a.y + a.h >= H - 60) {
        endGame(false);
        return;
      }
    }
    if (hitWall) {
      g.alienDir *= -1;
      for (const a of g.aliens) {
        if (a.alive) a.y += 10;
      }
    }

    // Alien shooting
    g.alienShootTimer--;
    if (g.alienShootTimer <= 0) {
      const alive = g.aliens.filter((a) => a.alive);
      if (alive.length > 0) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        g.alienBullets.push({
          x: shooter.x + shooter.w / 2,
          y: shooter.y + shooter.h,
          vy: 5,
          alive: true,
        });
      }
      g.alienShootTimer = 40 + Math.floor(Math.random() * 30);
    }

    // Move bullets
    for (const b of g.playerBullets) {
      if (b.alive) {
        b.y += b.vy;
        if (b.y < 0) b.alive = false;
      }
    }
    for (const b of g.alienBullets) {
      if (b.alive) {
        b.y += b.vy;
        if (b.y > H) b.alive = false;
      }
    }

    // Collisions: player bullets vs aliens
    for (const b of g.playerBullets) {
      if (!b.alive) continue;
      for (const a of g.aliens) {
        if (!a.alive) continue;
        if (b.x > a.x && b.x < a.x + a.w && b.y > a.y && b.y < a.y + a.h) {
          b.alive = false;
          a.alive = false;
        }
      }
    }

    // Alien bullets vs player
    const px = g.player.x;
    const py = H - 50;
    for (const b of g.alienBullets) {
      if (!b.alive) continue;
      if (Math.abs(b.x - px) < 18 && b.y > py && b.y < py + 35) {
        endGame(false);
        return;
      }
    }

    // Win check
    if (g.aliens.every((a) => !a.alive)) {
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

    const aliens: Entity[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        aliens.push({
          x: 40 + col * 68,
          y: 40 + row * 40,
          w: 28,
          h: 22,
          alive: true,
        });
      }
    }
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      b: Math.random() * 0.8 + 0.2,
    }));

    gameRef.current = {
      player: { x: W / 2, y: H - 50 },
      aliens,
      playerBullets: [],
      alienBullets: [],
      alienDir: 1,
      alienSpeed: 1.2,
      running: true,
      shootCooldown: 0,
      alienShootTimer: 60,
      stars,
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

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (W / rect.width);
    if (x < W / 2) g.player.x = Math.max(20, g.player.x - 6);
    else g.player.x = Math.min(W - 20, g.player.x + 6);
  };

  const handleCanvasTap = () => {
    const g = gameRef.current;
    if (!g || g.shootCooldown > 0) return;
    g.playerBullets.push({ x: g.player.x, y: H - 55, vy: -10, alive: true });
    g.shootCooldown = 12;
  };

  return (
    <ArcadeCabinet title="🛸 GALAGA" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          DESTROY ALL 20 ALIENS TO WIN 2x
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
                          background: "rgba(30,15,0,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="galaga.quickbet.button"
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
                background: "rgba(20,10,0,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="galaga.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #cc4400)`,
                color: "#000",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="galaga.play_button"
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
              ← → MOVE &bull; SPACE SHOOT &bull; TAP CANVAS MOBILE
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
                onTouchMove={handleCanvasTouch}
                onTouchStart={handleCanvasTap}
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
              <div className="text-6xl">{won ? "🎉" : "💥"}</div>
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
                data-ocid="galaga.play_again_button"
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
