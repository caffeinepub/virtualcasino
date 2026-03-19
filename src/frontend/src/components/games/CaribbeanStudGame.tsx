import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import {
  type Card,
  type Suit,
  createDeck,
  evaluatePokerHand,
  isRedSuit,
  rankNumericValue,
} from "./cardUtils";

type Phase = "bet" | "decision" | "result";

const COLOR = "oklch(0.70 0.20 190)";
const QUICK_BETS = [5, 10, 25, 50, 100];

const RAISE_PAYOUTS: Record<string, number> = {
  "Royal Flush": 100,
  "Straight Flush": 50,
  "Four of a Kind": 20,
  "Full House": 7,
  Flush: 5,
  Straight: 4,
  "Three of a Kind": 3,
  "Two Pair": 2,
  "Jacks or Better": 1,
  Nothing: 1,
};

function dealerQualifies(cards: Card[]): boolean {
  const hand = evaluatePokerHand(cards);
  if (hand !== "Nothing" && hand !== "Jacks or Better") return true;
  // Check A-K or better
  const ranks = cards
    .map((c) => rankNumericValue(c.rank))
    .sort((a, b) => b - a);
  if (ranks[0] === 14 && ranks[1] >= 13) return true; // Has Ace and King
  return false;
}

function pokerHandScore(cards: Card[]): number {
  const hand = evaluatePokerHand(cards);
  const order = [
    "Royal Flush",
    "Straight Flush",
    "Four of a Kind",
    "Full House",
    "Flush",
    "Straight",
    "Three of a Kind",
    "Two Pair",
    "Jacks or Better",
    "Nothing",
  ];
  const idx = order.indexOf(hand);
  return (
    (order.length - 1 - idx) * 1000 +
    Math.max(...cards.map((c) => rankNumericValue(c.rank)))
  );
}

function GameCard({ card, index = 0 }: { card: Card; index?: number }) {
  const isRed = isRedSuit(card.suit as Suit);
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, rotateY: 90 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: index * 0.15, duration: 0.3 }}
      className="w-12 rounded-lg flex flex-col justify-between p-1 font-black text-xs shadow-lg select-none"
      style={{
        background: card.faceDown ? "oklch(0.2 0.08 200)" : "white",
        border: card.faceDown ? `2px solid ${COLOR}` : "1px solid #ccc",
        color: isRed ? "#c0392b" : "#1a1a1a",
        minWidth: "3rem",
        minHeight: "4.5rem",
      }}
    >
      {card.faceDown ? (
        <div
          className="flex items-center justify-center h-full"
          style={{ color: COLOR }}
        >
          ?
        </div>
      ) : (
        <>
          <div className="flex flex-col leading-none">
            <span>{card.rank}</span>
            <span>{card.suit}</span>
          </div>
          <div className="self-center text-base">{card.suit}</div>
          <div className="flex flex-col leading-none self-end rotate-180">
            <span>{card.rank}</span>
            <span>{card.suit}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function CaribbeanStudGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [resultMsg, setResultMsg] = useState("");
  const [netGain, setNetGain] = useState(0);
  const [deckRef, setDeckRef] = useState<Card[]>([]);

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
    const deck = createDeck(1);
    const pCards = deck.slice(0, 5);
    const dCards = [
      { ...deck[5], faceDown: true },
      { ...deck[6], faceDown: true },
      { ...deck[7], faceDown: true },
      { ...deck[8], faceDown: true },
      deck[9],
    ];
    setPlayerCards(pCards);
    setDealerCards(dCards);
    setDeckRef(deck);
    setPhase("decision");
  };

  const handleFold = async () => {
    const net = -betNum;
    setNetGain(net);
    setResultMsg(`You folded — lost ${betNum} credits.`);
    setDealerCards(deckRef.slice(5, 10));
    setPhase("result");
    try {
      await recordOutcome({
        gameType: GameType.caribbeanStud,
        bet: BigInt(betNum),
        won: false,
        winAmount: BigInt(0),
      });
      onGameComplete();
      toast.error(`Folded — lost ${betNum} credits.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const handleRaise = async () => {
    const revealedDealer = deckRef.slice(5, 10);
    const raises = betNum * 2;
    const totalBet = betNum + raises;

    const pHand = evaluatePokerHand(playerCards);
    const dQualifies = dealerQualifies(revealedDealer);

    let net = 0;
    let msg = "";

    if (!dQualifies) {
      net = betNum; // ante pays 1:1, raise pushes
      msg = `Dealer doesn't qualify! Ante pays 1:1. +${net} credits!`;
    } else {
      const pScore = pokerHandScore(playerCards);
      const dScore = pokerHandScore(revealedDealer);
      if (pScore > dScore) {
        const raisePay = RAISE_PAYOUTS[pHand] ?? 1;
        net = betNum + raises * raisePay; // ante 1:1 + raise based on hand
        msg = `You win with ${pHand}! +${net} credits!`;
      } else {
        net = -totalBet;
        msg = `Dealer wins. -${totalBet} credits.`;
      }
    }

    setDealerCards(revealedDealer);
    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");

    try {
      const won = net > 0;
      await recordOutcome({
        gameType: GameType.caribbeanStud,
        bet: BigInt(totalBet),
        won,
        winAmount: won ? BigInt(net + totalBet) : BigInt(0),
      });
      onGameComplete();
      if (net > 0) toast.success(`🎉 ${msg}`);
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
    setPlayerCards([]);
    setDealerCards([]);
    setResultMsg("");
    setNetGain(0);
    setDeckRef([]);
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {phase === "bet" && (
          <motion.div
            key="bet"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <h3
              className="font-black text-lg tracking-widest text-center"
              style={{ color: COLOR }}
            >
              CARIBBEAN STUD
            </h3>
            <p
              className="text-center text-sm"
              style={{ color: "oklch(0.65 0.05 280)" }}
            >
              Beat the dealer's 5-card hand
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_BETS.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setBet(String(q))}
                  className="rounded px-3 py-1.5 text-sm font-bold transition-all"
                  style={{
                    background: betNum === q ? COLOR : "oklch(0.16 0.02 280)",
                    border: `1px solid ${betNum === q ? COLOR : "oklch(0.25 0.03 280)"}`,
                    color: betNum === q ? "white" : "oklch(0.65 0.05 280)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <Input
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              type="number"
              min={1}
              placeholder="Custom bet"
              className="bg-transparent border-white/20 text-white"
            />
            <Button
              onClick={handleDeal}
              disabled={isPending}
              className="w-full font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 20px ${COLOR}60` }}
            >
              DEAL
            </Button>
          </motion.div>
        )}

        {(phase === "decision" || phase === "result") && (
          <motion.div
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-5 space-y-5"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <div className="space-y-2">
              <p
                className="text-sm font-bold tracking-wider"
                style={{ color: "oklch(0.65 0.05 280)" }}
              >
                DEALER
              </p>
              <div className="flex gap-2">
                {dealerCards.map((c, i) => (
                  <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p
                className="text-sm font-bold tracking-wider"
                style={{ color: COLOR }}
              >
                YOUR HAND — {evaluatePokerHand(playerCards)}
              </p>
              <div className="flex gap-2">
                {playerCards.map((c, i) => (
                  <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                ))}
              </div>
            </div>
            {phase === "decision" && (
              <div className="flex gap-3">
                <Button
                  onClick={handleFold}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 font-black"
                  style={{
                    borderColor: "oklch(0.55 0.2 20)",
                    color: "oklch(0.55 0.2 20)",
                  }}
                >
                  FOLD
                </Button>
                <Button
                  onClick={handleRaise}
                  disabled={isPending}
                  className="flex-1 font-black"
                  style={{ background: COLOR }}
                >
                  RAISE (×{betNum * 2})
                </Button>
              </div>
            )}
            {phase === "result" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg p-4 text-center space-y-2"
                style={{
                  background:
                    netGain >= 0
                      ? "oklch(0.15 0.08 150)"
                      : "oklch(0.15 0.08 20)",
                }}
              >
                <p
                  className="font-black text-lg"
                  style={{
                    color:
                      netGain >= 0
                        ? "oklch(0.75 0.2 150)"
                        : "oklch(0.75 0.2 20)",
                  }}
                >
                  {netGain >= 0 ? `+${netGain}` : netGain} CREDITS
                </p>
                <p
                  className="text-sm"
                  style={{ color: "oklch(0.75 0.05 280)" }}
                >
                  {resultMsg}
                </p>
                <Button
                  onClick={reset}
                  className="mt-2 font-black"
                  style={{ background: COLOR }}
                >
                  PLAY AGAIN
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
