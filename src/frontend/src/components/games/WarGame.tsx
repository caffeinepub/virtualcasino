import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import {
  type Card,
  type Suit,
  createDeck,
  isRedSuit,
  rankNumericValue,
} from "./cardUtils";

type Phase = "bet" | "reveal" | "war" | "result";

const COLOR = "oklch(0.60 0.24 20)";
const QUICK_BETS = [5, 10, 25, 50, 100];

function WarCard({ card, index = 0 }: { card: Card; index?: number }) {
  const isRed = isRedSuit(card.suit as Suit);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, rotateY: 90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ delay: index * 0.2, duration: 0.35 }}
      className="w-14 h-20 rounded-lg flex flex-col justify-between p-1.5 font-black text-sm shadow-xl select-none"
      style={{
        background: "white",
        border: `2px solid ${COLOR}`,
        color: isRed ? "#c0392b" : "#1a1a1a",
        boxShadow: `0 0 16px ${COLOR}60`,
      }}
    >
      <div className="flex flex-col leading-none">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
      <div className="self-center text-lg">{card.suit}</div>
      <div className="flex flex-col leading-none self-end rotate-180">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
    </motion.div>
  );
}

export default function WarGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [dealerCard, setDealerCard] = useState<Card | null>(null);
  const [warPlayerCard, setWarPlayerCard] = useState<Card | null>(null);
  const [warDealerCard, setWarDealerCard] = useState<Card | null>(null);
  const [netGain, setNetGain] = useState(0);
  const [resultMsg, setResultMsg] = useState("");
  const [deck, setDeck] = useState<Card[]>([]);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const finishGame = async (won: boolean, msg: string, gain: number) => {
    setResultMsg(msg);
    setNetGain(gain);
    setPhase("result");
    try {
      const winAmount = won ? BigInt(Math.abs(gain) + betNum) : BigInt(0);
      await recordOutcome({
        gameType: GameType.war,
        bet: BigInt(betNum),
        won,
        winAmount,
      });
      onGameComplete();
      if (won) toast.success(`🎉 ${msg}`);
      else if (gain === 0) toast(msg);
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const handleDraw = () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    const d = createDeck(2);
    const pCard = d[0];
    const dCard = d[1];
    setDeck(d.slice(2));
    setPlayerCard(pCard);
    setDealerCard(dCard);
    setPhase("reveal");

    const pVal = rankNumericValue(pCard.rank);
    const dVal = rankNumericValue(dCard.rank);

    if (pVal > dVal) {
      finishGame(
        true,
        `You win! ${pCard.rank} beats ${dCard.rank}. +${betNum} credits!`,
        betNum,
      );
    } else if (dVal > pVal) {
      finishGame(
        false,
        `Dealer wins! ${dCard.rank} beats ${pCard.rank}. -${betNum} credits.`,
        -betNum,
      );
    } else {
      setPhase("war");
      toast("TIE! Go to WAR? (Double your bet)");
    }
  };

  const handleWar = async () => {
    if (BigInt(betNum * 2) > balance) {
      toast.error("Insufficient credits for War");
      return;
    }

    const d = deck.length > 1 ? deck : createDeck(2);
    const pWar = d[0];
    const dWar = d[1];
    setWarPlayerCard(pWar);
    setWarDealerCard(dWar);
    setDeck(d.slice(2));

    const pVal = rankNumericValue(pWar.rank);
    const dVal = rankNumericValue(dWar.rank);

    if (pVal >= dVal) {
      await finishGame(true, `WAR WIN! +${betNum * 2} credits!`, betNum * 2);
    } else {
      await finishGame(false, `WAR LOSS! -${betNum * 2} credits.`, -betNum * 2);
    }
  };

  const reset = () => {
    setPhase("bet");
    setPlayerCard(null);
    setDealerCard(null);
    setWarPlayerCard(null);
    setWarDealerCard(null);
    setNetGain(0);
    setResultMsg("");
  };

  return (
    <div className="space-y-4">
      {phase === "bet" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
            CASINO WAR
          </h3>
          <p className="text-center text-sm text-muted-foreground">
            Higher card wins. Tie? Go to WAR!
          </p>

          <div className="flex flex-wrap gap-2">
            {QUICK_BETS.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setBet(String(q))}
                className="px-3 py-1 rounded-full text-xs font-black"
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
            />
            <Button
              onClick={handleDraw}
              disabled={isPending}
              className="font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              DRAW!
            </Button>
          </div>
        </motion.div>
      )}

      {(phase === "reveal" || phase === "war" || phase === "result") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: `1px solid ${COLOR}40`,
            }}
          >
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center space-y-3">
                <div className="text-xs font-black tracking-wider text-muted-foreground">
                  YOUR CARD
                </div>
                {playerCard && (
                  <div className="flex justify-center">
                    <WarCard card={playerCard} />
                  </div>
                )}
                {warPlayerCard && (
                  <>
                    <div className="text-xs text-muted-foreground">
                      WAR CARD
                    </div>
                    <div className="flex justify-center">
                      <WarCard card={warPlayerCard} index={1} />
                    </div>
                  </>
                )}
              </div>
              <div className="text-center space-y-3">
                <div className="text-xs font-black tracking-wider text-muted-foreground">
                  DEALER
                </div>
                {dealerCard && (
                  <div className="flex justify-center">
                    <WarCard card={dealerCard} index={1} />
                  </div>
                )}
                {warDealerCard && (
                  <>
                    <div className="text-xs text-muted-foreground">
                      WAR CARD
                    </div>
                    <div className="flex justify-center">
                      <WarCard card={warDealerCard} index={2} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {phase === "war" && (
              <div className="text-center space-y-3">
                <div className="font-black text-xl" style={{ color: COLOR }}>
                  ⚔️ WAR! ⚔️
                </div>
                <p className="text-sm text-muted-foreground">
                  Put up {betNum} more credits and draw again!
                </p>
                <Button
                  onClick={handleWar}
                  disabled={isPending}
                  className="w-full font-black tracking-widest"
                  style={{
                    background: COLOR,
                    boxShadow: `0 0 12px ${COLOR}60`,
                  }}
                >
                  GO TO WAR! (2x Bet)
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    finishGame(
                      false,
                      `Surrendered — lost ${Math.floor(betNum / 2)} credits.`,
                      -Math.floor(betNum / 2),
                    )
                  }
                  className="w-full font-black"
                >
                  SURRENDER (Lose Half)
                </Button>
              </div>
            )}

            {phase === "result" && (
              <div
                className="rounded-lg p-3 text-center font-black"
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
            )}
          </div>

          {phase === "result" && (
            <Button
              onClick={reset}
              className="w-full font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              PLAY AGAIN
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
