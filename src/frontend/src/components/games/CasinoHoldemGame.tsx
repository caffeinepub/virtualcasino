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

type Phase = "bet" | "flop" | "result";

const QUICK_BETS = [5, 10, 25, 50, 100];
const COLOR = "oklch(0.68 0.22 150)";
const GOLD = "rgba(255,215,0,0.8)";

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

function dealerQualifiesFn(best5: Card[]): boolean {
  const hand = evaluatePokerHand(best5);
  if (hand !== "Nothing" && hand !== "Jacks or Better") return true;
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

export default function CasinoHoldemGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
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
    setPlayerHole([deck[0], deck[1]]);
    setDealerHole([
      { ...deck[2], faceDown: true },
      { ...deck[3], faceDown: true },
    ]);
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
    const dQualifies = dealerQualifiesFn(dealerBest);
    const pScore = pokerHandScore(playerBest);
    const dScore = pokerHandScore(dealerBest);
    const playerHand = evaluatePokerHand(playerBest);
    let net = 0;
    let msg = "";
    if (!dQualifies) {
      net = betNum;
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
      <div className="text-center">
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: COLOR,
            textShadow: `0 0 20px ${COLOR}, 0 0 40px ${COLOR}`,
          }}
        >
          CASINO HOLD'EM
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
                  {["ANTE", "CALL", "BONUS BET"].map((zone) => (
                    <div
                      key={zone}
                      className="py-1 px-3 rounded text-center"
                      style={{
                        border: `1px solid ${GOLD}`,
                        background: "rgba(0,0,0,0.4)",
                        color: GOLD,
                        fontSize: "10px",
                        fontWeight: 900,
                        letterSpacing: "0.1em",
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
                  Texas Hold'em vs the dealer — Fold or Call after the flop
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
                    background: `linear-gradient(135deg, ${COLOR}, oklch(0.52 0.2 150))`,
                    boxShadow: `0 0 24px ${COLOR}`,
                  }}
                >
                  DEAL CARDS
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {(phase === "flop" || phase === "result") && (
          <motion.div
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={WOOD_STYLE}>
              <div className="rounded-2xl p-4 space-y-4" style={FELT_STYLE}>
                {/* Dealer hole cards */}
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
                      DEALER HOLE
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                  </div>
                  <div className="flex gap-1 justify-center">
                    {dealerHole.map((c) => (
                      <RealisticCard
                        key={`dh-${c.rank}${c.suit}`}
                        card={c}
                        faceDown={!!c.faceDown}
                        small
                      />
                    ))}
                  </div>
                </div>

                {/* Community / board */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.25)" }}
                    />
                    <span
                      className="text-xs font-black tracking-widest px-2"
                      style={{ color: "rgba(255,215,0,0.5)" }}
                    >
                      BOARD
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.25)" }}
                    />
                  </div>
                  <div className="flex gap-1 justify-center">
                    {community.map((c) => (
                      <RealisticCard
                        key={`cm-${c.rank}${c.suit}`}
                        card={c}
                        faceDown={!!c.faceDown}
                        small
                      />
                    ))}
                  </div>
                </div>

                {/* Bet spots */}
                <div className="flex gap-2">
                  {["ANTE", "CALL", "BONUS BET"].map((zone, zi) => (
                    <div
                      key={zone}
                      className="flex-1 text-center py-2 rounded-xl"
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
                          width="24"
                          height="24"
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

                {/* Player hole */}
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
                      YOUR HOLE CARDS
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                  </div>
                  <div className="flex gap-1 justify-center">
                    {playerHole.map((c) => (
                      <RealisticCard key={`ph-${c.rank}${c.suit}`} card={c} />
                    ))}
                  </div>
                </div>

                {phase === "flop" && (
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
                      onClick={handleCall}
                      disabled={isPending}
                      className="flex-1 font-black py-5"
                      style={{
                        background: `linear-gradient(135deg, ${COLOR}, oklch(0.52 0.2 150))`,
                        boxShadow: `0 0 16px ${COLOR}`,
                      }}
                    >
                      CALL (+{betNum * 2})
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
