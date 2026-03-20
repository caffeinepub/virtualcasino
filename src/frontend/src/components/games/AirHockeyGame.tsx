import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const QUICK_BETS = [5, 10, 25, 50, 100];
const WIN_SCORE = 5;
const W = 280;
const H = 360;
const PADDLE_R = 22;
const PUCK_R = 14;
const GOAL_W = 90;

type Phase = "bet" | "playing" | "result";

export default function AirHockeyGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const rafRef = useRef<number | null>(null);
  const gameRef = useRef({
    running: false,
    puck: { x: W / 2, y: H / 2, vx: 3, vy: 4 },
    player: { x: W / 2, y: H - 60 },
    ai: { x: W / 2, y: 60 },
    playerScore: 0,
    aiScore: 0,
    mouse: { x: W / 2, y: H - 60 },
  });

  const endGame = useCallback(
    async (pScore: number, _aScore: number) => {
      gameRef.current.running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const didWin = pScore >= WIN_SCORE;
      const win = didWin ? betNum * 2 : 0;
      setWon(didWin);
      setWinAmount(win);
      try {
        await recordOutcome({
          gameType: GameType.airHockey,
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

  const startGame = useCallback(() => {
    if (betNum <= 0 || betNum > Number(balance)) {
      toast.error("Invalid bet");
      return;
    }
    const g = gameRef.current;
    g.running = true;
    g.puck = { x: W / 2, y: H / 2, vx: 3, vy: 4 };
    g.player = { x: W / 2, y: H - 60 };
    g.ai = { x: W / 2, y: 60 };
    g.playerScore = 0;
    g.aiScore = 0;
    g.mouse = { x: W / 2, y: H - 60 };
    setPlayerScore(0);
    setAiScore(0);
    setPhase("playing");

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !g.running) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Move AI
      const aiSpeed = 2.5;
      if (g.puck.y < H / 2) {
        const dx = g.puck.x - g.ai.x;
        const dy = g.puck.y - g.ai.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          g.ai.x += (dx / dist) * Math.min(aiSpeed, dist);
          g.ai.y += (dy / dist) * Math.min(aiSpeed, dist);
        }
      } else {
        g.ai.x += (W / 2 - g.ai.x) * 0.05;
        g.ai.y += (60 - g.ai.y) * 0.1;
      }
      g.ai.x = Math.max(PADDLE_R, Math.min(W - PADDLE_R, g.ai.x));
      g.ai.y = Math.max(PADDLE_R, Math.min(H / 2 - PADDLE_R, g.ai.y));

      // Move player toward mouse
      g.player.x += (g.mouse.x - g.player.x) * 0.3;
      g.player.y += (g.mouse.y - g.player.y) * 0.3;
      g.player.x = Math.max(PADDLE_R, Math.min(W - PADDLE_R, g.player.x));
      g.player.y = Math.max(
        H / 2 + PADDLE_R,
        Math.min(H - PADDLE_R, g.player.y),
      );

      // Move puck
      g.puck.x += g.puck.vx;
      g.puck.y += g.puck.vy;

      // Wall bounce
      if (g.puck.x < PUCK_R) {
        g.puck.x = PUCK_R;
        g.puck.vx = Math.abs(g.puck.vx);
      }
      if (g.puck.x > W - PUCK_R) {
        g.puck.x = W - PUCK_R;
        g.puck.vx = -Math.abs(g.puck.vx);
      }

      // Goal check
      const goalLeft = (W - GOAL_W) / 2;
      const goalRight = goalLeft + GOAL_W;
      if (g.puck.y < PUCK_R) {
        if (g.puck.x > goalLeft && g.puck.x < goalRight) {
          g.playerScore++;
          setPlayerScore(g.playerScore);
          if (g.playerScore >= WIN_SCORE) {
            endGame(g.playerScore, g.aiScore);
            return;
          }
          g.puck = { x: W / 2, y: H / 2, vx: 3, vy: 4 };
        } else {
          g.puck.y = PUCK_R;
          g.puck.vy = Math.abs(g.puck.vy);
        }
      }
      if (g.puck.y > H - PUCK_R) {
        if (g.puck.x > goalLeft && g.puck.x < goalRight) {
          g.aiScore++;
          setAiScore(g.aiScore);
          if (g.aiScore >= WIN_SCORE) {
            endGame(g.playerScore, g.aiScore);
            return;
          }
          g.puck = { x: W / 2, y: H / 2, vx: -3, vy: -4 };
        } else {
          g.puck.y = H - PUCK_R;
          g.puck.vy = -Math.abs(g.puck.vy);
        }
      }

      // Paddle collisions
      const checkPaddle = (px: number, py: number, sign: number) => {
        const dx = g.puck.x - px;
        const dy = g.puck.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PADDLE_R + PUCK_R) {
          const nx = dx / dist;
          const ny = dy / dist;
          const speed = Math.sqrt(g.puck.vx ** 2 + g.puck.vy ** 2) * 1.05;
          g.puck.vx = nx * speed;
          g.puck.vy = ny * speed * sign;
          g.puck.x = px + nx * (PADDLE_R + PUCK_R + 1);
          g.puck.y = py + ny * (PADDLE_R + PUCK_R + 1);
        }
      };
      checkPaddle(g.player.x, g.player.y, -1);
      checkPaddle(g.ai.x, g.ai.y, 1);

      // Draw
      ctx.clearRect(0, 0, W, H);
      // Table
      ctx.fillStyle = "#0a1a2a";
      ctx.fillRect(0, 0, W, H);
      // Center line
      ctx.strokeStyle = "#ffffff22";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Center circle
      ctx.strokeStyle = "#ffffff22";
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2);
      ctx.stroke();
      // Goals
      ctx.fillStyle = "#00aaff44";
      ctx.fillRect(goalLeft, 0, GOAL_W, 6);
      ctx.fillRect(goalLeft, H - 6, GOAL_W, 6);
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 3;
      ctx.strokeRect(goalLeft, 0, GOAL_W, 8);
      ctx.strokeRect(goalLeft, H - 8, GOAL_W, 8);
      // Border
      ctx.strokeStyle = "#00aaff88";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      // Player paddle
      const grad1 = ctx.createRadialGradient(
        g.player.x,
        g.player.y,
        0,
        g.player.x,
        g.player.y,
        PADDLE_R,
      );
      grad1.addColorStop(0, "#ff00aa");
      grad1.addColorStop(1, "#880044");
      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.arc(g.player.x, g.player.y, PADDLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff88cc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.player.x, g.player.y, PADDLE_R, 0, Math.PI * 2);
      ctx.stroke();
      // AI paddle
      const grad2 = ctx.createRadialGradient(
        g.ai.x,
        g.ai.y,
        0,
        g.ai.x,
        g.ai.y,
        PADDLE_R,
      );
      grad2.addColorStop(0, "#ff4444");
      grad2.addColorStop(1, "#880000");
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.arc(g.ai.x, g.ai.y, PADDLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff8888";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.ai.x, g.ai.y, PADDLE_R, 0, Math.PI * 2);
      ctx.stroke();
      // Puck
      const grad3 = ctx.createRadialGradient(
        g.puck.x - 3,
        g.puck.y - 3,
        0,
        g.puck.x,
        g.puck.y,
        PUCK_R,
      );
      grad3.addColorStop(0, "#cccccc");
      grad3.addColorStop(1, "#444444");
      ctx.fillStyle = grad3;
      ctx.beginPath();
      ctx.arc(g.puck.x, g.puck.y, PUCK_R, 0, Math.PI * 2);
      ctx.fill();
      // Labels
      ctx.fillStyle = "#ffffff44";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("AI", W / 2, 30);
      ctx.fillText("YOU", W / 2, H - 10);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
  }, [betNum, balance, endGame]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      gameRef.current.mouse = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      gameRef.current.mouse = {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <ArcadeCabinet title="AIR HOCKEY" color="#00aaff">
      {phase === "bet" && (
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-center mb-2">
            <div
              className="text-2xl font-black"
              style={{ color: "#00aaff", textShadow: "0 0 10px #00aaff" }}
            >
              AIR HOCKEY
            </div>
            <div className="text-sm opacity-70 mt-1">
              First to {WIN_SCORE} goals wins 2×
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
                    ? { background: "#00aaff", borderColor: "#00aaff" }
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
            className="w-24 text-center rounded border px-2 py-1 bg-black text-white border-cyan-500"
          />
          <Button
            onClick={startGame}
            className="w-full font-black tracking-widest text-lg"
            style={{
              background: "linear-gradient(135deg, #00aaff, #0044aa)",
              boxShadow: "0 0 20px #00aaff50",
            }}
          >
            🏒 PLAY FOR {betNum} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center">
          <div className="flex justify-between w-full px-4 py-2 text-sm font-bold">
            <span style={{ color: "#ff00aa" }}>YOU: {playerScore}</span>
            <span style={{ color: "#00aaff" }}>First to {WIN_SCORE}</span>
            <span style={{ color: "#ff4444" }}>AI: {aiScore}</span>
          </div>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ maxWidth: "100%", cursor: "none", touchAction: "none" }}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
          />
          <div className="text-center text-xs opacity-50 mt-2">
            Move mouse/finger to control your paddle
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="text-4xl">{won ? "🏆" : "😔"}</div>
          <div
            className="text-2xl font-black"
            style={{ color: won ? "#ffcc00" : "#ff4444" }}
          >
            {won ? "YOU WIN!" : "AI WINS!"}
          </div>
          <div className="text-sm opacity-70">
            You {playerScore} – {aiScore} AI
          </div>
          {won && (
            <div style={{ color: "#ffcc00" }} className="font-bold">
              +{winAmount} credits!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("bet")} variant="outline">
              Play Again
            </Button>
            <Button onClick={onGameComplete} style={{ background: "#00aaff" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ArcadeCabinet>
  );
}
