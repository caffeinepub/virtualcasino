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

type Phase = "bet" | "set" | "result";

const COLOR = "oklch(0.65 0.22 55)";
const QUICK_BETS = [5, 10, 25, 50, 100];

function handStrength(cards: Card[]): number {
  if (cards.length === 5) {
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
    return (order.length - 1 - idx) * 1000 + topCardValue(cards);
  }
  if (cards.length === 2) {
    const ranks = cards
      .map((c) => rankNumericValue(c.rank))
      .sort((a, b) => b - a);
    if (ranks[0] === ranks[1]) return ranks[0] * 100 + ranks[1];
    return ranks[0] * 15 + ranks[1];
  }
  return 0;
}

function topCardValue(cards: Card[]): number {
  return Math.max(...cards.map((c) => rankNumericValue(c.rank)));
}

function houseWay(cards: Card[]): { high: Card[]; low: Card[] } {
  // Try all C(7,5) = 21 combinations for best 5-card high hand
  let bestHigh: Card[] = [];
  let bestLow: Card[] = [];
  let bestScore = -1;

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const low = [cards[i], cards[j]];
      const high = cards.filter((_, idx) => idx !== i && idx !== j);
      const score = handStrength(high) * 10 + handStrength(low);
      if (score > bestScore) {
        bestScore = score;
        bestHigh = high;
        bestLow = low;
      }
    }
  }
  return { high: bestHigh, low: bestLow };
}

function GameCard({
  card,
  index = 0,
  selected,
  onClick,
}: {
  card: Card;
  index?: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  const isRed = isRedSuit(card.suit as Suit);
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, rotateY: 90 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      onClick={onClick}
      className="w-12 rounded-lg flex flex-col justify-between p-1 font-black text-xs shadow-lg select-none cursor-pointer transition-all"
      style={{
        background: "white",
        border: selected ? `2px solid ${COLOR}` : "1px solid #ccc",
        color: isRed ? "#c0392b" : "#1a1a1a",
        minWidth: "3rem",
        minHeight: "4.5rem",
        boxShadow: selected ? `0 0 12px ${COLOR}80` : undefined,
        transform: selected ? "translateY(-6px)" : undefined,
      }}
    >
      <div className="flex flex-col leading-none">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
      <div className="self-center text-base">{card.suit}</div>
      <div className="flex flex-col leading-none self-end rotate-180">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
    </motion.div>
  );
}

export default function PaiGowPokerGame({
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
  const [highHand, setHighHand] = useState<Card[]>([]);
  const [lowHand, setLowHand] = useState<Card[]>([]);
  const [unassigned, setUnassigned] = useState<Card[]>([]);
  const [resultMsg, setResultMsg] = useState("");
  const [netGain, setNetGain] = useState(0);

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
    const pCards = deck.slice(0, 7);
    const dCards = deck.slice(7, 14);
    setPlayerCards(pCards);
    setDealerCards(dCards);
    setUnassigned(pCards);
    setHighHand([]);
    setLowHand([]);
    setPhase("set");
  };

  const toggleCardHigh = (card: Card) => {
    const inHigh = highHand.some((c) => c === card);
    const inLow = lowHand.some((c) => c === card);
    if (inHigh) {
      setHighHand((prev) => prev.filter((c) => c !== card));
      setUnassigned((prev) => [...prev, card]);
    } else if (inLow) {
      setLowHand((prev) => prev.filter((c) => c !== card));
      setUnassigned((prev) => [...prev, card]);
    } else {
      if (highHand.length < 5) {
        setHighHand((prev) => [...prev, card]);
        setUnassigned((prev) => prev.filter((c) => c !== card));
      } else if (lowHand.length < 2) {
        setLowHand((prev) => [...prev, card]);
        setUnassigned((prev) => prev.filter((c) => c !== card));
      }
    }
  };

  const handleAutoSet = () => {
    const { high, low } = houseWay(playerCards);
    setHighHand(high);
    setLowHand(low);
    setUnassigned([]);
  };

  const handleSetHand = async () => {
    if (highHand.length !== 5 || lowHand.length !== 2) {
      toast.error("Set exactly 5 cards as high hand and 2 cards as low hand");
      return;
    }
    if (handStrength(highHand) < handStrength(lowHand) * 100) {
      toast.error("High hand must be stronger than low hand!");
      return;
    }

    const { high: dHigh, low: dLow } = houseWay(dealerCards);
    const playerHighWins = handStrength(highHand) > handStrength(dHigh);
    const playerLowWins = handStrength(lowHand) > handStrength(dLow);

    let net = 0;
    let msg = "";
    if (playerHighWins && playerLowWins) {
      net = Math.floor(betNum * 0.95);
      msg = `Both hands win! +${net} credits!`;
    } else if (!playerHighWins && !playerLowWins) {
      net = -betNum;
      msg = `Both hands lose. -${betNum} credits.`;
    } else {
      net = 0;
      msg = "One hand each — Push! Bet returned.";
    }

    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");

    try {
      const won = net > 0;
      await recordOutcome({
        gameType: GameType.paiGowPoker,
        bet: BigInt(betNum),
        won,
        winAmount: won ? BigInt(net + betNum) : BigInt(0),
      });
      onGameComplete();
      if (net > 0) toast.success(`🎉 ${msg}`);
      else if (net === 0) toast("Push!");
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
    setPlayerCards([]);
    setDealerCards([]);
    setHighHand([]);
    setLowHand([]);
    setUnassigned([]);
    setResultMsg("");
    setNetGain(0);
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
              PAI GOW POKER
            </h3>
            <p
              className="text-center text-sm"
              style={{ color: "oklch(0.65 0.05 280)" }}
            >
              Split 7 cards into 5-card high and 2-card low hands
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

        {phase === "set" && (
          <motion.div
            key="set"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <h3 className="font-black text-center" style={{ color: COLOR }}>
              SET YOUR HANDS
            </h3>
            <p
              className="text-xs text-center"
              style={{ color: "oklch(0.6 0.04 280)" }}
            >
              Click cards to assign — 5 to High, 2 to Low
            </p>
            <div className="space-y-2">
              <p className="text-sm font-bold" style={{ color: COLOR }}>
                HIGH HAND ({highHand.length}/5):{" "}
                {highHand.length === 5 ? evaluatePokerHand(highHand) : "--"}
              </p>
              <div
                className="flex flex-wrap gap-2 min-h-16 p-2 rounded"
                style={{ background: "oklch(0.14 0.02 55)" }}
              >
                {highHand.map((c, i) => (
                  <GameCard
                    key={`${c.rank}${c.suit}`}
                    card={c}
                    index={i}
                    selected
                    onClick={() => toggleCardHigh(c)}
                  />
                ))}
              </div>
              <p
                className="text-sm font-bold"
                style={{ color: "oklch(0.75 0.12 55)" }}
              >
                LOW HAND ({lowHand.length}/2)
              </p>
              <div
                className="flex flex-wrap gap-2 min-h-16 p-2 rounded"
                style={{ background: "oklch(0.14 0.01 55)" }}
              >
                {lowHand.map((c, i) => (
                  <GameCard
                    key={`${c.rank}${c.suit}`}
                    card={c}
                    index={i}
                    selected
                    onClick={() => toggleCardHigh(c)}
                  />
                ))}
              </div>
              <p
                className="text-sm font-bold"
                style={{ color: "oklch(0.65 0.05 280)" }}
              >
                UNASSIGNED
              </p>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((c, i) => (
                  <GameCard
                    key={`${c.rank}${c.suit}`}
                    card={c}
                    index={i}
                    onClick={() => toggleCardHigh(c)}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleAutoSet}
                variant="outline"
                className="flex-1 text-sm"
                style={{ borderColor: COLOR, color: COLOR }}
              >
                AUTO-SET
              </Button>
              <Button
                onClick={handleSetHand}
                disabled={
                  isPending || highHand.length !== 5 || lowHand.length !== 2
                }
                className="flex-1 font-black"
                style={{ background: COLOR }}
              >
                SET HAND
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: COLOR }}>
                  YOUR HIGH ({evaluatePokerHand(highHand)})
                </p>
                <div className="flex flex-wrap gap-1">
                  {highHand.map((c, i) => (
                    <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                  ))}
                </div>
              </div>
              <div>
                <p
                  className="text-sm font-bold mb-2"
                  style={{ color: "oklch(0.75 0.12 55)" }}
                >
                  DEALER HIGH
                </p>
                <div className="flex flex-wrap gap-1">
                  {houseWay(dealerCards).high.map((c, i) => (
                    <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: COLOR }}>
                  YOUR LOW
                </p>
                <div className="flex flex-wrap gap-1">
                  {lowHand.map((c, i) => (
                    <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                  ))}
                </div>
              </div>
              <div>
                <p
                  className="text-sm font-bold mb-2"
                  style={{ color: "oklch(0.75 0.12 55)" }}
                >
                  DEALER LOW
                </p>
                <div className="flex flex-wrap gap-1">
                  {houseWay(dealerCards).low.map((c, i) => (
                    <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                  ))}
                </div>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg p-4 text-center space-y-2"
              style={{
                background:
                  netGain >= 0 ? "oklch(0.15 0.08 150)" : "oklch(0.15 0.08 20)",
              }}
            >
              <p
                className="font-black text-lg"
                style={{
                  color:
                    netGain >= 0 ? "oklch(0.75 0.2 150)" : "oklch(0.75 0.2 20)",
                }}
              >
                {netGain >= 0 ? `+${netGain}` : netGain} CREDITS
              </p>
              <p className="text-sm" style={{ color: "oklch(0.75 0.05 280)" }}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
