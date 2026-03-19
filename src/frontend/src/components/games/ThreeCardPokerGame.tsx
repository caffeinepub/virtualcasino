import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import { RealisticCard } from "./RealisticCard";
import { type Card, createDeck } from "./cardUtils";

type Phase = "bet" | "decision" | "result";

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

function ChipStack({
  amount,
  color = "#e74c3c",
}: { amount: number; color?: string }) {
  return (
    <div className="flex flex-col items-center">
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        aria-label={`${amount} chip`}
      >
        <title>Chip: {amount}</title>
        <circle
          cx="22"
          cy="22"
          r="20"
          fill={color}
          stroke="#f5f5f5"
          strokeWidth="2"
        />
        <circle
          cx="22"
          cy="22"
          r="15"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
        <text
          x="22"
          y="27"
          textAnchor="middle"
          fill="white"
          fontSize="9"
          fontWeight="bold"
        >
          {amount}
        </text>
      </svg>
    </div>
  );
}

const FELT_STYLE = {
  background:
    "radial-gradient(ellipse at 50% 30%, #1f6b35 0%, #0f3d1c 55%, #071b0c 100%)",
};

const WOOD_STYLE = {
  background:
    "linear-gradient(135deg, #5D3A1A 0%, #8B5E3C 30%, #6B3C1E 60%, #8B5E3C 80%, #5D3A1A 100%)",
  padding: "10px",
  borderRadius: "24px",
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.4)",
};

export default function ThreeCardPokerGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
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
    const dealerQualifies = dHand.rank >= 2000 + 12;
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
      net = betNum + anteBonus;
      msg = `Dealer doesn't qualify! Ante pays 1:1. ${anteBonus > 0 ? `Ante bonus +${anteBonus}!` : ""} +${net} credits!`;
    } else if (pHand.rank > dHand.rank) {
      net = betNum * 2 + anteBonus;
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
      {/* Neon title */}
      <div className="text-center">
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "oklch(0.85 0.25 290)",
            textShadow:
              "0 0 20px oklch(0.6 0.3 290), 0 0 40px oklch(0.5 0.25 290)",
          }}
        >
          THREE CARD POKER
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {phase === "bet" && (
          <motion.div
            key="bet"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Felt table for bet phase */}
            <div style={WOOD_STYLE}>
              <div className="rounded-2xl p-6 space-y-5" style={FELT_STYLE}>
                {/* Zone labels on felt */}
                <div className="flex justify-center gap-4 mb-2">
                  {["PAIR PLUS", "ANTE", "PLAY"].map((zone) => (
                    <div key={zone} className="text-center">
                      <div
                        className="rounded-full border-2 px-3 py-1 text-xs font-black tracking-wider"
                        style={{
                          borderColor: "rgba(255,215,0,0.6)",
                          color: "rgba(255,215,0,0.8)",
                          background: "rgba(0,0,0,0.3)",
                        }}
                      >
                        {zone}
                      </div>
                    </div>
                  ))}
                </div>
                <p
                  className="text-center text-sm"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Place your ante bet to begin
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_BETS.map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setBet(String(q))}
                      className="rounded-full px-4 py-2 text-sm font-black transition-all"
                      style={{
                        background:
                          betNum === q
                            ? "oklch(0.55 0.25 290)"
                            : "rgba(0,0,0,0.5)",
                        border: `2px solid ${betNum === q ? "oklch(0.7 0.25 290)" : "rgba(255,215,0,0.3)"}`,
                        color: betNum === q ? "white" : "rgba(255,215,0,0.8)",
                        boxShadow:
                          betNum === q
                            ? "0 0 12px oklch(0.5 0.25 290)"
                            : "none",
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
                  className="bg-black/30 border-yellow-400/30 text-white text-center"
                />
                <Button
                  onClick={handleDeal}
                  disabled={isPending}
                  className="w-full font-black tracking-widest text-lg py-6"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.55 0.25 290), oklch(0.45 0.2 290))",
                    boxShadow: "0 0 24px oklch(0.5 0.25 290)",
                  }}
                >
                  DEAL CARDS
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {(phase === "decision" || phase === "result") && (
          <motion.div
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={WOOD_STYLE}>
              <div className="rounded-2xl p-5 space-y-4" style={FELT_STYLE}>
                {/* Dealer zone */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                    <span
                      className="text-xs font-black tracking-widest px-2"
                      style={{ color: "rgba(255,215,0,0.7)" }}
                    >
                      DEALER
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                  </div>
                  <div className="flex gap-2 justify-center">
                    {dealerCards.map((c) => (
                      <RealisticCard
                        key={`dc-${c.rank}${c.suit}`}
                        card={c}
                        faceDown={!!c.faceDown}
                      />
                    ))}
                    {dealerCards.length === 0 &&
                      [0, 1, 2].map((i) => (
                        <RealisticCard
                          key={i}
                          card={{ rank: "A", suit: "♠" }}
                          faceDown
                        />
                      ))}
                  </div>
                </div>

                {/* Zone divider */}
                <div className="flex items-center gap-3">
                  {["PAIR PLUS", "ANTE", "PLAY"].map((zone, i) => (
                    <div
                      key={zone}
                      className="flex-1 text-center py-1 rounded"
                      style={{
                        border: "1px solid rgba(255,215,0,0.4)",
                        background: "rgba(0,0,0,0.3)",
                      }}
                    >
                      <span
                        className="text-xs font-black"
                        style={{ color: "rgba(255,215,0,0.7)" }}
                      >
                        {zone}
                      </span>
                      {i === 1 && betNum > 0 && (
                        <div className="flex justify-center mt-1">
                          <ChipStack amount={betNum} color="#e74c3c" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Player zone */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                    <span
                      className="text-xs font-black tracking-widest px-2"
                      style={{ color: "oklch(0.85 0.25 150)" }}
                    >
                      YOUR HAND
                      {phase === "decision"
                        ? ` — ${evaluate3CardHand(playerCards).name}`
                        : ""}
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                  </div>
                  <div className="flex gap-2 justify-center">
                    {playerCards.map((c) => (
                      <RealisticCard key={`pc-${c.rank}${c.suit}`} card={c} />
                    ))}
                  </div>
                </div>

                {phase === "decision" && (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleFold}
                      disabled={isPending}
                      className="flex-1 font-black py-5"
                      style={{
                        background: "linear-gradient(135deg, #7f1d1d, #991b1b)",
                        border: "1px solid #ef4444",
                        boxShadow: "0 0 12px rgba(239,68,68,0.4)",
                      }}
                    >
                      FOLD
                    </Button>
                    <Button
                      onClick={handlePlay}
                      disabled={isPending}
                      className="flex-1 font-black py-5"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.45 0.25 290), oklch(0.35 0.2 290))",
                        border: "1px solid oklch(0.7 0.25 290)",
                        boxShadow: "0 0 16px oklch(0.5 0.25 290)",
                      }}
                    >
                      PLAY (+{betNum})
                    </Button>
                  </div>
                )}

                {phase === "result" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl p-4 text-center space-y-2"
                    style={{
                      background:
                        netGain >= 0
                          ? "rgba(0,100,40,0.6)"
                          : "rgba(120,0,0,0.6)",
                      border: `2px solid ${netGain >= 0 ? "rgba(0,255,100,0.4)" : "rgba(255,0,0,0.4)"}`,
                    }}
                  >
                    <p
                      className="font-black text-2xl"
                      style={{ color: netGain >= 0 ? "#4ade80" : "#f87171" }}
                    >
                      {netGain >= 0 ? `+${netGain}` : netGain} CREDITS
                    </p>
                    <p className="text-sm text-white/70">{resultMsg}</p>
                    <Button
                      onClick={reset}
                      className="mt-2 font-black"
                      style={{
                        background: "oklch(0.55 0.25 290)",
                        boxShadow: "0 0 16px oklch(0.5 0.25 290)",
                      }}
                    >
                      PLAY AGAIN
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
