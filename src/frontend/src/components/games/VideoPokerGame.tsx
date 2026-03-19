import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import {
  type Card,
  POKER_PAYOUTS,
  type Suit,
  createDeck,
  evaluatePokerHand,
  isRedSuit,
} from "./cardUtils";

const QUICK_BETS = [5, 10, 25, 50, 100];
type Phase = "bet" | "deal" | "result";

function PokerCard({
  card,
  held,
  onToggle,
  interactive,
  index = 0,
}: {
  card: Card;
  held: boolean;
  onToggle: () => void;
  interactive: boolean;
  index?: number;
}) {
  const isRed = isRedSuit(card.suit as Suit);
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="flex flex-col items-center gap-1"
    >
      {/* HELD badge */}
      <div className="h-5 flex items-center justify-center">
        {held && (
          <span
            className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded"
            style={{
              background: "#00e5ff",
              color: "#000",
              boxShadow: "0 0 8px #00e5ff",
            }}
          >
            HELD
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={interactive ? onToggle : undefined}
        className="relative rounded-xl flex flex-col justify-between font-black text-sm shadow-xl transition-all"
        style={{
          width: 62,
          height: 90,
          padding: 6,
          background: "#fff",
          border: held ? "3px solid #00e5ff" : "2px solid #ccc",
          boxShadow: held
            ? "0 0 16px #00e5ff80, 0 4px 12px rgba(0,0,0,0.4)"
            : "0 4px 12px rgba(0,0,0,0.4)",
          color: isRed ? "#c62828" : "#1a1a1a",
          transform: held ? "translateY(-8px)" : "translateY(0)",
          cursor: interactive ? "pointer" : "default",
        }}
      >
        <div className="flex flex-col leading-none" style={{ fontSize: 12 }}>
          <span className="font-black">{card.rank}</span>
          <span>{card.suit}</span>
        </div>
        <div className="self-center" style={{ fontSize: 24 }}>
          {card.suit}
        </div>
        <div
          className="flex flex-col leading-none self-end rotate-180"
          style={{ fontSize: 12 }}
        >
          <span className="font-black">{card.rank}</span>
          <span>{card.suit}</span>
        </div>
      </button>
    </motion.div>
  );
}

export default function VideoPokerGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState([false, false, false, false, false]);
  const [handName, setHandName] = useState("");
  const [winAmount, setWinAmount] = useState(0);

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
    const d = createDeck();
    setDeck(d.slice(5));
    setHand(d.slice(0, 5));
    setHeld([false, false, false, false, false]);
    setHandName("");
    setWinAmount(0);
    setPhase("deal");
  };

  const toggleHold = (i: number) =>
    setHeld((prev) => prev.map((h, idx) => (idx === i ? !h : h)));

  const handleDraw = async () => {
    let d = deck;
    const newHand = hand.map((card, i) => {
      if (held[i]) return card;
      const drawn = d[0];
      d = d.slice(1);
      return drawn;
    });
    setDeck(d);
    setHand(newHand);
    const hn = evaluatePokerHand(newHand);
    const mult = POKER_PAYOUTS[hn];
    const win = betNum * mult;
    const netGain = win - betNum;
    setHandName(hn);
    setWinAmount(netGain);
    setPhase("result");
    try {
      const won = mult > 0;
      await recordOutcome({
        gameType: GameType.videoPoker,
        bet: BigInt(betNum),
        won,
        winAmount: BigInt(win),
      });
      onGameComplete();
      if (mult === 0) toast.error(`${hn} — lost ${betNum} credits.`);
      else if (mult === 1) toast(`${hn} — break even!`);
      else toast.success(`🃏 ${hn}! +${netGain} credits!`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const resetGame = () => {
    setPhase("bet");
    setHand([]);
    setHeld([false, false, false, false, false]);
    setHandName("");
    setWinAmount(0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* TERMINAL CABINET */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)",
          border: "6px solid #2a2a2a",
          boxShadow:
            "0 0 0 2px #444, 0 8px 40px rgba(0,0,0,0.8), inset 0 2px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* TOP HEADER BAR */}
        <div
          className="px-4 py-2 flex justify-between items-center"
          style={{ background: "#0d0d0d", borderBottom: "1px solid #333" }}
        >
          <span
            className="font-black text-xs tracking-widest"
            style={{ color: "#ffd700", textShadow: "0 0 8px #ffd700" }}
          >
            VIDEO POKER
          </span>
          <span
            className="font-black text-xs"
            style={{ color: "#ffd700", fontFamily: "monospace" }}
          >
            JACKS OR BETTER
          </span>
        </div>

        {/* SCREEN AREA */}
        <div
          className="m-3 rounded-xl p-4"
          style={{
            background: "linear-gradient(180deg, #0a2010 0%, #061808 100%)",
            border: "3px solid #1a4a1a",
            boxShadow:
              "inset 0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,100,0,0.2)",
          }}
        >
          {/* CREDIT + WIN METERS */}
          <div className="flex justify-between mb-3 px-2">
            {[
              ["CREDITS", balance.toString().padStart(6, "0"), "#00ff88"],
              ["BET", String(betNum).padStart(4, "0"), "#ffd700"],
              [
                "WIN",
                winAmount > 0 ? String(winAmount).padStart(4, "0") : "0000",
                "#ff6600",
              ],
            ].map(([label, val, color]) => (
              <div key={label} className="text-center">
                <div
                  className="text-[9px] tracking-widest mb-0.5"
                  style={{ color: `${color}80`, fontFamily: "monospace" }}
                >
                  {label}
                </div>
                <div
                  className="font-black text-sm"
                  style={{
                    color,
                    fontFamily: "monospace",
                    textShadow: `0 0 8px ${color}`,
                  }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* CARDS */}
          <div className="flex gap-2 justify-center flex-wrap min-h-[110px] items-end">
            <AnimatePresence mode="wait">
              {hand.map((card, i) => (
                <PokerCard
                  key={`${card.rank}${card.suit}${i}`}
                  card={card}
                  held={held[i]}
                  onToggle={() => toggleHold(i)}
                  interactive={phase === "deal"}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* HAND RESULT */}
          <AnimatePresence>
            {phase === "result" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 py-2 rounded-lg text-center font-black tracking-wider text-sm"
                style={{
                  background:
                    winAmount >= 0
                      ? "rgba(0,255,100,0.15)"
                      : "rgba(255,50,50,0.15)",
                  border: `1px solid ${winAmount >= 0 ? "rgba(0,255,100,0.4)" : "rgba(255,50,50,0.4)"}`,
                  color:
                    winAmount > 0
                      ? "#00ff88"
                      : winAmount === 0
                        ? "#ffd700"
                        : "#ff5252",
                  textShadow: winAmount > 0 ? "0 0 10px #00ff88" : "none",
                }}
              >
                {handName}{" "}
                {winAmount > 0
                  ? `· +${winAmount} credits`
                  : winAmount === 0
                    ? "· Break even"
                    : `· Lost ${betNum} credits`}
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "deal" && (
            <p
              className="text-center text-xs mt-2"
              style={{ color: "rgba(0,255,136,0.5)" }}
            >
              Tap cards to HOLD them
            </p>
          )}
        </div>

        {/* HOLD BUTTONS ROW */}
        {(phase === "deal" || phase === "result") && hand.length > 0 && (
          <div className="flex gap-2 justify-center px-3 pb-1">
            {hand.map((_, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed hand positions
                key={`hold-${i}`}
                type="button"
                onClick={() => phase === "deal" && toggleHold(i)}
                className="flex-1 py-1.5 rounded text-xs font-black tracking-wider transition-all"
                style={{
                  background: held[i] ? "#00e5ff" : "#1a1a1a",
                  color: held[i] ? "#000" : "#555",
                  border: `1px solid ${held[i] ? "#00e5ff" : "#333"}`,
                  boxShadow: held[i] ? "0 0 8px #00e5ff60" : "none",
                  cursor: phase === "deal" ? "pointer" : "default",
                }}
              >
                HOLD
              </button>
            ))}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="p-3 space-y-2">
          {phase === "bet" && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap justify-center">
                {QUICK_BETS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setBet(q.toString())}
                    className="px-3 py-1.5 rounded text-xs font-black transition-all"
                    style={
                      bet === q.toString()
                        ? { background: "#ffd700", color: "#000" }
                        : {
                            background: "#1a1a1a",
                            color: "#666",
                            border: "1px solid #333",
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
                className="w-full rounded px-3 py-2 text-center font-bold"
                style={{
                  background: "#0a0a0a",
                  color: "#ffd700",
                  border: "2px solid #333",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleDeal}
                className="w-full py-3 rounded-xl font-black tracking-widest text-black text-sm transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(180deg, #ffd700, #f5a623)",
                  boxShadow: "0 4px 0 #b8860b, 0 0 20px rgba(255,215,0,0.3)",
                }}
              >
                🃏 DEAL CARDS
              </button>
            </div>
          )}
          {phase === "deal" && (
            <button
              type="button"
              onClick={handleDraw}
              className="w-full py-3 rounded-xl font-black tracking-widest text-black text-sm transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(180deg, #ffd700, #f5a623)",
                boxShadow: "0 4px 0 #b8860b, 0 0 20px rgba(255,215,0,0.3)",
              }}
            >
              🃏 DRAW CARDS
            </button>
          )}
          {phase === "result" && (
            <button
              type="button"
              onClick={resetGame}
              disabled={isPending}
              className="w-full py-3 rounded-xl font-black tracking-widest text-black text-sm transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(180deg, #ffd700, #f5a623)",
                boxShadow: "0 4px 0 #b8860b",
              }}
            >
              DEAL AGAIN
            </button>
          )}
        </div>
      </div>

      {/* PAYTABLE */}
      <div
        className="mt-4 rounded-xl p-3"
        style={{
          background: "oklch(0.10 0.012 280)",
          border: "1px solid oklch(0.16 0.02 280)",
        }}
      >
        <p className="text-xs font-black tracking-wider text-muted-foreground mb-2">
          JACKS OR BETTER — PAYTABLE
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          {(Object.entries(POKER_PAYOUTS) as [string, number][]).map(
            ([hn, mult]) => (
              <div key={hn} className="flex justify-between">
                <span className="text-muted-foreground">{hn}</span>
                <span
                  className="font-black"
                  style={{
                    color:
                      mult >= 25 ? "#ffd700" : mult > 0 ? "#00e5ff" : "#444",
                  }}
                >
                  {mult > 0 ? `${mult}×` : "—"}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
