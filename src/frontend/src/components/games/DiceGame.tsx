import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "rolling" | "result";

const COLOR = "oklch(0.70 0.20 190)";
const DEALER_COLOR = "oklch(0.577 0.245 27)";
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
  "top-left": "top-2.5 left-2.5",
  "top-right": "top-2.5 right-2.5",
  "mid-left": "top-1/2 left-2.5 -translate-y-1/2",
  "mid-right": "top-1/2 right-2.5 -translate-y-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "bottom-left": "bottom-2.5 left-2.5",
  "bottom-right": "bottom-2.5 right-2.5",
};

function DiceFace({
  value,
  diceColor,
  rolling,
}: { value: number; diceColor: string; rolling?: boolean }) {
  return (
    <motion.div
      animate={rolling ? { rotateX: [0, 180, 360], rotateY: [0, 90, 180] } : {}}
      transition={{
        repeat: rolling ? Number.POSITIVE_INFINITY : 0,
        duration: 0.4,
      }}
      className="relative rounded-2xl"
      style={{
        width: 72,
        height: 72,
        background:
          "linear-gradient(145deg, #f5f5f0 0%, #e8e8e0 50%, #d0d0c8 100%)",
        border: `3px solid ${diceColor}`,
        boxShadow: `0 6px 20px rgba(0,0,0,0.4), 0 0 16px ${diceColor}60, inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.15)`,
        perspective: "400px",
      }}
    >
      {/* Rounded edges effect */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 25% 25%, rgba(255,255,255,0.4), transparent 60%)",
        }}
      />
      {(DOT_POSITIONS[value] ?? []).map((pos) => (
        <div
          key={pos}
          className={`absolute w-4 h-4 rounded-full ${POS_CLASSES[pos]}`}
          style={{
            background: `radial-gradient(circle at 40% 35%, ${diceColor}aa, #1a0a00)`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        />
      ))}
    </motion.div>
  );
}

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

export default function DiceGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
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
    await new Promise((r) => setTimeout(r, 1200));
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
      <div className="text-center">
        <h2
          className="text-2xl font-black tracking-widest"
          style={{
            color: COLOR,
            textShadow: `0 0 20px ${COLOR}, 0 0 40px ${COLOR}`,
          }}
        >
          DICE BATTLE
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Roll 2 dice vs the dealer — highest total wins!
        </p>
      </div>

      {phase === "bet" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={WOOD_STYLE}>
            <div className="rounded-2xl p-6 space-y-5" style={FELT_STYLE}>
              {/* Show dice on table */}
              <div className="flex justify-center items-center gap-6">
                <div className="text-center space-y-2">
                  <div className="flex gap-2 justify-center">
                    <DiceFace value={5} diceColor={COLOR} />
                    <DiceFace value={4} diceColor={COLOR} />
                  </div>
                  <p className="text-xs font-black" style={{ color: COLOR }}>
                    YOU
                  </p>
                </div>
                <div
                  className="font-black text-2xl"
                  style={{ color: "rgba(255,215,0,0.7)" }}
                >
                  VS
                </div>
                <div className="text-center space-y-2">
                  <div className="flex gap-2 justify-center">
                    <DiceFace value={3} diceColor={DEALER_COLOR} />
                    <DiceFace value={6} diceColor={DEALER_COLOR} />
                  </div>
                  <p
                    className="text-xs font-black"
                    style={{ color: DEALER_COLOR }}
                  >
                    DEALER
                  </p>
                </div>
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
                      color: betNum === q ? "white" : "rgba(255,215,0,0.8)",
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
                onClick={handleRoll}
                disabled={isPending}
                className="w-full font-black tracking-widest text-lg py-6"
                style={{
                  background: `linear-gradient(135deg, ${COLOR}, oklch(0.55 0.18 190))`,
                  boxShadow: `0 0 24px ${COLOR}`,
                }}
              >
                ROLL THE DICE!
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {phase === "rolling" && (
        <div style={WOOD_STYLE}>
          <div className="rounded-2xl p-8" style={FELT_STYLE}>
            <div className="flex justify-center items-center gap-8">
              <div className="text-center space-y-3">
                <div className="flex gap-2 justify-center">
                  <DiceFace
                    value={Math.ceil(Math.random() * 6)}
                    diceColor={COLOR}
                    rolling
                  />
                  <DiceFace
                    value={Math.ceil(Math.random() * 6)}
                    diceColor={COLOR}
                    rolling
                  />
                </div>
                <p className="text-xs font-black" style={{ color: COLOR }}>
                  YOU
                </p>
              </div>
              <div
                className="font-black text-2xl"
                style={{ color: "rgba(255,215,0,0.7)" }}
              >
                VS
              </div>
              <div className="text-center space-y-3">
                <div className="flex gap-2 justify-center">
                  <DiceFace
                    value={Math.ceil(Math.random() * 6)}
                    diceColor={DEALER_COLOR}
                    rolling
                  />
                  <DiceFace
                    value={Math.ceil(Math.random() * 6)}
                    diceColor={DEALER_COLOR}
                    rolling
                  />
                </div>
                <p
                  className="text-xs font-black"
                  style={{ color: DEALER_COLOR }}
                >
                  DEALER
                </p>
              </div>
            </div>
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.6 }}
              className="text-center font-black tracking-widest mt-4"
              style={{ color: "rgba(255,215,0,0.8)" }}
            >
              ROLLING...
            </motion.p>
          </div>
        </div>
      )}

      {phase === "result" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={WOOD_STYLE}>
            <div className="rounded-2xl p-5 space-y-4" style={FELT_STYLE}>
              <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex justify-center gap-2">
                    <DiceFace value={playerDice[0]} diceColor={COLOR} />
                    <DiceFace value={playerDice[1]} diceColor={COLOR} />
                  </div>
                  <div className="font-black text-xl" style={{ color: COLOR }}>
                    Total: {playerDice[0] + playerDice[1]}
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <div
                    className="inline-block py-1 px-3 rounded"
                    style={{
                      border: `2px solid ${DEALER_COLOR}`,
                      color: DEALER_COLOR,
                      fontSize: "11px",
                      fontWeight: 900,
                    }}
                  >
                    DEALER
                  </div>
                  <div className="flex justify-center gap-2">
                    <DiceFace value={aiDice[0]} diceColor={DEALER_COLOR} />
                    <DiceFace value={aiDice[1]} diceColor={DEALER_COLOR} />
                  </div>
                  <div
                    className="font-black text-xl"
                    style={{ color: DEALER_COLOR }}
                  >
                    Total: {aiDice[0] + aiDice[1]}
                  </div>
                </div>
              </div>

              {/* Gold VS divider */}
              <div className="flex items-center gap-3">
                <div
                  className="h-0.5 flex-1"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, rgba(255,215,0,0.5))",
                  }}
                />
                <div
                  className="font-black text-lg"
                  style={{ color: "rgba(255,215,0,0.8)" }}
                >
                  VS
                </div>
                <div
                  className="h-0.5 flex-1"
                  style={{
                    background:
                      "linear-gradient(to left, transparent, rgba(255,215,0,0.5))",
                  }}
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
                          : "rgba(255,215,0,0.9)",
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
                  style={{ background: COLOR, boxShadow: `0 0 16px ${COLOR}` }}
                >
                  ROLL AGAIN
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
