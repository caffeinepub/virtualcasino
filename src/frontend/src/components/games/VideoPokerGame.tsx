import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import {
  type Card,
  POKER_PAYOUTS,
  type Suit,
  createDeck,
  evaluatePokerHand,
  isRedSuit,
} from "./cardUtils";

const COLOR = "oklch(0.78 0.18 72)";
const QUICK_BETS = [5, 10, 25, 50, 100];
type Phase = "bet" | "deal" | "result";

function PokerCard({
  card,
  held,
  onToggle,
  interactive,
  index = 0,
}: {
  card: Card;
  held: boolean;
  onToggle: () => void;
  interactive: boolean;
  index?: number;
}) {
  const isRed = isRedSuit(card.suit as Suit);

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, rotateX: 90 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="flex flex-col items-center gap-1"
      style={{ perspective: 600 }}
    >
      {held && (
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs font-black tracking-wider"
          style={{ color: "oklch(0.78 0.18 72)" }}
        >
          HELD
        </motion.span>
      )}
      {!held && interactive && (
        <span className="text-xs font-black tracking-wider text-transparent select-none">
          HELD
        </span>
      )}
      <button
        type="button"
        onClick={interactive ? onToggle : undefined}
        className="relative w-16 h-24 rounded-xl flex flex-col justify-between p-2 font-black text-sm shadow-xl transition-all"
        style={{
          background: "white",
          border: held ? "3px solid oklch(0.78 0.18 72)" : "2px solid #ccc",
          boxShadow: held
            ? "0 0 16px oklch(0.78 0.18 72 / 0.6)"
            : "0 4px 12px rgba(0,0,0,0.3)",
          color: isRed ? "#c0392b" : "#1a1a1a",
          transform: held ? "translateY(-6px)" : "none",
          cursor: interactive ? "pointer" : "default",
        }}
        data-ocid="videopoker.card.toggle"
      >
        <div className="flex flex-col leading-none">
          <span style={{ fontSize: 13 }}>{card.rank}</span>
          <span style={{ fontSize: 13 }}>{card.suit}</span>
        </div>
        <div className="self-center" style={{ fontSize: 22 }}>
          {card.suit}
        </div>
        <div className="flex flex-col leading-none self-end rotate-180">
          <span style={{ fontSize: 13 }}>{card.rank}</span>
          <span style={{ fontSize: 13 }}>{card.suit}</span>
        </div>
      </button>
    </motion.div>
  );
}

export default function VideoPokerGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState([false, false, false, false, false]);
  const [handName, setHandName] = useState("");
  const [winAmount, setWinAmount] = useState(0);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleDeal = () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    const d = createDeck();
    const newHand = d.slice(0, 5);
    setDeck(d.slice(5));
    setHand(newHand);
    setHeld([false, false, false, false, false]);
    setHandName("");
    setWinAmount(0);
    setPhase("deal");
  };

  const toggleHold = (i: number) => {
    setHeld((prev) => prev.map((h, idx) => (idx === i ? !h : h)));
  };

  const handleDraw = async () => {
    let d = deck;
    const newHand = hand.map((card, i) => {
      if (held[i]) return card;
      const drawn = d[0];
      d = d.slice(1);
      return drawn;
    });
    setDeck(d);
    setHand(newHand);

    const hn = evaluatePokerHand(newHand);
    const mult = POKER_PAYOUTS[hn];
    const win = betNum * mult;
    const netGain = win - betNum;
    setHandName(hn);
    setWinAmount(netGain);
    setPhase("result");

    try {
      const won = mult > 0;
      await recordOutcome({
        gameType: GameType.videoPoker,
        bet: BigInt(betNum),
        won,
        winAmount: BigInt(win),
      });
      onGameComplete();
      if (mult === 0) toast.error(`${hn} — lost ${betNum} credits.`);
      else if (mult === 1) toast(`${hn} — break even!`);
      else toast.success(`🃏 ${hn}! +${netGain} credits!`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const resetGame = () => {
    setPhase("bet");
    setHand([]);
    setHeld([false, false, false, false, false]);
    setHandName("");
    setWinAmount(0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="font-display font-black text-xl tracking-widest"
          style={{ color: COLOR, textShadow: `0 0 12px ${COLOR}` }}
        >
          VIDEO POKER
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">BALANCE</span>
          <span className="font-black text-gold">{balance.toString()}</span>
        </div>
      </div>

      {/* BET PHASE */}
      {phase === "bet" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: `1px solid ${COLOR}40`,
          }}
        >
          <p className="text-sm text-muted-foreground font-bold tracking-wider">
            PLACE YOUR BET
          </p>
          <div className="flex gap-2 flex-wrap">
            {QUICK_BETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBet(q.toString())}
                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                style={
                  bet === q.toString()
                    ? { background: COLOR, color: "#000" }
                    : {
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
                      }
                }
                data-ocid="videopoker.quickbet.button"
              >
                {q}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min="1"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            className="bg-secondary border-border text-foreground font-bold"
            data-ocid="videopoker.bet.input"
          />
          <Button
            onClick={handleDeal}
            className="w-full py-5 font-black tracking-widest text-black"
            style={{ background: COLOR, boxShadow: `0 0 20px ${COLOR}50` }}
            data-ocid="videopoker.deal.button"
          >
            🃏 DEAL CARDS
          </Button>
        </motion.div>
      )}

      {/* DEAL / RESULT PHASES */}
      {(phase === "deal" || phase === "result") && (
        <div className="space-y-4">
          {/* Cards */}
          <div
            className="rounded-2xl p-6"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.14 0.04 150), oklch(0.10 0.02 160))",
              border: `2px solid ${COLOR}40`,
            }}
          >
            <div className="flex gap-2 justify-center flex-wrap">
              <AnimatePresence mode="wait">
                {hand.map((card, i) => (
                  <PokerCard
                    key={`${card.rank}${card.suit}${i}`}
                    card={card}
                    held={held[i]}
                    onToggle={() => toggleHold(i)}
                    interactive={phase === "deal"}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Result */}
          <AnimatePresence>
            {phase === "result" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl p-4 text-center"
                style={{
                  background:
                    winAmount >= 0
                      ? "oklch(0.78 0.18 72 / 0.1)"
                      : "oklch(0.577 0.245 27 / 0.1)",
                  border: `1px solid ${
                    winAmount >= 0
                      ? "oklch(0.78 0.18 72 / 0.5)"
                      : "oklch(0.577 0.245 27 / 0.5)"
                  }`,
                }}
                data-ocid="videopoker.result.panel"
              >
                <p
                  className="font-black text-2xl mb-1"
                  style={{
                    color:
                      winAmount > 0
                        ? "oklch(0.78 0.18 72)"
                        : winAmount === 0
                          ? COLOR
                          : "oklch(0.577 0.245 27)",
                  }}
                >
                  {handName}
                </p>
                <p className="text-muted-foreground text-sm">
                  {winAmount > 0
                    ? `+${winAmount} credits`
                    : winAmount === 0
                      ? "Break even"
                      : `Lost ${betNum} credits`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2">
            {phase === "deal" && (
              <Button
                onClick={handleDraw}
                className="flex-1 py-4 font-black tracking-widest text-black"
                style={{ background: COLOR, boxShadow: `0 0 20px ${COLOR}50` }}
                data-ocid="videopoker.draw.button"
              >
                🃏 DRAW (hold selected)
              </Button>
            )}
            {phase === "result" && (
              <Button
                onClick={resetGame}
                className="flex-1 py-4 font-black tracking-widest text-black"
                style={{ background: COLOR }}
                data-ocid="videopoker.play_again.button"
                disabled={isPending}
              >
                PLAY AGAIN
              </Button>
            )}
          </div>

          {phase === "deal" && (
            <p className="text-center text-xs text-muted-foreground">
              Click cards to hold them, then click DRAW
            </p>
          )}
        </div>
      )}

      {/* Paytable */}
      <div
        className="rounded-xl p-3"
        style={{
          background: "oklch(0.10 0.012 280)",
          border: "1px solid oklch(0.16 0.02 280)",
        }}
      >
        <p className="text-xs font-black tracking-wider text-muted-foreground mb-2">
          JACKS OR BETTER — PAYTABLE
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          {(Object.entries(POKER_PAYOUTS) as [string, number][]).map(
            ([hand, mult]) => (
              <div key={hand} className="flex justify-between">
                <span className="text-muted-foreground">{hand}</span>
                <span
                  className="font-black"
                  style={{
                    color:
                      mult >= 25
                        ? "oklch(0.78 0.18 72)"
                        : mult > 0
                          ? COLOR
                          : "oklch(0.45 0.02 270)",
                  }}
                >
                  {mult > 0 ? `${mult}×` : "—"}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
