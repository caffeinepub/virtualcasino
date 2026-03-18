import { Loader2, Medal, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useGetDailyWinners } from "../hooks/useQueries";

const SAMPLE_LEADERS = [
  { user: "jackpot7s", amount: 1000, game: "Crash Game" },
  { user: "neonking", amount: 420, game: "Slots" },
  { user: "arcadeace", amount: 320, game: "Mines" },
  { user: "vegasvip", amount: 230, game: "Plinko" },
  { user: "highroll", amount: 175, game: "Baccarat" },
  { user: "spinqueen", amount: 90, game: "Wheel of Fortune" },
  { user: "player99", amount: 85, game: "Blackjack" },
  { user: "luckystar", amount: 55, game: "Roulette" },
];

export default function LeaderboardPage() {
  const { data: winners, isLoading } = useGetDailyWinners();
  const shuffled =
    winners && winners.length > 0
      ? [...winners]
          .sort(() => Math.random() - 0.5)
          .map((w) => ({
            user: w.user.toString().slice(0, 12),
            amount: Number(w.amount),
            game: "Game",
          }))
      : SAMPLE_LEADERS;

  const rankColor = (i: number) => {
    if (i === 0) return "oklch(0.78 0.18 72)";
    if (i === 1) return "oklch(0.80 0.01 270)";
    if (i === 2) return "oklch(0.65 0.18 45)";
    return "oklch(0.55 0.02 270)";
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div
          className="rounded-2xl p-6 mb-6 text-center relative overflow-hidden"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.78 0.18 72 / 0.4)",
            boxShadow: "0 0 30px oklch(0.78 0.18 72 / 0.15)",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.78 0.18 72), oklch(0.70 0.20 190))",
            }}
          />
          <Trophy
            className="w-10 h-10 mx-auto mb-2"
            style={{
              color: "oklch(0.78 0.18 72)",
              filter: "drop-shadow(0 0 10px oklch(0.78 0.18 72 / 0.6))",
            }}
          />
          <h1
            className="font-display font-black text-3xl tracking-widest mb-1"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.78 0.18 72), oklch(0.70 0.20 190))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            TODAY'S SCOREBOARD
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest">
            DAILY WINNERS · RANDOMIZED ORDER · RESETS AT MIDNIGHT
          </p>
        </div>

        {/* Scoreboard */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.22 0.03 275)",
          }}
          data-ocid="leaderboard.panel"
        >
          {/* Table header */}
          <div
            className="flex items-center px-6 py-3"
            style={{
              background: "oklch(0.14 0.02 278)",
              borderBottom: "1px solid oklch(0.65 0.28 340 / 0.3)",
            }}
          >
            <span className="text-xs font-black text-muted-foreground w-10 tracking-widest">
              #
            </span>
            <span className="text-xs font-black text-muted-foreground flex-1 tracking-widest">
              PLAYER
            </span>
            <span className="text-xs font-black text-muted-foreground tracking-widest">
              WINNINGS
            </span>
          </div>

          {isLoading ? (
            <div
              className="flex justify-center py-16"
              data-ocid="leaderboard.loading_state"
            >
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "oklch(0.65 0.28 340)" }}
              />
            </div>
          ) : shuffled.length === 0 ? (
            <div
              className="py-16 text-center"
              data-ocid="leaderboard.empty_state"
            >
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-muted-foreground">
                No winners yet today. Play to be first!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {shuffled.map((w, i) => (
                <motion.div
                  key={`${w.user}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 px-6 py-4"
                  style={{
                    background:
                      i === 0
                        ? "linear-gradient(to right, oklch(0.78 0.18 72 / 0.12), transparent)"
                        : "transparent",
                  }}
                  data-ocid={`leaderboard.item.${i + 1}`}
                >
                  <div className="w-8 flex justify-center">
                    {i < 3 ? (
                      <Medal
                        className="w-5 h-5"
                        style={{ color: rankColor(i) }}
                      />
                    ) : (
                      <span
                        className="text-sm font-black"
                        style={{ color: rankColor(i) }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{w.user}...</p>
                    <p className="text-xs text-muted-foreground">Player</p>
                  </div>
                  <span
                    className="font-black text-sm"
                    style={{
                      color:
                        i === 0
                          ? "oklch(0.78 0.18 72)"
                          : "oklch(0.65 0.28 340)",
                      textShadow: `0 0 8px ${i === 0 ? "oklch(0.78 0.18 72 / 0.5)" : "oklch(0.65 0.28 340 / 0.5)"}`,
                    }}
                  >
                    +{w.amount}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
