import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Coins,
  Flame,
  GamepadIcon,
  Gift,
  Loader2,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GameResult, GameType } from "../backend.d";
import FlipGameCard from "../components/FlipGameCard";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useClaimDailyCredits,
  useGetCallerUserProfile,
  useGetDailyWinners,
  useGetGameHistory,
  useGetWalletBalance,
} from "../hooks/useQueries";

// ============================================================
// Game Data
// ============================================================
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
  { user: "neonking", amount: 420 },
  { user: "vegasvip", amount: 850 },
  { user: "jackpot7s", amount: 1000 },
  { user: "arcadeace", amount: 320 },
  { user: "spinqueen", amount: 185 },
  { user: "highroll", amount: 630 },
  { user: "player99", amount: 75 },
  { user: "luckystar", amount: 290 },
];

const GAME_LABELS: Record<string, string> = {};
for (const g of ALL_GAMES) {
  GAME_LABELS[g.id] = g.label;
}

// ============================================================
// Shared Components
// ============================================================
function NeonGrid() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.65 0.28 340 / 0.4) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.65 0.28 340 / 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "oklch(0.65 0.28 340)", filter: "blur(100px)" }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-15 pointer-events-none"
        style={{ background: "oklch(0.70 0.20 190)", filter: "blur(100px)" }}
      />
      <div
        className="absolute top-1/2 right-10 w-48 h-48 rounded-full opacity-20 pointer-events-none"
        style={{ background: "oklch(0.55 0.25 290)", filter: "blur(60px)" }}
      />
    </>
  );
}

function WinnerTicker({
  items,
}: { items: { user: string; amount: number; game?: string }[] }) {
  const doubled = [...items, ...items];
  return (
    <div
      className="overflow-hidden py-2.5 relative"
      style={{
        background: "oklch(0.65 0.28 340 / 0.1)",
        borderTop: "1px solid oklch(0.65 0.28 340 / 0.4)",
        borderBottom: "1px solid oklch(0.65 0.28 340 / 0.4)",
      }}
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((w, i) => (
          <span
            key={`ticker-${i}-${w.user}`}
            className="inline-flex items-center gap-2 px-6 text-sm font-bold"
          >
            <Trophy
              className="w-3 h-3 shrink-0"
              style={{ color: "oklch(0.78 0.18 72)" }}
            />
            <span className="text-gold font-black">{w.user}</span>
            <span className="text-muted-foreground">won</span>
            <span
              style={{
                color: "oklch(0.65 0.28 340)",
                textShadow: "0 0 8px oklch(0.65 0.28 340 / 0.7)",
              }}
            >
              +{w.amount} credits
            </span>
            {w.game && (
              <span className="text-muted-foreground">on {w.game}</span>
            )}
            <span className="text-muted-foreground/30 mx-2">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatsBar({ compact = false }: { compact?: boolean }) {
  const stats = [
    {
      icon: GamepadIcon,
      label: "Games Available",
      value: "25",
      color: "oklch(0.65 0.28 340)",
    },
    {
      icon: Users,
      label: "Players Online",
      value: "1,240+",
      color: "oklch(0.70 0.20 190)",
    },
    {
      icon: TrendingUp,
      label: "Credits Won Today",
      value: "52,800+",
      color: "oklch(0.78 0.18 72)",
    },
    {
      icon: Gift,
      label: "Daily Bonuses",
      value: "Free",
      color: "oklch(0.55 0.25 290)",
    },
  ];
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-4 gap-px ${compact ? "" : ""}`}
      style={{ background: "oklch(0.22 0.03 275 / 0.4)" }}
      data-ocid="stats.section"
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex items-center gap-3 ${compact ? "px-4 py-3" : "px-6 py-5"}`}
          style={{ background: "oklch(0.10 0.015 280)" }}
        >
          <s.icon
            className={compact ? "w-4 h-4 shrink-0" : "w-5 h-5 shrink-0"}
            style={{ color: s.color }}
          />
          <div>
            <p
              className={`font-black ${compact ? "text-sm" : "text-lg"}`}
              style={{ color: s.color, textShadow: `0 0 8px ${s.color} / 0.5` }}
            >
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardPanel({
  winners,
}: { winners: { user: string; amount: number }[] }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "oklch(0.11 0.015 280)",
        border: "1px solid oklch(0.78 0.18 72 / 0.4)",
        boxShadow: "0 0 20px oklch(0.78 0.18 72 / 0.1)",
      }}
    >
      <div
        className="px-5 py-4"
        style={{
          background:
            "linear-gradient(90deg, oklch(0.78 0.18 72 / 0.2), transparent)",
          borderBottom: "1px solid oklch(0.78 0.18 72 / 0.3)",
        }}
      >
        <h3 className="font-display font-black tracking-widest text-gold text-lg">
          🏆 TODAY'S WINNERS
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Refreshed daily · Randomized order
        </p>
      </div>
      <div data-ocid="leaderboard.list">
        {winners.length === 0 ? (
          <div
            className="p-8 text-center text-sm text-muted-foreground"
            data-ocid="leaderboard.empty_state"
          >
            No winners yet today. Be the first!
          </div>
        ) : (
          winners.slice(0, 8).map((w, i) => (
            <div
              key={`${w.user}-${i}`}
              className="flex items-center gap-3 px-5 py-3 text-sm"
              style={{
                borderBottom: "1px solid oklch(0.22 0.03 275)",
                background:
                  i === 0
                    ? "linear-gradient(90deg, oklch(0.78 0.18 72 / 0.1), transparent)"
                    : "transparent",
              }}
              data-ocid={`leaderboard.item.${i + 1}`}
            >
              <span className="font-black text-base w-7 text-center">
                {i === 0 ? (
                  "🥇"
                ) : i === 1 ? (
                  "🥈"
                ) : i === 2 ? (
                  "🥉"
                ) : (
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                )}
              </span>
              <span className="flex-1 text-xs font-medium truncate text-foreground">
                {w.user}...
              </span>
              <span
                className="text-sm font-black"
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
      <div className="p-4 text-center">
        <Link
          to="/leaderboard"
          className="text-xs font-bold neon-pink hover:underline"
          data-ocid="leaderboard.view_button"
        >
          View Full Scoreboard →
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Animated Counter
// ============================================================
function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = setTimeout(tick, 16);
    };
    tick();
    return () => {
      if (ref.current) clearTimeout(ref.current);
    };
  }, [target, duration]);
  return value;
}

// ============================================================
// Logged-Out View
// ============================================================
function LoggedOutHome({
  winners,
}: { winners: { user: string; amount: number }[] }) {
  const tickerItems =
    winners.length > 0 ? winners : SAMPLE_WINNERS.map((w) => ({ ...w }));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: 580 }}>
        <NeonGrid />
        <div className="relative z-10 flex flex-col items-center justify-center py-24 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black tracking-widest mb-6"
              style={{
                background: "oklch(0.65 0.28 340 / 0.15)",
                border: "1px solid oklch(0.65 0.28 340 / 0.5)",
                color: "oklch(0.65 0.28 340)",
                boxShadow: "0 0 16px oklch(0.65 0.28 340 / 0.2)",
              }}
              animate={{
                boxShadow: [
                  "0 0 16px oklch(0.65 0.28 340 / 0.2)",
                  "0 0 28px oklch(0.65 0.28 340 / 0.4)",
                  "0 0 16px oklch(0.65 0.28 340 / 0.2)",
                ],
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <Zap className="w-3 h-3" /> 25 GAMES AVAILABLE NOW
            </motion.div>
            <h1
              className="font-display font-black text-5xl md:text-7xl lg:text-8xl tracking-tight mb-4 leading-none"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.28 340) 0%, oklch(0.88 0.14 76) 40%, oklch(0.70 0.20 190) 80%, oklch(0.65 0.28 340) 100%)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 30px oklch(0.65 0.28 340 / 0.5))",
              }}
            >
              CPM VEGAS
              <br />
              <span
                style={{
                  filter: "drop-shadow(0 0 20px oklch(0.70 0.20 190 / 0.6))",
                }}
              >
                AND ARCADE
              </span>
            </h1>
            <p className="text-muted-foreground text-xl md:text-2xl mb-10 font-medium">
              25 Games · Casino &amp; Arcade ·{" "}
              <span className="text-gold font-bold">Win Today</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth" data-ocid="hero.primary_button">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-10 py-4 rounded-xl font-black text-lg tracking-widest w-full sm:w-auto"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                    color: "#fff",
                    boxShadow:
                      "0 0 30px oklch(0.65 0.28 340 / 0.5), 0 0 60px oklch(0.65 0.28 340 / 0.2)",
                  }}
                >
                  🎮 PLAY NOW
                </motion.button>
              </Link>
              <Link to="/auth" data-ocid="hero.secondary_button">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-10 py-4 rounded-xl font-black text-lg tracking-widest w-full sm:w-auto"
                  style={{
                    background: "transparent",
                    color: "oklch(0.88 0.14 76)",
                    border: "2px solid oklch(0.78 0.18 72 / 0.7)",
                    boxShadow: "0 0 20px oklch(0.78 0.18 72 / 0.2)",
                  }}
                >
                  🎰 BROWSE GAMES
                </motion.button>
              </Link>
            </div>
            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 mt-10 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-gold" fill="currentColor" /> Free
                to Play
              </span>
              <span className="flex items-center gap-1">
                <Gift
                  className="w-3 h-3"
                  style={{ color: "oklch(0.65 0.28 340)" }}
                />{" "}
                10 Sign-Up Credits
              </span>
              <span className="flex items-center gap-1">
                <Trophy
                  className="w-3 h-3"
                  style={{ color: "oklch(0.70 0.20 190)" }}
                />{" "}
                Daily Bonus
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <StatsBar />

      {/* Winner ticker */}
      <WinnerTicker items={tickerItems} />

      {/* Main content */}
      <div className="px-4 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured Games */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mb-6"
            >
              <Flame
                className="w-6 h-6 animate-neon-pulse"
                style={{ color: "oklch(0.65 0.28 340)" }}
              />
              <h2
                className="font-display font-black text-2xl tracking-widest"
                style={{
                  color: "oklch(0.65 0.28 340)",
                  textShadow: "0 0 12px oklch(0.65 0.28 340 / 0.6)",
                }}
              >
                FEATURED TODAY
              </h2>
              <Badge
                className="ml-auto text-xs font-black tracking-wider"
                style={{
                  background: "oklch(0.65 0.28 340 / 0.15)",
                  border: "1px solid oklch(0.65 0.28 340 / 0.4)",
                  color: "oklch(0.65 0.28 340)",
                }}
              >
                Rotates Daily
              </Badge>
            </motion.div>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              data-ocid="featured.list"
            >
              {FEATURED_GAMES.map((game, i) => (
                <FlipGameCard
                  key={game.id}
                  id={game.id}
                  label={game.label}
                  description={game.description}
                  emoji={game.emoji}
                  color={game.color}
                  index={i}
                  featured
                  overrideHref="/auth"
                  ocid={`featured.item.${i + 1}`}
                />
              ))}
            </div>

            {/* CTA Banner */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 rounded-2xl p-8 text-center relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.12 0.015 280), oklch(0.14 0.025 290))",
                border: "1px solid oklch(0.65 0.28 340 / 0.3)",
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, oklch(0.65 0.28 340), transparent 70%)",
                }}
              />
              <div className="relative">
                <p className="text-4xl mb-3">🎁</p>
                <h3 className="font-display font-black text-xl tracking-wider mb-2 text-foreground">
                  GET 10 FREE CREDITS
                </h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Sign up today and start playing instantly. Claim 5 more every
                  day!
                </p>
                <Link to="/auth" data-ocid="cta.signup_button">
                  <Button
                    className="font-black tracking-widest px-8"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.78 0.18 72), oklch(0.65 0.22 55))",
                      color: "oklch(0.08 0.01 280)",
                      boxShadow: "0 0 20px oklch(0.78 0.18 72 / 0.4)",
                      border: "none",
                    }}
                  >
                    ✨ CLAIM FREE CREDITS
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LeaderboardPanel
              winners={winners.length > 0 ? winners : SAMPLE_WINNERS}
            />
            {/* Events teaser */}
            <div
              className="mt-6 rounded-xl p-5"
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
                  <span className="text-xs text-muted-foreground">
                    {t.time}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Logged-In View
// ============================================================
function LoggedInHome({
  winners,
}: { winners: { user: string; amount: number }[] }) {
  const { identity } = useInternetIdentity();
  const { data: profile } = useGetCallerUserProfile();
  const { data: balance } = useGetWalletBalance();
  const { data: gameHistory, isLoading: historyLoading } = useGetGameHistory(
    identity?.getPrincipal(),
  );
  const { mutateAsync: claimDaily, isPending: claiming } =
    useClaimDailyCredits();

  const username =
    profile?.name ||
    identity?.getPrincipal().toString().slice(0, 10) ||
    "Player";
  const recentGames = useMemo(
    () => (gameHistory || []).slice(0, 5),
    [gameHistory],
  );
  const tickerItems =
    winners.length > 0 ? winners : SAMPLE_WINNERS.map((w) => ({ ...w }));

  const handleClaimDaily = async () => {
    try {
      await claimDaily();
      toast.success("🎁 +5 daily credits claimed!");
    } catch {
      toast.error("Already claimed today or error occurred");
    }
  };

  const balanceNum = useCountUp(balance !== undefined ? Number(balance) : 0);

  return (
    <div>
      {/* Personalized Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: 400 }}>
        <NeonGrid />
        <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-black tracking-widest text-muted-foreground mb-2">
              WELCOME BACK
            </p>
            <h1
              className="font-display font-black text-4xl md:text-6xl tracking-tight mb-6"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.88 0.14 76), oklch(0.70 0.20 190))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 20px oklch(0.65 0.28 340 / 0.5))",
              }}
            >
              {username.toUpperCase()}!
            </h1>

            {/* Balance card */}
            <motion.div
              className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl mb-8"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.13 0.022 278), oklch(0.15 0.03 72))",
                border: "2px solid oklch(0.78 0.18 72 / 0.6)",
                boxShadow:
                  "0 0 30px oklch(0.78 0.18 72 / 0.2), inset 0 0 20px oklch(0.78 0.18 72 / 0.05)",
              }}
              animate={{
                boxShadow: [
                  "0 0 30px oklch(0.78 0.18 72 / 0.2)",
                  "0 0 50px oklch(0.78 0.18 72 / 0.35)",
                  "0 0 30px oklch(0.78 0.18 72 / 0.2)",
                ],
              }}
              transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
            >
              <Coins className="w-8 h-8 text-gold" />
              <div className="text-left">
                <p className="text-3xl font-black text-gold font-display">
                  {balanceNum.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground font-bold tracking-wider">
                  CREDITS
                </p>
              </div>
            </motion.div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/games" data-ocid="hero.play_button">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-8 py-3.5 rounded-xl font-black text-base tracking-widest w-full sm:w-auto"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                    color: "#fff",
                    boxShadow: "0 0 24px oklch(0.65 0.28 340 / 0.5)",
                  }}
                >
                  🎮 PLAY GAMES
                </motion.button>
              </Link>
              <motion.button
                type="button"
                onClick={handleClaimDaily}
                disabled={claiming}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-8 py-3.5 rounded-xl font-black text-base tracking-widest w-full sm:w-auto"
                style={{
                  background: "transparent",
                  color: "oklch(0.88 0.14 76)",
                  border: "2px solid oklch(0.78 0.18 72 / 0.7)",
                  boxShadow: "0 0 16px oklch(0.78 0.18 72 / 0.2)",
                }}
                data-ocid="hero.claim_button"
              >
                {claiming ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                ) : null}
                🎁 CLAIM DAILY BONUS
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Compact stats */}
      <StatsBar compact />

      {/* Winner ticker */}
      <WinnerTicker items={tickerItems} />

      {/* Main content */}
      <div className="px-4 py-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            {/* Most Popular Today */}
            <section>
              <div className="flex items-center gap-3 mb-5">
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
                  MOST POPULAR TODAY
                </h2>
                <Badge
                  className="ml-auto text-xs font-black"
                  style={{
                    background: "oklch(0.65 0.28 340 / 0.15)",
                    border: "1px solid oklch(0.65 0.28 340 / 0.4)",
                    color: "oklch(0.65 0.28 340)",
                  }}
                >
                  Rotates Daily
                </Badge>
              </div>
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                data-ocid="featured.list"
              >
                {FEATURED_GAMES.map((game, i) => (
                  <FlipGameCard
                    key={game.id}
                    id={game.id}
                    label={game.label}
                    description={game.description}
                    emoji={game.emoji}
                    color={game.color}
                    index={i}
                    featured
                    ocid={`featured.item.${i + 1}`}
                  />
                ))}
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <TrendingUp
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
                  RECENT ACTIVITY
                </h2>
              </div>
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: "oklch(0.11 0.015 280)",
                  border: "1px solid oklch(0.70 0.20 190 / 0.3)",
                }}
                data-ocid="activity.section"
              >
                {historyLoading ? (
                  <div
                    className="p-8 flex justify-center"
                    data-ocid="activity.loading_state"
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentGames.length === 0 ? (
                  <div
                    className="p-10 text-center"
                    data-ocid="activity.empty_state"
                  >
                    <p className="text-4xl mb-3">🎮</p>
                    <p className="text-sm font-bold text-muted-foreground">
                      No games played yet.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Head to the lobby and start winning!
                    </p>
                    <Link to="/games" className="mt-4 inline-block">
                      <Button
                        size="sm"
                        className="mt-3 font-bold"
                        style={{
                          background: "oklch(0.70 0.20 190 / 0.2)",
                          color: "oklch(0.70 0.20 190)",
                          border: "1px solid oklch(0.70 0.20 190 / 0.4)",
                        }}
                      >
                        Go to Games Lobby
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div
                      className="grid grid-cols-5 px-5 py-2 text-xs font-black text-muted-foreground tracking-wider"
                      style={{ borderBottom: "1px solid oklch(0.22 0.03 275)" }}
                    >
                      <span className="col-span-2">GAME</span>
                      <span>RESULT</span>
                      <span>BET</span>
                      <span className="text-right">CHANGE</span>
                    </div>
                    {recentGames.map((g, i) => (
                      <div
                        key={`game-${g.gameType}-${g.timestamp?.toString()}-${i}`}
                        className="grid grid-cols-5 items-center px-5 py-3 text-sm"
                        style={{
                          borderBottom: "1px solid oklch(0.22 0.03 275 / 0.5)",
                        }}
                        data-ocid={`activity.item.${i + 1}`}
                      >
                        <span className="col-span-2 font-bold text-foreground truncate">
                          {GAME_LABELS[g.gameType as string] || g.gameType}
                        </span>
                        <span>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-black"
                            style={{
                              background:
                                g.result === GameResult.win
                                  ? "oklch(0.70 0.22 150 / 0.2)"
                                  : "oklch(0.60 0.24 20 / 0.2)",
                              color:
                                g.result === GameResult.win
                                  ? "oklch(0.70 0.22 150)"
                                  : "oklch(0.65 0.24 20)",
                              border: `1px solid ${g.result === GameResult.win ? "oklch(0.70 0.22 150 / 0.4)" : "oklch(0.60 0.24 20 / 0.4)"}`,
                            }}
                          >
                            {g.result === GameResult.win ? "WIN" : "LOSE"}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {g.bet.toString()}
                        </span>
                        <span
                          className="text-right font-black"
                          style={{
                            color:
                              g.result === GameResult.win
                                ? "oklch(0.70 0.22 150)"
                                : "oklch(0.65 0.24 20)",
                          }}
                        >
                          {g.result === GameResult.win ? "+" : ""}
                          {g.balanceChange.toString()}
                        </span>
                      </div>
                    ))}
                    <div className="p-3 text-center">
                      <Link
                        to="/history"
                        className="text-xs font-bold neon-cyan hover:underline"
                        data-ocid="activity.view_button"
                      >
                        View Full History →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LeaderboardPanel
              winners={winners.length > 0 ? winners : SAMPLE_WINNERS}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Export
// ============================================================
export default function HomePage() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: winners, isLoading: winnersLoading } = useGetDailyWinners();

  const shuffledWinners = useMemo(() => {
    if (!winners || winners.length === 0) return [];
    return [...winners]
      .sort(() => Math.random() - 0.5)
      .map((w) => ({
        user: w.user.toString().slice(0, 10),
        amount: Number(w.amount),
      }));
  }, [winners]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="h-10 w-10 animate-spin"
            style={{ color: "oklch(0.65 0.28 340)" }}
          />
          <p
            className="font-black tracking-widest text-sm"
            style={{ color: "oklch(0.65 0.28 340)" }}
          >
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {identity ? (
        <motion.div
          key="logged-in"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {!winnersLoading && <LoggedInHome winners={shuffledWinners} />}
          {winnersLoading && (
            <div className="min-h-screen flex items-center justify-center">
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: "oklch(0.65 0.28 340)" }}
              />
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="logged-out"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LoggedOutHome winners={shuffledWinners} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
