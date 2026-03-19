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
  handValue,
  isBlackjack,
  isRedSuit,
} from "./cardUtils";

type Phase = "bet" | "playing" | "result";

interface HandResult {
  outcome: "win" | "lose" | "push" | "blackjack";
  netGain: number;
}

function PlayingCard({ card, index = 0 }: { card: Card; index?: number }) {
  const isRed = !card.faceDown && isRedSuit(card.suit as Suit);

  return (
    <motion.div
      initial={{ opacity: 0, y: -30, rotateY: 90 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: index * 0.15, duration: 0.3 }}
      className="relative select-none"
      style={{ perspective: "400px" }}
    >
      <div
        className="w-14 h-20 rounded-lg flex flex-col justify-between p-1.5 font-black text-sm shadow-lg"
        style={{
          background: card.faceDown
            ? "linear-gradient(135deg, oklch(0.25 0.08 280), oklch(0.18 0.06 290))"
            : "white",
          border: card.faceDown
            ? "1px solid oklch(0.55 0.25 290 / 0.6)"
            : "1px solid #ccc",
          color: card.faceDown ? "transparent" : isRed ? "#c0392b" : "#1a1a1a",
        }}
      >
        {card.faceDown ? (
          <div
            className="absolute inset-1 rounded"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, oklch(0.55 0.25 290 / 0.3) 0px, oklch(0.55 0.25 290 / 0.3) 2px, transparent 2px, transparent 8px)",
            }}
          />
        ) : (
          <>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-black">{card.rank}</span>
              <span className="text-xs">{card.suit}</span>
            </div>
            <div className="self-center text-lg leading-none">{card.suit}</div>
            <div className="flex flex-col leading-none self-end rotate-180">
              <span className="text-xs font-black">{card.rank}</span>
              <span className="text-xs">{card.suit}</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function HandDisplay({
  cards,
  label,
  active = false,
  color,
}: {
  cards: Card[];
  label: string;
  active?: boolean;
  color: string;
}) {
  const value = handValue(cards);
  const bust = value > 21;
  const hasBlackjack = isBlackjack(cards);

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: active ? "oklch(0.12 0.02 280)" : "oklch(0.10 0.015 280)",
        border: active
          ? `2px solid ${color}`
          : "1px solid oklch(0.18 0.025 280)",
        boxShadow: active ? `0 0 16px ${color}40` : "none",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className="text-sm font-black"
          style={{
            color: bust
              ? "oklch(0.577 0.245 27)"
              : hasBlackjack
                ? "oklch(0.78 0.18 72)"
                : color,
          }}
        >
          {bust ? "BUST" : hasBlackjack ? "BLACKJACK!" : value}
        </span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {cards.map((card, i) => (
          <PlayingCard
            key={`${card.rank}${card.suit}${i}`}
            card={card}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

const QUICK_BETS = [5, 10, 25, 50, 100];

export default function BlackjackGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHands, setPlayerHands] = useState<Card[][]>([[]]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [currentHandIdx, setCurrentHandIdx] = useState(0);
  const [splitBets, setSplitBets] = useState<number[]>([]);
  const [results, setResults] = useState<HandResult[]>([]);
  const [dealerThinking, setDealerThinking] = useState(false);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;
  const color = "oklch(0.70 0.20 190)";

  function drawCard(d: Card[], faceDown = false): [Card, Card[]] {
    const card = { ...d[0], faceDown };
    return [card, d.slice(1)];
  }

  const handleDeal = () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    let d = createDeck(2);
    let [p1, d1] = drawCard(d);
    d = d1;
    let [d_dealer, d2] = drawCard(d);
    d = d2;
    let [p2, d3] = drawCard(d);
    d = d3;
    let [d_hole, d4] = drawCard(d, true);
    d = d4;

    setDeck(d);
    setPlayerHands([[p1, p2]]);
    setDealerHand([d_dealer, d_hole]);
    setSplitBets([betNum]);
    setCurrentHandIdx(0);
    setResults([]);
    setPhase("playing");
  };

  const resolveGame = async (
    pHands: Card[][],
    dHand: Card[],
    bets: number[],
  ) => {
    const finalResults: HandResult[] = [];
    let totalNet = 0;

    for (let i = 0; i < pHands.length; i++) {
      const pVal = handValue(pHands[i]);
      const dVal = handValue(dHand);
      const pBJ = isBlackjack(pHands[i]) && i === 0 && pHands.length === 1;
      const b = bets[i];

      let outcome: HandResult["outcome"];
      let netGain = 0;

      if (pVal > 21) {
        outcome = "lose";
        netGain = -b;
      } else if (pBJ && !isBlackjack(dHand)) {
        outcome = "blackjack";
        netGain = Math.floor(b * 1.5);
      } else if (dVal > 21 || pVal > dVal) {
        outcome = "win";
        netGain = b;
      } else if (pVal === dVal) {
        outcome = "push";
        netGain = 0;
      } else {
        outcome = "lose";
        netGain = -b;
      }

      totalNet += netGain;
      finalResults.push({ outcome, netGain });
    }

    setResults(finalResults);
    setPhase("result");

    // Record to backend — use the primary bet, won if any positive net
    try {
      const won = totalNet > 0;
      const winAmount = won ? BigInt(totalNet + betNum) : BigInt(0);
      await recordOutcome({
        gameType: GameType.blackjack,
        bet: BigInt(betNum),
        won,
        winAmount,
      });
      onGameComplete();
      if (totalNet > 0) toast.success(`🎉 You won ${totalNet} credits!`);
      else if (totalNet === 0) toast("Push — bet returned!");
      else toast.error(`You lost ${Math.abs(totalNet)} credits.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const runDealer = async (pHands: Card[][], bets: number[]) => {
    setDealerThinking(true);
    // Reveal hole card
    let dHand = dealerHand.map((c) => ({ ...c, faceDown: false }));
    setDealerHand([...dHand]);

    let d = deck;
    // Dealer hits until 17+
    await new Promise((r) => setTimeout(r, 600));
    while (handValue(dHand) < 17) {
      let rawCard: Card;
      [rawCard, d] = drawCard(d);
      const card = { ...rawCard, faceDown: false as const };
      dHand = [...dHand, card];
      setDealerHand([...dHand]);
      setDeck(d);
      await new Promise((r) => setTimeout(r, 500));
    }
    setDealerThinking(false);
    await resolveGame(pHands, dHand, bets);
  };

  const handleHit = async () => {
    const [card, newDeck] = drawCard(deck);
    const newHands = playerHands.map((h, i) =>
      i === currentHandIdx ? [...h, card] : h,
    );
    setDeck(newDeck);
    setPlayerHands(newHands);

    if (handValue(newHands[currentHandIdx]) >= 21) {
      await advanceOrDealer(newHands, splitBets);
    }
  };

  const advanceOrDealer = async (pHands: Card[][], bets: number[]) => {
    if (currentHandIdx < pHands.length - 1) {
      setCurrentHandIdx(currentHandIdx + 1);
    } else {
      // Check if all player hands busted
      const allBust = pHands.every((h) => handValue(h) > 21);
      if (allBust) {
        await resolveGame(
          pHands,
          dealerHand.map((c) => ({ ...c, faceDown: false })),
          bets,
        );
      } else {
        await runDealer(pHands, bets);
      }
    }
  };

  const handleStand = async () => {
    await advanceOrDealer(playerHands, splitBets);
  };

  const handleDouble = async () => {
    const [card, newDeck] = drawCard(deck);
    const newBets = splitBets.map((b, i) => (i === currentHandIdx ? b * 2 : b));
    const newHands = playerHands.map((h, i) =>
      i === currentHandIdx ? [...h, card] : h,
    );
    setDeck(newDeck);
    setPlayerHands(newHands);
    setSplitBets(newBets);
    await advanceOrDealer(newHands, newBets);
  };

  const handleSplit = async () => {
    const hand = playerHands[currentHandIdx];
    const c1 = hand[0];
    const c2 = hand[1];
    let [extra1, d1] = drawCard(deck);
    let [extra2, d2] = drawCard(d1);
    const newHands = [
      ...playerHands.slice(0, currentHandIdx),
      [c1, extra1],
      [c2, extra2],
      ...playerHands.slice(currentHandIdx + 1),
    ];
    const newBets = [
      ...splitBets.slice(0, currentHandIdx),
      betNum,
      betNum,
      ...splitBets.slice(currentHandIdx + 1),
    ];
    setDeck(d2);
    setPlayerHands(newHands);
    setSplitBets(newBets);
  };

  const canSplit =
    phase === "playing" &&
    playerHands[currentHandIdx]?.length === 2 &&
    playerHands[currentHandIdx][0].rank ===
      playerHands[currentHandIdx][1].rank &&
    playerHands.length < 4;

  const canDouble =
    phase === "playing" &&
    playerHands[currentHandIdx]?.length === 2 &&
    BigInt(splitBets[currentHandIdx] ?? 0) <= balance;

  const resetGame = () => {
    setPhase("bet");
    setPlayerHands([[]]);
    setDealerHand([]);
    setResults([]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="font-display font-black text-xl tracking-widest"
          style={{ color, textShadow: `0 0 12px ${color}` }}
        >
          BLACKJACK
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">BALANCE</span>
          <span className="font-black text-gold">{balance.toString()}</span>
        </div>
      </div>

      {/* BET PHASE */}
      {phase === "bet" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: `1px solid ${color}40`,
          }}
        >
          <p className="text-sm text-muted-foreground font-bold tracking-wider">
            PLACE YOUR BET
          </p>
          <div className="flex gap-2 flex-wrap">
            {QUICK_BETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBet(q.toString())}
                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                style={
                  bet === q.toString()
                    ? { background: color, color: "#000" }
                    : {
                        background: "oklch(0.16 0.025 278)",
                        color: "oklch(0.60 0.02 270)",
                        border: "1px solid oklch(0.22 0.03 275)",
                      }
                }
                data-ocid="blackjack.quickbet.button"
              >
                {q}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min="1"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            className="bg-secondary border-border text-foreground font-bold"
            data-ocid="blackjack.bet.input"
          />
          <Button
            onClick={handleDeal}
            className="w-full py-5 font-black tracking-widest text-black"
            style={{ background: color, boxShadow: `0 0 20px ${color}50` }}
            data-ocid="blackjack.deal.button"
          >
            🃏 DEAL
          </Button>
        </motion.div>
      )}

      {/* PLAYING PHASE */}
      {(phase === "playing" || phase === "result") && (
        <div className="space-y-4">
          {/* Dealer */}
          <HandDisplay
            cards={dealerHand}
            label="DEALER"
            color="oklch(0.577 0.245 27)"
          />

          {/* Player Hands */}
          {playerHands.map((hand, i) => (
            <HandDisplay
              key={
                hand.map((c) => c.rank + c.suit).join("") || `hand-empty-${i}`
              }
              cards={hand}
              label={playerHands.length > 1 ? `HAND ${i + 1}` : "YOUR HAND"}
              active={phase === "playing" && i === currentHandIdx}
              color={color}
            />
          ))}

          {/* Results */}
          <AnimatePresence>
            {phase === "result" && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-2"
              >
                {results.map((r, i) => (
                  <div
                    key={r.outcome + String(i) + String(r.netGain)}
                    className="rounded-xl p-4 flex items-center justify-between"
                    style={{
                      background:
                        r.outcome === "lose"
                          ? "oklch(0.577 0.245 27 / 0.1)"
                          : "oklch(0.78 0.18 72 / 0.1)",
                      border: `1px solid ${
                        r.outcome === "lose"
                          ? "oklch(0.577 0.245 27 / 0.4)"
                          : "oklch(0.78 0.18 72 / 0.4)"
                      }`,
                    }}
                    data-ocid={`blackjack.result.${i + 1}`}
                  >
                    <span className="font-black text-lg">
                      {r.outcome === "blackjack" && "🎉 BLACKJACK!"}
                      {r.outcome === "win" && "🏆 YOU WIN!"}
                      {r.outcome === "push" && "🤝 PUSH"}
                      {r.outcome === "lose" && "💸 YOU LOSE"}
                    </span>
                    <span
                      className="font-black"
                      style={{
                        color:
                          r.netGain > 0
                            ? "oklch(0.78 0.18 72)"
                            : r.netGain === 0
                              ? "oklch(0.60 0.02 270)"
                              : "oklch(0.577 0.245 27)",
                      }}
                    >
                      {r.netGain > 0 ? `+${r.netGain}` : r.netGain} credits
                    </span>
                  </div>
                ))}
                <Button
                  onClick={resetGame}
                  className="w-full py-4 font-black tracking-widest text-black"
                  style={{ background: color }}
                  data-ocid="blackjack.play_again.button"
                >
                  PLAY AGAIN
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          {phase === "playing" && !dealerThinking && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleHit}
                className="py-4 font-black tracking-wider"
                style={{ background: "oklch(0.55 0.25 290)", color: "white" }}
                data-ocid="blackjack.hit.button"
              >
                HIT
              </Button>
              <Button
                onClick={handleStand}
                className="py-4 font-black tracking-wider"
                style={{ background: "oklch(0.577 0.245 27)", color: "white" }}
                data-ocid="blackjack.stand.button"
              >
                STAND
              </Button>
              {canDouble && (
                <Button
                  onClick={handleDouble}
                  className="py-4 font-black tracking-wider"
                  style={{ background: "oklch(0.65 0.28 340)", color: "white" }}
                  data-ocid="blackjack.double.button"
                >
                  DOUBLE DOWN
                </Button>
              )}
              {canSplit && (
                <Button
                  onClick={handleSplit}
                  className="py-4 font-black tracking-wider"
                  style={{ background: "oklch(0.78 0.18 72)", color: "#000" }}
                  data-ocid="blackjack.split.button"
                >
                  SPLIT
                </Button>
              )}
            </div>
          )}

          {dealerThinking && (
            <div
              className="rounded-xl p-4 text-center font-black tracking-widest text-sm"
              style={{ color, background: `${color}15` }}
              data-ocid="blackjack.dealer.loading_state"
            >
              DEALER PLAYING...
            </div>
          )}

          {isPending && (
            <div
              className="rounded-xl p-2 text-center text-xs text-muted-foreground"
              data-ocid="blackjack.recording.loading_state"
            >
              Recording result...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
