import { Loader2, Medal, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useGetDailyWinners } from "../hooks/useQueries";

export default function LeaderboardPage() {
  const { data: winners, isLoading } = useGetDailyWinners();
  const shuffled = winners ? [...winners].sort(() => Math.random() - 0.5) : [];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-gold" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider">
              LEADERBOARD
            </h1>
            <p className="text-xs text-muted-foreground">TODAY'S WINNERS</p>
          </div>
        </div>

        <div
          className="card-dark rounded-xl overflow-hidden"
          data-ocid="leaderboard.panel"
        >
          <div className="flex items-center px-6 py-3 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground w-10">
              #
            </span>
            <span className="text-xs font-semibold text-muted-foreground flex-1">
              PLAYER
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              WINNINGS
            </span>
          </div>

          {isLoading ? (
            <div
              className="flex justify-center py-16"
              data-ocid="leaderboard.loading_state"
            >
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
                  key={w.user.toString()}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-6 py-4"
                  style={
                    i === 0
                      ? {
                          background:
                            "linear-gradient(to right, oklch(0.55 0.10 70 / 0.25), transparent)",
                        }
                      : {}
                  }
                  data-ocid={`leaderboard.item.${i + 1}`}
                >
                  <div className="w-8 flex justify-center">
                    {i === 0 ? (
                      <Medal
                        className="w-5 h-5"
                        style={{ color: "oklch(0.82 0.12 75)" }}
                      />
                    ) : i === 1 ? (
                      <Medal className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {w.user.toString().slice(0, 16)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Principal ID
                    </p>
                  </div>
                  <span
                    className={`font-bold text-sm ${i === 0 ? "text-gold-light" : "text-gold"}`}
                  >
                    +{w.amount.toString()}
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
