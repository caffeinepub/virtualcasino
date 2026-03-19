import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "comeOut" | "point" | "result";
type BetType = "pass" | "dontPass";

const COLOR = "oklch(0.60 0.24 25)";
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
  "top-left": "top-1 left-1",
  "top-right": "top-1 right-1",
  "mid-left": "top-1/2 left-1 -translate-y-1/2",
  "mid-right": "top-1/2 right-1 -translate-y-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "bottom-left": "bottom-1 left-1",
  "bottom-right": "bottom-1 right-1",
};

function DiceFace({ value }: { value: number }) {
  return (
    <div
      className="relative w-14 h-14 rounded-lg"
      style={{ background: "white", border: `2px solid ${COLOR}` }}
    >
      {(DOT_POSITIONS[value] ?? []).map((pos) => (
        <div
          key={pos}
          className={`absolute w-2.5 h-2.5 rounded-full ${POS_CLASSES[pos]}`}
          style={{ background: "#1a1a1a" }}
        />
      ))}
    </div>
  );
}

export default function CrapsGame({
  balance,
  onGameComplete,
}: {
  balance: bigint;
  onGameComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [betType, setBetType] = useState<BetType>("pass");
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [point, setPoint] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [netGain, setNetGain] = useState(0);

  const { mutateAsync: recordOutcome, isPending } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const rollDice = (): [number, number] => [
    Math.ceil(Math.random() * 6),
    Math.ceil(Math.random() * 6),
  ];

  const finishGame = async (won: boolean, msg: string, gain: number) => {
    setResultMsg(msg);
    setNetGain(gain);
    setPhase("result");
    try {
      const winAmount = won ? BigInt(gain + betNum) : BigInt(0);
      await recordOutcome({
        gameType: GameType.craps,
        bet: BigInt(betNum),
        won,
        winAmount,
      });
      onGameComplete();
      if (won) toast.success(`🎉 ${msg}`);
      else toast.error(msg);
    } catch (e: any) {
      toast.error(e?.message ?? "Error recording game");
    }
  };

  const handleComeOut = async () => {
    if (betNum < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }

    setRolling(true);
    await new Promise((r) => setTimeout(r, 600));
    const [d1, d2] = rollDice();
    setDice([d1, d2]);
    setRolling(false);
    setPhase("comeOut");

    const total = d1 + d2;
    if (total === 7 || total === 11) {
      if (betType === "pass")
        await finishGame(
          true,
          `${total}! Pass Line wins! +${betNum} credits`,
          betNum,
        );
      else await finishGame(false, `${total}! Don't Pass loses.`, -betNum);
    } else if (total === 2 || total === 3) {
      if (betType === "dontPass")
        await finishGame(
          true,
          `${total}! Don't Pass wins! +${betNum} credits`,
          betNum,
        );
      else await finishGame(false, `${total}! Pass Line loses.`, -betNum);
    } else if (total === 12) {
      if (betType === "dontPass") {
        setResultMsg("12 — Push! Bet returned.");
        setNetGain(0);
        setPhase("result");
        toast("Push — bet returned!");
        try {
          await recordOutcome({
            gameType: GameType.craps,
            bet: BigInt(betNum),
            won: false,
            winAmount: BigInt(0),
          });
          onGameComplete();
        } catch {}
      } else {
        await finishGame(false, "12! Pass Line loses.", -betNum);
      }
    } else {
      setPoint(total);
      setPhase("point");
      toast(`Point set: ${total}. Roll again!`);
    }
  };

  const handleRollPoint = async () => {
    setRolling(true);
    await new Promise((r) => setTimeout(r, 600));
    const [d1, d2] = rollDice();
    setDice([d1, d2]);
    setRolling(false);

    const total = d1 + d2;
    if (total === point) {
      if (betType === "pass")
        await finishGame(
          true,
          `Hit the point ${point}! Pass Line wins! +${betNum}`,
          betNum,
        );
      else await finishGame(false, "Point hit — Don't Pass loses.", -betNum);
    } else if (total === 7) {
      if (betType === "dontPass")
        await finishGame(true, `7-Out! Don't Pass wins! +${betNum}`, betNum);
      else await finishGame(false, "7-Out! Pass Line loses.", -betNum);
    } else {
      toast(`Rolled ${total} — keep rolling!`);
    }
  };

  const reset = () => {
    setPhase("bet");
    setDice([1, 1]);
    setPoint(null);
    setResultMsg("");
    setNetGain(0);
  };

  const betTypes: BetType[] = ["pass", "dontPass"];
  const betTypeLabel: Record<BetType, string> = {
    pass: "Pass Line (1:1)",
    dontPass: "Don't Pass (1:1)",
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
            PLACE YOUR BET
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {betTypes.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setBetType(type)}
                className="rounded-lg py-3 font-black uppercase tracking-wider text-sm transition-all"
                style={{
                  background: betType === type ? COLOR : "oklch(0.16 0.02 280)",
                  border: `2px solid ${betType === type ? COLOR : "oklch(0.22 0.03 280)"}`,
                  color: betType === type ? "white" : "oklch(0.65 0.05 280)",
                  boxShadow: betType === type ? `0 0 16px ${COLOR}60` : "none",
                }}
              >
                {betTypeLabel[type]}
              </button>
            ))}
          </div>

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
              onClick={handleComeOut}
              disabled={isPending || rolling}
              className="font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              ROLL!
            </Button>
          </div>
        </motion.div>
      )}

      {(phase === "comeOut" || phase === "point") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl p-5 space-y-4"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: `1px solid ${COLOR}40`,
          }}
        >
          {point !== null && (
            <div className="text-center">
              <span className="text-xs font-black tracking-wider text-muted-foreground">
                POINT:{" "}
              </span>
              <span className="text-2xl font-black" style={{ color: COLOR }}>
                {point}
              </span>
            </div>
          )}

          <div className="flex justify-center gap-4">
            {rolling ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.3 }}
              >
                <DiceFace value={Math.ceil(Math.random() * 6)} />
              </motion.div>
            ) : (
              <>
                <DiceFace value={dice[0]} />
                <DiceFace value={dice[1]} />
              </>
            )}
          </div>

          <div
            className="text-center font-black text-2xl"
            style={{ color: COLOR }}
          >
            {rolling ? "Rolling..." : `Total: ${dice[0] + dice[1]}`}
          </div>

          {phase === "point" && (
            <Button
              onClick={handleRollPoint}
              disabled={rolling || isPending}
              className="w-full font-black tracking-widest"
              style={{ background: COLOR, boxShadow: `0 0 12px ${COLOR}60` }}
            >
              ROLL AGAIN
            </Button>
          )}
        </motion.div>
      )}

      {phase === "result" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex justify-center gap-4">
            <>
              <DiceFace value={dice[0]} />
              <DiceFace value={dice[1]} />
            </>
          </div>
          <div
            className="rounded-xl p-4 text-center font-black text-lg"
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
