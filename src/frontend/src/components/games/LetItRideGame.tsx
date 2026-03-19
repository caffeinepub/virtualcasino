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
} from "./cardUtils";

type Phase = "bet" | "round1" | "round2" | "result";

const COLOR = "oklch(0.62 0.22 200)";
const QUICK_BETS = [5, 10, 25, 50, 100];

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

function GameCard({
  card,
  index = 0,
  hidden,
}: { card: Card; index?: number; hidden?: boolean }) {
  const isRed = isRedSuit(card.suit as Suit);
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, rotateY: 90 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: index * 0.15, duration: 0.3 }}
      className="w-12 rounded-lg flex flex-col justify-between p-1 font-black text-xs shadow-lg select-none"
      style={{
        background: hidden ? "oklch(0.2 0.08 200)" : "white",
        border: hidden ? `2px solid ${COLOR}` : "1px solid #ccc",
        color: isRed ? "#c0392b" : "#1a1a1a",
        minWidth: "3rem",
        minHeight: "4.5rem",
      }}
    >
      {hidden ? (
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

export default function LetItRideGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
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
    const totalStaked = betNum * 3; // 3 bets always deducted upfront
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
              LET IT RIDE
            </h3>
            <p
              className="text-center text-sm"
              style={{ color: "oklch(0.65 0.05 280)" }}
            >
              3 equal bets placed — pull back or let them ride!
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
              placeholder="Bet per spot"
              className="bg-transparent border-white/20 text-white"
            />
            <p
              className="text-xs text-center"
              style={{ color: "oklch(0.55 0.04 280)" }}
            >
              Total placed: {betNum * 3} credits
            </p>
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

        {(phase === "round1" || phase === "round2" || phase === "result") && (
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
                COMMUNITY CARDS
              </p>
              <div className="flex gap-2">
                <GameCard
                  card={communityCards[0]}
                  index={0}
                  hidden={phase === "round1"}
                />
                <GameCard
                  card={communityCards[1]}
                  index={1}
                  hidden={phase === "round1" || phase === "round2"}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold mb-2" style={{ color: COLOR }}>
                YOUR CARDS{" "}
                {phase === "result"
                  ? `— ${evaluatePokerHand([...playerCards, ...communityCards])}`
                  : ""}
              </p>
              <div className="flex gap-2">
                {playerCards.map((c, i) => (
                  <GameCard key={`${c.rank}${c.suit}`} card={c} index={i} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              {(["bet1", "bet2", "bet3"] as const).map((betKey, i) => {
                const active = [true, bet1Active, bet2Active][i];
                return (
                  <div
                    key={betKey}
                    className="flex-1 text-center rounded-lg p-2"
                    style={{
                      background:
                        i === 0 ||
                        (i === 1 && phase !== "round1") ||
                        (i === 2 && phase === "result")
                          ? active
                            ? `${COLOR}30`
                            : "oklch(0.16 0.02 280)"
                          : "oklch(0.16 0.02 280)",
                      border: `1px solid ${active ? COLOR : "oklch(0.25 0.03 280)"}`,
                    }}
                  >
                    <p
                      className="text-xs font-bold"
                      style={{ color: active ? COLOR : "oklch(0.45 0.04 280)" }}
                    >
                      BET {i + 1}
                    </p>
                    <p
                      className="text-sm font-black"
                      style={{
                        color: active ? "white" : "oklch(0.45 0.04 280)",
                      }}
                    >
                      {betNum}
                    </p>
                  </div>
                );
              })}
            </div>

            {phase === "round1" && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleRound1(false)}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 font-black"
                  style={{
                    borderColor: "oklch(0.55 0.2 20)",
                    color: "oklch(0.55 0.2 20)",
                  }}
                >
                  TAKE BACK BET 1
                </Button>
                <Button
                  onClick={() => handleRound1(true)}
                  disabled={isPending}
                  className="flex-1 font-black"
                  style={{ background: COLOR }}
                >
                  LET IT RIDE ↗
                </Button>
              </div>
            )}
            {phase === "round2" && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleRound2(false)}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 font-black"
                  style={{
                    borderColor: "oklch(0.55 0.2 20)",
                    color: "oklch(0.55 0.2 20)",
                  }}
                >
                  TAKE BACK BET 2
                </Button>
                <Button
                  onClick={() => handleRound2(true)}
                  disabled={isPending}
                  className="flex-1 font-black"
                  style={{ background: COLOR }}
                >
                  LET IT RIDE ↗
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
