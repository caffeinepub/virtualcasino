import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import { RealisticCard } from "./RealisticCard";
import {
  type Card,
  createDeck,
  evaluatePokerHand,
  rankNumericValue,
} from "./cardUtils";

type Phase = "bet" | "decision" | "result";

const QUICK_BETS = [5, 10, 25, 50, 100];
const COLOR = "oklch(0.70 0.20 190)";
const GOLD = "rgba(255,215,0,0.8)";

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

function dealerQualifiesFn(cards: Card[]): boolean {
  const hand = evaluatePokerHand(cards);
  if (hand !== "Nothing" && hand !== "Jacks or Better") return true;
  const ranks = cards
    .map((c) => rankNumericValue(c.rank))
    .sort((a, b) => b - a);
  if (ranks[0] === 14 && ranks[1] >= 13) return true;
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

const FELT_STYLE = {
  background:
    "radial-gradient(ellipse at 50% 30%, #1f6b35 0%, #0f3d1c 55%, #071b0c 100%)",
};
const WOOD_STYLE = {
  background:
    "linear-gradient(135deg, #5D3A1A 0%, #8B5E3C 30%, #6B3C1E 60%, #8B5E3C 80%, #5D3A1A 100%)",
  padding: "10px",
  borderRadius: "24px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
};

export default function CaribbeanStudGame({
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
    const dQualifies = dealerQualifiesFn(revealedDealer);
    let net = 0;
    let msg = "";
    if (!dQualifies) {
      net = betNum;
      msg = `Dealer doesn't qualify! Ante pays 1:1. +${net} credits!`;
    } else {
      const pScore = pokerHandScore(playerCards);
      const dScore = pokerHandScore(revealedDealer);
      if (pScore > dScore) {
        const raisePay = RAISE_PAYOUTS[pHand] ?? 1;
        net = betNum + raises * raisePay;
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
      <div className="text-center">
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: COLOR,
            textShadow: `0 0 20px ${COLOR}, 0 0 40px ${COLOR}`,
          }}
        >
          CARIBBEAN STUD
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
            <div style={WOOD_STYLE}>
              <div className="rounded-2xl p-6 space-y-5" style={FELT_STYLE}>
                <div className="flex justify-center gap-3 mb-2">
                  {["ANTE", "CALL", "BONUS"].map((zone) => (
                    <div
                      key={zone}
                      className="text-center py-1 px-3 rounded"
                      style={{
                        border: `1px solid ${GOLD}`,
                        background: "rgba(0,0,0,0.4)",
                        color: GOLD,
                        fontSize: "11px",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                      }}
                    >
                      {zone}
                    </div>
                  ))}
                </div>
                <p
                  className="text-center text-sm"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Beat the dealer's 5-card hand
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_BETS.map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setBet(String(q))}
                      className="rounded-full px-4 py-2 text-sm font-black transition-all"
                      style={{
                        background: betNum === q ? COLOR : "rgba(0,0,0,0.5)",
                        border: `2px solid ${betNum === q ? COLOR : "rgba(255,215,0,0.3)"}`,
                        color: betNum === q ? "white" : GOLD,
                        boxShadow: betNum === q ? `0 0 12px ${COLOR}` : "none",
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
                    background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.18 190))`,
                    boxShadow: `0 0 24px ${COLOR}`,
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                    <span
                      className="text-xs font-black tracking-widest px-2"
                      style={{ color: GOLD }}
                    >
                      DEALER
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                  </div>
                  <div className="flex gap-1 justify-center flex-wrap">
                    {dealerCards.map((c) => (
                      <RealisticCard
                        key={`dc-${c.rank}${c.suit}`}
                        card={c}
                        faceDown={!!c.faceDown}
                        small
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  {["ANTE", "CALL", "BONUS"].map((zone, zi) => (
                    <div
                      key={zone}
                      className="flex-1 text-center py-1 rounded"
                      style={{
                        border: `1px solid ${GOLD}`,
                        background: "rgba(0,0,0,0.35)",
                      }}
                    >
                      <span
                        className="text-xs font-black block"
                        style={{ color: GOLD }}
                      >
                        {zone}
                      </span>
                      {zi === 0 && betNum > 0 && (
                        <svg
                          className="mx-auto mt-1"
                          width="28"
                          height="28"
                          viewBox="0 0 44 44"
                        >
                          <title>chip</title>
                          <circle
                            cx="22"
                            cy="22"
                            r="20"
                            fill="#e74c3c"
                            stroke="#f5f5f5"
                            strokeWidth="2"
                          />
                          <text
                            x="22"
                            y="27"
                            textAnchor="middle"
                            fill="white"
                            fontSize="9"
                            fontWeight="bold"
                          >
                            {betNum}
                          </text>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                    <span
                      className="text-xs font-black tracking-widest px-2"
                      style={{ color: COLOR }}
                    >
                      YOUR HAND — {evaluatePokerHand(playerCards)}
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                  </div>
                  <div className="flex gap-1 justify-center flex-wrap">
                    {playerCards.map((c) => (
                      <RealisticCard
                        key={`pc-${c.rank}${c.suit}`}
                        card={c}
                        small
                      />
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
                      }}
                    >
                      FOLD
                    </Button>
                    <Button
                      onClick={handleRaise}
                      disabled={isPending}
                      className="flex-1 font-black py-5"
                      style={{
                        background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.18 190))`,
                        boxShadow: `0 0 16px ${COLOR}`,
                      }}
                    >
                      RAISE (×{betNum * 2})
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
                        background: COLOR,
                        boxShadow: `0 0 16px ${COLOR}`,
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
