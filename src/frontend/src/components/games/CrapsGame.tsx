import { motion } from "motion/react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";

type Phase = "bet" | "comeOut" | "point" | "result";
type BetType = "pass" | "dontPass";

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

const POS_STYLE: Record<string, React.CSSProperties> = {
  "top-left": { top: 8, left: 8 },
  "top-right": { top: 8, right: 8 },
  "mid-left": { top: "50%", left: 8, transform: "translateY(-50%)" },
  "mid-right": { top: "50%", right: 8, transform: "translateY(-50%)" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  "bottom-left": { bottom: 8, left: 8 },
  "bottom-right": { bottom: 8, right: 8 },
};

function RealisticDie({
  value,
  rolling = false,
}: { value: number; rolling?: boolean }) {
  return (
    <motion.div
      animate={
        rolling
          ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={rolling ? { duration: 0.4, repeat: 2 } : { duration: 0.2 }}
      className="relative"
      style={{
        width: 68,
        height: 68,
        borderRadius: 12,
        background: "linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",
        border: "2px solid #ccc",
        boxShadow:
          "0 6px 16px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.15)",
      }}
    >
      {(DOT_POSITIONS[value] ?? []).map((pos) => (
        <div
          key={pos}
          className="absolute"
          style={{
            ...POS_STYLE[pos],
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #333, #000)",
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </motion.div>
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
    await new Promise((r) => setTimeout(r, 800));
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
      } else await finishGame(false, "12! Pass Line loses.", -betNum);
    } else {
      setPoint(total);
      setPhase("point");
      toast(`Point set: ${total}. Roll again!`);
    }
  };

  const handleRollPoint = async () => {
    setRolling(true);
    await new Promise((r) => setTimeout(r, 800));
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

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* CRAPS TABLE */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#1b5e20",
          border: "10px solid #3e2208",
          boxShadow: "0 0 0 3px #8d5524, 0 8px 40px rgba(0,0,0,0.7)",
        }}
      >
        {/* TABLE HEADER */}
        <div
          className="px-4 py-2 text-center font-black text-sm tracking-[0.2em]"
          style={{
            background: "#0d3b10",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,215,0,0.8)",
            textShadow: "0 0 8px rgba(255,215,0,0.4)",
          }}
        >
          CRAPS — PASS LINE PAYS EVEN MONEY
        </div>

        {/* BET LAYOUT */}
        <div className="p-3 space-y-2">
          {/* PLACE NUMBERS */}
          <div className="grid grid-cols-6 gap-1">
            {[4, 5, 6, 8, 9, 10].map((n) => (
              <div
                key={n}
                className="text-center py-2 rounded text-xs font-black text-white"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div
                  style={{
                    color: n === point ? "#ffd700" : "#fff",
                    textShadow: n === point ? "0 0 8px #ffd700" : "none",
                  }}
                >
                  {n}
                </div>
                <div className="text-[8px] text-white/40">PLACE</div>
              </div>
            ))}
          </div>

          {/* COME / DONT COME */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="py-2 rounded text-center text-xs font-black text-white"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              COME
            </div>
            <div
              className="py-2 rounded text-center text-xs font-black text-white"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              DON'T COME
            </div>
          </div>

          {/* FIELD */}
          <div
            className="py-2 rounded text-center"
            style={{
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-xs font-black text-white tracking-widest">
              FIELD: 2,3,4,9,10,11,12
            </span>
          </div>

          {/* PASS LINE */}
          <div
            className="py-3 rounded-lg text-center transition-all"
            style={{
              background:
                betType === "pass" ? "rgba(21,101,192,0.4)" : "rgba(0,0,0,0.3)",
              border:
                betType === "pass"
                  ? "2px solid #1e88e5"
                  : "1px solid rgba(255,255,255,0.15)",
              boxShadow:
                betType === "pass" ? "0 0 16px rgba(30,136,229,0.3)" : "none",
            }}
          >
            <span className="text-sm font-black text-white tracking-[0.15em]">
              PASS LINE
            </span>
          </div>

          {/* DON'T PASS BAR */}
          <div
            className="py-2 rounded text-center transition-all"
            style={{
              background:
                betType === "dontPass"
                  ? "rgba(183,28,28,0.4)"
                  : "rgba(0,0,0,0.2)",
              border:
                betType === "dontPass"
                  ? "2px solid #ef5350"
                  : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-xs font-black text-white tracking-widest">
              DON'T PASS BAR
            </span>
          </div>
        </div>

        {/* DICE AREA */}
        <div
          className="mx-4 mb-4 rounded-xl p-4 flex flex-col items-center gap-3"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(4px)",
          }}
        >
          {point !== null && phase !== "result" && (
            <div className="text-center">
              <span className="text-xs font-black tracking-widest text-white/60">
                POINT:{" "}
              </span>
              <span
                className="text-2xl font-black"
                style={{ color: "#ffd700", textShadow: "0 0 8px #ffd700" }}
              >
                {point}
              </span>
            </div>
          )}

          <div className="flex gap-6 justify-center">
            <RealisticDie value={dice[0]} rolling={rolling} />
            <RealisticDie value={dice[1]} rolling={rolling} />
          </div>

          {(phase === "comeOut" || phase === "point") && !rolling && (
            <div
              className="text-center font-black text-xl"
              style={{ color: "#ffd700" }}
            >
              Total: {dice[0] + dice[1]}
            </div>
          )}
          {rolling && (
            <div className="text-center font-black text-sm text-white/60 animate-pulse tracking-widest">
              ROLLING...
            </div>
          )}
        </div>

        {/* RESULT */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 mb-4 rounded-xl p-4 text-center font-black"
            style={{
              background:
                netGain > 0
                  ? "rgba(27,94,32,0.6)"
                  : netGain < 0
                    ? "rgba(183,28,28,0.5)"
                    : "rgba(255,255,255,0.1)",
              border: `1px solid ${netGain > 0 ? "rgba(102,187,106,0.6)" : netGain < 0 ? "rgba(239,83,80,0.6)" : "rgba(255,255,255,0.2)"}`,
              color: netGain > 0 ? "#a5d6a7" : netGain < 0 ? "#ef9a9a" : "#fff",
            }}
          >
            {resultMsg}
          </motion.div>
        )}
      </div>

      {/* CONTROLS */}
      <div
        className="mt-4 rounded-2xl p-5 space-y-4"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: "1px solid oklch(0.20 0.03 280)",
        }}
      >
        {phase === "bet" && (
          <>
            <p
              className="text-xs font-black tracking-widest text-center"
              style={{ color: "#c8a84b" }}
            >
              PLACE YOUR BET
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["pass", "dontPass"] as BetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBetType(t)}
                  className="py-3 rounded-xl font-black uppercase tracking-wider text-sm text-white transition-all"
                  style={{
                    background:
                      betType === t
                        ? t === "pass"
                          ? "#1565c0"
                          : "#b71c1c"
                        : "oklch(0.16 0.02 280)",
                    border: `2px solid ${betType === t ? (t === "pass" ? "#1e88e5" : "#ef5350") : "oklch(0.22 0.03 280)"}`,
                    boxShadow:
                      betType === t
                        ? `0 0 16px ${t === "pass" ? "#1e88e560" : "#ef535060"}`
                        : "none",
                  }}
                >
                  {t === "pass" ? "Pass Line 1:1" : "Don't Pass 1:1"}
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
              onClick={handleComeOut}
              disabled={isPending || rolling}
              className="w-full py-4 rounded-xl font-black tracking-widest transition-all hover:brightness-110"
              style={{
                background: "#c8a84b",
                color: "#1a1a1a",
                boxShadow: "0 0 24px rgba(200,168,75,0.4)",
              }}
            >
              🎲 ROLL!
            </button>
          </>
        )}
        {phase === "point" && (
          <button
            type="button"
            onClick={handleRollPoint}
            disabled={rolling || isPending}
            className="w-full py-4 rounded-xl font-black tracking-widest transition-all hover:brightness-110"
            style={{
              background: "#c8a84b",
              color: "#1a1a1a",
              boxShadow: "0 0 24px rgba(200,168,75,0.4)",
            }}
          >
            🎲 ROLL AGAIN
          </button>
        )}
        {phase === "result" && (
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
