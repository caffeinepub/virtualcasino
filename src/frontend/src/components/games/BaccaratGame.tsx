import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import { RealisticCard } from "./RealisticCard";
import { type Card, type Suit, createDeck, isRedSuit } from "./cardUtils";

type Phase = "bet" | "result";
type BetChoice = "player" | "banker" | "tie";

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
    const fp = handTotal(pCards);
    const fb = handTotal(bCards);
    const isTie = fp === fb;
    const playerWins = fp > fb;
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
  const betLabel: Record<BetChoice, string> = {
    player: "PLAYER 1:1",
    banker: "BANKER 0.95:1",
    tie: "TIE 8:1",
  };
  const choiceColor: Record<BetChoice, string> = {
    player: "#1565c0",
    banker: "#b71c1c",
    tie: "#2e7d32",
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* BACCARAT TABLE */}
      <div
        className="relative rounded-[2rem] overflow-hidden p-5"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, #1b5e20 0%, #0d3b10 60%, #071a08 100%)",
          border: "10px solid #3e2208",
          boxShadow:
            "0 0 0 3px #8d5524, 0 8px 40px rgba(0,0,0,0.7), inset 0 0 60px rgba(0,0,0,0.3)",
          minHeight: 340,
        }}
      >
        {/* TABLE LABEL */}
        <div className="text-center mb-4">
          <span
            className="text-sm font-black tracking-[0.2em]"
            style={{
              color: "rgba(255,215,0,0.7)",
              textShadow: "0 0 8px rgba(255,215,0,0.4)",
            }}
          >
            BACCARAT
          </span>
        </div>

        {/* ZONE LAYOUT */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* PLAYER ZONE */}
          <div
            className="rounded-xl p-3 flex flex-col items-center"
            style={{
              background: "rgba(21,101,192,0.25)",
              border:
                betChoice === "player"
                  ? "2px solid #1e88e5"
                  : "1.5px solid rgba(21,101,192,0.4)",
              boxShadow:
                betChoice === "player"
                  ? "0 0 16px rgba(30,136,229,0.4)"
                  : "none",
            }}
          >
            <span className="text-xs font-black tracking-widest text-blue-300 mb-2">
              PLAYER
            </span>
            <div className="flex flex-wrap gap-1 justify-center min-h-[60px] items-center">
              {phase === "bet" ? (
                <div className="text-xs text-white/20 italic">cards here</div>
              ) : (
                playerCards.map((c, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable card positions
                  <RealisticCard key={`p${i}`} card={c} index={i} small />
                ))
              )}
            </div>
            {phase === "result" && (
              <span className="mt-2 text-xl font-black text-white">
                {handTotal(playerCards)}
              </span>
            )}
          </div>

          {/* TIE ZONE */}
          <div
            className="rounded-xl p-3 flex flex-col items-center"
            style={{
              background: "rgba(46,125,50,0.2)",
              border:
                betChoice === "tie"
                  ? "2px solid #43a047"
                  : "1.5px solid rgba(46,125,50,0.3)",
              boxShadow:
                betChoice === "tie" ? "0 0 16px rgba(67,160,71,0.4)" : "none",
            }}
          >
            <span className="text-xs font-black tracking-widest text-green-300 mb-1">
              TIE
            </span>
            <span className="text-xs text-white/40">8:1</span>
            {phase === "result" && (
              <span
                className="mt-2 text-lg font-black"
                style={{
                  color:
                    netGain === 0 || (betChoice === "tie" && netGain > 0)
                      ? "#a5d6a7"
                      : "#fff",
                }}
              >
                PUSH
              </span>
            )}
          </div>

          {/* BANKER ZONE */}
          <div
            className="rounded-xl p-3 flex flex-col items-center"
            style={{
              background: "rgba(183,28,28,0.25)",
              border:
                betChoice === "banker"
                  ? "2px solid #ef5350"
                  : "1.5px solid rgba(183,28,28,0.4)",
              boxShadow:
                betChoice === "banker"
                  ? "0 0 16px rgba(239,83,80,0.4)"
                  : "none",
            }}
          >
            <span className="text-xs font-black tracking-widest text-red-300 mb-2">
              BANKER
            </span>
            <div className="flex flex-wrap gap-1 justify-center min-h-[60px] items-center">
              {phase === "bet" ? (
                <div className="text-xs text-white/20 italic">cards here</div>
              ) : (
                bankerCards.map((c, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable card positions
                  <RealisticCard key={`b${i}`} card={c} index={i} small />
                ))
              )}
            </div>
            {phase === "result" && (
              <span className="mt-2 text-xl font-black text-white">
                {handTotal(bankerCards)}
              </span>
            )}
          </div>
        </div>

        {/* RESULT MESSAGE */}
        <AnimatePresence>
          {phase === "result" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-3 text-center font-black"
              style={{
                background:
                  netGain > 0
                    ? "rgba(27,94,32,0.5)"
                    : netGain < 0
                      ? "rgba(183,28,28,0.4)"
                      : "rgba(255,255,255,0.1)",
                border: `1px solid ${netGain > 0 ? "rgba(102,187,106,0.5)" : netGain < 0 ? "rgba(239,83,80,0.5)" : "rgba(255,255,255,0.2)"}`,
                color:
                  netGain > 0 ? "#a5d6a7" : netGain < 0 ? "#ef9a9a" : "#fff",
              }}
            >
              {resultMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BET PANEL */}
      <div
        className="mt-4 rounded-2xl p-5 space-y-4"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: "1px solid oklch(0.20 0.03 280)",
        }}
      >
        {phase === "bet" ? (
          <>
            <p
              className="text-xs font-black tracking-widest text-center"
              style={{ color: "#c8a84b" }}
            >
              PLACE YOUR BET
            </p>
            <div className="grid grid-cols-3 gap-2">
              {betChoices.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBetChoice(c)}
                  className="py-3 rounded-xl font-black text-sm tracking-wider text-white transition-all hover:brightness-110"
                  style={{
                    background:
                      betChoice === c ? choiceColor[c] : "oklch(0.16 0.02 280)",
                    border: `2px solid ${betChoice === c ? choiceColor[c] : "oklch(0.22 0.03 280)"}`,
                    boxShadow:
                      betChoice === c ? `0 0 16px ${choiceColor[c]}60` : "none",
                  }}
                >
                  {betLabel[c]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {QUICK_BETS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setBet(String(q))}
                  className="px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                  style={
                    betNum === q
                      ? { background: "#c8a84b", color: "#1a1a1a" }
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
            <input
              type="number"
              min="1"
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-center font-bold"
              style={{
                background: "oklch(0.09 0.01 280)",
                color: "#c8a84b",
                border: "1px solid oklch(0.22 0.03 280)",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleDeal}
              disabled={isPending}
              className="w-full py-4 rounded-xl font-black tracking-widest transition-all hover:brightness-110"
              style={{
                background: "#c8a84b",
                color: "#1a1a1a",
                boxShadow: "0 0 24px rgba(200,168,75,0.4)",
              }}
            >
              DEAL
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="w-full py-4 rounded-xl font-black tracking-widest transition-all hover:brightness-110"
            style={{ background: "#c8a84b", color: "#1a1a1a" }}
          >
            PLAY AGAIN
          </button>
        )}
      </div>
    </div>
  );
}
