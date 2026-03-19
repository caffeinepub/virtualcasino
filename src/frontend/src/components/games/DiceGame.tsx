import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "rolling" | "result";

const COLOR = "oklch(0.70 0.20 190)";
const QUICK_BETS = [5, 10, 25, 50, 100];

const DOT_POSITIONS: Record<number, string[]> = {
  1: ["center"],
  2: ["top-right", "bottom-left"],
  3: ["top-right", "center", "bottom-left"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: [
    "top-left",
    "top-right",
    "mid-left",
    "mid-right",
    "bottom-left",
    "bottom-right",
  ],
};

const POS_CLASSES: Record<string, string> = {
  "top-left": "top-1.5 left-1.5",
  "top-right": "top-1.5 right-1.5",
  "mid-left": "top-1/2 left-1.5 -translate-y-1/2",
  "mid-right": "top-1/2 right-1.5 -translate-y-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "bottom-left": "bottom-1.5 left-1.5",
  "bottom-right": "bottom-1.5 right-1.5",
};

function DiceFace({ value, diceColor }: { value: number; diceColor: string }) {
  return (
    <div
      className="relative w-16 h-16 rounded-xl"
      style={{
        background: "white",
        border: `3px solid ${diceColor}`,
        boxShadow: `0 0 12px ${diceColor}60`,
      }}
    >
      {(DOT_POSITIONS[value] ?? []).map((pos) => (
        <div
          key={pos}
          className={`absolute w-3 h-3 rounded-full ${POS_CLASSES[pos]}`}
          style={{ background: "#1a1a1a" }}
        />
      ))}
    </div>
  );
}

export default function DiceGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [playerDice, setPlayerDice] = useState<[number, number]>([1, 1]);
  const [aiDice, setAiDice] = useState<[number, number]>([1, 1]);
  const [netGain, setNetGain] = useState(0);
  const [resultMsg, setResultMsg] = useState("");

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const handleRoll = async () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    setPhase("rolling");
    await new Promise((r) => setTimeout(r, 800));

    const p: [number, number] = [
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6),
    ];
    const a: [number, number] = [
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6),
    ];
    setPlayerDice(p);
    setAiDice(a);

    const pTotal = p[0] + p[1];
    const aTotal = a[0] + a[1];
    let net = 0;
    let msg = "";

    if (pTotal > aTotal) {
      net = betNum;
      msg = `You win! ${pTotal} vs ${aTotal} — +${betNum} credits!`;
    } else if (aTotal > pTotal) {
      net = -betNum;
      msg = `Dealer wins! ${aTotal} vs ${pTotal} — -${betNum} credits.`;
    } else {
      net = 0;
      msg = `Tie! ${pTotal} vs ${aTotal} — bet returned.`;
    }

    setNetGain(net);
    setResultMsg(msg);
    setPhase("result");

    try {
      const won = net > 0;
      const winAmount = won ? BigInt(net + betNum) : BigInt(0);
      await recordOutcome({
        gameType: GameType.dice,
        bet: BigInt(betNum),
        won,
        winAmount,
      });
      onGameComplete();
      if (net > 0) toast.success(`🎉 ${msg}`);
      else if (net === 0) toast(msg);
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const reset = () => {
    setPhase("bet");
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
            DICE BATTLE
          </h3>
          <p className="text-center text-sm text-muted-foreground">
            Roll 2 dice vs the dealer. Higher total wins!
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
              onClick={handleRoll}
              disabled={isPending}
              className="font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              ROLL!
            </Button>
          </div>
        </motion.div>
      )}

      {phase === "rolling" && (
        <div className="text-center py-8 space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.4 }}
            className="text-5xl mx-auto w-fit"
          >
            🎲
          </motion.div>
          <p className="font-black tracking-widest" style={{ color: COLOR }}>
            ROLLING...
          </p>
        </div>
      )}

      {phase === "result" && (
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
              <div className="text-center space-y-2">
                <div className="text-xs font-black tracking-wider text-muted-foreground">
                  YOU
                </div>
                <div className="flex justify-center gap-2">
                  <DiceFace value={playerDice[0]} diceColor={COLOR} />
                  <DiceFace value={playerDice[1]} diceColor={COLOR} />
                </div>
                <div className="font-black text-xl" style={{ color: COLOR }}>
                  Total: {playerDice[0] + playerDice[1]}
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-xs font-black tracking-wider text-muted-foreground">
                  DEALER
                </div>
                <div className="flex justify-center gap-2">
                  <DiceFace
                    value={aiDice[0]}
                    diceColor="oklch(0.577 0.245 27)"
                  />
                  <DiceFace
                    value={aiDice[1]}
                    diceColor="oklch(0.577 0.245 27)"
                  />
                </div>
                <div
                  className="font-black text-xl"
                  style={{ color: "oklch(0.577 0.245 27)" }}
                >
                  Total: {aiDice[0] + aiDice[1]}
                </div>
              </div>
            </div>

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
    </div>
  );
}
