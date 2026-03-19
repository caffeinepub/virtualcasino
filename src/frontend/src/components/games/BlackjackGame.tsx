import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import { RealisticCard } from "./RealisticCard";
import { type Card, createDeck, handValue, isBlackjack } from "./cardUtils";

type Phase = "bet" | "playing" | "result";

interface HandResult {
  outcome: "win" | "lose" | "push" | "blackjack";
  netGain: number;
}

const QUICK_BETS = [5, 10, 25, 50, 100];
const FELT =
  "radial-gradient(ellipse at 50% 30%, #1b5e20 0%, #0d3b10 60%, #071a08 100%)";
const RAIL = "linear-gradient(180deg, #5d3a1a 0%, #3e2208 40%, #5d3a1a 100%)";

function ChipStack({ amount }: { amount: number }) {
  const chips = [
    { color: "#e53935", threshold: 1 },
    { color: "#1e88e5", threshold: 5 },
    { color: "#43a047", threshold: 25 },
    { color: "#000", threshold: 100 },
  ];
  const chip =
    chips
      .slice()
      .reverse()
      .find((c) => amount >= c.threshold) ?? chips[0];
  const count = Math.min(Math.ceil(amount / 5), 6);
  return (
    <div
      className="relative flex flex-col-reverse items-center"
      style={{ width: 32, height: 16 + count * 4 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static chip visual
          key={i}
          className="absolute rounded-full border-2 border-white/30"
          style={{
            width: 32,
            height: 16,
            bottom: i * 4,
            background: chip.color,
            boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        />
      ))}
    </div>
  );
}

function HandArea({
  cards,
  label,
  active,
  value,
  bust,
  bj,
}: {
  cards: Card[];
  label: string;
  active: boolean;
  value: number;
  bust: boolean;
  bj: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
      style={{
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
        border: active
          ? "1.5px solid rgba(255,255,255,0.25)"
          : "1.5px solid transparent",
        boxShadow: active ? "0 0 20px rgba(255,255,255,0.1)" : "none",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-black tracking-widest text-white/70 uppercase">
          {label}
        </span>
        <span
          className="text-sm font-black px-2 py-0.5 rounded"
          style={{
            background: bust
              ? "#b71c1c"
              : bj
                ? "#f9a825"
                : "rgba(255,255,255,0.15)",
            color: bust || bj ? "#fff" : "#fff",
          }}
        >
          {bust ? "BUST" : bj ? "BJ!" : value}
        </span>
      </div>
      <div className="flex gap-1 flex-wrap justify-center">
        {cards.map((card, i) => (
          <RealisticCard
            key={`${card.rank}${card.suit}${i}`}
            card={card}
            faceDown={card.faceDown}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

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
    let [dd, d2] = drawCard(d);
    d = d2;
    let [p2, d3] = drawCard(d);
    d = d3;
    let [dh, d4] = drawCard(d, true);
    d = d4;
    setDeck(d);
    setPlayerHands([[p1, p2]]);
    setDealerHand([dd, dh]);
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
    let dHand = dealerHand.map((c) => ({ ...c, faceDown: false }));
    setDealerHand([...dHand]);
    let d = deck;
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
    if (handValue(newHands[currentHandIdx]) >= 21)
      await advanceOrDealer(newHands, splitBets);
  };

  const advanceOrDealer = async (pHands: Card[][], bets: number[]) => {
    if (currentHandIdx < pHands.length - 1) {
      setCurrentHandIdx(currentHandIdx + 1);
    } else {
      const allBust = pHands.every((h) => handValue(h) > 21);
      if (allBust)
        await resolveGame(
          pHands,
          dealerHand.map((c) => ({ ...c, faceDown: false })),
          bets,
        );
      else await runDealer(pHands, bets);
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
    let [extra1, d1] = drawCard(deck);
    let [extra2, d2] = drawCard(d1);
    const newHands = [
      ...playerHands.slice(0, currentHandIdx),
      [hand[0], extra1],
      [hand[1], extra2],
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
    <div className="w-full max-w-2xl mx-auto">
      {/* TABLE */}
      <div
        className="relative rounded-[2rem] overflow-hidden"
        style={{
          background: FELT,
          border: "10px solid #3e2208",
          borderImage: `${RAIL} 10`,
          boxShadow:
            "0 0 0 3px #8d5524, 0 8px 40px rgba(0,0,0,0.7), inset 0 0 60px rgba(0,0,0,0.4)",
          minHeight: 420,
        }}
      >
        {/* Felt texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='1' cy='1' r='0.5' fill='rgba(255,255,255,0.03)'/%3E%3C/svg%3E\")",
          }}
        />
        {/* Table arc line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{
            width: "80%",
            height: 2,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 999,
            marginTop: 16,
          }}
        />

        <div className="relative z-10 p-5 space-y-4">
          {/* DEALER AREA */}
          <div className="text-center">
            <HandArea
              cards={dealerHand}
              label="DEALER"
              active={false}
              value={handValue(dealerHand)}
              bust={handValue(dealerHand) > 21}
              bj={isBlackjack(dealerHand)}
            />
          </div>

          {/* CENTER DIVIDER */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.1)" }}
            />
            <div className="text-xs font-black tracking-widest text-white/40 uppercase">
              Blackjack Pays 3:2
            </div>
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.1)" }}
            />
          </div>

          {/* PLAYER AREA */}
          {(phase === "playing" || phase === "result") && (
            <div className="space-y-2">
              {playerHands.map((hand, i) => (
                <HandArea
                  key={hand.map((c) => c.rank + c.suit).join("") || `hand-${i}`}
                  cards={hand}
                  label={playerHands.length > 1 ? `HAND ${i + 1}` : "YOUR HAND"}
                  active={phase === "playing" && i === currentHandIdx}
                  value={handValue(hand)}
                  bust={handValue(hand) > 21}
                  bj={isBlackjack(hand)}
                />
              ))}
            </div>
          )}

          {/* BET DISPLAY */}
          {phase !== "bet" && (
            <div className="flex justify-center gap-4 items-end">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-white/50 font-black tracking-wider">
                  BET
                </span>
                <ChipStack amount={betNum} />
                <span className="text-xs text-white font-black">{betNum}</span>
              </div>
            </div>
          )}

          {/* RESULTS */}
          <AnimatePresence>
            {phase === "result" && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-2"
              >
                {results.map((r, i) => (
                  <div
                    key={r.outcome + String(i)}
                    className="rounded-xl p-3 flex items-center justify-between"
                    style={{
                      background:
                        r.outcome === "lose"
                          ? "rgba(183,28,28,0.3)"
                          : "rgba(27,94,32,0.5)",
                      border: `1px solid ${r.outcome === "lose" ? "rgba(239,83,80,0.5)" : "rgba(102,187,106,0.5)"}`,
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <span className="font-black text-white text-sm">
                      {r.outcome === "blackjack" && "🎉 BLACKJACK!"}
                      {r.outcome === "win" && "🏆 YOU WIN!"}
                      {r.outcome === "push" && "🤝 PUSH"}
                      {r.outcome === "lose" && "💸 YOU LOSE"}
                    </span>
                    <span
                      className="font-black text-sm"
                      style={{
                        color:
                          r.netGain > 0
                            ? "#a5d6a7"
                            : r.netGain === 0
                              ? "#fff"
                              : "#ef9a9a",
                      }}
                    >
                      {r.netGain > 0 ? `+${r.netGain}` : r.netGain} credits
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIONS */}
          {phase === "playing" && !dealerThinking && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "HIT", fn: handleHit, color: "#1565c0" },
                { label: "STAND", fn: handleStand, color: "#b71c1c" },
                ...(canDouble
                  ? [
                      {
                        label: "DOUBLE DOWN",
                        fn: handleDouble,
                        color: "#6a1b9a",
                      },
                    ]
                  : []),
                ...(canSplit
                  ? [{ label: "SPLIT", fn: handleSplit, color: "#e65100" }]
                  : []),
              ].map(({ label, fn, color }) => (
                <button
                  key={label}
                  type="button"
                  onClick={fn}
                  className="py-3 rounded-xl font-black tracking-wider text-white text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: color,
                    boxShadow: `0 4px 12px ${color}60`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {dealerThinking && (
            <div className="text-center py-2 text-sm font-black tracking-widest text-white/60 animate-pulse">
              DEALER PLAYING...
            </div>
          )}

          {phase === "result" && (
            <Button
              onClick={resetGame}
              disabled={isPending}
              className="w-full py-4 font-black tracking-widest"
              style={{ background: "#c8a84b", color: "#1a1a1a" }}
            >
              DEAL AGAIN
            </Button>
          )}
        </div>
      </div>

      {/* BET PANEL (outside table) */}
      {phase === "bet" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl p-5 space-y-4"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.20 0.03 280)",
          }}
        >
          <p
            className="text-xs font-black tracking-widest text-center"
            style={{ color: "#c8a84b" }}
          >
            PLACE YOUR BET
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK_BETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBet(q.toString())}
                className="px-4 py-2 rounded-xl text-sm font-black transition-all hover:scale-105"
                style={
                  bet === q.toString()
                    ? {
                        background: "#c8a84b",
                        color: "#1a1a1a",
                        boxShadow: "0 0 16px #c8a84b60",
                      }
                    : {
                        background: "oklch(0.16 0.02 280)",
                        color: "#aaa",
                        border: "1px solid oklch(0.22 0.03 280)",
                      }
                }
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
            className="text-center font-bold"
          />
          <Button
            onClick={handleDeal}
            className="w-full py-5 font-black tracking-widest text-black"
            style={{ background: "#c8a84b", boxShadow: "0 0 24px #c8a84b50" }}
          >
            🃏 DEAL
          </Button>
        </motion.div>
      )}
    </div>
  );
}
