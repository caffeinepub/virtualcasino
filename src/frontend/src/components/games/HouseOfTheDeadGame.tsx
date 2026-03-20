import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 280;
const H = 180;
const ROUND_TIME = 30;
const WIN_KILLS = 15;

type Phase = "bet" | "playing" | "result";
type Zombie = {
  x: number;
  y: number;
  size: number;
  hp: number;
  speed: number;
  id: number;
  hitFlash: number;
  dead: boolean;
};

export default function HouseOfTheDeadGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({
    running: false,
    startTime: 0,
    tick: 0,
    kills: 0,
    ammo: 12,
    reloading: false,
    reloadTimer: 0,
    zombies: [] as Zombie[],
    nextId: 0,
    crosshair: { x: W / 2, y: H / 2 },
    muzzleFlash: 0,
    shots: [] as { x: number; y: number; life: number }[],
  });
  const animRef = useRef<number | null>(null);

  const endGame = useCallback(
    async (didWin: boolean) => {
      if (!gameRef.current.running) return;
      gameRef.current.running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.houseOfTheDead,
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

  const shoot = useCallback((cx: number, cy: number) => {
    const g = gameRef.current;
    if (!g.running || g.reloading || g.ammo <= 0) return;
    g.ammo--;
    g.muzzleFlash = 5;
    g.shots.push({ x: cx, y: cy, life: 8 });
    for (const z of g.zombies) {
      if (z.dead) continue;
      const dx = cx - z.x;
      const dy = cy - z.y;
      if (Math.sqrt(dx * dx + dy * dy) < z.size) {
        z.hp--;
        z.hitFlash = 6;
        if (z.hp <= 0) {
          z.dead = true;
          g.kills++;
        }
      }
    }
    if (g.ammo <= 0) {
      g.reloading = true;
      g.reloadTimer = 90;
    }
  }, []);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Background - haunted house
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    // Moonlit sky
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    sky.addColorStop(0, "#050520");
    sky.addColorStop(1, "#1a1a2a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.6);

    // Moon
    ctx.fillStyle = "#ffffcc";
    ctx.shadowColor = "#ffffcc";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(W - 40, 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1a1a2a";
    ctx.beginPath();
    ctx.arc(W - 35, 28, 15, 0, Math.PI * 2);
    ctx.fill();

    // House silhouette
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(50, 40, 80, 80);
    ctx.beginPath();
    ctx.moveTo(40, 40);
    ctx.lineTo(90, 10);
    ctx.lineTo(140, 40);
    ctx.fill();
    // Windows (glowing)
    ctx.fillStyle = "#ffcc0033";
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = 8;
    ctx.fillRect(65, 60, 20, 20);
    ctx.fillRect(100, 60, 20, 20);
    ctx.shadowBlur = 0;

    // Dead trees
    ctx.strokeStyle = "#1a0a0a";
    ctx.lineWidth = 3;
    for (const [tx, ty] of [
      [20, 60],
      [220, 50],
      [250, 70],
    ]) {
      ctx.beginPath();
      ctx.moveTo(tx, H * 0.8);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx, ty + 15);
      ctx.lineTo(tx - 15, ty);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx, ty + 15);
      ctx.lineTo(tx + 15, ty);
      ctx.stroke();
    }

    // Ground
    ctx.fillStyle = "#0f1a0f";
    ctx.fillRect(0, H * 0.75, W, H * 0.25);

    // Zombies
    for (const z of g.zombies) {
      if (z.dead) continue;
      ctx.save();
      ctx.translate(z.x, z.y);
      const zColor = z.hitFlash > 0 ? "#ffffff" : "#44aa44";
      // Body
      ctx.fillStyle = zColor;
      ctx.fillRect(-z.size * 0.4, -z.size, z.size * 0.8, z.size * 1.2);
      // Head
      ctx.beginPath();
      ctx.arc(0, -z.size * 1.1, z.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(-z.size * 0.15, -z.size * 1.15, z.size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(z.size * 0.15, -z.size * 1.15, z.size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      // Arms outstretched
      ctx.strokeStyle = zColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-z.size * 0.4, -z.size * 0.5);
      ctx.lineTo(-z.size * 1.0, -z.size * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(z.size * 0.4, -z.size * 0.5);
      ctx.lineTo(z.size * 1.0, -z.size * 0.2);
      ctx.stroke();
      // HP bar
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(-z.size, -z.size * 1.7, z.size * 2, 4);
      ctx.fillStyle = "#44ff44";
      ctx.fillRect(-z.size, -z.size * 1.7, z.size * 2 * (z.hp / 3), 4);
      ctx.restore();
      if (z.hitFlash > 0) z.hitFlash--;
    }

    // Muzzle flash
    if (g.muzzleFlash > 0) {
      ctx.fillStyle = "rgba(255,200,0,0.8)";
      ctx.shadowColor = "#ffcc00";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(W / 2, H - 10, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      g.muzzleFlash--;
    }

    // Shot effects
    for (const s of g.shots) {
      ctx.fillStyle = `rgba(255,220,0,${s.life / 8})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.fill();
      s.life--;
    }
    g.shots = g.shots.filter((s) => s.life > 0);

    // Crosshair
    const cx = g.crosshair.x;
    const cy = g.crosshair.y;
    ctx.strokeStyle = "rgba(255,50,50,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, 16);
    const elapsed = (Date.now() - g.startTime) / 1000;
    const rem = Math.max(0, ROUND_TIME - elapsed);
    ctx.fillStyle = rem < 8 ? "#ff4444" : "#ffff00";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`⏱ ${Math.ceil(rem)}s  🔫 ${g.ammo}`, 5, 12);
    ctx.textAlign = "right";
    ctx.fillStyle = "#44ff88";
    ctx.fillText(`KILLS: ${g.kills}/${WIN_KILLS}`, W - 5, 12);
    if (g.reloading) {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(W / 2 - 40, H / 2 - 10, 80, 20);
      ctx.fillStyle = "#ffff00";
      ctx.textAlign = "center";
      ctx.fillText("RELOADING...", W / 2, H / 2 + 4);
    }
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameRef.current.running) return;
    const g = gameRef.current;
    g.tick++;

    if (g.reloading) {
      g.reloadTimer--;
      if (g.reloadTimer <= 0) {
        g.reloading = false;
        g.ammo = 12;
      }
    }

    // Spawn zombies
    if (g.tick % 40 === 0 && g.zombies.filter((z) => !z.dead).length < 5) {
      const side = Math.random() < 0.5;
      g.zombies.push({
        x: side ? 20 : W - 20,
        y: H * 0.6 + Math.random() * H * 0.2,
        size: 14 + Math.random() * 8,
        hp: 3,
        speed: 0.5 + Math.random() * 1,
        id: g.nextId++,
        hitFlash: 0,
        dead: false,
      });
    }

    // Move zombies
    for (const z of g.zombies) {
      if (z.dead) continue;
      z.x += (W / 2 - z.x > 0 ? 1 : -1) * z.speed;
      z.y += H * 0.75 - z.y > 0 ? 0.3 : -0.3;
    }
    g.zombies = g.zombies.filter(
      (z) => !(z.dead && g.tick % 5 === 0 && Math.random() < 0.3),
    );
    // Zombie reaches player
    for (const z of g.zombies) {
      if (!z.dead && Math.abs(z.x - W / 2) < 15 && z.y > H * 0.7) {
        endGame(false);
        return;
      }
    }

    const elapsed = (Date.now() - g.startTime) / 1000;
    if (g.kills >= WIN_KILLS) {
      endGame(true);
      return;
    }
    if (elapsed >= ROUND_TIME) {
      endGame(g.kills >= WIN_KILLS);
      return;
    }

    drawGame();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawGame, endGame]);

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    gameRef.current = {
      running: true,
      startTime: Date.now(),
      tick: 0,
      kills: 0,
      ammo: 12,
      reloading: false,
      reloadTimer: 0,
      zombies: [],
      nextId: 0,
      crosshair: { x: W / 2, y: H / 2 },
      muzzleFlash: 0,
      shots: [],
    };
    setPhase("playing");
    animRef.current = requestAnimationFrame(gameLoop);
  }, [betNum, balance, gameLoop]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      shoot(cx, cy);
    },
    [shoot],
  );

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      gameRef.current.crosshair = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const handleCanvasTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const t = e.changedTouches[0];
      const cx = (t.clientX - rect.left) * scaleX;
      const cy = (t.clientY - rect.top) * scaleY;
      gameRef.current.crosshair = { x: cx, y: cy };
      shoot(cx, cy);
    },
    [shoot],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        gameRef.current.reloading = true;
        gameRef.current.reloadTimer = 90;
        gameRef.current.ammo = 0;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  useEffect(
    () => () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  return (
    <ArcadeCabinet title="HOUSE OF THE DEAD" color="#44ff44">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#44ff44", textShadow: "0 0 10px #44ff44" }}
            >
              SHOOT THE ZOMBIES!
            </div>
            <div className="text-sm opacity-70 mt-1">
              Click/tap to aim and shoot. Kill {WIN_KILLS} zombies in{" "}
              {ROUND_TIME}s to win 2×! R to reload.
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
                    ? {
                        background: "#44ff44",
                        borderColor: "#44ff44",
                        color: "#000",
                      }
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-green-400"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #44ff44, #008800)",
              color: "#000",
              boxShadow: "0 0 20px #44ff4450",
            }}
          >
            🔫 SHOOT FOR {betNum} CREDITS
          </Button>
        </div>
      )}
      {phase === "playing" && (
        <div>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{
              display: "block",
              margin: "0 auto",
              maxWidth: "100%",
              cursor: "crosshair",
            }}
            onClick={handleCanvasClick}
            onKeyDown={() => {}}
            onMouseMove={handleCanvasMove}
            onTouchStart={handleCanvasTouch}
          />
          <div
            className="text-center text-xs opacity-60 pb-1"
            style={{ color: "#44ff44" }}
          >
            Tap/click to shoot • R = reload
          </div>
        </div>
      )}
      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🧟" : "💀"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#44ff44" : "#ff4444" }}
          >
            {won ? "CLEARED!" : "OVERWHELMED!"}
          </div>
          {won && (
            <div style={{ color: "#44ff44" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button
              onClick={onGameComplete}
              style={{ background: "#44ff44", color: "#000" }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
