import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameType } from "../../backend.d";
import { useRecordGameOutcome } from "../../hooks/useQueries";
import ArcadeCabinet from "./ArcadeCabinet";

const HEX_COLOR = "#ff2266";
const QUICK_BETS = [5, 10, 25, 50, 100];
type Phase = "bet" | "playing" | "result";
type Move = "punch" | "kick" | "block";

interface FightState {
  playerHp: number;
  cpuHp: number;
  round: number;
  animMsg: string;
  lastPlayerMove: Move | null;
  lastCpuMove: Move | null;
  animating: boolean;
}

const MOVES: { id: Move; label: string; emoji: string; dmg: number }[] = [
  { id: "punch", label: "HIGH PUNCH", emoji: "👊", dmg: 15 },
  { id: "kick", label: "LOW KICK", emoji: "🦵", dmg: 20 },
  { id: "block", label: "BLOCK", emoji: "🛡️", dmg: 0 },
];

export default function StreetFighterGame({
  balance,
  onGameComplete,
}: { balance: bigint; onGameComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState("10");
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [fight, setFight] = useState<FightState | null>(null);
  const { mutateAsync: recordOutcome } = useRecordGameOutcome();
  const betNum = Number.parseInt(bet, 10) || 0;

  const startGame = () => {
    if (betNum < 1) {
      toast.error("Min bet is 1");
      return;
    }
    if (BigInt(betNum) > balance) {
      toast.error("Insufficient credits");
      return;
    }
    setFight({
      playerHp: 100,
      cpuHp: 100,
      round: 1,
      animMsg: "",
      lastPlayerMove: null,
      lastCpuMove: null,
      animating: false,
    });
    setPhase("playing");
  };

  const doMove = async (move: Move) => {
    if (!fight || fight.animating) return;
    const cpuMove = MOVES[Math.floor(Math.random() * MOVES.length)].id;
    const playerMove = MOVES.find((m) => m.id === move)!;
    const cpuMoveData = MOVES.find((m) => m.id === cpuMove)!;

    // Damage calculation
    let playerDmg = 0;
    let cpuDmg = 0;

    if (cpuMove !== "block") {
      playerDmg = move === "block" ? 5 : cpuMoveData.dmg;
    } else {
      playerDmg = 0;
    }
    if (move !== "block") {
      cpuDmg = cpuMove === "block" ? 5 : playerMove.dmg;
    } else {
      cpuDmg = 0;
    }

    const newPlayerHp = Math.max(0, fight.playerHp - playerDmg);
    const newCpuHp = Math.max(0, fight.cpuHp - cpuDmg);

    const msg = `YOU: ${playerMove.emoji} ${playerMove.label} | CPU: ${cpuMoveData.emoji} ${cpuMoveData.label}`;

    setFight((f) =>
      f
        ? {
            ...f,
            animating: true,
            animMsg: msg,
            lastPlayerMove: move,
            lastCpuMove: cpuMove,
          }
        : f,
    );

    await new Promise((r) => setTimeout(r, 900));

    const didWin = newCpuHp <= 0;
    const didLose = newPlayerHp <= 0;

    if (didWin || didLose) {
      const win = didWin ? betNum * 2 : 0;
      try {
        await recordOutcome({
          gameType: GameType.streetFighter,
          bet: BigInt(betNum),
          won: didWin,
          winAmount: BigInt(win),
        });
        onGameComplete();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
      setWon(didWin);
      setWinAmount(win);
      setFight((f) =>
        f
          ? { ...f, playerHp: newPlayerHp, cpuHp: newCpuHp, animating: false }
          : f,
      );
      setPhase("result");
      return;
    }

    setFight((f) =>
      f
        ? {
            ...f,
            playerHp: newPlayerHp,
            cpuHp: newCpuHp,
            round: f.round + 1,
            animating: false,
            animMsg: msg,
          }
        : f,
    );
  };

  const HpBar = ({
    hp,
    label,
    color,
  }: { hp: number; label: string; color: string }) => (
    <div className="space-y-1">
      <div
        className="flex justify-between text-xs font-black"
        style={{ fontFamily: "monospace", color }}
      >
        <span>{label}</span>
        <span>{hp}/100</span>
      </div>
      <div
        className="h-4 rounded-full overflow-hidden"
        style={{
          background: "rgba(0,0,0,0.5)",
          border: `1px solid ${color}40`,
        }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          animate={{ width: `${hp}%` }}
          transition={{ type: "spring", stiffness: 200 }}
        />
      </div>
    </div>
  );

  const Fighter = ({
    side,
    move,
    color,
  }: { side: "player" | "cpu"; move: Move | null; color: string }) => {
    const isAttacking = move === "punch" || move === "kick";
    const isBlocking = move === "block";
    return (
      <motion.div
        className="relative flex flex-col items-center"
        animate={
          isAttacking
            ? { x: side === "player" ? 10 : -10 }
            : isBlocking
              ? { scaleX: 0.85 }
              : { x: 0, scaleX: 1 }
        }
        transition={{ duration: 0.15 }}
      >
        {/* Body */}
        <div className="relative" style={{ width: 44, height: 80 }}>
          {/* Head */}
          <div
            className="absolute rounded-full"
            style={{
              width: 24,
              height: 24,
              top: 0,
              left: 10,
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
          {/* Torso */}
          <div
            className="absolute"
            style={{
              width: 30,
              height: 28,
              top: 26,
              left: 7,
              background: color,
              borderRadius: 4,
              boxShadow: `0 0 6px ${color}40`,
            }}
          />
          {/* Arms */}
          {isBlocking ? (
            <div
              className="absolute"
              style={{
                width: 36,
                height: 10,
                top: 28,
                left: 4,
                background: `${color}cc`,
                borderRadius: 4,
                transform: "rotate(-10deg)",
              }}
            />
          ) : (
            <>
              <div
                className="absolute"
                style={{
                  width: 10,
                  height: 24,
                  top: 28,
                  left: 0,
                  background: `${color}cc`,
                  borderRadius: 4,
                  transform:
                    side === "player"
                      ? isAttacking
                        ? "rotate(-40deg)"
                        : "rotate(10deg)"
                      : isAttacking
                        ? "rotate(40deg)"
                        : "rotate(-10deg)",
                }}
              />
              <div
                className="absolute"
                style={{
                  width: 10,
                  height: 24,
                  top: 28,
                  right: 0,
                  background: `${color}cc`,
                  borderRadius: 4,
                }}
              />
            </>
          )}
          {/* Legs */}
          <div
            className="absolute"
            style={{
              width: 12,
              height: 26,
              top: 54,
              left: 8,
              background: `${color}99`,
              borderRadius: 4,
            }}
          />
          <div
            className="absolute"
            style={{
              width: 12,
              height: 26,
              top: 54,
              right: 8,
              background: `${color}99`,
              borderRadius: 4,
              transform: isAttacking ? "rotate(20deg)" : "none",
            }}
          />
        </div>
        <span
          className="text-xs font-black mt-1"
          style={{ color, fontFamily: "monospace" }}
        >
          {side === "player" ? "YOU" : "CPU"}
        </span>
      </motion.div>
    );
  };

  return (
    <ArcadeCabinet title="🥊 STREET FIGHTER" color={HEX_COLOR}>
      <div className="p-4">
        <p
          className="text-sm text-center mb-3"
          style={{ color: `${HEX_COLOR}99`, fontFamily: "monospace" }}
        >
          DEPLETE CPU HP TO WIN 2x YOUR BET
        </p>
        {phase === "bet" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap justify-center">
              {QUICK_BETS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setBet(q.toString())}
                  className="px-4 py-2 rounded-lg text-xs font-black"
                  style={
                    bet === q.toString()
                      ? { background: HEX_COLOR, color: "#000" }
                      : {
                          background: "rgba(40,0,15,0.6)",
                          color: `${HEX_COLOR}99`,
                          border: `1px solid ${HEX_COLOR}40`,
                        }
                  }
                  data-ocid="streetfighter.quickbet.button"
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
              className="w-full px-4 py-3 rounded-xl text-lg font-bold text-center"
              style={{
                background: "rgba(30,0,10,0.8)",
                border: `1px solid ${HEX_COLOR}50`,
                color: HEX_COLOR,
                fontFamily: "monospace",
              }}
              data-ocid="streetfighter.bet.input"
            />
            <Button
              onClick={startGame}
              className="w-full py-6 font-black tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${HEX_COLOR}, #aa0044)`,
                color: "#fff",
                boxShadow: `0 0 20px ${HEX_COLOR}60`,
              }}
              data-ocid="streetfighter.play_button"
            >
              INSERT COIN &mdash; PLAY FOR {bet}
            </Button>
          </div>
        )}
        {phase === "playing" && fight && (
          <div className="space-y-4">
            {/* HP Bars */}
            <div className="space-y-2">
              <HpBar hp={fight.playerHp} label="YOU" color="#00d4ff" />
              <HpBar hp={fight.cpuHp} label="CPU" color={HEX_COLOR} />
            </div>
            {/* Round */}
            <div
              className="text-center font-black text-xs"
              style={{ color: `${HEX_COLOR}80`, fontFamily: "monospace" }}
            >
              ROUND {fight.round}
            </div>
            {/* Fighters */}
            <div
              className="flex justify-around items-end py-4 rounded-xl"
              style={{
                background:
                  "linear-gradient(180deg, #1a0a00 0%, #330011 50%, #1a0008 100%)",
                border: `1px solid ${HEX_COLOR}20`,
                minHeight: 140,
              }}
            >
              <Fighter
                side="player"
                move={fight.lastPlayerMove}
                color="#00d4ff"
              />
              <div
                className="text-4xl font-black"
                style={{
                  color: HEX_COLOR,
                  textShadow: `0 0 10px ${HEX_COLOR}`,
                  fontFamily: "monospace",
                }}
              >
                VS
              </div>
              <Fighter side="cpu" move={fight.lastCpuMove} color={HEX_COLOR} />
            </div>
            {/* Action message */}
            <AnimatePresence mode="wait">
              {fight.animMsg && (
                <motion.div
                  key={fight.round}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-xs font-black py-2 rounded-lg"
                  style={{
                    background: "rgba(255,34,102,0.1)",
                    border: `1px solid ${HEX_COLOR}30`,
                    color: HEX_COLOR,
                    fontFamily: "monospace",
                  }}
                >
                  {fight.animMsg}
                </motion.div>
              )}
            </AnimatePresence>
            {/* Move buttons */}
            <div className="grid grid-cols-3 gap-2">
              {MOVES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={fight.animating}
                  onClick={() => doMove(m.id)}
                  className="py-3 rounded-xl font-black text-xs flex flex-col items-center gap-1 transition-transform active:scale-95"
                  style={{
                    background: "rgba(255,34,102,0.15)",
                    border: `1px solid ${HEX_COLOR}50`,
                    color: HEX_COLOR,
                    cursor: fight.animating ? "not-allowed" : "pointer",
                  }}
                  data-ocid={`streetfighter.${m.id}.button`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span>{m.label}</span>
                  {m.dmg > 0 && (
                    <span style={{ color: `${HEX_COLOR}60`, fontSize: 9 }}>
                      {m.dmg} DMG
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {phase === "result" && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-6"
            >
              <div className="text-6xl">{won ? "🏆" : "💀"}</div>
              <h3
                className="text-2xl font-black"
                style={{
                  color: won ? "#ffd700" : "#ff4444",
                  textShadow: won ? "0 0 10px #ffd700" : "0 0 10px #ff4444",
                  fontFamily: "monospace",
                }}
              >
                {won ? `+${winAmount} CREDITS!` : "K.O.! YOU LOSE!"}
              </h3>
              <Button
                onClick={() => setPhase("bet")}
                className="font-black"
                style={{
                  background: HEX_COLOR,
                  color: "#fff",
                  boxShadow: `0 0 15px ${HEX_COLOR}60`,
                }}
                data-ocid="streetfighter.play_again_button"
              >
                PLAY AGAIN
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </ArcadeCabinet>
  );
}
