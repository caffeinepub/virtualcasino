import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import { RealisticCard } from "./RealisticCard";
import { type Card, createDeck, evaluatePokerHand } from "./cardUtils";

type Phase = "bet" | "round1" | "round2" | "result";

const QUICK_BETS = [5, 10, 25, 50, 100];
const COLOR = "oklch(0.62 0.22 200)";
const GOLD = "rgba(255,215,0,0.8)";

const LIR_PAYOUTS: Record<string, number> = {
  "Royal Flush": 1000,
  "Straight Flush": 200,
  "Four of a Kind": 50,
  "Full House": 11,
  Flush: 8,
  Straight: 5,
  "Three of a Kind": 3,
  "Two Pair": 2,
  "Jacks or Better": 1,
  Nothing: 0,
};

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

export default function LetItRideGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [bet1Active, setBet1Active] = useState(true);
  const [bet2Active, setBet2Active] = useState(true);
  const [resultMsg, setResultMsg] = useState("");
  const [netGain, setNetGain] = useState(0);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleDeal = () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum * 3) > balance) {
      toast.error("Need at least 3× bet in credits");
      return;
    }
    const deck = createDeck(1);
    setPlayerCards(deck.slice(0, 3));
    setCommunityCards(deck.slice(3, 5));
    setBet1Active(true);
    setBet2Active(true);
    setPhase("round1");
  };

  const handleRound1 = (letItRide: boolean) => {
    setBet1Active(letItRide);
    setPhase("round2");
  };

  const handleRound2 = async (letItRide: boolean) => {
    setBet2Active(letItRide);
    const finalBet2Active = letItRide;
    const allCards = [...playerCards, ...communityCards];
    const hand = evaluatePokerHand(allCards);
    const multiplier = LIR_PAYOUTS[hand] ?? 0;
    const activeBets = [true, bet1Active, finalBet2Active].filter(
      Boolean,
    ).length;
    const totalStaked = betNum * 3;
    const pulledBack =
      ((!bet1Active ? 1 : 0) + (!finalBet2Active ? 1 : 0)) * betNum;
    let net = 0;
    let msg = "";
    if (multiplier > 0) {
      const winnings = activeBets * betNum * multiplier;
      net = winnings + pulledBack - totalStaked;
      msg = `${hand}! ${activeBets} bet(s) at ${multiplier}:1 = +${winnings} credits!`;
    } else {
      net = pulledBack - totalStaked;
      msg = `No qualifying hand. ${pulledBack > 0 ? `Pulled back ${pulledBack}.` : ""} Net: ${net}`;
    }
    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");
    try {
      const won = net > 0;
      await recordOutcome({
        gameType: GameType.letItRide,
        bet: BigInt(betNum * activeBets),
        won,
        winAmount: won ? BigInt(net + totalStaked) : BigInt(0),
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
    setCommunityCards([]);
    setBet1Active(true);
    setBet2Active(true);
    setResultMsg("");
    setNetGain(0);
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
          LET IT RIDE
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
                <div className="flex justify-center gap-2 mb-2">
                  {["1ST BET", "2ND BET", "3RD BET"].map((zone) => (
                    <div
                      key={zone}
                      className="text-center py-1 px-3 rounded"
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
                  3 equal bets placed — pull back or let them ride!
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
                  placeholder="Bet per spot"
                  className="bg-black/30 border-yellow-400/30 text-white text-center"
                />
                <p
                  className="text-xs text-center"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Total placed: {betNum * 3} credits (3 spots)
                </p>
                <Button
                  onClick={handleDeal}
                  disabled={isPending}
                  className="w-full font-black tracking-widest text-lg py-6"
                  style={{
                    background: `linear-gradient(135deg, ${COLOR}, oklch(0.48 0.18 200))`,
                    boxShadow: `0 0 24px ${COLOR}`,
                  }}
                >
                  DEAL CARDS
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {(phase === "round1" || phase === "round2" || phase === "result") && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={WOOD_STYLE}>
              <div className="rounded-2xl p-5 space-y-4" style={FELT_STYLE}>
                {/* Community cards */}
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
                      COMMUNITY CARDS
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: "rgba(255,215,0,0.3)" }}
                    />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <RealisticCard
                      card={communityCards[0]}
                      faceDown={phase === "round1"}
                      index={0}
                    />
                    <RealisticCard
                      card={communityCards[1]}
                      faceDown={phase === "round1" || phase === "round2"}
                      index={1}
                    />
                  </div>
                </div>

                {/* Bet spots */}
                <div className="flex gap-2">
                  {(["1ST", "2ND", "3RD"] as const).map((label, i) => {
                    const active = [true, bet1Active, bet2Active][i];
                    const isFixed = i === 0;
                    return (
                      <div
                        key={label}
                        className="flex-1 text-center rounded-xl py-2"
                        style={{
                          background: active
                            ? "rgba(0,80,40,0.5)"
                            : "rgba(0,0,0,0.4)",
                          border: `2px solid ${active ? "rgba(0,255,100,0.4)" : "rgba(255,255,255,0.1)"}`,
                          transition: "all 0.3s",
                        }}
                      >
                        <span
                          className="text-xs font-black block"
                          style={{
                            color: active ? "#4ade80" : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {label}
                        </span>
                        {betNum > 0 && active && (
                          <span className="text-xs" style={{ color: GOLD }}>
                            {betNum} cr
                          </span>
                        )}
                        {!isFixed && !active && (
                          <span
                            className="text-xs"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            PULLED
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Player cards */}
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
                      YOUR CARDS
                      {phase === "result"
                        ? ` — ${evaluatePokerHand([...playerCards, ...communityCards])}`
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

                {phase === "round1" && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleRound1(false)}
                      disabled={isPending}
                      className="flex-1 font-black py-5"
                      style={{
                        background: "linear-gradient(135deg, #7f1d1d, #991b1b)",
                        border: "1px solid #ef4444",
                      }}
                    >
                      PULL BACK (-{betNum})
                    </Button>
                    <Button
                      onClick={() => handleRound1(true)}
                      disabled={isPending}
                      className="flex-1 font-black py-5"
                      style={{
                        background: `linear-gradient(135deg, ${COLOR}, oklch(0.48 0.18 200))`,
                        boxShadow: `0 0 16px ${COLOR}`,
                      }}
                    >
                      LET IT RIDE
                    </Button>
                  </div>
                )}

                {phase === "round2" && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleRound2(false)}
                      disabled={isPending}
                      className="flex-1 font-black py-5"
                      style={{
                        background: "linear-gradient(135deg, #7f1d1d, #991b1b)",
                        border: "1px solid #ef4444",
                      }}
                    >
                      PULL BACK (-{betNum})
                    </Button>
                    <Button
                      onClick={() => handleRound2(true)}
                      disabled={isPending}
                      className="flex-1 font-black py-5"
                      style={{
                        background: `linear-gradient(135deg, ${COLOR}, oklch(0.48 0.18 200))`,
                        boxShadow: `0 0 16px ${COLOR}`,
                      }}
                    >
                      LET IT RIDE
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
