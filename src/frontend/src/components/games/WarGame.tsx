import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import { RealisticCard } from "./RealisticCard";
import { type Card, createDeck, rankNumericValue } from "./cardUtils";

type Phase = "bet" | "result";

const QUICK_BETS = [5, 10, 25, 50, 100];
const COLOR = "oklch(0.72 0.22 30)";
const GOLD = "rgba(255,215,0,0.8)";

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

export default function WarGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [dealerCard, setDealerCard] = useState<Card | null>(null);
  const [resultMsg, setResultMsg] = useState("");
  const [netGain, setNetGain] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleDeal = async () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    setIsAnimating(true);
    await new Promise((r) => setTimeout(r, 600));

    const deck = createDeck(1);
    const pCard = deck[0];
    const dCard = deck[1];
    setPlayerCard(pCard);
    setDealerCard(dCard);

    const pVal = rankNumericValue(pCard.rank);
    const dVal = rankNumericValue(dCard.rank);

    let net = 0;
    let msg = "";
    if (pVal > dVal) {
      net = betNum;
      msg = `${pCard.rank} beats ${dCard.rank}! +${net} credits!`;
    } else if (pVal < dVal) {
      net = -betNum;
      msg = `Dealer's ${dCard.rank} beats your ${pCard.rank}. -${betNum} credits.`;
    } else {
      net = 0;
      msg = `Tie! Both played ${pCard.rank}. Bet returned.`;
    }

    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");
    setIsAnimating(false);

    try {
      const won = net > 0;
      await recordOutcome({
        gameType: GameType.war,
        bet: BigInt(betNum),
        won,
        winAmount: won ? BigInt(net + betNum) : BigInt(0),
      });
      onGameComplete();
      if (net > 0) toast.success(`🎉 ${msg}`);
      else if (net === 0) toast("Tie! Push.");
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
    setPlayerCard(null);
    setDealerCard(null);
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
          CASINO WAR
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Highest card wins — simple as that
        </p>
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
                {/* Zone labels */}
                <div className="flex justify-center gap-4">
                  {["YOUR BET", "⚔️ WAR", "DEALER"].map((zone) => (
                    <div
                      key={zone}
                      className="flex-1 text-center py-2 rounded-xl"
                      style={{
                        border: `1px solid ${GOLD}`,
                        background: "rgba(0,0,0,0.4)",
                        color: GOLD,
                        fontSize: "11px",
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {zone}
                    </div>
                  ))}
                </div>
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
                  disabled={isPending || isAnimating}
                  className="w-full font-black tracking-widest text-lg py-6"
                  style={{
                    background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.2 30))`,
                    boxShadow: `0 0 24px ${COLOR}`,
                  }}
                >
                  {isAnimating ? "DEALING..." : "⚔️ GO TO WAR"}
                </Button>
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
              <div className="rounded-2xl p-5 space-y-5" style={FELT_STYLE}>
                <div className="grid grid-cols-2 gap-4">
                  {/* Dealer side */}
                  <div className="text-center space-y-3">
                    <div
                      className="inline-block py-1 px-3 rounded"
                      style={{
                        border: `1px solid ${GOLD}`,
                        color: GOLD,
                        fontSize: "11px",
                        fontWeight: 900,
                      }}
                    >
                      DEALER
                    </div>
                    <div className="flex justify-center">
                      {dealerCard && (
                        <RealisticCard card={dealerCard} index={0} />
                      )}
                    </div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "rgba(255,215,0,0.6)" }}
                    >
                      {dealerCard?.rank}
                    </p>
                  </div>

                  {/* VS divider */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden" />

                  {/* Player side */}
                  <div className="text-center space-y-3">
                    <div
                      className="inline-block py-1 px-3 rounded"
                      style={{
                        border: `2px solid ${COLOR}`,
                        color: COLOR,
                        fontSize: "11px",
                        fontWeight: 900,
                      }}
                    >
                      YOU
                    </div>
                    <div className="flex justify-center">
                      {playerCard && (
                        <RealisticCard card={playerCard} index={0} />
                      )}
                    </div>
                    <p className="text-sm font-bold" style={{ color: COLOR }}>
                      {playerCard?.rank}
                    </p>
                  </div>
                </div>

                {/* VS badge */}
                <div className="flex items-center gap-3">
                  <div
                    className="h-px flex-1"
                    style={{ background: `${COLOR}40` }}
                  />
                  <div
                    className="rounded-full w-10 h-10 flex items-center justify-center font-black text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.2 30))`,
                      boxShadow: `0 0 16px ${COLOR}`,
                    }}
                  >
                    VS
                  </div>
                  <div
                    className="h-px flex-1"
                    style={{ background: `${COLOR}40` }}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl p-4 text-center space-y-2"
                  style={{
                    background:
                      netGain > 0
                        ? "rgba(0,100,40,0.6)"
                        : netGain < 0
                          ? "rgba(120,0,0,0.6)"
                          : "rgba(50,50,0,0.6)",
                    border: `2px solid ${netGain > 0 ? "rgba(0,255,100,0.4)" : netGain < 0 ? "rgba(255,0,0,0.4)" : "rgba(255,215,0,0.4)"}`,
                  }}
                >
                  <p
                    className="font-black text-2xl"
                    style={{
                      color:
                        netGain > 0
                          ? "#4ade80"
                          : netGain < 0
                            ? "#f87171"
                            : GOLD,
                    }}
                  >
                    {netGain > 0
                      ? `+${netGain}`
                      : netGain === 0
                        ? "PUSH"
                        : netGain}{" "}
                    CREDITS
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
