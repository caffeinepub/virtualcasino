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

type Phase = "bet" | "set" | "result";

const QUICK_BETS = [5, 10, 25, 50, 100];
const GOLD = "rgba(255,215,0,0.8)";

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

const FELT_STYLE = {
  background:
    "radial-gradient(ellipse at 50% 30%, #1f6b35 0%, #0f3d1c 55%, #071b0c 100%)",
};
const WOOD_STYLE = {
  background:
    "linear-gradient(135deg, #5D3A1A 0%, #8B5E3C 30%, #6B3C1E 60%, #8B5E3C 80%, #5D3A1A 100%)",
  padding: "10px",
  borderRadius: "24px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)",
};

function ZoneLabel({ children }: { children: string }) {
  return (
    <div
      className="text-center py-1 px-2 rounded"
      style={{
        border: `1px solid ${GOLD}`,
        background: "rgba(0,0,0,0.4)",
        color: GOLD,
        fontSize: "10px",
        fontWeight: 900,
        letterSpacing: "0.12em",
      }}
    >
      {children}
    </div>
  );
}

export default function PaiGowPokerGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
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
      <div className="text-center">
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: "oklch(0.85 0.2 55)",
            textShadow:
              "0 0 20px oklch(0.65 0.25 55), 0 0 40px oklch(0.5 0.2 55)",
          }}
        >
          PAI GOW POKER
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
                  {["BANKER", "PLAYER", "DRAGON HAND"].map((zone) => (
                    <ZoneLabel key={zone}>{zone}</ZoneLabel>
                  ))}
                </div>
                <p
                  className="text-center text-sm"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Split 7 cards into 5-card high and 2-card low hands
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
                            ? "oklch(0.55 0.22 55)"
                            : "rgba(0,0,0,0.5)",
                        border: `2px solid ${betNum === q ? "oklch(0.7 0.22 55)" : "rgba(255,215,0,0.3)"}`,
                        color: betNum === q ? "white" : GOLD,
                        boxShadow:
                          betNum === q ? "0 0 12px oklch(0.5 0.22 55)" : "none",
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
                      "linear-gradient(135deg, oklch(0.5 0.22 55), oklch(0.4 0.18 55))",
                    boxShadow: "0 0 24px oklch(0.5 0.22 55)",
                  }}
                >
                  DEAL CARDS
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "set" && (
          <motion.div
            key="set"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={WOOD_STYLE}>
              <div className="rounded-2xl p-4 space-y-4" style={FELT_STYLE}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-px flex-1"
                    style={{ background: "rgba(255,215,0,0.3)" }}
                  />
                  <span
                    className="text-xs font-black tracking-widest px-2"
                    style={{ color: GOLD }}
                  >
                    SET YOUR HANDS — Click cards to assign
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: "rgba(255,215,0,0.3)" }}
                  />
                </div>

                <div className="space-y-3">
                  <div
                    className="rounded-xl p-3 space-y-2"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,215,0,0.4)",
                    }}
                  >
                    <p
                      className="text-xs font-black tracking-wider"
                      style={{ color: GOLD }}
                    >
                      HIGH HAND ({highHand.length}/5)
                      {highHand.length === 5
                        ? ` — ${evaluatePokerHand(highHand)}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 min-h-14">
                      {highHand.map((c) => (
                        <motion.div
                          key={`h-${c.rank}${c.suit}`}
                          animate={{ y: -4 }}
                          className="cursor-pointer"
                          onClick={() => toggleCardHigh(c)}
                        >
                          <RealisticCard card={c} small />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 space-y-2"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,215,0,0.25)",
                    }}
                  >
                    <p
                      className="text-xs font-black tracking-wider"
                      style={{ color: "rgba(255,215,0,0.6)" }}
                    >
                      LOW HAND ({lowHand.length}/2)
                    </p>
                    <div className="flex flex-wrap gap-1 min-h-14">
                      {lowHand.map((c) => (
                        <motion.div
                          key={`l-${c.rank}${c.suit}`}
                          animate={{ y: -4 }}
                          className="cursor-pointer"
                          onClick={() => toggleCardHigh(c)}
                        >
                          <RealisticCard card={c} small />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 space-y-2"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px dashed rgba(255,255,255,0.15)",
                    }}
                  >
                    <p
                      className="text-xs font-black tracking-wider"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      UNASSIGNED — tap to place
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {unassigned.map((c) => (
                        <button
                          type="button"
                          key={`u-${c.rank}-${c.suit}`}
                          className="cursor-pointer"
                          onClick={() => toggleCardHigh(c)}
                        >
                          <RealisticCard card={c} small />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAutoSet}
                    variant="outline"
                    className="flex-1 font-black"
                    style={{
                      borderColor: GOLD,
                      color: GOLD,
                      background: "rgba(0,0,0,0.4)",
                    }}
                  >
                    AUTO-SET
                  </Button>
                  <Button
                    onClick={handleSetHand}
                    disabled={
                      isPending || highHand.length !== 5 || lowHand.length !== 2
                    }
                    className="flex-1 font-black"
                    style={{
                      background: "oklch(0.5 0.22 55)",
                      boxShadow: "0 0 16px oklch(0.5 0.22 55)",
                    }}
                  >
                    SET HAND
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={WOOD_STYLE}>
              <div className="rounded-2xl p-4 space-y-4" style={FELT_STYLE}>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,215,0,0.4)",
                    }}
                  >
                    <p
                      className="text-xs font-black mb-2"
                      style={{ color: GOLD }}
                    >
                      YOUR HIGH ({evaluatePokerHand(highHand)})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {highHand.map((c) => (
                        <RealisticCard
                          key={`yh-${c.rank}${c.suit}`}
                          card={c}
                          small
                        />
                      ))}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,215,0,0.25)",
                    }}
                  >
                    <p
                      className="text-xs font-black mb-2"
                      style={{ color: "rgba(255,215,0,0.6)" }}
                    >
                      DEALER HIGH
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {houseWay(dealerCards).high.map((c) => (
                        <RealisticCard
                          key={`dh-${c.rank}${c.suit}`}
                          card={c}
                          small
                        />
                      ))}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,215,0,0.4)",
                    }}
                  >
                    <p
                      className="text-xs font-black mb-2"
                      style={{ color: GOLD }}
                    >
                      YOUR LOW
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {lowHand.map((c) => (
                        <RealisticCard
                          key={`yl-${c.rank}${c.suit}`}
                          card={c}
                          small
                        />
                      ))}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,215,0,0.25)",
                    }}
                  >
                    <p
                      className="text-xs font-black mb-2"
                      style={{ color: "rgba(255,215,0,0.6)" }}
                    >
                      DEALER LOW
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {houseWay(dealerCards).low.map((c) => (
                        <RealisticCard
                          key={`dl-${c.rank}${c.suit}`}
                          card={c}
                          small
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl p-4 text-center space-y-2"
                  style={{
                    background:
                      netGain >= 0 ? "rgba(0,100,40,0.6)" : "rgba(120,0,0,0.6)",
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
                      background: "oklch(0.5 0.22 55)",
                      boxShadow: "0 0 16px oklch(0.5 0.22 55)",
                    }}
                  >
                    PLAY AGAIN
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
