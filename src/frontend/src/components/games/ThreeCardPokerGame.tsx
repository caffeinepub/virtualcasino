import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import { type Card, type Suit, createDeck, isRedSuit } from "./cardUtils";

type Phase = "bet" | "decision" | "result";

const COLOR = "oklch(0.55 0.25 290)";
const QUICK_BETS = [5, 10, 25, 50, 100];

type HandName =
  | "Straight Flush"
  | "Three of a Kind"
  | "Straight"
  | "Flush"
  | "Pair"
  | "High Card";

function evaluate3CardHand(cards: Card[]): { name: HandName; rank: number } {
  const rankOrder: Record<string, number> = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    "10": 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
  };
  const ranks = cards.map((c) => rankOrder[c.rank]);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const sorted = [...ranks].sort((a, b) => a - b);
  const isConsec = sorted[2] - sorted[1] === 1 && sorted[1] - sorted[0] === 1;
  const isStraight =
    isConsec || (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14);
  const rankCounts: Record<number, number> = {};
  for (const r of ranks) rankCounts[r] = (rankCounts[r] ?? 0) + 1;
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isThreeOfAKind = counts[0] === 3;
  const isPair = counts[0] === 2;
  const topCard = Math.max(...ranks);

  if (isFlush && isStraight)
    return { name: "Straight Flush", rank: 6000 + topCard };
  if (isThreeOfAKind) return { name: "Three of a Kind", rank: 5000 + ranks[0] };
  if (isStraight) return { name: "Straight", rank: 4000 + topCard };
  if (isFlush) return { name: "Flush", rank: 3000 + topCard };
  if (isPair) {
    const pairVal = Number(
      Object.entries(rankCounts).find(([, v]) => v === 2)?.[0] ?? 0,
    );
    return { name: "Pair", rank: 2000 + pairVal };
  }
  return { name: "High Card", rank: topCard };
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
        background: card.faceDown ? "oklch(0.2 0.08 290)" : "white",
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

export default function ThreeCardPokerGame({
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
    const pCards = deck.slice(0, 3);
    const dCards = deck.slice(3, 6).map((c) => ({ ...c, faceDown: true }));
    setPlayerCards(pCards);
    setDealerCards(dCards);
    setDeckRef(deck);
    setPhase("decision");
  };

  const handleFold = async () => {
    const net = -betNum;
    setNetGain(net);
    setResultMsg(`You folded — lost ${betNum} credits.`);
    setDealerCards(deckRef.slice(3, 6));
    setPhase("result");
    try {
      await recordOutcome({
        gameType: GameType.threeCardPoker,
        bet: BigInt(betNum),
        won: false,
        winAmount: BigInt(0),
      });
      onGameComplete();
      toast.error(`You folded — lost ${betNum} credits.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const handlePlay = async () => {
    const dealerRevealed = deckRef.slice(3, 6);
    const pHand = evaluate3CardHand(playerCards);
    const dHand = evaluate3CardHand(dealerRevealed);
    const dealerQualifies = dHand.rank >= 2000 + 12; // Q high or better (Q = 12)

    // Ante bonus regardless of dealer qualifying
    const anteBonusTable: Record<HandName, number> = {
      "Straight Flush": 5,
      "Three of a Kind": 4,
      Straight: 1,
      Flush: 3,
      Pair: 0,
      "High Card": 0,
    };
    const anteBonus = anteBonusTable[pHand.name] * betNum;

    let net = 0;
    let msg = "";

    if (!dealerQualifies) {
      net = betNum + anteBonus; // ante pays 1:1, play pushes
      msg = `Dealer doesn't qualify! Ante pays 1:1. ${anteBonus > 0 ? `Ante bonus +${anteBonus}!` : ""} +${net} credits!`;
    } else if (pHand.rank > dHand.rank) {
      net = betNum * 2 + anteBonus; // ante + play both pay 1:1
      msg = `You win! ${pHand.name} beats ${dHand.name}. ${anteBonus > 0 ? `+${anteBonus} bonus!` : ""} +${net} credits!`;
    } else if (pHand.rank === dHand.rank) {
      net = anteBonus;
      msg = `Tie! ${anteBonus > 0 ? `Ante bonus +${anteBonus}!` : "Bet returned."}  Net: ${net}`;
    } else {
      net = -(betNum * 2) + anteBonus;
      msg = `Dealer wins with ${dHand.name}. ${anteBonus > 0 ? `But ante bonus +${anteBonus}!` : ""} Net: ${net}`;
    }

    setDealerCards(dealerRevealed);
    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");

    try {
      const won = net > 0;
      const winAmount = won ? BigInt(net + betNum * 2) : BigInt(0);
      await recordOutcome({
        gameType: GameType.threeCardPoker,
        bet: BigInt(betNum * 2),
        won,
        winAmount,
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
              THREE CARD POKER
            </h3>
            <p
              className="text-center text-sm"
              style={{ color: "oklch(0.65 0.05 280)" }}
            >
              Place your ante bet
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
            <div className="space-y-3">
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
            <div className="space-y-3">
              <p
                className="text-sm font-bold tracking-wider"
                style={{ color: COLOR }}
              >
                YOUR HAND
              </p>
              <div className="flex gap-2">
                {playerCards.map((c, i) => (
                  <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                ))}
              </div>
              {phase === "decision" && (
                <p
                  className="text-sm"
                  style={{ color: "oklch(0.75 0.12 290)" }}
                >
                  {evaluate3CardHand(playerCards).name}
                </p>
              )}
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
                  onClick={handlePlay}
                  disabled={isPending}
                  className="flex-1 font-black"
                  style={{ background: COLOR }}
                >
                  PLAY (+{betNum})
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
