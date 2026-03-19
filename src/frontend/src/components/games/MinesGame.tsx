import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.68 0.22 150)";
const QUICK_BETS = [5, 10, 25, 50, 100];
const GRID_SIZE = 25;
const MINE_COUNT = 5;
type Phase = "bet" | "playing" | "result";
type TileState = "hidden" | "safe" | "mine";

function placeMines(): Set<number> {
  const mines = new Set<number>();
  while (mines.size < MINE_COUNT)
    mines.add(Math.floor(Math.random() * GRID_SIZE));
  return mines;
}

export default function MinesGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [tiles, setTiles] = useState<TileState[]>(
    Array(GRID_SIZE).fill("hidden"),
  );
  const [safeCount, setSafeCount] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const currentMultiplier = Math.max(1, 1 + safeCount * 0.3);

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setMines(placeMines());
    setTiles(Array(GRID_SIZE).fill("hidden"));
    setSafeCount(0);
    setPhase("playing");
  };

  const revealTile = (idx: number) => {
    if (tiles[idx] !== "hidden" || phase !== "playing") return;
    if (mines.has(idx)) {
      // Hit a mine!
      setTiles((prev) =>
        prev.map((t, i) => (mines.has(i) ? "mine" : t === "hidden" ? t : t)),
      );
      setTiles((prev) => {
        const n = [...prev];
        n[idx] = "mine";
        return n;
      });
      setTimeout(async () => {
        setTiles((prev) => prev.map((t, i) => (mines.has(i) ? "mine" : t)));
        try {
          await recordOutcome({
            gameType: GameType.mines,
            bet: BigInt(betNum),
            won: false,
            winAmount: BigInt(0),
          });
          onGameComplete();
        } catch (e: any) {
          toast.error(e?.message ?? "Error");
        }
        setWon(false);
        setWinAmount(0);
        setPhase("result");
      }, 600);
    } else {
      const newCount = safeCount + 1;
      setSafeCount(newCount);
      setTiles((prev) => {
        const n = [...prev];
        n[idx] = "safe";
        return n;
      });
    }
  };

  const cashOut = async () => {
    if (safeCount === 0) {
      toast.error("Reveal at least one tile first!");
      return;
    }
    const win = Math.round(betNum * currentMultiplier);
    setWon(true);
    setWinAmount(win);
    setTiles((prev) => prev.map((t, i) => (mines.has(i) ? "mine" : t)));
    try {
      await recordOutcome({
        gameType: GameType.mines,
        bet: BigInt(betNum),
        won: true,
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
        💣 MINES
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Avoid 5 hidden mines. Cash out anytime!
      </p>

      {phase === "bet" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {QUICK_BETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBet(q.toString())}
                className="px-4 py-2 rounded-lg text-xs font-black"
                style={
                  bet === q.toString()
                    ? { background: COLOR, color: "#fff" }
                    : {
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
                      }
                }
                data-ocid="mines.quickbet.button"
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
            data-ocid="mines.bet.input"
          />
          <Button
            onClick={startGame}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.25 290))`,
              color: "#fff",
            }}
            data-ocid="mines.play_button"
          >
            💣 PLAY FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold" style={{ color: COLOR }}>
              Safe: {safeCount} tiles
            </span>
            <span className="text-sm font-black text-yellow-400">
              {currentMultiplier.toFixed(2)}x ={" "}
              {Math.round(betNum * currentMultiplier)} credits
            </span>
            <span className="text-sm text-muted-foreground">
              💣 5 mines hidden
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {tiles.map((t, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                key={`tile-${i}`}
                type="button"
                onClick={() => revealTile(i)}
                className="aspect-square rounded-xl text-2xl font-black transition-all"
                style={{
                  background:
                    t === "hidden"
                      ? "oklch(0.16 0.025 278)"
                      : t === "safe"
                        ? "oklch(0.25 0.12 150)"
                        : "oklch(0.30 0.20 20)",
                  border:
                    t === "hidden"
                      ? "1px solid oklch(0.22 0.03 275)"
                      : t === "safe"
                        ? `1px solid ${COLOR}`
                        : "1px solid oklch(0.577 0.245 27)",
                  boxShadow:
                    t === "safe"
                      ? `0 0 8px ${COLOR}60`
                      : t === "mine"
                        ? "0 0 8px oklch(0.577 0.245 27 / 0.6)"
                        : "none",
                  cursor: t === "hidden" ? "pointer" : "default",
                }}
                data-ocid={`mines.tile.${i + 1}`}
              >
                {t === "hidden" ? "" : t === "safe" ? "✨" : "💣"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={cashOut}
              disabled={isPending || safeCount === 0}
              className="flex-1 font-black"
              style={{ background: "oklch(0.78 0.18 72)", color: "#000" }}
              data-ocid="mines.cashout_button"
            >
              💰 CASH OUT {currentMultiplier.toFixed(2)}x
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
            <div className="text-6xl">{won ? "💰" : "💥"}</div>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won ? `+${winAmount} CREDITS!` : "BOOM! Hit a mine!"}
            </h3>
            <Button
              onClick={() => setPhase("bet")}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="mines.play_again_button"
            >
              PLAY AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
