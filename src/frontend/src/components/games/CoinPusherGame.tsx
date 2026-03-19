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
        // shift column down
        for (let r = ROWS - 1; r > 0; r--) {
          next[r][col] = next[r - 1][col];
        }
        next[0][col] = true;
        return next;
      });
      // bottom row coins fall off with 40% chance
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
        🪙 COIN PUSHER
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
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
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
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
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.65 0.22 55))`,
              color: "#fff",
              boxShadow: `0 0 20px ${COLOR}40`,
            }}
            data-ocid="coinpusher.play_button"
          >
            🪙 PLAY FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-4">
          <div className="flex justify-between text-sm font-bold">
            <span style={{ color: COLOR }}>Round {round}/3</span>
            <span className="text-yellow-400">Coins fallen: {fallenCoins}</span>
          </div>
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
                  className="aspect-square rounded-full flex items-center justify-center text-lg"
                  style={{
                    background: hasCoin
                      ? "oklch(0.78 0.18 72 / 0.9)"
                      : "oklch(0.14 0.02 280)",
                    border: "1px solid oklch(0.22 0.03 275)",
                    boxShadow: hasCoin ? `0 0 6px ${COLOR}60` : "none",
                    transition: "all 0.3s",
                  }}
                >
                  {hasCoin ? "🪙" : ""}
                </div>
              )),
            )}
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
                  background: droppedCol === c ? COLOR : "oklch(0.20 0.03 280)",
                  color: "#fff",
                }}
                data-ocid={`coinpusher.drop_button.${c + 1}`}
              >
                ▼
              </Button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {round >= 3
              ? "All rounds done!"
              : `Drop a coin in any column (${3 - round} drops left)`}
          </p>
          {round >= 3 && (
            <Button
              onClick={handleFinish}
              disabled={false}
              className="w-full font-black"
              style={{ background: COLOR, color: "#fff" }}
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
              style={{ color: won ? COLOR : "oklch(0.577 0.245 27)" }}
            >
              {won ? `+${winAmount} CREDITS!` : "NO COINS FELL"}
            </h3>
            <p className="text-muted-foreground">
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
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="coinpusher.play_again_button"
            >
              PLAY AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
