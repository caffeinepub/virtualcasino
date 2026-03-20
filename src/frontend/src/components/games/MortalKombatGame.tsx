import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 280;
const H = 180;
const PLAYER_HP = 100;
const ENEMY_HP = 100;
const ROUND_TIME = 60;

type Phase = "bet" | "playing" | "result";

type Fighter = {
  x: number;
  y: number;
  hp: number;
  blocking: boolean;
  attacking: boolean;
  attackTimer: number;
  facing: 1 | -1;
  hitFlash: number;
};

export default function MortalKombatGame({
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
    player: {
      x: 60,
      y: H - 50,
      hp: PLAYER_HP,
      blocking: false,
      attacking: false,
      attackTimer: 0,
      facing: 1 as 1 | -1,
      hitFlash: 0,
    },
    enemy: {
      x: W - 80,
      y: H - 50,
      hp: ENEMY_HP,
      blocking: false,
      attacking: false,
      attackTimer: 0,
      facing: -1 as 1 | -1,
      hitFlash: 0,
    },
    projectiles: [] as {
      x: number;
      y: number;
      dir: number;
      owner: "player" | "enemy";
    }[],
  });
  const animRef = useRef<number | null>(null);
  const keysRef = useRef({
    left: false,
    right: false,
    punch: false,
    kick: false,
    block: false,
    special: false,
  });
  const lastPressRef = useRef({
    punch: false,
    kick: false,
    special: false,
    block: false,
  });

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
          gameType: GameType.mortalKombat,
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

  const drawFighter = useCallback(
    (ctx: CanvasRenderingContext2D, f: Fighter, isPlayer: boolean) => {
      const color = isPlayer
        ? f.hitFlash > 0
          ? "#ffffff"
          : "#4488ff"
        : f.hitFlash > 0
          ? "#ffffff"
          : "#ff4444";
      ctx.save();
      ctx.translate(f.x, f.y);
      // Body
      ctx.fillStyle = color;
      ctx.fillRect(-8, -30, 16, 22);
      // Head
      ctx.beginPath();
      ctx.arc(0, -36, 9, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillStyle = isPlayer ? "#224488" : "#882222";
      ctx.fillRect(-8, -8, 6, 18);
      ctx.fillRect(2, -8, 6, 18);
      // Attack arm
      if (f.attacking) {
        ctx.fillStyle = color;
        ctx.fillRect(f.facing > 0 ? 8 : -22, -24, 14, 6);
      }
      // Block shield
      if (f.blocking) {
        ctx.fillStyle = "rgba(100,200,255,0.5)";
        ctx.fillRect(f.facing > 0 ? 6 : -22, -36, 16, 36);
      }
      ctx.restore();
    },
    [],
  );

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Background - temple arena
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0a2e");
    bg.addColorStop(0.6, "#1a0a1a");
    bg.addColorStop(1, "#2a0a0a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Temple pillars
    for (let p = 0; p < 4; p++) {
      ctx.fillStyle = "#3a1a1a";
      ctx.fillRect(p * 80 - 10, 0, 15, H * 0.65);
      ctx.fillStyle = "#4a2a2a";
      ctx.fillRect(p * 80 - 12, H * 0.65, 20, 8);
    }

    // Lava glow at bottom
    const lava = ctx.createLinearGradient(0, H * 0.85, 0, H);
    lava.addColorStop(0, "#ff440022");
    lava.addColorStop(1, "#ff880044");
    ctx.fillStyle = lava;
    ctx.fillRect(0, H * 0.85, W, H * 0.15);

    // Floor
    ctx.fillStyle = "#3a1a0a";
    ctx.fillRect(0, H - 20, W, 20);

    // Projectiles
    for (const p of g.projectiles) {
      ctx.fillStyle = p.owner === "player" ? "#4488ff" : "#ff4422";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    drawFighter(ctx, g.player, true);
    drawFighter(ctx, g.enemy, false);

    // Health bars
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(5, 5, 100, 14);
    ctx.fillRect(W - 105, 5, 100, 14);
    const pPct = g.player.hp / PLAYER_HP;
    const ePct = g.enemy.hp / ENEMY_HP;
    ctx.fillStyle =
      pPct > 0.5 ? "#44ff44" : pPct > 0.25 ? "#ffff00" : "#ff4444";
    ctx.fillRect(5, 5, 100 * pPct, 14);
    ctx.fillStyle =
      ePct > 0.5 ? "#44ff44" : ePct > 0.25 ? "#ffff00" : "#ff4444";
    ctx.fillRect(W - 105 + 100 * (1 - ePct), 5, 100 * ePct, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("YOU", 8, 15);
    ctx.textAlign = "right";
    ctx.fillText("ENEMY", W - 8, 15);

    // Timer
    const elapsed = (Date.now() - g.startTime) / 1000;
    const remaining = Math.max(0, ROUND_TIME - elapsed);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(W / 2 - 20, 5, 40, 14);
    ctx.fillStyle = remaining < 10 ? "#ff4444" : "#ffff00";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(Math.ceil(remaining).toString(), W / 2, 15);
  }, [drawFighter]);

  const gameLoop = useCallback(() => {
    if (!gameRef.current.running) return;
    const g = gameRef.current;
    const keys = keysRef.current;
    g.tick++;

    const p = g.player;
    const e = g.enemy;

    // Player movement
    if (keys.left) p.x = Math.max(20, p.x - 2.5);
    if (keys.right) p.x = Math.min(W - 20, p.x + 2.5);
    p.facing = p.x < e.x ? 1 : -1;
    e.facing = e.x < p.x ? 1 : -1;

    // Player attack
    if (keys.punch && !lastPressRef.current.punch) {
      p.attacking = true;
      p.attackTimer = 10;
      // Hit check
      if (Math.abs(p.x - e.x) < 35 && !e.blocking) {
        e.hp = Math.max(0, e.hp - (8 + Math.random() * 5));
        e.hitFlash = 5;
      }
    }
    if (keys.kick && !lastPressRef.current.kick) {
      p.attacking = true;
      p.attackTimer = 12;
      if (Math.abs(p.x - e.x) < 40 && !e.blocking) {
        e.hp = Math.max(0, e.hp - (12 + Math.random() * 6));
        e.hitFlash = 8;
      }
    }
    if (
      keys.special &&
      !lastPressRef.current.special &&
      g.projectiles.length < 3
    ) {
      g.projectiles.push({
        x: p.x + p.facing * 10,
        y: p.y - 20,
        dir: p.facing,
        owner: "player",
      });
    }
    p.blocking = keys.block;

    lastPressRef.current = {
      punch: keys.punch,
      kick: keys.kick,
      special: keys.special,
      block: keys.block,
    };

    if (p.attackTimer > 0) {
      p.attackTimer--;
    } else {
      p.attacking = false;
    }
    if (p.hitFlash > 0) p.hitFlash--;
    if (e.hitFlash > 0) e.hitFlash--;

    // Enemy AI
    if (g.tick % 30 === 0) {
      const dist = Math.abs(e.x - p.x);
      if (dist > 50) {
        e.x += e.facing * 2;
      }
      if (dist < 35) {
        e.attacking = true;
        e.attackTimer = 10;
        if (!p.blocking) {
          p.hp = Math.max(0, p.hp - (6 + Math.random() * 8));
          p.hitFlash = 5;
        }
      }
      if (Math.random() < 0.2 && dist > 60 && g.projectiles.length < 3) {
        g.projectiles.push({
          x: e.x + e.facing * 10,
          y: e.y - 20,
          dir: e.facing,
          owner: "enemy",
        });
      }
      e.blocking = Math.random() < 0.15;
    }
    if (e.attackTimer > 0) {
      e.attackTimer--;
    } else {
      e.attacking = false;
    }

    // Projectile movement
    for (const proj of g.projectiles) {
      proj.x += proj.dir * 5;
    }
    // Projectile hits
    for (const proj of g.projectiles) {
      if (
        proj.owner === "player" &&
        Math.abs(proj.x - e.x) < 15 &&
        Math.abs(proj.y - (e.y - 20)) < 20 &&
        !e.blocking
      ) {
        e.hp = Math.max(0, e.hp - 15);
        e.hitFlash = 8;
        proj.x = -999;
      }
      if (
        proj.owner === "enemy" &&
        Math.abs(proj.x - p.x) < 15 &&
        Math.abs(proj.y - (p.y - 20)) < 20 &&
        !p.blocking
      ) {
        p.hp = Math.max(0, p.hp - 15);
        p.hitFlash = 8;
        proj.x = -999;
      }
    }
    g.projectiles = g.projectiles.filter((proj) => proj.x > 0 && proj.x < W);

    // Win/lose
    if (e.hp <= 0) {
      endGame(true);
      return;
    }
    if (p.hp <= 0) {
      endGame(false);
      return;
    }
    const elapsed = (Date.now() - g.startTime) / 1000;
    if (elapsed >= ROUND_TIME) {
      endGame(p.hp > e.hp);
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
      player: {
        x: 60,
        y: H - 50,
        hp: PLAYER_HP,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        facing: 1,
        hitFlash: 0,
      },
      enemy: {
        x: W - 80,
        y: H - 50,
        hp: ENEMY_HP,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        facing: -1,
        hitFlash: 0,
      },
      projectiles: [],
    };
    setPhase("playing");
    animRef.current = requestAnimationFrame(gameLoop);
  }, [betNum, balance, gameLoop]);

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = true;
      if (e.key === "z" || e.key === "Z") keysRef.current.punch = true;
      if (e.key === "x" || e.key === "X") keysRef.current.kick = true;
      if (e.key === "c" || e.key === "C") keysRef.current.special = true;
      if (e.key === "s" || e.key === "ArrowDown") keysRef.current.block = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d")
        keysRef.current.right = false;
      if (e.key === "z" || e.key === "Z") keysRef.current.punch = false;
      if (e.key === "x" || e.key === "X") keysRef.current.kick = false;
      if (e.key === "c" || e.key === "C") keysRef.current.special = false;
      if (e.key === "s" || e.key === "ArrowDown") keysRef.current.block = false;
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
      if (animRef.current) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  const btnStyle = {
    width: 60,
    height: 44,
    background: "#ff222211",
    border: "2px solid #ff2222",
    borderRadius: 8,
    color: "#ff2222",
    fontSize: 11,
    fontWeight: "bold" as const,
  };

  return (
    <ArcadeCabinet title="MORTAL KOMBAT" color="#ff2222">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#ff2222", textShadow: "0 0 10px #ff2222" }}
            >
              FIGHT!
            </div>
            <div className="text-sm opacity-70 mt-1">
              ←/→ move, Z=Punch, X=Kick, C=Special, S=Block. Defeat the enemy to
              win 2×!
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
                        background: "#ff2222",
                        borderColor: "#ff2222",
                        color: "#fff",
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-red-500"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #ff2222, #880000)",
              color: "#fff",
              boxShadow: "0 0 20px #ff222250",
            }}
          >
            ⚔️ FIGHT FOR {betNum} CREDITS
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
          <div className="flex justify-center gap-1 pb-2 mt-1 flex-wrap">
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.left = true;
              }}
              onPointerUp={() => {
                keysRef.current.left = false;
              }}
              style={btnStyle}
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.right = true;
              }}
              onPointerUp={() => {
                keysRef.current.right = false;
              }}
              style={btnStyle}
            >
              ▶
            </button>
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.punch = true;
              }}
              onPointerUp={() => {
                keysRef.current.punch = false;
              }}
              style={btnStyle}
            >
              PUNCH
            </button>
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.kick = true;
              }}
              onPointerUp={() => {
                keysRef.current.kick = false;
              }}
              style={btnStyle}
            >
              KICK
            </button>
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.special = true;
              }}
              onPointerUp={() => {
                keysRef.current.special = false;
              }}
              style={{ ...btnStyle, borderColor: "#4488ff", color: "#4488ff" }}
            >
              SP
            </button>
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.block = true;
              }}
              onPointerUp={() => {
                keysRef.current.block = false;
              }}
              style={{ ...btnStyle, borderColor: "#ffff00", color: "#ffff00" }}
            >
              BLK
            </button>
          </div>
        </div>
      )}
      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🏆" : "💀"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ff2222" : "#888" }}
          >
            {won ? "FATALITY!" : "YOU LOSE!"}
          </div>
          {won && (
            <div style={{ color: "#ff2222" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button
              onClick={onGameComplete}
              style={{ background: "#ff2222", color: "#fff" }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
