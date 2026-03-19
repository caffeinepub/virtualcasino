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

type Phase = "bet" | "flop" | "result";

const COLOR = "oklch(0.68 0.22 150)";
const QUICK_BETS = [5, 10, 25, 50, 100];

const HOLDEM_PAYOUTS: Record<string, number> = {
  "Royal Flush": 100,
  "Straight Flush": 20,
  "Four of a Kind": 10,
  "Full House": 7,
  Flush: 4,
  Straight: 3,
  "Three of a Kind": 2,
  "Two Pair": 1,
  "Jacks or Better": 1,
  Nothing: 1,
};

function bestFiveFromSeven(cards: Card[]): Card[] {
  let best: Card[] = [];
  let bestScore = -1;
  const handOrder = [
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
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const five = cards.filter((_, idx) => idx !== i && idx !== j);
      const hand = evaluatePokerHand(five);
      const idx = handOrder.indexOf(hand);
      const score =
        (handOrder.length - 1 - idx) * 1000 +
        Math.max(...five.map((c) => rankNumericValue(c.rank)));
      if (score > bestScore) {
        bestScore = score;
        best = five;
      }
    }
  }
  return best;
}

function dealerQualifies(best5: Card[]): boolean {
  const hand = evaluatePokerHand(best5);
  if (hand !== "Nothing" && hand !== "Jacks or Better") return true;
  // Pair of 4s or better
  const ranks = best5.map((c) => rankNumericValue(c.rank));
  const counts: Record<number, number> = {};
  for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1;
  const pairRank = Number(
    Object.entries(counts).find(([, v]) => v >= 2)?.[0] ?? 0,
  );
  if (pairRank >= 4) return true;
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
      className="w-10 rounded-lg flex flex-col justify-between p-1 font-black text-xs shadow-lg select-none"
      style={{
        background: card.faceDown ? "oklch(0.2 0.08 150)" : "white",
        border: card.faceDown ? `2px solid ${COLOR}` : "1px solid #ccc",
        color: isRed ? "#c0392b" : "#1a1a1a",
        minWidth: "2.5rem",
        minHeight: "4rem",
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
          <div className="self-center text-sm">{card.suit}</div>
          <div className="flex flex-col leading-none self-end rotate-180">
            <span>{card.rank}</span>
            <span>{card.suit}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function CasinoHoldemGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [playerHole, setPlayerHole] = useState<Card[]>([]);
  const [dealerHole, setDealerHole] = useState<Card[]>([]);
  const [community, setCommunity] = useState<Card[]>([]);
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
    // player hole, dealer hole, 5 community
    setPlayerHole([deck[0], deck[1]]);
    setDealerHole([
      { ...deck[2], faceDown: true },
      { ...deck[3], faceDown: true },
    ]);
    // Reveal 3 community (flop)
    setCommunity([
      deck[4],
      deck[5],
      deck[6],
      { ...deck[7], faceDown: true },
      { ...deck[8], faceDown: true },
    ]);
    setDeckRef(deck);
    setPhase("flop");
  };

  const handleFold = async () => {
    const net = -betNum;
    setNetGain(net);
    setResultMsg(`You folded — lost ${betNum} credits.`);
    setDealerHole([deckRef[2], deckRef[3]]);
    setCommunity([deckRef[4], deckRef[5], deckRef[6], deckRef[7], deckRef[8]]);
    setPhase("result");
    try {
      await recordOutcome({
        gameType: GameType.casinoHoldem,
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

  const handleCall = async () => {
    const callBet = betNum * 2;
    const totalBet = betNum + callBet;
    const revealedDealer = [deckRef[2], deckRef[3]];
    const allCommunity = [
      deckRef[4],
      deckRef[5],
      deckRef[6],
      deckRef[7],
      deckRef[8],
    ];

    const playerAll = [...playerHole, ...allCommunity];
    const dealerAll = [...revealedDealer, ...allCommunity];
    const playerBest = bestFiveFromSeven(playerAll);
    const dealerBest = bestFiveFromSeven(dealerAll);

    const dQualifies = dealerQualifies(dealerBest);
    const pScore = pokerHandScore(playerBest);
    const dScore = pokerHandScore(dealerBest);
    const playerHand = evaluatePokerHand(playerBest);

    let net = 0;
    let msg = "";

    if (!dQualifies) {
      net = betNum; // ante 1:1, call pushes
      msg = `Dealer doesn't qualify! Ante pays 1:1. +${net} credits!`;
    } else if (pScore > dScore) {
      const callPay = HOLDEM_PAYOUTS[playerHand] ?? 1;
      net = betNum + callBet * callPay;
      msg = `You win with ${playerHand}! +${net} credits!`;
    } else if (pScore === dScore) {
      net = 0;
      msg = "Tie — bets returned.";
    } else {
      net = -totalBet;
      msg = `Dealer wins. -${totalBet} credits.`;
    }

    setDealerHole(revealedDealer);
    setCommunity(allCommunity);
    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");

    try {
      const won = net > 0;
      await recordOutcome({
        gameType: GameType.casinoHoldem,
        bet: BigInt(totalBet),
        won,
        winAmount: won ? BigInt(net + totalBet) : BigInt(0),
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
    setPlayerHole([]);
    setDealerHole([]);
    setCommunity([]);
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
              CASINO HOLD'EM
            </h3>
            <p
              className="text-center text-sm"
              style={{ color: "oklch(0.65 0.05 280)" }}
            >
              Texas Hold'em vs the house
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

        {(phase === "flop" || phase === "result") && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-5 space-y-5"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <div>
              <p
                className="text-sm font-bold mb-2"
                style={{ color: "oklch(0.65 0.05 280)" }}
              >
                COMMUNITY
              </p>
              <div className="flex gap-2">
                {community.map((c, i) => (
                  <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: COLOR }}>
                  YOUR HOLE CARDS
                </p>
                <div className="flex gap-2">
                  {playerHole.map((c, i) => (
                    <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                  ))}
                </div>
              </div>
              <div>
                <p
                  className="text-sm font-bold mb-2"
                  style={{ color: "oklch(0.65 0.05 280)" }}
                >
                  DEALER HOLE
                </p>
                <div className="flex gap-2">
                  {dealerHole.map((c, i) => (
                    <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                  ))}
                </div>
              </div>
            </div>
            {phase === "result" && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  className="rounded p-2"
                  style={{ background: "oklch(0.14 0.03 150)" }}
                >
                  <p style={{ color: COLOR }} className="font-bold">
                    YOUR BEST
                  </p>
                  <p style={{ color: "white" }}>
                    {evaluatePokerHand(
                      bestFiveFromSeven([...playerHole, ...community]),
                    )}
                  </p>
                </div>
                <div
                  className="rounded p-2"
                  style={{ background: "oklch(0.14 0.02 280)" }}
                >
                  <p
                    style={{ color: "oklch(0.65 0.05 280)" }}
                    className="font-bold"
                  >
                    DEALER BEST
                  </p>
                  <p style={{ color: "white" }}>
                    {evaluatePokerHand(
                      bestFiveFromSeven([...dealerHole, ...community]),
                    )}
                  </p>
                </div>
              </div>
            )}
            {phase === "flop" && (
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
                  onClick={handleCall}
                  disabled={isPending}
                  className="flex-1 font-black"
                  style={{ background: COLOR }}
                >
                  CALL (×{betNum * 2})
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
