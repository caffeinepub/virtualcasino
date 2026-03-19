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
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a0f0a 0%, #050a05 100%)",
        border: "4px solid #ff3300",
        boxShadow: "0 0 0 1px #330000, 0 0 30px rgba(255,50,0,0.2)",
      }}
    >
      {/* Warning header */}
      <div
        style={{
          background:
            "repeating-linear-gradient(45deg, #1a0000 0px, #1a0000 20px, #2a0a00 20px, #2a0a00 40px)",
          borderBottom: "3px solid #ff3300",
          padding: "10px 24px",
          textAlign: "center",
        }}
      >
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "#ffdd00",
            textShadow: "0 0 10px #ff8800, 2px 2px 0 #000",
            fontFamily: "monospace",
            letterSpacing: "0.3em",
          }}
        >
          ⚠ MINE FIELD ⚠
        </h2>
        <p
          style={{
            color: "#ff6600",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            fontFamily: "monospace",
          }}
        >
          DANGER — EXPLOSIVE AREA — PROCEED WITH CAUTION
        </p>
      </div>

      <div className="p-6">
        <p className="text-sm text-center mb-4" style={{ color: "#88aa88" }}>
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
                          background: "rgba(255,255,255,0.05)",
                          color: "#aaa",
                          border: "1px solid #333",
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
              <span className="text-sm font-black" style={{ color: "#ffd700" }}>
                {currentMultiplier.toFixed(2)}x ={" "}
                {Math.round(betNum * currentMultiplier)} credits
              </span>
              <span className="text-sm" style={{ color: "#ff6600" }}>
                💣 5 mines
              </span>
            </div>
            {/* Gunmetal grid */}
            <div
              style={{
                background: "linear-gradient(180deg, #1a1f1a, #0f140f)",
                border: "3px solid #ff3300",
                borderRadius: 8,
                padding: 8,
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.7)",
              }}
            >
              <div className="grid grid-cols-5 gap-2">
                {tiles.map((t, i) => (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
                    key={`tile-${i}`}
                    type="button"
                    onClick={() => revealTile(i)}
                    className="aspect-square rounded font-black text-xl transition-all relative overflow-hidden"
                    style={{
                      background:
                        t === "hidden"
                          ? "linear-gradient(135deg, #2a3028, #1a2018)"
                          : t === "safe"
                            ? "linear-gradient(135deg, #0a3a1a, #062a10)"
                            : "linear-gradient(135deg, #3a0a00, #2a0500)",
                      border:
                        t === "hidden"
                          ? "1px solid #3a4038"
                          : t === "safe"
                            ? "2px solid #44ff88"
                            : "2px solid #ff2200",
                      boxShadow:
                        t === "safe"
                          ? "0 0 10px rgba(68,255,136,0.5), inset 0 0 8px rgba(68,255,136,0.1)"
                          : t === "mine"
                            ? "0 0 14px rgba(255,34,0,0.7), inset 0 0 8px rgba(255,34,0,0.2)"
                            : "inset 0 1px 3px rgba(255,255,255,0.05), inset 0 -1px 3px rgba(0,0,0,0.5)",
                      cursor: t === "hidden" ? "pointer" : "default",
                    }}
                    data-ocid={`mines.tile.${i + 1}`}
                  >
                    {/* Rivets on hidden tiles */}
                    {t === "hidden" &&
                      [
                        ["2px", "2px"],
                        ["2px", "auto"],
                        ["auto", "2px"],
                        ["auto", "auto"],
                      ].map(([top, bottom], ri) => (
                        <div
                          // biome-ignore lint/suspicious/noArrayIndexKey: decorative
                          key={ri}
                          style={{
                            position: "absolute",
                            top: top === "auto" ? undefined : top,
                            bottom: bottom === "auto" ? undefined : bottom,
                            left: ri % 2 === 0 ? "2px" : undefined,
                            right: ri % 2 === 1 ? "2px" : undefined,
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background:
                              "radial-gradient(circle at 35% 35%, #888, #333)",
                          }}
                        />
                      ))}
                    <span style={{ position: "relative", zIndex: 1 }}>
                      {t === "safe" ? "✅" : t === "mine" ? "💥" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={cashOut}
                disabled={isPending || safeCount === 0}
                className="flex-1 font-black"
                style={{
                  background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                  color: "#000",
                }}
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
                style={{ color: won ? "#ffd700" : "#ff2200" }}
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
    </div>
  );
}
