import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import { type Card, type Suit, createDeck, isRedSuit } from "./cardUtils";

type Phase = "bet" | "result";
type BetChoice = "player" | "banker" | "tie";

const COLOR = "oklch(0.55 0.25 290)";
const QUICK_BETS = [5, 10, 25, 50, 100];

const baccaratValue = (rank: string): number => {
  if (["10", "J", "Q", "K"].includes(rank)) return 0;
  if (rank === "A") return 1;
  return Number.parseInt(rank, 10);
};

const handTotal = (cards: Card[]): number => {
  const sum = cards.reduce((acc, c) => acc + baccaratValue(c.rank), 0);
  return sum % 10;
};

function BaccaratCard({ card, index = 0 }: { card: Card; index?: number }) {
  const isRed = isRedSuit(card.suit as Suit);
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, rotateY: 90 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: index * 0.2, duration: 0.35 }}
      className="w-12 rounded-lg flex flex-col justify-between p-1 font-black text-xs shadow-lg select-none"
      style={{
        background: "white",
        border: "1px solid #ccc",
        color: isRed ? "#c0392b" : "#1a1a1a",
        minWidth: "3rem",
        minHeight: "4.5rem",
      }}
    >
      <div className="flex flex-col leading-none">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
      <div className="self-center text-base">{card.suit}</div>
      <div className="flex flex-col leading-none self-end rotate-180">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
    </motion.div>
  );
}

export default function BaccaratGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [betChoice, setBetChoice] = useState<BetChoice>("player");
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [resultMsg, setResultMsg] = useState("");
  const [netGain, setNetGain] = useState(0);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const drawN = (deck: Card[], n: number): [Card[], Card[]] => [
    deck.slice(0, n),
    deck.slice(n),
  ];

  const handleDeal = async () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    const deck = createDeck(8);
    const [p0, d1] = drawN(deck, 2);
    const [b0, d2] = drawN(d1, 2);
    let remaining = d2;
    let pCards = p0;
    let bCards = b0;

    const pTotal = handTotal(pCards);
    const bTotal = handTotal(bCards);
    const natural = pTotal >= 8 || bTotal >= 8;

    if (!natural) {
      let playerDrewThird = false;
      let playerThirdValue = -1;
      if (pTotal <= 5) {
        const [drawn, rest] = drawN(remaining, 1);
        pCards = [...pCards, ...drawn];
        remaining = rest;
        playerDrewThird = true;
        playerThirdValue = baccaratValue(drawn[0].rank);
      }

      const bt = handTotal(bCards);
      let bankerDraws = false;
      if (!playerDrewThird) {
        bankerDraws = bt <= 5;
      } else {
        if (bt <= 2) bankerDraws = true;
        else if (bt === 3) bankerDraws = playerThirdValue !== 8;
        else if (bt === 4)
          bankerDraws = playerThirdValue >= 2 && playerThirdValue <= 7;
        else if (bt === 5)
          bankerDraws = playerThirdValue >= 4 && playerThirdValue <= 7;
        else if (bt === 6)
          bankerDraws = playerThirdValue >= 6 && playerThirdValue <= 7;
      }
      if (bankerDraws) {
        const [drawn, rest] = drawN(remaining, 1);
        bCards = [...bCards, ...drawn];
        remaining = rest;
      }
    }

    setPlayerCards(pCards);
    setBankerCards(bCards);

    const finalPlayer = handTotal(pCards);
    const finalBanker = handTotal(bCards);
    const isTie = finalPlayer === finalBanker;
    const playerWins = finalPlayer > finalBanker;

    let net = 0;
    let msg = "";

    if (isTie) {
      if (betChoice === "tie") {
        net = betNum * 8;
        msg = `TIE! You win ${net} credits!`;
      } else {
        net = 0;
        msg = "TIE — bet returned!";
      }
    } else if (playerWins) {
      if (betChoice === "player") {
        net = betNum;
        msg = `PLAYER wins! +${net} credits!`;
      } else {
        net = -betNum;
        msg = `Player wins — you lost ${betNum} credits.`;
      }
    } else {
      if (betChoice === "banker") {
        net = Math.floor(betNum * 0.95);
        msg = `BANKER wins! +${net} credits!`;
      } else {
        net = -betNum;
        msg = `Banker wins — you lost ${betNum} credits.`;
      }
    }

    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");

    try {
      const won = net > 0;
      const winAmount = won ? BigInt(net + betNum) : BigInt(0);
      await recordOutcome({
        gameType: GameType.baccarat,
        bet: BigInt(betNum),
        won,
        winAmount,
      });
      onGameComplete();
      if (net > 0) toast.success(`🎉 ${msg}`);
      else if (net === 0) toast("Push — bet returned!");
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
    setPlayerCards([]);
    setBankerCards([]);
    setResultMsg("");
    setNetGain(0);
  };

  const betChoices: BetChoice[] = ["player", "banker", "tie"];
  const betChoiceLabel: Record<BetChoice, string> = {
    player: "Player (1:1)",
    banker: "Banker (0.95:1)",
    tie: "Tie (8:1)",
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
              PLACE YOUR BET
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {betChoices.map((choice) => (
                <button
                  type="button"
                  key={choice}
                  onClick={() => setBetChoice(choice)}
                  className="rounded-lg py-3 font-black uppercase tracking-wider text-sm transition-all"
                  style={{
                    background:
                      betChoice === choice ? COLOR : "oklch(0.16 0.02 280)",
                    border: `2px solid ${betChoice === choice ? COLOR : "oklch(0.22 0.03 280)"}`,
                    color:
                      betChoice === choice ? "white" : "oklch(0.65 0.05 280)",
                    boxShadow:
                      betChoice === choice ? `0 0 16px ${COLOR}60` : "none",
                  }}
                >
                  {betChoiceLabel[choice]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_BETS.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setBet(String(q))}
                  className="px-3 py-1 rounded-full text-xs font-black tracking-wider"
                  style={{
                    background: betNum === q ? COLOR : "oklch(0.16 0.02 280)",
                    color: betNum === q ? "white" : "oklch(0.65 0.05 280)",
                    border: `1px solid ${betNum === q ? COLOR : "oklch(0.22 0.03 280)"}`,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                className="flex-1"
                placeholder="Bet amount"
              />
              <Button
                onClick={handleDeal}
                disabled={isPending}
                className="font-black tracking-widest"
                style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
              >
                DEAL
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div
              className="rounded-xl p-4 space-y-4"
              style={{
                background: "oklch(0.11 0.015 280)",
                border: `1px solid ${COLOR}40`,
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "oklch(0.14 0.02 280)",
                    border: `1px solid ${COLOR}30`,
                  }}
                >
                  <div className="text-xs font-black tracking-wider text-muted-foreground mb-2">
                    PLAYER — {handTotal(playerCards)}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {playerCards.map((c, i) => (
                      <BaccaratCard
                        key={`p-${c.rank}-${c.suit}`}
                        card={c}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "oklch(0.14 0.02 280)",
                    border: `1px solid ${COLOR}30`,
                  }}
                >
                  <div className="text-xs font-black tracking-wider text-muted-foreground mb-2">
                    BANKER — {handTotal(bankerCards)}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {bankerCards.map((c, i) => (
                      <BaccaratCard
                        key={`b-${c.rank}-${c.suit}`}
                        card={c}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg p-3 text-center font-black text-lg"
                style={{
                  background:
                    netGain > 0
                      ? "oklch(0.78 0.18 72 / 0.15)"
                      : netGain < 0
                        ? "oklch(0.577 0.245 27 / 0.15)"
                        : "oklch(0.16 0.02 280)",
                  color:
                    netGain > 0
                      ? "oklch(0.78 0.18 72)"
                      : netGain < 0
                        ? "oklch(0.577 0.245 27)"
                        : COLOR,
                  border: `1px solid ${netGain > 0 ? "oklch(0.78 0.18 72 / 0.5)" : netGain < 0 ? "oklch(0.577 0.245 27 / 0.5)" : `${COLOR}40`}`,
                }}
              >
                {resultMsg}
              </div>
            </div>

            <Button
              onClick={reset}
              className="w-full font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              PLAY AGAIN
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
