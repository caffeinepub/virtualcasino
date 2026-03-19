import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

const COLOR = "oklch(0.70 0.20 190)";
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
  return (
    <div
      className="w-24 h-36 rounded-xl flex flex-col items-center justify-center font-black text-2xl shadow-lg"
      style={{
        background: revealed ? "#fff" : "oklch(0.20 0.04 280)",
        border: revealed
          ? "2px solid oklch(0.40 0.05 280)"
          : `2px solid ${COLOR}60`,
        transition: "all 0.3s",
      }}
    >
      {revealed ? (
        <>
          <span style={{ color: isRed ? "#e00" : "#111" }}>{card.rank}</span>
          <span style={{ color: isRed ? "#e00" : "#111", fontSize: "1.5rem" }}>
            {card.suit}
          </span>
        </>
      ) : (
        <span style={{ color: COLOR, fontSize: "2rem" }}>🃏</span>
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
        🃏 HI-LO
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Guess higher or lower. Chain for bigger multipliers!
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
          <Button
            onClick={startGame}
            className="w-full py-6 font-black tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.25 290))`,
              color: "#fff",
            }}
            data-ocid="hilo.play_button"
          >
            🃏 DEAL FOR {bet} CREDITS
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-6">
          <div className="flex justify-between text-sm font-bold">
            <span style={{ color: COLOR }}>Streak: {streak}</span>
            <span className="text-yellow-400">
              {multiplier.toFixed(1)}x = {Math.round(betNum * multiplier)}{" "}
              credits
            </span>
          </div>
          <div className="flex items-center justify-center gap-8">
            <CardFace card={currentCard} revealed={true} />
            <div className="text-4xl font-black" style={{ color: COLOR }}>
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
              style={{ background: "oklch(0.68 0.22 150)", color: "#fff" }}
              data-ocid="hilo.higher_button"
            >
              ⬆ HIGHER
            </Button>
            <Button
              onClick={() => guess(false)}
              className="flex-1 py-4 font-black text-lg"
              style={{ background: "oklch(0.60 0.24 20)", color: "#fff" }}
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
              style={{ background: "oklch(0.78 0.18 72)", color: "#000" }}
              data-ocid="hilo.cashout_button"
            >
              💰 CASH OUT {multiplier.toFixed(1)}x ={" "}
              {Math.round(betNum * multiplier)} credits
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
            <div className="text-6xl">{won ? "💰" : "❌"}</div>
            <p className="text-muted-foreground">{resultMsg}</p>
            <h3
              className="text-2xl font-black"
              style={{
                color: won ? "oklch(0.78 0.18 72)" : "oklch(0.577 0.245 27)",
              }}
            >
              {won ? `+${winAmount} CREDITS!` : "Wrong guess — you lost!"}
            </h3>
            <Button
              onClick={() => setPhase("bet")}
              className="font-black"
              style={{ background: COLOR, color: "#fff" }}
              data-ocid="hilo.play_again_button"
            >
              DEAL AGAIN
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
