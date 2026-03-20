import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#ff9900";
const QUICK_BETS = [5, 10, 25, 50, 100];
const W = 300;
const H = 400;
type Phase = "bet" | "playing" | "result";

interface Platform {
  x: number;
  y: number;
  w: number;
}
interface Ladder {
  x: number;
  y1: number;
  y2: number;
}
interface Barrel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

const PLATFORMS: Platform[] = [
  { x: 0, y: 360, w: W },
  { x: 20, y: 280, w: 240 },
  { x: 0, y: 200, w: 240 },
  { x: 20, y: 120, w: 240 },
  { x: 0, y: 50, w: W },
];

const LADDERS: Ladder[] = [
  { x: 60, y1: 280, y2: 360 },
  { x: 180, y1: 200, y2: 280 },
  { x: 60, y1: 120, y2: 200 },
  { x: 200, y1: 50, y2: 120 },
];

function getPlatformAt(x: number, y: number): Platform | null {
  for (const p of PLATFORMS) {
    if (x + 8 > p.x && x - 8 < p.x + p.w && y >= p.y - 2 && y <= p.y + 6)
      return p;
  }
  return null;
}
function getLadderAt(x: number, y: number): Ladder | null {
  for (const l of LADDERS) {
    if (Math.abs(x - l.x) < 12 && y >= l.y1 - 4 && y <= l.y2 + 4) return l;
  }
  return null;
}

export default function DonkeyKongGame({
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
  const keysRef = useRef<Set<string>>(new Set());

  const gameRef = useRef<{
    player: {
      x: number;
      y: number;
      vy: number;
      onGround: boolean;
      onLadder: boolean;
    };
    barrels: Barrel[];
    running: boolean;
    barrelTimer: number;
    frame: number;
  } | null>(null);

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
          gameType: GameType.donkeyKong,
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

    ctx.fillStyle = "#0a0500";
    ctx.fillRect(0, 0, W, H);

    // Platforms
    for (const p of PLATFORMS) {
      const grad = ctx.createLinearGradient(0, p.y - 8, 0, p.y + 4);
      grad.addColorStop(0, "#cc8800");
      grad.addColorStop(1, "#663300");
      ctx.fillStyle = grad;
      ctx.shadowColor = HEX_COLOR;
      ctx.shadowBlur = 4;
      ctx.fillRect(p.x, p.y - 8, p.w, 12);
      ctx.shadowBlur = 0;
      // Girder bolts
      ctx.fillStyle = "#ffcc66";
      for (let bx = p.x + 15; bx < p.x + p.w - 10; bx += 30) {
        ctx.beginPath();
        ctx.arc(bx, p.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ladders
    for (const l of LADDERS) {
      ctx.strokeStyle = "#8866aa";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(l.x - 6, l.y1);
      ctx.lineTo(l.x - 6, l.y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(l.x + 6, l.y1);
      ctx.lineTo(l.x + 6, l.y2);
      ctx.stroke();
      ctx.strokeStyle = "#6644aa";
      ctx.lineWidth = 2;
      for (let y = l.y1; y < l.y2; y += 12) {
        ctx.beginPath();
        ctx.moveTo(l.x - 6, y);
        ctx.lineTo(l.x + 6, y);
        ctx.stroke();
      }
    }

    // Gorilla at top
    const gx = 30;
    const gy = PLATFORMS[4].y - 50;
    ctx.fillStyle = "#553322";
    ctx.beginPath();
    ctx.ellipse(gx, gy + 20, 22, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#885544";
    ctx.beginPath();
    ctx.ellipse(gx, gy, 18, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cc8866";
    ctx.beginPath();
    ctx.ellipse(gx, gy + 4, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#220000";
    ctx.beginPath();
    ctx.arc(gx - 5, gy - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Barrels
    for (const b of g.barrels) {
      ctx.fillStyle = "#884400";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#cc6600";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x - 10, b.y);
      ctx.lineTo(b.x + 10, b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Player (Mario-like)
    const px = g.player.x;
    const py = g.player.y;
    // Hat
    ctx.fillStyle = "#cc0000";
    ctx.fillRect(px - 8, py - 22, 16, 6);
    ctx.fillRect(px - 5, py - 28, 12, 8);
    // Face
    ctx.fillStyle = "#ffcc99";
    ctx.fillRect(px - 7, py - 16, 14, 10);
    // Eye & mustache
    ctx.fillStyle = "#000";
    ctx.fillRect(px + 2, py - 13, 3, 3);
    ctx.fillStyle = "#663300";
    ctx.fillRect(px - 5, py - 9, 10, 3);
    // Body
    ctx.fillStyle = "#0044cc";
    ctx.fillRect(px - 7, py - 6, 14, 12);
    // Legs
    ctx.fillStyle = "#cc0000";
    ctx.fillRect(px - 7, py + 6, 6, 8);
    ctx.fillRect(px + 1, py + 6, 6, 8);
    // Shoes
    ctx.fillStyle = "#442200";
    ctx.fillRect(px - 9, py + 12, 8, 4);
    ctx.fillRect(px + 1, py + 12, 8, 4);

    // HUD
    ctx.fillStyle = HEX_COLOR;
    ctx.font = "bold 11px monospace";
    ctx.shadowColor = HEX_COLOR;
    ctx.shadowBlur = 4;
    ctx.fillText("REACH THE TOP!", W / 2 - 52, 18);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g || !g.running) return;
    g.frame++;

    const p = g.player;

    // Check if on ladder
    const ladder = getLadderAt(p.x, p.y);
    p.onLadder =
      !!ladder &&
      (keysRef.current.has("ArrowUp") ||
        keysRef.current.has("ArrowDown") ||
        p.onLadder);

    if (p.onLadder && ladder) {
      p.vy = 0;
      if (keysRef.current.has("ArrowUp")) p.y -= 2;
      if (keysRef.current.has("ArrowDown")) p.y += 2;
      p.y = Math.max(ladder.y1, Math.min(ladder.y2, p.y));
      p.onGround = false;
    } else {
      p.onLadder = false;
      p.vy += 0.5;
      p.y += p.vy;

      const plat = getPlatformAt(p.x, p.y);
      if (plat) {
        p.y = plat.y;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }

      if (keysRef.current.has("ArrowLeft")) p.x = Math.max(10, p.x - 2.5);
      if (keysRef.current.has("ArrowRight")) p.x = Math.min(W - 10, p.x + 2.5);

      if (keysRef.current.has("ArrowUp") && p.onGround) {
        p.vy = -9;
        p.onGround = false;
      }
    }

    // Win check
    if (p.y <= PLATFORMS[4].y + 2) {
      endGame(true);
      return;
    }

    // Spawn barrels
    g.barrelTimer--;
    if (g.barrelTimer <= 0) {
      g.barrels.push({
        x: 35,
        y: PLATFORMS[4].y - 4,
        vx: 2,
        vy: 0,
        onGround: true,
      });
      g.barrelTimer = 120;
    }

    // Move barrels
    for (const b of g.barrels) {
      b.vy += 0.4;
      b.x += b.vx;
      b.y += b.vy;
      const bp = getPlatformAt(b.x, b.y);
      if (bp) {
        b.y = bp.y;
        b.vy = 0;
        b.onGround = true;
        b.vx = b.x < W / 2 ? 2.2 : -2.2;
      }
      if (b.y > H + 20) b.vx = 0;
    }
    g.barrels = g.barrels.filter((b) => b.y <= H + 30);

    // Barrel collision
    for (const b of g.barrels) {
      if (Math.abs(b.x - p.x) < 16 && Math.abs(b.y - p.y) < 16) {
        endGame(false);
        return;
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
    gameRef.current = {
      player: {
        x: 150,
        y: PLATFORMS[0].y,
        vy: 0,
        onGround: true,
        onLadder: false,
      },
      barrels: [],
      running: true,
      barrelTimer: 120,
      frame: 0,
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

  const pressKey = (key: string) => keysRef.current.add(key);
  const releaseKey = (key: string) => keysRef.current.delete(key);

  return (
    <ArcadeCabinet title="🦍 DONKEY KONG" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          DODGE BARRELS &mdash; REACH TOP TO WIN 2x
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
                          background: "rgba(30,10,0,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="donkeykong.quickbet.button"
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
                background: "rgba(20,8,0,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="donkeykong.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #cc6600)`,
                color: "#000",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="donkeykong.play_button"
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
              ← → MOVE &bull; ↑ JUMP / CLIMB &bull; ↓ DESCEND
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
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onPointerDown={() => pressKey("ArrowUp")}
                onPointerUp={() => releaseKey("ArrowUp")}
                onPointerLeave={() => releaseKey("ArrowUp")}
                className="w-12 h-10 rounded font-black select-none"
                style={{
                  background: "rgba(40,20,0,0.8)",
                  border: `1px solid ${HEX_COLOR}40`,
                  color: HEX_COLOR,
                }}
              >
                ↑
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onPointerDown={() => pressKey("ArrowLeft")}
                  onPointerUp={() => releaseKey("ArrowLeft")}
                  onPointerLeave={() => releaseKey("ArrowLeft")}
                  className="w-12 h-10 rounded font-black select-none"
                  style={{
                    background: "rgba(40,20,0,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onPointerDown={() => pressKey("ArrowDown")}
                  onPointerUp={() => releaseKey("ArrowDown")}
                  onPointerLeave={() => releaseKey("ArrowDown")}
                  className="w-12 h-10 rounded font-black select-none"
                  style={{
                    background: "rgba(40,20,0,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onPointerDown={() => pressKey("ArrowRight")}
                  onPointerUp={() => releaseKey("ArrowRight")}
                  onPointerLeave={() => releaseKey("ArrowRight")}
                  className="w-12 h-10 rounded font-black select-none"
                  style={{
                    background: "rgba(40,20,0,0.8)",
                    border: `1px solid ${HEX_COLOR}40`,
                    color: HEX_COLOR,
                  }}
                >
                  →
                </button>
              </div>
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
              <div className="text-6xl">{won ? "🎉" : "🦍"}</div>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won ? `+${winAmount} CREDITS!` : "GOT BARRELED!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: HEX_COLOR,
                  color: "#000",
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                }}
                data-ocid="donkeykong.play_again_button"
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
