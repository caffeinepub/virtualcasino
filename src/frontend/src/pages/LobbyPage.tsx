import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";
import { Flame, Loader2, Play, Trophy, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { GameType } from "../backend.d";
import ProfileSetup from "../components/ProfileSetup";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetDailyWinners,
} from "../hooks/useQueries";

const CASINO_GAMES = [
  {
    id: GameType.slots,
    label: "Slots",
    emoji: "🎰",
    description: "Spin & Win",
    color: "oklch(0.65 0.28 340)",
  },
  {
    id: GameType.blackjack,
    label: "Blackjack",
    emoji: "🃏",
    description: "Beat the Dealer",
    color: "oklch(0.70 0.20 190)",
  },
  {
    id: GameType.roulette,
    label: "Roulette",
    emoji: "🎡",
    description: "Spin the Wheel",
    color: "oklch(0.60 0.24 20)",
  },
  {
    id: GameType.videoPoker,
    label: "Video Poker",
    emoji: "♠️",
    description: "Royal Flush!",
    color: "oklch(0.78 0.18 72)",
  },
  {
    id: GameType.dice,
    label: "Dice",
    emoji: "🎲",
    description: "Roll to Win",
    color: "oklch(0.70 0.20 190)",
  },
  {
    id: GameType.baccarat,
    label: "Baccarat",
    emoji: "💎",
    description: "Classic Elegance",
    color: "oklch(0.55 0.25 290)",
  },
  {
    id: GameType.keno,
    label: "Keno",
    emoji: "🔢",
    description: "Pick Your Numbers",
    color: "oklch(0.62 0.22 240)",
  },
  {
    id: GameType.scratchCards,
    label: "Scratch Cards",
    emoji: "🎫",
    description: "Instant Win",
    color: "oklch(0.68 0.22 150)",
  },
  {
    id: GameType.craps,
    label: "Craps",
    emoji: "🎲",
    description: "Roll the Bones",
    color: "oklch(0.60 0.24 25)",
  },
  {
    id: GameType.paiGowPoker,
    label: "Pai Gow Poker",
    emoji: "🀄",
    description: "Ancient Strategy",
    color: "oklch(0.65 0.22 55)",
  },
  {
    id: GameType.sicBo,
    label: "Sic Bo",
    emoji: "🎰",
    description: "Three Dice",
    color: "oklch(0.65 0.28 340)",
  },
  {
    id: GameType.war,
    label: "War",
    emoji: "🃏",
    description: "Simple & Fast",
    color: "oklch(0.60 0.24 20)",
  },
  {
    id: GameType.caribbeanStud,
    label: "Caribbean Stud",
    emoji: "♣️",
    description: "Caribbean Vibes",
    color: "oklch(0.70 0.20 190)",
  },
  {
    id: GameType.letItRide,
    label: "Let It Ride",
    emoji: "🌊",
    description: "Ride the Wave",
    color: "oklch(0.62 0.22 200)",
  },
  {
    id: GameType.threeCardPoker,
    label: "Three Card Poker",
    emoji: "🃏",
    description: "Three Card Magic",
    color: "oklch(0.55 0.25 290)",
  },
  {
    id: GameType.casinoHoldem,
    label: "Casino Hold'em",
    emoji: "♠️",
    description: "Texas Style",
    color: "oklch(0.68 0.22 150)",
  },
  {
    id: GameType.wheelOfFortune,
    label: "Wheel of Fortune",
    emoji: "🎡",
    description: "Spin to Win",
    color: "oklch(0.78 0.18 72)",
  },
];

const ARCADE_GAMES = [
  {
    id: GameType.coinPusher,
    label: "Coin Pusher",
    emoji: "🪙",
    description: "Push to Win",
    color: "oklch(0.78 0.18 72)",
  },
  {
    id: GameType.plinko,
    label: "Plinko",
    emoji: "📍",
    description: "Drop the Ball",
    color: "oklch(0.65 0.28 340)",
  },
  {
    id: GameType.crashGame,
    label: "Crash Game",
    emoji: "🚀",
    description: "Cash Out in Time",
    color: "oklch(0.60 0.24 20)",
  },
  {
    id: GameType.mines,
    label: "Mines",
    emoji: "💣",
    description: "Avoid the Mines",
    color: "oklch(0.68 0.22 150)",
  },
  {
    id: GameType.limbo,
    label: "Limbo",
    emoji: "🌀",
    description: "How Low Can You Go?",
    color: "oklch(0.55 0.25 290)",
  },
  {
    id: GameType.hiLo,
    label: "Hi-Lo",
    emoji: "🃏",
    description: "Higher or Lower?",
    color: "oklch(0.70 0.20 190)",
  },
  {
    id: GameType.penaltyShootout,
    label: "Penalty Shootout",
    emoji: "⚽",
    description: "Score to Win",
    color: "oklch(0.68 0.22 150)",
  },
  {
    id: GameType.ballDrop,
    label: "Ball Drop",
    emoji: "🎱",
    description: "Drop & Win",
    color: "oklch(0.55 0.25 290)",
  },
];

const ALL_GAMES = [...CASINO_GAMES, ...ARCADE_GAMES];

function getDailyFeatured(count: number) {
  const seed = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const shuffled = [...ALL_GAMES].sort((a, b) => {
    const ha = Math.abs((hash * 1664525 + a.id.charCodeAt(0) * 1013904223) | 0);
    const hb = Math.abs((hash * 1664525 + b.id.charCodeAt(0) * 1013904223) | 0);
    return (ha % 97) - (hb % 97);
  });
  return shuffled.slice(0, count);
}

const FEATURED_GAMES = getDailyFeatured(6);

const SAMPLE_WINNERS = [
  { user: "abc123xyz", amount: 420, game: "Slots" },
  { user: "player99", amount: 85, game: "Blackjack" },
  { user: "neonking", amount: 230, game: "Plinko" },
  { user: "vegasvip", amount: 55, game: "Roulette" },
  { user: "jackpot7s", amount: 1000, game: "Crash Game" },
  { user: "arcadeace", amount: 320, game: "Mines" },
  { user: "highroll", amount: 175, game: "Baccarat" },
  { user: "spinqueen", amount: 90, game: "Wheel of Fortune" },
];

function GameCard({
  game,
  index,
  featured = false,
}: { game: (typeof ALL_GAMES)[0]; index: number; featured?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      data-ocid={`games.item.${index + 1}`}
    >
      <Link to="/game/$gameType" params={{ gameType: game.id }}>
        <div
          className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
          style={{
            background: "oklch(0.12 0.015 280)",
            border: `1px solid ${game.color}40`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor =
              `${game.color}cc`;
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              `0 0 24px ${game.color}40, 0 0 48px ${game.color}20`;
            (e.currentTarget as HTMLDivElement).style.transform =
              "translateY(-3px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor =
              `${game.color}40`;
            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            (e.currentTarget as HTMLDivElement).style.transform =
              "translateY(0)";
          }}
        >
          {featured && (
            <div
              className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-black tracking-wider"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                color: "#fff",
                boxShadow: "0 0 8px oklch(0.65 0.28 340 / 0.5)",
              }}
            >
              🔥 HOT
            </div>
          )}
          <div
            className={`flex items-center justify-center relative ${featured ? "h-36" : "h-28"}`}
            style={{
              background: `radial-gradient(ellipse at center, ${game.color}22, oklch(0.10 0.012 280))`,
            }}
          >
            <span
              className={`filter drop-shadow-lg ${featured ? "text-5xl" : "text-4xl"}`}
            >
              {game.emoji}
            </span>
            <div
              className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: game.color }}
            >
              <Play className="w-3 h-3" style={{ color: "#fff" }} />
            </div>
          </div>
          <div
            className="px-3 py-2"
            style={{
              borderTop: `1px solid ${game.color}30`,
              background: `${game.color}10`,
            }}
          >
            <p className="font-black text-xs tracking-wider text-foreground">
              {game.label.toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground">{game.description}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function LobbyPage() {
  const { identity } = useInternetIdentity();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();
  const { data: winners, isLoading: winnersLoading } = useGetDailyWinners();
  const [activeTab, setActiveTab] = useState<"all" | "casino" | "arcade">(
    "all",
  );

  const isNewUser = !profileLoading && profileFetched && profile === null;
  const showProfileSetup =
    !!identity && !profileLoading && profileFetched && profile === null;

  const shuffledWinners = useMemo(() => {
    const list = winners && winners.length > 0 ? winners : [];
    return [...list].sort(() => Math.random() - 0.5);
  }, [winners]);

  // Combine real winners with sample for display when empty
  const displayWinners =
    shuffledWinners.length > 0
      ? shuffledWinners.map((w) => ({
          user: w.user.toString().slice(0, 10),
          amount: Number(w.amount),
          game: "Game",
        }))
      : SAMPLE_WINNERS;

  const tickerItems = [...displayWinners, ...displayWinners];

  const displayedGames =
    activeTab === "casino"
      ? CASINO_GAMES
      : activeTab === "arcade"
        ? ARCADE_GAMES
        : ALL_GAMES;

  return (
    <div className="min-h-full">
      <ProfileSetup
        open={showProfileSetup}
        isNewUser={isNewUser}
        onComplete={() => {}}
      />

      {/* ===== HERO BANNER ===== */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "oklch(0.08 0.01 280)",
          minHeight: 320,
        }}
      >
        {/* Neon grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(oklch(0.65 0.28 340 / 0.3) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.65 0.28 340 / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Radial glows */}
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{ background: "oklch(0.65 0.28 340)", filter: "blur(80px)" }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15"
          style={{ background: "oklch(0.70 0.20 190)", filter: "blur(80px)" }}
        />
        <div
          className="absolute top-1/2 right-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: "oklch(0.55 0.25 290)", filter: "blur(50px)" }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center py-16 px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Zap
                className="w-8 h-8 animate-neon-pulse"
                style={{ color: "oklch(0.65 0.28 340)" }}
              />
              <p
                className="text-sm font-black tracking-widest"
                style={{
                  color: "oklch(0.65 0.28 340)",
                  textShadow: "0 0 10px oklch(0.65 0.28 340 / 0.8)",
                }}
              >
                WELCOME TO
              </p>
              <Zap
                className="w-8 h-8 animate-neon-pulse"
                style={{ color: "oklch(0.70 0.20 190)" }}
              />
            </div>
            <h1
              className="font-display font-black text-4xl md:text-6xl tracking-tight mb-3"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.88 0.14 76), oklch(0.70 0.20 190))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 20px oklch(0.65 0.28 340 / 0.6))",
              }}
            >
              CPM VEGAS
              <br />
              AND ARCADE
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              25 GAMES · CASINO &amp; ARCADE · WIN TODAY
            </p>
            <Link to="/games">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="px-10 py-4 rounded-xl font-black text-base tracking-widest"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                  color: "#fff",
                  boxShadow:
                    "0 0 30px oklch(0.65 0.28 340 / 0.5), 0 0 60px oklch(0.65 0.28 340 / 0.25)",
                }}
                data-ocid="hero.primary_button"
              >
                🎮 PLAY NOW
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===== WINNER TICKER ===== */}
      <div
        className="overflow-hidden py-2 relative"
        style={{
          background: "oklch(0.65 0.28 340 / 0.12)",
          borderTop: "1px solid oklch(0.65 0.28 340 / 0.4)",
          borderBottom: "1px solid oklch(0.65 0.28 340 / 0.4)",
        }}
      >
        <div className="flex animate-marquee whitespace-nowrap gap-0">
          {tickerItems.map((w, i) => (
            <span
              key={`${w.user}-${i}`}
              className="inline-flex items-center gap-2 px-6 text-sm font-bold"
            >
              <Trophy
                className="w-3 h-3 shrink-0"
                style={{ color: "oklch(0.78 0.18 72)" }}
              />
              <span className="text-gold">{w.user}...</span>
              <span className="text-foreground">won</span>
              <span
                style={{
                  color: "oklch(0.65 0.28 340)",
                  textShadow: "0 0 8px oklch(0.65 0.28 340 / 0.7)",
                }}
              >
                +{w.amount} credits
              </span>
              <span className="text-muted-foreground">on {w.game}</span>
              <span className="text-muted-foreground/40 mx-2">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Left: Games */}
        <div className="lg:col-span-2 space-y-8">
          {/* Most Popular Today */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Flame
                className="w-5 h-5 animate-neon-pulse"
                style={{ color: "oklch(0.65 0.28 340)" }}
              />
              <h2
                className="font-display font-black text-xl tracking-widest"
                style={{
                  color: "oklch(0.65 0.28 340)",
                  textShadow: "0 0 10px oklch(0.65 0.28 340 / 0.6)",
                }}
              >
                🔥 MOST POPULAR TODAY
              </h2>
              <span
                className="ml-auto text-xs px-3 py-1 rounded-full font-black tracking-wider"
                style={{
                  background: "oklch(0.65 0.28 340 / 0.15)",
                  border: "1px solid oklch(0.65 0.28 340 / 0.4)",
                  color: "oklch(0.65 0.28 340)",
                }}
              >
                Refreshes Daily
              </span>
            </div>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              data-ocid="featured.list"
            >
              {FEATURED_GAMES.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} featured />
              ))}
            </div>
          </section>

          {/* Games Lobby */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap
                className="w-5 h-5"
                style={{ color: "oklch(0.70 0.20 190)" }}
              />
              <h2
                className="font-display font-black text-xl tracking-widest"
                style={{
                  color: "oklch(0.70 0.20 190)",
                  textShadow: "0 0 10px oklch(0.70 0.20 190 / 0.6)",
                }}
              >
                GAMES LOBBY
              </h2>
              <span className="ml-2 text-xs text-muted-foreground">
                {CASINO_GAMES.length} Casino · {ARCADE_GAMES.length} Arcade
              </span>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as "all" | "casino" | "arcade")
              }
              className="mb-4"
            >
              <TabsList
                className="h-10 gap-1 p-1"
                style={{
                  background: "oklch(0.12 0.015 280)",
                  border: "1px solid oklch(0.22 0.03 275)",
                }}
              >
                <TabsTrigger
                  value="all"
                  className="text-xs font-black tracking-wider data-[state=active]:text-foreground"
                  style={{}}
                  data-ocid="games.all.tab"
                >
                  ALL ({ALL_GAMES.length})
                </TabsTrigger>
                <TabsTrigger
                  value="casino"
                  className="text-xs font-black tracking-wider"
                  data-ocid="games.casino.tab"
                >
                  🎰 CASINO ({CASINO_GAMES.length})
                </TabsTrigger>
                <TabsTrigger
                  value="arcade"
                  className="text-xs font-black tracking-wider"
                  data-ocid="games.arcade.tab"
                >
                  🕹️ ARCADE ({ARCADE_GAMES.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
              data-ocid="games.list"
            >
              {displayedGames.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} />
              ))}
            </div>
          </section>
        </div>

        {/* Right: Scoreboard */}
        <div className="space-y-6">
          {/* Today's Winners scoreboard */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: "1px solid oklch(0.78 0.18 72 / 0.4)",
              boxShadow: "0 0 20px oklch(0.78 0.18 72 / 0.1)",
            }}
          >
            <div
              className="px-4 py-3"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.78 0.18 72 / 0.2), transparent)",
                borderBottom: "1px solid oklch(0.78 0.18 72 / 0.3)",
              }}
            >
              <h3 className="font-display font-black tracking-widest text-gold">
                🏆 TODAY'S WINNERS
              </h3>
              <p className="text-xs text-muted-foreground">
                Refreshed daily · Randomized order
              </p>
            </div>
            <div data-ocid="leaderboard.list">
              {winnersLoading ? (
                <div className="p-6 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : displayWinners.length === 0 ? (
                <div
                  className="p-6 text-center text-xs text-muted-foreground"
                  data-ocid="leaderboard.empty_state"
                >
                  No winners yet today. Be the first!
                </div>
              ) : (
                displayWinners.slice(0, 8).map((w, i) => (
                  <div
                    key={`${w.user}-${i}`}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                    style={{
                      borderBottom: "1px solid oklch(0.22 0.03 275)",
                      background:
                        i === 0
                          ? "linear-gradient(90deg, oklch(0.78 0.18 72 / 0.15), transparent)"
                          : "transparent",
                    }}
                    data-ocid={`leaderboard.item.${i + 1}`}
                  >
                    <span
                      className="font-black text-xs w-6 text-center"
                      style={{
                        color:
                          i === 0
                            ? "oklch(0.78 0.18 72)"
                            : i === 1
                              ? "oklch(0.80 0.01 270)"
                              : i === 2
                                ? "oklch(0.65 0.18 45)"
                                : "oklch(0.50 0.02 270)",
                      }}
                    >
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `${i + 1}`}
                    </span>
                    <span className="flex-1 text-xs font-medium truncate text-foreground">
                      {typeof w.user === "string" ? w.user : w.user}...
                    </span>
                    <span
                      className="text-xs font-black"
                      style={{
                        color: "oklch(0.65 0.28 340)",
                        textShadow: "0 0 6px oklch(0.65 0.28 340 / 0.5)",
                      }}
                    >
                      +{w.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 text-center">
              <Link
                to="/leaderboard"
                className="text-xs font-bold neon-pink hover:underline"
                data-ocid="leaderboard.view_button"
              >
                View Full Scoreboard →
              </Link>
            </div>
          </div>

          {/* Upcoming Tournaments */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: "1px solid oklch(0.55 0.25 290 / 0.4)",
              boxShadow: "0 0 16px oklch(0.55 0.25 290 / 0.1)",
            }}
          >
            <h4
              className="font-display font-black text-sm tracking-widest mb-3"
              style={{
                color: "oklch(0.55 0.25 290)",
                textShadow: "0 0 8px oklch(0.55 0.25 290 / 0.6)",
              }}
            >
              ⚡ UPCOMING EVENTS
            </h4>
            {[
              { name: "Slots Sprint", time: "Tonight 8PM" },
              { name: "Blackjack Blitz", time: "Tomorrow 3PM" },
              { name: "Crash Mania", time: "Friday 9PM" },
              { name: "Plinko Championship", time: "Saturday 7PM" },
              { name: "High Roller Night", time: "Sunday 5PM" },
            ].map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid oklch(0.22 0.03 275)" }}
              >
                <span className="text-sm font-medium text-foreground">
                  {t.name}
                </span>
                <span className="text-xs text-muted-foreground">{t.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
