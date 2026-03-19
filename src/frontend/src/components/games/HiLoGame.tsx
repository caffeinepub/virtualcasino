import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const QUICK_BETS = [5, 10, 25, 50, 100];
type Phase = "bet" | "playing" | "result";
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
const RANK_VALUES: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

interface Card {
  rank: string;
  suit: string;
  value: number;
}

function drawCard(): Card {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { rank, suit, value: RANK_VALUES[rank] };
}

function CardFace({ card, revealed }: { card: Card; revealed: boolean }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  const suitColor = isRed ? "#cc0000" : "#111";

  return (
    <div
      className="rounded-xl shadow-2xl relative overflow-hidden"
      style={{
        width: 90,
        height: 130,
        background: revealed
          ? "linear-gradient(145deg, #ffffff 0%, #f8f8f0 100%)"
          : "linear-gradient(145deg, #1a2a6a 0%, #0d1a4a 50%, #1a2a6a 100%)",
        border: revealed ? "2px solid #ccc" : "2px solid #2a4a9a",
        boxShadow: revealed
          ? "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.8)"
          : "0 4px 16px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.05)",
      }}
    >
      {revealed ? (
        <>
          {/* Top-left rank+suit */}
          <div style={{ position: "absolute", top: 6, left: 8, lineHeight: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: suitColor,
                fontFamily: "serif",
              }}
            >
              {card.rank}
            </div>
            <div style={{ fontSize: 12, color: suitColor }}>{card.suit}</div>
          </div>
          {/* Center symbol */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: card.rank === "10" ? 32 : 40,
              color: suitColor,
            }}
          >
            {["J", "Q", "K"].includes(card.rank) ? card.rank : card.suit}
          </div>
          {/* Bottom-right rank+suit (rotated) */}
          <div
            style={{
              position: "absolute",
              bottom: 6,
              right: 8,
              lineHeight: 1,
              transform: "rotate(180deg)",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: suitColor,
                fontFamily: "serif",
              }}
            >
              {card.rank}
            </div>
            <div style={{ fontSize: 12, color: suitColor }}>{card.suit}</div>
          </div>
        </>
      ) : (
        // Card back pattern
        <>
          <div
            style={{
              position: "absolute",
              inset: 4,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 4px, transparent 4px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 4px, transparent 4px, transparent 8px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🃏
          </div>
        </>
      )}
    </div>
  );
}

export default function HiLoGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [currentCard, setCurrentCard] = useState<Card>(drawCard());
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [streak, setStreak] = useState(0);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [resultMsg, setResultMsg] = useState("");
  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setCurrentCard(drawCard());
    setNextCard(null);
    setMultiplier(1.0);
    setStreak(0);
    setPhase("playing");
  };

  const guess = async (higher: boolean) => {
    const next = drawCard();
    setNextCard(next);
    await new Promise((r) => setTimeout(r, 500));
    const correct = higher
      ? next.value > currentCard.value
      : next.value < currentCard.value;
    const tie = next.value === currentCard.value;
    if (tie) {
      toast("Tie! Draw another card.");
      setCurrentCard(next);
      setNextCard(null);
      return;
    }
    if (correct) {
      const newMult = multiplier + 0.5;
      const newStreak = streak + 1;
      setMultiplier(newMult);
      setStreak(newStreak);
      setCurrentCard(next);
      setNextCard(null);
      toast.success(`Correct! ${newMult.toFixed(1)}x`);
    } else {
      setResultMsg("Wrong guess!");
      try {
        await recordOutcome({
          gameType: GameType.hiLo,
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
    }
  };

  const cashOut = async () => {
    const win = Math.round(betNum * multiplier);
    setResultMsg(`Cashed out at ${multiplier.toFixed(1)}x!`);
    try {
      await recordOutcome({
        gameType: GameType.hiLo,
        bet: BigInt(betNum),
        won: true,
        winAmount: BigInt(win),
      });
      onGameComplete();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
    setWon(true);
    setWinAmount(win);
    setPhase("result");
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a1a0a 0%, #051005 100%)",
        border: "3px solid #8a6a00",
        boxShadow: "0 0 0 1px #5a4400, 0 0 30px rgba(180,140,0,0.2)",
      }}
    >
      {/* Casino header with gold trim */}
      <div
        style={{
          background: "linear-gradient(180deg, #2a1a00, #1a1000)",
          borderBottom: "3px solid #c8a000",
          padding: "10px 24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background:
              "linear-gradient(90deg, transparent, #ffd700, transparent)",
          }}
        />
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "#ffd700",
            textShadow:
              "0 0 10px rgba(255,215,0,0.6), 2px 2px 4px rgba(0,0,0,0.8)",
            fontFamily: "serif",
          }}
        >
          🃏 HI-LO
        </h2>
      </div>

      {/* Green felt table area */}
      <div
        style={{
          background:
            "radial-gradient(ellipse at center, #1a4a1a 0%, #0d3010 60%, #071a07 100%)",
          padding: "24px",
          borderBottom: "2px solid #8a6a00",
        }}
      >
        {phase === "bet" && (
          <div className="space-y-4">
            {/* Gold border card table frame */}
            <div
              style={{
                border: "2px solid #8a6a00",
                borderRadius: 12,
                padding: 16,
                background: "rgba(0,0,0,0.2)",
              }}
            >
              <div className="flex gap-2 flex-wrap mb-3">
                {QUICK_BETS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setBet(q.toString())}
                    className="px-4 py-2 rounded-lg text-xs font-black"
                    style={
                      bet === q.toString()
                        ? {
                            background:
                              "linear-gradient(135deg, #ffd700, #aa8800)",
                            color: "#000",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            color: "#aaa",
                            border: "1px solid #5a4400",
                          }
                    }
                    data-ocid="hilo.quickbet.button"
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
                data-ocid="hilo.bet.input"
              />
            </div>
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: "linear-gradient(135deg, #ffd700, #aa8800)",
                color: "#000",
                boxShadow: "0 0 20px rgba(255,215,0,0.4)",
              }}
              data-ocid="hilo.play_button"
            >
              🃏 DEAL FOR {bet} CREDITS
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold">
              <span style={{ color: "#ffd700" }}>Streak: {streak}</span>
              <span style={{ color: "#88ffcc" }}>
                {multiplier.toFixed(1)}x = {Math.round(betNum * multiplier)}{" "}
                credits
              </span>
            </div>
            <div className="flex items-center justify-center gap-8">
              <CardFace card={currentCard} revealed={true} />
              <div
                className="text-4xl font-black"
                style={{
                  color: "#ffd700",
                  textShadow: "0 0 10px rgba(255,215,0,0.5)",
                }}
              >
                →
              </div>
              <CardFace
                card={nextCard ?? { rank: "?", suit: "?", value: 0 }}
                revealed={nextCard !== null}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => guess(true)}
                className="flex-1 py-4 font-black text-lg"
                style={{
                  background: "linear-gradient(135deg, #006600, #004400)",
                  color: "#44ff88",
                  border: "2px solid #44ff88",
                  boxShadow: "0 0 10px rgba(68,255,136,0.3)",
                }}
                data-ocid="hilo.higher_button"
              >
                ⬆ HIGHER
              </Button>
              <Button
                onClick={() => guess(false)}
                className="flex-1 py-4 font-black text-lg"
                style={{
                  background: "linear-gradient(135deg, #660000, #440000)",
                  color: "#ff6644",
                  border: "2px solid #ff6644",
                  boxShadow: "0 0 10px rgba(255,102,68,0.3)",
                }}
                data-ocid="hilo.lower_button"
              >
                ⬇ LOWER
              </Button>
            </div>
            {streak > 0 && (
              <Button
                onClick={cashOut}
                disabled={isPending}
                className="w-full font-black"
                style={{
                  background: "linear-gradient(135deg, #ffd700, #aa8800)",
                  color: "#000",
                  boxShadow: "0 0 15px rgba(255,215,0,0.4)",
                }}
                data-ocid="hilo.cashout_button"
              >
                💰 CASH OUT {multiplier.toFixed(1)}x ={" "}
                {Math.round(betNum * multiplier)} credits
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="p-6">
        {phase === "result" && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-4"
            >
              <div className="text-6xl">{won ? "💰" : "❌"}</div>
              <p style={{ color: "#aaa" }}>{resultMsg}</p>
              <h3
                className="text-2xl font-black"
                style={{ color: won ? "#ffd700" : "#ff4422" }}
              >
                {won ? `+${winAmount} CREDITS!` : "Wrong guess — you lost!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: "linear-gradient(135deg, #ffd700, #aa8800)",
                  color: "#000",
                }}
                data-ocid="hilo.play_again_button"
              >
                DEAL AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
