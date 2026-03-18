import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useState } from "react";
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
  },
  {
    id: GameType.blackjack,
    label: "Blackjack",
    emoji: "🃏",
    description: "Beat the Dealer",
  },
  {
    id: GameType.roulette,
    label: "Roulette",
    emoji: "🎡",
    description: "Spin the Wheel",
  },
  {
    id: GameType.videoPoker,
    label: "Video Poker",
    emoji: "♠️",
    description: "Royal Flush!",
  },
  { id: GameType.dice, label: "Dice", emoji: "🎲", description: "Roll to Win" },
  {
    id: GameType.baccarat,
    label: "Baccarat",
    emoji: "💎",
    description: "Classic Elegance",
  },
  {
    id: GameType.keno,
    label: "Keno",
    emoji: "🔢",
    description: "Pick Your Numbers",
  },
  {
    id: GameType.scratchCards,
    label: "Scratch Cards",
    emoji: "🎫",
    description: "Instant Win",
  },
  {
    id: GameType.craps,
    label: "Craps",
    emoji: "🎲",
    description: "Roll the Bones",
  },
  {
    id: GameType.paiGowPoker,
    label: "Pai Gow Poker",
    emoji: "🀄",
    description: "Ancient Strategy",
  },
  {
    id: GameType.sicBo,
    label: "Sic Bo",
    emoji: "🎰",
    description: "Three Dice",
  },
  { id: GameType.war, label: "War", emoji: "🃏", description: "Simple & Fast" },
  {
    id: GameType.caribbeanStud,
    label: "Caribbean Stud",
    emoji: "♣️",
    description: "Caribbean Vibes",
  },
  {
    id: GameType.letItRide,
    label: "Let It Ride",
    emoji: "🌊",
    description: "Ride the Wave",
  },
  {
    id: GameType.threeCardPoker,
    label: "Three Card Poker",
    emoji: "🃏",
    description: "Three Card Magic",
  },
  {
    id: GameType.casinoHoldem,
    label: "Casino Hold'em",
    emoji: "♠️",
    description: "Texas Style",
  },
  {
    id: GameType.wheelOfFortune,
    label: "Wheel of Fortune",
    emoji: "🎡",
    description: "Spin to Win",
  },
];

const ARCADE_GAMES = [
  {
    id: GameType.coinPusher,
    label: "Coin Pusher",
    emoji: "🪙",
    description: "Push to Win",
  },
  {
    id: GameType.plinko,
    label: "Plinko",
    emoji: "📍",
    description: "Drop the Ball",
  },
  {
    id: GameType.crashGame,
    label: "Crash Game",
    emoji: "🚀",
    description: "Cash Out in Time",
  },
  {
    id: GameType.mines,
    label: "Mines",
    emoji: "💣",
    description: "Avoid the Mines",
  },
  {
    id: GameType.limbo,
    label: "Limbo",
    emoji: "🌀",
    description: "How Low Can You Go?",
  },
  {
    id: GameType.hiLo,
    label: "Hi-Lo",
    emoji: "🃏",
    description: "Higher or Lower?",
  },
  {
    id: GameType.penaltyShootout,
    label: "Penalty Shootout",
    emoji: "⚽",
    description: "Score to Win",
  },
  {
    id: GameType.ballDrop,
    label: "Ball Drop",
    emoji: "🎱",
    description: "Drop & Win",
  },
];

const ALL_GAMES = [...CASINO_GAMES, ...ARCADE_GAMES];

// Deterministic daily featured games using date as seed
function getDailyFeatured(count: number) {
  const seed = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const shuffled = [...ALL_GAMES].sort((a, b) => {
    const ha = (hash * (a.id.length + 1)) | 0;
    const hb = (hash * (b.id.length + 1)) | 0;
    return (ha % 97) - (hb % 97);
  });
  return shuffled.slice(0, count);
}

const FEATURED_GAMES = getDailyFeatured(4);

const TOURNAMENTS = [
  { name: "Slots Sprint", time: "Tonight 8PM" },
  { name: "Blackjack Blitz", time: "Tomorrow 3PM" },
  { name: "High Roller Roulette", time: "Friday 9PM" },
  { name: "Crash Mania", time: "Saturday 7PM" },
  { name: "Plinko Championship", time: "Sunday 5PM" },
];

const GAME_COLORS: Record<string, string> = {
  [GameType.slots]: "oklch(0.65 0.18 290)",
  [GameType.blackjack]: "oklch(0.60 0.12 160)",
  [GameType.roulette]: "oklch(0.57 0.245 27)",
  [GameType.videoPoker]: "oklch(0.70 0.13 72)",
  [GameType.dice]: "oklch(0.60 0.12 200)",
  [GameType.baccarat]: "oklch(0.65 0.15 300)",
  [GameType.keno]: "oklch(0.62 0.16 240)",
  [GameType.scratchCards]: "oklch(0.68 0.14 140)",
  [GameType.craps]: "oklch(0.58 0.20 25)",
  [GameType.paiGowPoker]: "oklch(0.63 0.18 50)",
  [GameType.sicBo]: "oklch(0.67 0.17 310)",
  [GameType.war]: "oklch(0.55 0.22 20)",
  [GameType.caribbeanStud]: "oklch(0.64 0.19 185)",
  [GameType.letItRide]: "oklch(0.61 0.15 220)",
  [GameType.threeCardPoker]: "oklch(0.66 0.16 270)",
  [GameType.casinoHoldem]: "oklch(0.59 0.14 150)",
  [GameType.wheelOfFortune]: "oklch(0.72 0.20 65)",
  [GameType.coinPusher]: "oklch(0.73 0.16 80)",
  [GameType.plinko]: "oklch(0.64 0.21 310)",
  [GameType.crashGame]: "oklch(0.60 0.24 20)",
  [GameType.mines]: "oklch(0.56 0.18 145)",
  [GameType.limbo]: "oklch(0.67 0.20 260)",
  [GameType.hiLo]: "oklch(0.63 0.13 175)",
  [GameType.penaltyShootout]: "oklch(0.61 0.18 145)",
  [GameType.ballDrop]: "oklch(0.65 0.22 290)",
};

function GameCard({
  game,
  index,
  featured = false,
}: { game: (typeof ALL_GAMES)[0]; index: number; featured?: boolean }) {
  const color = GAME_COLORS[game.id] ?? "oklch(0.65 0.15 270)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      data-ocid={`games.item.${index + 1}`}
    >
      <Link to="/game/$gameType" params={{ gameType: game.id }}>
        <div
          className={`group relative card-dark rounded-xl overflow-hidden cursor-pointer hover:border-gold/50 transition-all hover:shadow-gold ${
            featured ? "ring-1 ring-gold/40" : ""
          }`}
        >
          {featured && (
            <div
              className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-bold tracking-wider"
              style={{
                background: "oklch(0.70 0.13 72)",
                color: "oklch(0.10 0.012 240)",
              }}
            >
              🔥 HOT
            </div>
          )}
          <div
            className={`flex items-center justify-center relative ${
              featured ? "h-40" : "h-32"
            }`}
            style={{
              background: `linear-gradient(135deg, oklch(0.14 0.015 230), ${color}33)`,
            }}
          >
            <span
              className={`filter drop-shadow-lg ${featured ? "text-6xl" : "text-5xl"}`}
            >
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

  const shuffledWinners = winners
    ? [...winners].sort(() => Math.random() - 0.5)
    : [];

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
              25 GAMES — CASINO & ARCADE
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
          {/* Featured Today Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-gold" />
              <h2 className="font-display text-xl font-bold tracking-wider">
                🔥 FEATURED TODAY
              </h2>
              <span
                className="ml-auto text-xs px-2 py-1 rounded-full font-semibold"
                style={{
                  background: "oklch(0.70 0.13 72 / 0.2)",
                  color: "oklch(0.70 0.13 72)",
                }}
              >
                Refreshes Daily
              </span>
            </div>
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              data-ocid="featured.list"
            >
              {FEATURED_GAMES.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} featured />
              ))}
            </div>
          </section>

          {/* Category Tabs + Full Grid */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gold" />
              <h2 className="font-display text-xl font-bold tracking-wider">
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
                className="h-9"
                style={{ background: "oklch(0.15 0.018 230)" }}
              >
                <TabsTrigger
                  value="all"
                  className="text-xs font-bold tracking-wider"
                  data-ocid="games.all.tab"
                >
                  ALL ({ALL_GAMES.length})
                </TabsTrigger>
                <TabsTrigger
                  value="casino"
                  className="text-xs font-bold tracking-wider"
                  data-ocid="games.casino.tab"
                >
                  🎰 CASINO ({CASINO_GAMES.length})
                </TabsTrigger>
                <TabsTrigger
                  value="arcade"
                  className="text-xs font-bold tracking-wider"
                  data-ocid="games.arcade.tab"
                >
                  🕹️ ARCADE ({ARCADE_GAMES.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              data-ocid="games.list"
            >
              {displayedGames.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} />
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

        {/* Right: Leaderboard + Tournaments */}
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
                      className={`font-bold text-xs w-5 text-center ${i === 0 ? "text-gold" : "text-muted-foreground"}`}
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
