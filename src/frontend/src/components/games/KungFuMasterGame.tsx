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
const WIN_SCORE = 500;

type Phase = "bet" | "playing" | "result";
type Enemy = {
  x: number;
  y: number;
  hp: number;
  type: "grunt" | "knife" | "boss";
  attacking: boolean;
  attackTimer: number;
  hitFlash: number;
  dead: boolean;
  id: number;
};

export default function KungFuMasterGame({
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
    score: 0,
    player: {
      x: 40,
      y: H - 40,
      hp: PLAYER_HP,
      punching: false,
      kicking: false,
      punchTimer: 0,
      kickTimer: 0,
      crouching: false,
      hitFlash: 0,
    },
    enemies: [] as Enemy[],
    nextId: 0,
    scrollX: 0,
  });
  const animRef = useRef<number | null>(null);
  const keysRef = useRef({
    left: false,
    right: false,
    punch: false,
    kick: false,
    crouch: false,
  });
  const lastPressRef = useRef({ punch: false, kick: false });

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
          gameType: GameType.kungFuMaster,
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
    const p = g.player;

    // Background - pagoda interior
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1a0a00");
    bg.addColorStop(0.6, "#2a1000");
    bg.addColorStop(1, "#3a1500");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Lanterns
    for (let l = 0; l < 4; l++) {
      const lx = 40 + l * 65 - ((g.scrollX * 0.3) % W);
      ctx.fillStyle = "#cc2200";
      ctx.fillRect(lx - 8, 15, 16, 20);
      ctx.fillStyle = "#ff8800";
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 10;
      ctx.fillRect(lx - 6, 17, 12, 16);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#cc2200";
      ctx.fillRect(lx - 2, 35, 4, 6);
    }

    // Floor tiles
    for (let tx = 0; tx < W; tx += 30) {
      const shade = Math.floor(tx / 30) % 2 === 0 ? "#331500" : "#2a1000";
      ctx.fillStyle = shade;
      ctx.fillRect(tx, H - 20, 30, 20);
    }
    ctx.strokeStyle = "#442200";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 20);
    ctx.lineTo(W, H - 20);
    ctx.stroke();

    // Enemies
    for (const e of g.enemies) {
      if (e.dead) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      const eColor =
        e.hitFlash > 0
          ? "#ffffff"
          : e.type === "boss"
            ? "#882200"
            : e.type === "knife"
              ? "#226688"
              : "#664400";
      ctx.fillStyle = eColor;
      ctx.fillRect(-10, -32, 20, 22);
      ctx.beginPath();
      ctx.arc(0, -38, 10, 0, Math.PI * 2);
      ctx.fill();
      // Attack arm
      if (e.attacking) {
        ctx.fillStyle = eColor;
        const dir = e.x > p.x ? -1 : 1;
        ctx.fillRect(dir > 0 ? 10 : -24, -28, 14, 5);
        if (e.type === "knife") {
          ctx.fillStyle = "#cccccc";
          ctx.fillRect(dir > 0 ? 24 : -30, -26, 8, 3);
        }
      }
      // HP
      const hpMax = e.type === "boss" ? 10 : e.type === "knife" ? 5 : 3;
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(-12, -46, 24, 3);
      ctx.fillStyle = "#44ff44";
      ctx.fillRect(-12, -46, 24 * (e.hp / hpMax), 3);
      ctx.restore();
    }

    // Player
    ctx.save();
    ctx.translate(p.x, p.y);
    const pColor = p.hitFlash > 0 ? "#ffffff" : "#ffcc44";
    ctx.fillStyle = pColor;
    // White karate gi
    ctx.fillStyle = p.hitFlash > 0 ? "#ffffff" : "#eeeecc";
    const pH = p.crouching ? 16 : 26;
    const pYOff = p.crouching ? 6 : 0;
    ctx.fillRect(-10, -pH - pYOff, 20, pH);
    // Red belt
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(-10, -pH / 2 - pYOff - 2, 20, 4);
    // Head
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.arc(0, -pH - pYOff - 8, 9, 0, Math.PI * 2);
    ctx.fill();
    // Headband
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(-9, -pH - pYOff - 14, 18, 4);
    // Punch
    if (p.punching) {
      ctx.fillStyle = p.hitFlash > 0 ? "#ffffff" : "#eeeecc";
      ctx.fillRect(10, -pH * 0.7 - pYOff, 20, 6);
    }
    // Kick
    if (p.kicking) {
      ctx.fillStyle = p.hitFlash > 0 ? "#ffffff" : "#eeeecc";
      ctx.fillRect(8, -pYOff - 4, 24, 8);
    }
    ctx.restore();

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, 16);
    const pPct = p.hp / PLAYER_HP;
    ctx.fillStyle =
      pPct > 0.5 ? "#44ff44" : pPct > 0.25 ? "#ffff00" : "#ff4444";
    ctx.fillRect(5, 3, 80 * pPct, 10);
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 3, 80, 10);
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`SCORE: ${g.score}/${WIN_SCORE}`, W - 5, 12);
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameRef.current.running) return;
    const g = gameRef.current;
    const keys = keysRef.current;
    g.tick++;

    const p = g.player;
    if (keys.left) p.x = Math.max(20, p.x - 2);
    if (keys.right) p.x = Math.min(W - 20, p.x + 2);
    p.crouching = keys.crouch;

    // Attack
    if (keys.punch && !lastPressRef.current.punch) {
      p.punching = true;
      p.punchTimer = 12;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - p.x) < 40 && Math.abs(e.y - p.y) < 15) {
          e.hp--;
          e.hitFlash = 5;
          if (e.hp <= 0) {
            e.dead = true;
            g.score += e.type === "boss" ? 100 : e.type === "knife" ? 50 : 30;
          }
        }
      }
    }
    if (keys.kick && !lastPressRef.current.kick) {
      p.kicking = true;
      p.kickTimer = 14;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - p.x) < 50 && Math.abs(e.y - p.y) < 15) {
          e.hp -= 2;
          e.hitFlash = 8;
          if (e.hp <= 0) {
            e.dead = true;
            g.score += e.type === "boss" ? 100 : e.type === "knife" ? 50 : 30;
          }
        }
      }
    }
    lastPressRef.current = { punch: keys.punch, kick: keys.kick };
    if (p.punchTimer > 0) {
      p.punchTimer--;
    } else {
      p.punching = false;
    }
    if (p.kickTimer > 0) {
      p.kickTimer--;
    } else {
      p.kicking = false;
    }
    if (p.hitFlash > 0) p.hitFlash--;

    // Spawn enemies
    const types: ("grunt" | "knife" | "boss")[] = [
      "grunt",
      "grunt",
      "knife",
      "boss",
    ];
    if (g.tick % 80 === 0 && g.enemies.filter((e) => !e.dead).length < 3) {
      const type =
        g.score > 300
          ? types[Math.floor(Math.random() * types.length)]
          : "grunt";
      const hpMap = { grunt: 3, knife: 5, boss: 10 };
      g.enemies.push({
        x: Math.random() < 0.5 ? W - 30 : 30,
        y: H - 35,
        hp: hpMap[type],
        type,
        attacking: false,
        attackTimer: 0,
        hitFlash: 0,
        dead: false,
        id: g.nextId++,
      });
    }

    // Enemy AI
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (e.hitFlash > 0) {
        e.hitFlash--;
        continue;
      }
      const dx = p.x - e.x;
      if (Math.abs(dx) > 35) {
        e.x += dx > 0 ? 1 : -1;
      }
      if (g.tick % 45 === e.id % 45 && Math.abs(dx) < 40) {
        e.attacking = true;
        e.attackTimer = 15;
        if (!p.crouching || e.type === "boss") {
          p.hp = Math.max(
            0,
            p.hp - (e.type === "boss" ? 15 : e.type === "knife" ? 10 : 7),
          );
          p.hitFlash = 8;
        }
      }
      if (e.attackTimer > 0) {
        e.attackTimer--;
      } else {
        e.attacking = false;
      }
    }
    g.enemies = g.enemies.filter((e) => !(e.dead && g.tick % 10 === 0));

    if (p.hp <= 0) {
      endGame(false);
      return;
    }
    if (g.score >= WIN_SCORE) {
      endGame(true);
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
      score: 0,
      player: {
        x: 40,
        y: H - 40,
        hp: PLAYER_HP,
        punching: false,
        kicking: false,
        punchTimer: 0,
        kickTimer: 0,
        crouching: false,
        hitFlash: 0,
      },
      enemies: [],
      nextId: 0,
      scrollX: 0,
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
      if (e.key === "ArrowDown" || e.key === "s") keysRef.current.crouch = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d")
        keysRef.current.right = false;
      if (e.key === "z" || e.key === "Z") keysRef.current.punch = false;
      if (e.key === "x" || e.key === "X") keysRef.current.kick = false;
      if (e.key === "ArrowDown" || e.key === "s")
        keysRef.current.crouch = false;
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
    height: 44,
    background: "#cc880011",
    border: "2px solid #cc8800",
    borderRadius: 8,
    color: "#cc8800",
    fontSize: 12,
    fontWeight: "bold" as const,
    padding: "0 10px",
  };

  return (
    <ArcadeCabinet title="KUNG FU MASTER" color="#cc8800">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#cc8800", textShadow: "0 0 10px #cc8800" }}
            >
              HI-YA!
            </div>
            <div className="text-sm opacity-70 mt-1">
              ←/→ move, Z=Punch, X=Kick, ↓=Crouch. Score {WIN_SCORE} points to
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
                        background: "#cc8800",
                        borderColor: "#cc8800",
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-yellow-600"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #cc8800, #885500)",
              color: "#fff",
              boxShadow: "0 0 20px #cc880050",
            }}
          >
            🥋 FIGHT FOR {betNum} CREDITS
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
          <div className="flex justify-center gap-2 pb-2 mt-1 flex-wrap">
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
                keysRef.current.crouch = true;
              }}
              onPointerUp={() => {
                keysRef.current.crouch = false;
              }}
              style={btnStyle}
            >
              ↓ DUCK
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
                keysRef.current.right = true;
              }}
              onPointerUp={() => {
                keysRef.current.right = false;
              }}
              style={btnStyle}
            >
              ▶
            </button>
          </div>
        </div>
      )}
      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🥋" : "💢"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#cc8800" : "#ff4444" }}
          >
            {won ? "MASTER!" : "DEFEATED!"}
          </div>
          {won && (
            <div style={{ color: "#cc8800" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button
              onClick={onGameComplete}
              style={{ background: "#cc8800", color: "#fff" }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
