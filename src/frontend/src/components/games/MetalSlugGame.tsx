import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 280;
const H = 200;
const WIN_KILLS = 10;
const GAME_TIME = 60;

type Phase = "bet" | "playing" | "result";

interface Bullet {
  id: number;
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  type: "soldier" | "tank";
  dir: number;
  dead: boolean;
  deadTimer: number;
}

export default function MetalSlugGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [kills, setKills] = useState(0);
  const [_timeLeft, setTimeLeft] = useState(GAME_TIME);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    running: boolean;
    player: { x: number; y: number; facingRight: boolean };
    bullets: Bullet[];
    enemies: Enemy[];
    kills: number;
    bId: number;
    eId: number;
    tick: number;
    startTime: number;
    scrollX: number;
  }>({
    running: false,
    player: { x: 40, y: H - 50, facingRight: true },
    bullets: [],
    enemies: [],
    kills: 0,
    bId: 0,
    eId: 0,
    tick: 0,
    startTime: 0,
    scrollX: 0,
  });
  const animRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endGame = useCallback(
    async (didWin: boolean) => {
      if (!gameRef.current.running) return;
      gameRef.current.running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.metalSlug,
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

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H - 40);
    skyGrad.addColorStop(0, "#1a2a0a");
    skyGrad.addColorStop(1, "#3a4a1a");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = "#4a3010";
    ctx.fillRect(0, H - 40, W, 40);
    ctx.fillStyle = "#5a4020";
    ctx.fillRect(0, H - 40, W, 4);

    // Scrolling background elements
    for (let i = 0; i < 5; i++) {
      const bx =
        ((((i * 120 - g.scrollX * 0.3) % (W + 60)) + W + 60) % (W + 60)) - 60;
      // Tree
      ctx.fillStyle = "#2a5010";
      ctx.fillRect(bx + 10, H - 90, 8, 50);
      ctx.fillStyle = "#3a7020";
      ctx.beginPath();
      ctx.arc(bx + 14, H - 95, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw bullets
    for (const b of g.bullets) {
      ctx.fillStyle = "#ffff00";
      ctx.shadowColor = "#ffff00";
      ctx.shadowBlur = 6;
      ctx.fillRect(b.x - g.scrollX * 0.5, b.y, 8, 3);
      ctx.shadowBlur = 0;
    }

    // Draw enemies
    for (const e of g.enemies) {
      const ex = e.x - g.scrollX * 0.5;
      if (ex < -30 || ex > W + 30) continue;
      if (e.dead) {
        ctx.font = "20px serif";
        ctx.textAlign = "center";
        ctx.globalAlpha = e.deadTimer / 30;
        ctx.fillText("💥", ex, e.y);
        ctx.globalAlpha = 1;
      } else {
        ctx.font = e.type === "tank" ? "24px serif" : "18px serif";
        ctx.textAlign = "center";
        ctx.fillText(e.type === "tank" ? "🚗" : "🪖", ex, e.y + 18);
      }
    }

    // Draw player
    const px = g.player.x;
    ctx.font = "20px serif";
    ctx.textAlign = "center";
    ctx.save();
    if (!g.player.facingRight) {
      ctx.scale(-1, 1);
      ctx.fillText("🧑‍🦱", -px, g.player.y + 18);
    } else {
      ctx.fillText("🧑‍🦱", px, g.player.y + 18);
    }
    ctx.restore();

    // Gun flash when shooting
    if (keysRef.current.has(" ") && g.tick % 6 < 3) {
      ctx.fillStyle = "#ffff0088";
      ctx.shadowColor = "#ffff00";
      ctx.shadowBlur = 12;
      const gx = g.player.facingRight ? px + 14 : px - 14;
      ctx.beginPath();
      ctx.arc(gx, g.player.y + 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, 16);
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`KILLS: ${g.kills}/${WIN_KILLS}`, 4, 12);
    ctx.textAlign = "right";
    const tl = Math.max(
      0,
      GAME_TIME - Math.floor((Date.now() - g.startTime) / 1000),
    );
    ctx.fillText(`⏱ ${tl}s`, W - 4, 12);
  }, []);

  const shoot = useCallback(() => {
    const g = gameRef.current;
    const bid = g.bId++;
    g.bullets.push({
      id: bid,
      x: g.player.x + (g.player.facingRight ? 14 : -14),
      y: g.player.y + 8,
    });
  }, []);

  const gameLoop = useCallback(
    (_timestamp: number) => {
      if (!gameRef.current.running) return;
      const g = gameRef.current;
      g.tick++;

      // Player movement
      if (g.tick % 4 === 0) {
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) {
          g.player.x = Math.min(W - 20, g.player.x + 3);
          g.player.facingRight = true;
          g.scrollX += 1.5;
        }
        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) {
          g.player.x = Math.max(20, g.player.x - 3);
          g.player.facingRight = false;
        }
      }

      // Auto-shoot when space held
      if (keysRef.current.has(" ") && g.tick % 10 === 0) {
        shoot();
      }

      // Move bullets
      g.bullets = g.bullets
        .map((b) => ({ ...b, x: b.x + (g.player.facingRight ? 8 : -8) }))
        .filter((b) => b.x > -20 && b.x < W + g.scrollX * 0.5 + 100);

      // Spawn enemies
      if (
        g.tick % 80 === 0 &&
        g.kills + g.enemies.filter((e) => !e.dead).length < WIN_KILLS + 3
      ) {
        const eid = g.eId++;
        const isTank = Math.random() < 0.2;
        g.enemies.push({
          id: eid,
          x: g.scrollX * 0.5 + W + 40,
          y: H - 58,
          hp: isTank ? 3 : 1,
          type: isTank ? "tank" : "soldier",
          dir: -1,
          dead: false,
          deadTimer: 0,
        });
      }

      // Move enemies + check bullet hits
      for (const e of g.enemies) {
        if (e.dead) {
          e.deadTimer = Math.max(0, e.deadTimer - 1);
          continue;
        }
        e.x += e.dir * (e.type === "tank" ? 1.5 : 2);
        // Check bullet collision
        for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
          const b = g.bullets[bi];
          if (
            Math.abs(b.x - (e.x - g.scrollX * 0.5)) < 20 &&
            Math.abs(b.y - e.y) < 30
          ) {
            e.hp--;
            g.bullets.splice(bi, 1);
            if (e.hp <= 0) {
              e.dead = true;
              e.deadTimer = 30;
              g.kills++;
              setKills(g.kills);
              if (g.kills >= WIN_KILLS) {
                endGame(true);
                return;
              }
            }
            break;
          }
        }
        // Enemy reaches player
        if (Math.abs(e.x - g.scrollX * 0.5 - g.player.x) < 16) {
          endGame(false);
          return;
        }
      }
      g.enemies = g.enemies.filter((e) => !e.dead || e.deadTimer > 0);

      drawGame();
      animRef.current = requestAnimationFrame(gameLoop);
    },
    [drawGame, endGame, shoot],
  );

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    gameRef.current = {
      running: true,
      player: { x: 60, y: H - 58, facingRight: true },
      bullets: [],
      enemies: [],
      kills: 0,
      bId: 0,
      eId: 0,
      tick: 0,
      startTime: Date.now(),
      scrollX: 0,
    };
    setKills(0);
    setTimeLeft(GAME_TIME);
    setPhase("playing");
    timerRef.current = setInterval(() => {
      const tl = Math.max(
        0,
        GAME_TIME - Math.floor((Date.now() - gameRef.current.startTime) / 1000),
      );
      setTimeLeft(tl);
      if (tl <= 0) endGame(false);
    }, 1000);
    animRef.current = requestAnimationFrame(gameLoop);
  }, [betNum, balance, gameLoop, endGame]);

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " ") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <ArcadeCabinet title="METAL SLUG" color="#ff6600">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ff6600", textShadow: "0 0 10px #ff6600" }}
            >
              RUN AND GUN!
            </div>
            <div className="text-sm opacity-70 mt-1">
              Eliminate {WIN_KILLS} enemies in {GAME_TIME}s to win 2×. Arrow
              keys + Space.
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
                    ? { background: "#ff6600", borderColor: "#ff6600" }
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
              background: "linear-gradient(135deg, #ff6600, #cc2200)",
              boxShadow: "0 0 20px #ff660050",
            }}
          >
            🔫 PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
          />
          <div className="flex justify-center gap-2 pb-2 mt-1">
            <button
              type="button"
              onMouseDown={() => keysRef.current.add("ArrowLeft")}
              onMouseUp={() => keysRef.current.delete("ArrowLeft")}
              onTouchStart={() => keysRef.current.add("ArrowLeft")}
              onTouchEnd={() => keysRef.current.delete("ArrowLeft")}
              style={{
                width: 44,
                height: 44,
                background: "#ff660022",
                border: "1px solid #ff6600",
                borderRadius: 6,
                color: "#ff6600",
                fontSize: 18,
              }}
            >
              ←
            </button>
            <button
              type="button"
              onMouseDown={() => keysRef.current.add("ArrowRight")}
              onMouseUp={() => keysRef.current.delete("ArrowRight")}
              onTouchStart={() => keysRef.current.add("ArrowRight")}
              onTouchEnd={() => keysRef.current.delete("ArrowRight")}
              style={{
                width: 44,
                height: 44,
                background: "#ff660022",
                border: "1px solid #ff6600",
                borderRadius: 6,
                color: "#ff6600",
                fontSize: 18,
              }}
            >
              →
            </button>
            <button
              type="button"
              onMouseDown={() => keysRef.current.add(" ")}
              onMouseUp={() => keysRef.current.delete(" ")}
              onTouchStart={() => keysRef.current.add(" ")}
              onTouchEnd={() => keysRef.current.delete(" ")}
              style={{
                width: 60,
                height: 44,
                background: "#ff000044",
                border: "2px solid #ff6600",
                borderRadius: 6,
                color: "#ff6600",
                fontSize: 13,
                fontWeight: "bold",
              }}
            >
              FIRE
            </button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🎖️" : "💀"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ffcc00" : "#ff4444" }}
          >
            {won ? "MISSION COMPLETE!" : "MISSION FAILED"}
          </div>
          <div className="text-sm opacity-70">
            Kills: {kills}/{WIN_KILLS}
          </div>
          {won && (
            <div style={{ color: "#ff6600" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button onClick={onGameComplete} style={{ background: "#ff6600" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
