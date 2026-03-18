import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Circle,
  Dice1,
  Flame,
  Loader2,
  Play,
  Spade,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import { GameType } from "../backend.d";
import ProfileSetup from "../components/ProfileSetup";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetDailyWinners,
} from "../hooks/useQueries";

const GAMES = [
  {
    id: GameType.slots,
    label: "Slots",
    emoji: "🎰",
    icon: BarChart3,
    description: "Spin & Win",
    color: "oklch(0.65 0.18 290)",
  },
  {
    id: GameType.blackjack,
    label: "Blackjack",
    emoji: "🃏",
    icon: Spade,
    description: "Beat the Dealer",
    color: "oklch(0.60 0.12 160)",
  },
  {
    id: GameType.roulette,
    label: "Roulette",
    emoji: "🎡",
    icon: Circle,
    description: "Spin the Wheel",
    color: "oklch(0.57 0.245 27)",
  },
  {
    id: GameType.videoPoker,
    label: "Video Poker",
    emoji: "♠️",
    icon: Spade,
    description: "Royal Flush!",
    color: "oklch(0.70 0.13 72)",
  },
  {
    id: GameType.dice,
    label: "Dice",
    emoji: "🎲",
    icon: Dice1,
    description: "Roll the Dice",
    color: "oklch(0.60 0.12 200)",
  },
  {
    id: GameType.baccarat,
    label: "Baccarat",
    emoji: "💎",
    icon: Flame,
    description: "Classic Elegance",
    color: "oklch(0.65 0.15 300)",
  },
];

const TOURNAMENTS = [
  { name: "Slots Sprint", time: "Tonight 8PM" },
  { name: "Blackjack Blitz", time: "Tomorrow 3PM" },
  { name: "High Roller Roulette", time: "Friday 9PM" },
];

export default function LobbyPage() {
  const { identity } = useInternetIdentity();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();
  const { data: winners, isLoading: winnersLoading } = useGetDailyWinners();

  const isNewUser = !profileLoading && profileFetched && profile === null;
  const showProfileSetup =
    !!identity && !profileLoading && profileFetched && profile === null;

  const shuffledWinners = winners
    ? [...winners].sort(() => Math.random() - 0.5)
    : [];

  return (
    <div className="min-h-full">
      <ProfileSetup
        open={showProfileSetup}
        isNewUser={isNewUser}
        onComplete={() => {}}
      />

      {/* Hero Banner */}
      <section
        className="mx-4 mt-6 mb-8 rounded-2xl overflow-hidden relative"
        style={{
          height: 280,
          background:
            "linear-gradient(135deg, oklch(0.18 0.08 300), oklch(0.24 0.12 295), oklch(0.20 0.10 260))",
        }}
      >
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-20"
          style={{ background: "oklch(0.70 0.13 72)", filter: "blur(20px)" }}
        />
        <div
          className="absolute right-20 top-8 w-24 h-24 rounded-full border-2 opacity-30"
          style={{ borderColor: "oklch(0.70 0.13 72)" }}
        />
        <div
          className="absolute right-16 bottom-8 w-16 h-16 rounded-full border opacity-20"
          style={{ borderColor: "oklch(0.82 0.12 75)" }}
        />
        <div className="absolute inset-0 flex flex-col justify-center px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-semibold tracking-widest text-gold mb-2">
              🎰 WELCOME TO
            </p>
            <h1
              className="font-display text-5xl font-bold text-gold-gradient mb-2"
              style={{ textShadow: "0 0 40px oklch(0.70 0.13 72 / 0.5)" }}
            >
              VIRTUAL CASINO
            </h1>
            <p className="text-foreground/80 text-lg mb-6">
              EXPERIENCE THE THRILL OF VIRTUAL GAMBLING
            </p>
            <Link to="/games">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 rounded-lg font-bold text-sm tracking-wider"
                style={{
                  background: "oklch(0.70 0.13 72)",
                  color: "oklch(0.10 0.012 240)",
                }}
                data-ocid="hero.play_button"
              >
                PLAY NOW
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="px-4 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Games Lobby */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-gold" />
              <h2 className="font-display text-xl font-bold tracking-wider">
                GAMES LOBBY
              </h2>
            </div>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              data-ocid="games.list"
            >
              {GAMES.map((game, i) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  data-ocid={`games.item.${i + 1}`}
                >
                  <Link to="/game/$gameType" params={{ gameType: game.id }}>
                    <div className="group relative card-dark rounded-xl overflow-hidden cursor-pointer hover:border-gold/50 transition-all hover:shadow-gold">
                      <div
                        className="h-32 flex items-center justify-center relative"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.14 0.015 230), ${game.color}33)`,
                        }}
                      >
                        <span className="text-5xl filter drop-shadow-lg">
                          {game.emoji}
                        </span>
                        <div
                          className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "oklch(0.70 0.13 72)" }}
                        >
                          <Play
                            className="w-4 h-4"
                            style={{ color: "oklch(0.10 0.012 240)" }}
                          />
                        </div>
                      </div>
                      <div
                        className="px-3 py-2"
                        style={{
                          background:
                            "linear-gradient(to right, oklch(0.55 0.10 70), oklch(0.70 0.13 72))",
                        }}
                      >
                        <p
                          className="font-bold text-xs tracking-wider"
                          style={{ color: "oklch(0.10 0.012 240)" }}
                        >
                          {game.label.toUpperCase()}
                        </p>
                        <p
                          className="text-xs opacity-70"
                          style={{ color: "oklch(0.10 0.012 240)" }}
                        >
                          {game.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          {shuffledWinners.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-gold" />
                <h3 className="font-display font-bold tracking-wider text-sm">
                  LATEST WINS
                </h3>
              </div>
              <div className="card-dark rounded-xl p-4 overflow-hidden">
                <div className="flex gap-4 overflow-x-auto pb-1">
                  {shuffledWinners.slice(0, 6).map((w) => (
                    <div
                      key={w.user.toString()}
                      className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                      style={{ background: "oklch(0.18 0.020 228)" }}
                    >
                      <span className="text-gold font-bold">
                        +{w.amount.toString()}
                      </span>
                      <span className="text-muted-foreground">
                        {w.user.toString().slice(0, 8)}...
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right: Leaderboard + Promo */}
        <div className="space-y-6">
          <div className="card-dark rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-bold tracking-wider">
                LEADERBOARD
              </h3>
              <p className="text-xs text-muted-foreground">TODAY'S WINNERS</p>
            </div>
            <div
              className="divide-y divide-border"
              data-ocid="leaderboard.list"
            >
              {winnersLoading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : shuffledWinners.length === 0 ? (
                <div
                  className="p-4 text-center text-xs text-muted-foreground"
                  data-ocid="leaderboard.empty_state"
                >
                  No winners yet today. Be the first!
                </div>
              ) : (
                shuffledWinners.slice(0, 5).map((w, i) => (
                  <div
                    key={w.user.toString()}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                    style={
                      i === 0
                        ? {
                            background:
                              "linear-gradient(to right, oklch(0.55 0.10 70 / 0.3), transparent)",
                          }
                        : {}
                    }
                    data-ocid={`leaderboard.item.${i + 1}`}
                  >
                    <span
                      className={`font-bold text-xs w-5 text-center ${
                        i === 0 ? "text-gold" : "text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-xs font-medium truncate">
                      {w.user.toString().slice(0, 10)}...
                    </span>
                    <span className="text-gold text-xs font-bold">
                      +{w.amount.toString()}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="p-3">
              <Link
                to="/leaderboard"
                className="block text-center text-xs text-gold hover:underline"
                data-ocid="leaderboard.view_button"
              >
                View Full Leaderboard →
              </Link>
            </div>
          </div>

          <div className="card-dark rounded-xl p-4">
            <h4 className="font-display font-bold text-sm tracking-wider mb-3">
              UPCOMING TOURNAMENTS
            </h4>
            {TOURNAMENTS.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
