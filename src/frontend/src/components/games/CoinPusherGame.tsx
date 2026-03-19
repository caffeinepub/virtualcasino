import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.78 0.18 72)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const COLS = 5;
const ROWS = 6;

type Phase = "bet" | "playing" | "result";

function genGrid(): boolean[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, () => r > 0 && Math.random() > 0.45),
  );
}

export default function CoinPusherGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [grid, setGrid] = useState<boolean[][]>(genGrid);
  const [droppedCol, setDroppedCol] = useState<number | null>(null);
  const [fallenCoins, setFallenCoins] = useState(0);
  const [round, setRound] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleStart = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setGrid(genGrid());
    setFallenCoins(0);
    setRound(0);
    setPhase("playing");
  };

  const dropCoin = (col: number) => {
    if (round >= 3) return;
    setDroppedCol(col);
    setTimeout(() => {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        for (let r = ROWS - 1; r > 0; r--) {
          next[r][col] = next[r - 1][col];
        }
        next[0][col] = true;
        return next;
      });
      const fell = Math.random() < 0.4 ? Math.floor(Math.random() * 2) + 1 : 0;
      setFallenCoins((prev) => prev + fell);
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        if (fell > 0) {
          let cleared = 0;
          for (let c = 0; c < COLS && cleared < fell; c++) {
            if (next[ROWS - 1][c]) {
              next[ROWS - 1][c] = false;
              cleared++;
            }
          }
        }
        return next;
      });
      setRound((r) => r + 1);
      setDroppedCol(null);
    }, 500);
  };

  const handleFinish = async () => {
    const didWin = fallenCoins > 0;
    const win = didWin ? fallenCoins * 3 * betNum : 0;
    setWon(didWin);
    setWinAmount(win);
    try {
      await recordOutcome({
        gameType: GameType.coinPusher,
        bet: BigInt(betNum),
        won: didWin,
        winAmount: BigInt(win),
      });
      onGameComplete();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
    setPhase("result");
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
        border: "3px solid #4a4a6a",
        boxShadow:
          "0 0 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {/* LED Marquee */}
      <div
        style={{
          background: "linear-gradient(180deg, #0d0d1a 0%, #1a0a2e 100%)",
          borderBottom: "3px solid #333",
          padding: "12px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,200,0,0.03) 8px, rgba(255,200,0,0.03) 9px)",
          }}
        />
        <h2
          className="text-2xl font-black tracking-widest relative z-10"
          style={{
            color: "#ffd700",
            textShadow: "0 0 10px #ffd700, 0 0 20px #ffa500, 0 0 40px #ff6600",
            fontFamily: "monospace",
          }}
        >
          🪙 COIN PUSHER
        </h2>
        <div className="flex justify-center gap-2 mt-1">
          {[...Array(12)].map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: decorative
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i % 2 === 0 ? "#ffd700" : "#ff6600",
                boxShadow: i % 2 === 0 ? "0 0 4px #ffd700" : "0 0 4px #ff6600",
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm text-center mb-4" style={{ color: "#aaa" }}>
          Drop coins to push others off the edge!
        </p>

        {phase === "bet" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {QUICK_BETS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setBet(q.toString())}
                  className="px-4 py-2 rounded-lg text-xs font-black transition-all"
                  style={
                    bet === q.toString()
                      ? {
                          background: COLOR,
                          color: "#fff",
                          boxShadow: `0 0 12px ${COLOR}60`,
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          color: "#aaa",
                          border: "1px solid #333",
                        }
                  }
                  data-ocid="coinpusher.quickbet.button"
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
              data-ocid="coinpusher.bet.input"
            />
            <Button
              onClick={handleStart}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                color: "#000",
                boxShadow: "0 0 20px rgba(255,215,0,0.4)",
              }}
              data-ocid="coinpusher.play_button"
            >
              🪙 PLAY FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-bold">
              <span style={{ color: COLOR }}>Round {round}/3</span>
              <span style={{ color: "#ffd700" }}>
                Coins fallen: {fallenCoins}
              </span>
            </div>

            {/* Cabinet interior */}
            <div
              style={{
                background: "linear-gradient(180deg, #2a1a0a 0%, #1a1000 100%)",
                border: "4px solid #5a3a1a",
                borderRadius: 12,
                padding: 8,
                boxShadow:
                  "inset 0 4px 12px rgba(0,0,0,0.6), inset 0 -2px 8px rgba(255,180,0,0.1)",
                position: "relative",
              }}
            >
              {/* Chrome shelf/ledge divider */}
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  right: 8,
                  top: "50%",
                  height: 8,
                  background:
                    "linear-gradient(180deg, #d0d0d0 0%, #888 40%, #ccc 60%, #666 100%)",
                  borderRadius: 4,
                  boxShadow:
                    "0 2px 6px rgba(0,0,0,0.5), 0 -1px 2px rgba(255,255,255,0.3)",
                  zIndex: 5,
                }}
              />
              {/* Grid */}
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
              >
                {grid.map((row, r) =>
                  row.map((hasCoin, c) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                      key={`cell-${r}-${c}`}
                      className="aspect-square rounded-full flex items-center justify-center"
                      style={{
                        background: hasCoin
                          ? "radial-gradient(circle at 35% 35%, #ffe066, #ffd700 40%, #b8860b 80%, #8b6914)"
                          : "rgba(0,0,0,0.3)",
                        border: hasCoin
                          ? "1px solid #ffd700"
                          : "1px solid rgba(255,255,255,0.05)",
                        boxShadow: hasCoin
                          ? "0 2px 6px rgba(0,0,0,0.6), 0 0 8px rgba(255,215,0,0.4), inset 0 1px 3px rgba(255,255,255,0.4)"
                          : "none",
                        transition: "all 0.3s",
                      }}
                    />
                  )),
                )}
              </div>
            </div>

            {/* Drop buttons */}
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {(["d0", "d1", "d2", "d3", "d4"] as const).map((id, c) => (
                <Button
                  key={id}
                  size="sm"
                  onClick={() => dropCoin(c)}
                  disabled={round >= 3 || droppedCol !== null}
                  className="font-black text-xs"
                  style={{
                    background:
                      droppedCol === c
                        ? "linear-gradient(180deg, #ffd700, #ff8c00)"
                        : "linear-gradient(180deg, #3a2a0a, #2a1a00)",
                    color: "#ffd700",
                    border: "1px solid #5a3a1a",
                    boxShadow:
                      droppedCol === c
                        ? "0 0 10px rgba(255,215,0,0.6)"
                        : "none",
                  }}
                  data-ocid={`coinpusher.drop_button.${c + 1}`}
                >
                  ▼
                </Button>
              ))}
            </div>
            <p className="text-center text-xs" style={{ color: "#888" }}>
              {round >= 3
                ? "All rounds done!"
                : `Drop a coin (${3 - round} drops left)`}
            </p>
            {round >= 3 && (
              <Button
                onClick={handleFinish}
                className="w-full font-black"
                style={{
                  background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                  color: "#000",
                }}
                data-ocid="coinpusher.finish_button"
              >
                COLLECT WINNINGS
              </Button>
            )}
          </div>
        )}

        {phase === "result" && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-6"
            >
              <div className="text-6xl">{won ? "🎉" : "😔"}</div>
              <h3
                className="text-2xl font-black"
                style={{ color: won ? "#ffd700" : "#e55" }}
              >
                {won ? `+${winAmount} CREDITS!` : "NO COINS FELL"}
              </h3>
              <p style={{ color: "#aaa" }}>
                {won ? `${fallenCoins} coins pushed off!` : "Try again!"}
              </p>
              <Button
                onClick={() => {
                  setPhase("bet");
                  setGrid(genGrid());
                  setFallenCoins(0);
                  setRound(0);
                }}
                className="font-black"
                style={{
                  background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                  color: "#000",
                }}
                data-ocid="coinpusher.play_again_button"
              >
                PLAY AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
