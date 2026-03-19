import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Coins, Loader2, Trophy, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameResult, GameType } from "../backend.d";
import BlackjackGame from "../components/games/BlackjackGame";
import RouletteGame from "../components/games/RouletteGame";
import SlotsGame from "../components/games/SlotsGame";
import VideoPokerGame from "../components/games/VideoPokerGame";
import { useGetWalletBalance, usePlayGame } from "../hooks/useQueries";

const GAME_INFO: Record<
  string,
  {
    label: string;
    emoji: string;
    description: string;
    rules: string;
    color: string;
  }
> = {
  [GameType.slots]: {
    label: "Slots",
    emoji: "🎰",
    description: "Spin the reels and match symbols!",
    rules: "Match 3 symbols to win. Higher bets, bigger wins!",
    color: "oklch(0.65 0.28 340)",
  },
  [GameType.blackjack]: {
    label: "Blackjack",
    emoji: "🃏",
    description: "Beat the dealer without going over 21!",
    rules: "Get closer to 21 than the dealer. Ace = 1 or 11.",
    color: "oklch(0.70 0.20 190)",
  },
  [GameType.roulette]: {
    label: "Roulette",
    emoji: "🎡",
    description: "Spin the wheel and place your bets!",
    rules: "The ball lands on a number. Bet wisely!",
    color: "oklch(0.60 0.24 20)",
  },
  [GameType.videoPoker]: {
    label: "Video Poker",
    emoji: "♠️",
    description: "Build the best poker hand!",
    rules: "Royal Flush pays 250x. Get the best 5-card hand.",
    color: "oklch(0.78 0.18 72)",
  },
  [GameType.dice]: {
    label: "Dice",
    emoji: "🎲",
    description: "Roll the dice and beat the house!",
    rules: "Roll higher than the dealer. Snake eyes loses!",
    color: "oklch(0.70 0.20 190)",
  },
  [GameType.baccarat]: {
    label: "Baccarat",
    emoji: "💎",
    description: "Bet on Player or Banker!",
    rules: "Closest to 9 wins. 8 or 9 = Natural win!",
    color: "oklch(0.55 0.25 290)",
  },
  [GameType.keno]: {
    label: "Keno",
    emoji: "🔢",
    description: "Pick your lucky numbers!",
    rules: "Choose up to 10 numbers. More matches = bigger wins!",
    color: "oklch(0.62 0.22 240)",
  },
  [GameType.scratchCards]: {
    label: "Scratch Cards",
    emoji: "🎫",
    description: "Instant win potential!",
    rules: "Scratch to reveal your prize. Match 3 symbols to win!",
    color: "oklch(0.68 0.22 150)",
  },
  [GameType.craps]: {
    label: "Craps",
    emoji: "🎲",
    description: "Roll the bones!",
    rules: "Bet on the dice outcome. Pass line bets are most popular.",
    color: "oklch(0.60 0.24 25)",
  },
  [GameType.paiGowPoker]: {
    label: "Pai Gow Poker",
    emoji: "🀄",
    description: "Ancient Chinese strategy!",
    rules: "Split 7 cards into two hands. Beat the banker's hands to win.",
    color: "oklch(0.65 0.22 55)",
  },
  [GameType.sicBo]: {
    label: "Sic Bo",
    emoji: "🎰",
    description: "Three dice action!",
    rules: "Predict the outcome of 3 dice. Big/Small bets are easiest.",
    color: "oklch(0.65 0.28 340)",
  },
  [GameType.war]: {
    label: "War",
    emoji: "🃏",
    description: "Simple card battle!",
    rules: "Higher card wins. Tie? Go to War for double or nothing!",
    color: "oklch(0.60 0.24 20)",
  },
  [GameType.caribbeanStud]: {
    label: "Caribbean Stud",
    emoji: "♣️",
    description: "Caribbean vibes!",
    rules: "Beat the dealer's 5-card poker hand to win.",
    color: "oklch(0.70 0.20 190)",
  },
  [GameType.letItRide]: {
    label: "Let It Ride",
    emoji: "🌊",
    description: "Ride the wave!",
    rules: "Let good hands ride for bigger payouts. Pull back bad ones.",
    color: "oklch(0.62 0.22 200)",
  },
  [GameType.threeCardPoker]: {
    label: "Three Card Poker",
    emoji: "🃏",
    description: "Three card magic!",
    rules: "Straight flush, three of a kind, or straight pays big.",
    color: "oklch(0.55 0.25 290)",
  },
  [GameType.casinoHoldem]: {
    label: "Casino Hold'em",
    emoji: "♠️",
    description: "Texas style poker!",
    rules: "Beat the dealer with the best 5-card hand using community cards.",
    color: "oklch(0.68 0.22 150)",
  },
  [GameType.wheelOfFortune]: {
    label: "Wheel of Fortune",
    emoji: "🎡",
    description: "Spin to win big!",
    rules: "Bet on which symbol the wheel stops on. 40x payout possible!",
    color: "oklch(0.78 0.18 72)",
  },
  [GameType.coinPusher]: {
    label: "Coin Pusher",
    emoji: "🪙",
    description: "Push to win!",
    rules: "Drop coins to push more coins off the edge and collect them.",
    color: "oklch(0.78 0.18 72)",
  },
  [GameType.plinko]: {
    label: "Plinko",
    emoji: "📍",
    description: "Drop the ball!",
    rules: "Drop the ball and watch it bounce for multiplied winnings.",
    color: "oklch(0.65 0.28 340)",
  },
  [GameType.crashGame]: {
    label: "Crash Game",
    emoji: "🚀",
    description: "Cash out in time!",
    rules: "The multiplier grows. Cash out before it crashes to win!",
    color: "oklch(0.60 0.24 20)",
  },
  [GameType.mines]: {
    label: "Mines",
    emoji: "💣",
    description: "Avoid the mines!",
    rules: "Reveal safe tiles to multiply your bet. Hit a mine and lose all.",
    color: "oklch(0.68 0.22 150)",
  },
  [GameType.limbo]: {
    label: "Limbo",
    emoji: "🌀",
    description: "How low can you go?",
    rules:
      "Set a target multiplier. The lower the target, the higher the chance to win.",
    color: "oklch(0.55 0.25 290)",
  },
  [GameType.hiLo]: {
    label: "Hi-Lo",
    emoji: "🃏",
    description: "Higher or lower?",
    rules:
      "Guess if the next card will be higher or lower. Chain correct guesses!",
    color: "oklch(0.70 0.20 190)",
  },
  [GameType.penaltyShootout]: {
    label: "Penalty Shootout",
    emoji: "⚽",
    description: "Score to win!",
    rules: "Pick your corner and shoot. Beat the goalkeeper to win!",
    color: "oklch(0.68 0.22 150)",
  },
  [GameType.ballDrop]: {
    label: "Ball Drop",
    emoji: "🎱",
    description: "Drop & win!",
    rules: "Drop the ball through pegs to land in a prize slot.",
    color: "oklch(0.55 0.25 290)",
  },
};

const FEATURED_GAMES = new Set([
  GameType.blackjack,
  GameType.roulette,
  GameType.slots,
  GameType.videoPoker,
]);

const QUICK_BETS = [5, 10, 25, 50, 100];

export default function GamePage() {
  const { gameType } = useParams({ from: "/layout/game/$gameType" });
  const navigate = useNavigate();
  const [bet, setBet] = useState("10");
  const [lastResult, setLastResult] = useState<{
    result: GameResult;
    balanceChange: bigint;
  } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const { data: balance, refetch: refetchBalance } = useGetWalletBalance();
  const { mutateAsync: playGame, isPending } = usePlayGame();

  const gameInfo = GAME_INFO[gameType] ?? {
    label: gameType,
    emoji: "🎮",
    description: "",
    rules: "",
    color: "oklch(0.65 0.28 340)",
  };
  const { color } = gameInfo;

  const handlePlay = async () => {
    const betAmount = Number.parseInt(bet, 10);
    if (!betAmount || betAmount < 1) {
      toast.error("Minimum bet is 1 credit");
      return;
    }
    if (balance !== undefined && betAmount > Number(balance)) {
      toast.error("Insufficient credits");
      return;
    }
    try {
      setIsAnimating(true);
      const result = await playGame({
        gameType: gameType as GameType,
        bet: BigInt(betAmount),
      });
      setLastResult({
        result: result.result,
        balanceChange: result.balanceChange,
      });
      if (result.result === GameResult.win) {
        toast.success(`🎉 You won ${result.balanceChange.toString()} credits!`);
      } else {
        toast.error(`You lost ${betAmount} credits. Better luck next time!`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  const onGameComplete = () => {
    refetchBalance();
  };

  const isFeaturedGame = FEATURED_GAMES.has(gameType as GameType);

  return (
    <div className="min-h-full p-4 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/" })}
        className="text-muted-foreground hover:text-foreground mb-4"
        data-ocid="game.back_button"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Lobby
      </Button>

      {/* Game header banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden mb-6"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: `1px solid ${color}60`,
          boxShadow: `0 0 30px ${color}20`,
        }}
      >
        <div
          className="h-32 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            background: `radial-gradient(ellipse at center, ${color}25, oklch(0.09 0.012 280))`,
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(${color}30 1px, transparent 1px), linear-gradient(90deg, ${color}30 1px, transparent 1px)`,
              backgroundSize: "30px 30px",
            }}
          />
          <motion.div
            animate={
              isAnimating
                ? { rotate: [0, 15, -15, 10, 0], scale: [1, 1.3, 1] }
                : {}
            }
            transition={{ duration: 0.5 }}
            className="text-5xl mb-1 relative z-10"
          >
            {gameInfo.emoji}
          </motion.div>
          <h1
            className="font-display font-black text-xl tracking-widest relative z-10"
            style={{ color, textShadow: `0 0 20px ${color}` }}
          >
            {gameInfo.label.toUpperCase()}
          </h1>
        </div>
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{
            background: "oklch(0.13 0.015 282)",
            borderTop: `1px solid ${color}30`,
          }}
        >
          <p className="text-xs text-muted-foreground flex-1">
            {gameInfo.rules}
          </p>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <Coins className="w-4 h-4 text-gold" />
            <span className="text-gold font-black text-sm">
              {balance?.toString() ?? "—"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Featured games get dedicated components */}
      {isFeaturedGame ? (
        <div className="pb-8">
          {gameType === GameType.blackjack && (
            <BlackjackGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.roulette && (
            <RouletteGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.slots && (
            <SlotsGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.videoPoker && (
            <VideoPokerGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
        </div>
      ) : (
        /* Generic panel for all other games */
        <>
          <AnimatePresence mode="wait">
            {lastResult && (
              <motion.div
                key={lastResult.result}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="rounded-xl p-4 mb-6 flex items-center gap-4"
                style={{
                  background:
                    lastResult.result === GameResult.win
                      ? "oklch(0.78 0.18 72 / 0.1)"
                      : "oklch(0.577 0.245 27 / 0.1)",
                  border: `1px solid ${lastResult.result === GameResult.win ? "oklch(0.78 0.18 72 / 0.5)" : "oklch(0.577 0.245 27 / 0.5)"}`,
                  boxShadow:
                    lastResult.result === GameResult.win
                      ? "0 0 20px oklch(0.78 0.18 72 / 0.2)"
                      : "0 0 20px oklch(0.577 0.245 27 / 0.2)",
                }}
                data-ocid="game.result_state"
              >
                {lastResult.result === GameResult.win ? (
                  <Trophy className="w-8 h-8 text-gold" />
                ) : (
                  <XCircle className="w-8 h-8 text-destructive" />
                )}
                <div>
                  <p
                    className={`font-black text-lg ${lastResult.result === GameResult.win ? "text-gold" : "text-destructive"}`}
                  >
                    {lastResult.result === GameResult.win
                      ? "🎉 YOU WIN!"
                      : "💸 YOU LOSE"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lastResult.result === GameResult.win
                      ? `+${lastResult.balanceChange.toString()} credits`
                      : `-${bet} credits`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="rounded-2xl p-6"
            style={{
              background: "oklch(0.11 0.015 280)",
              border: "1px solid oklch(0.22 0.03 275)",
            }}
          >
            <h3
              className="font-display font-black tracking-widest mb-4"
              style={{ color }}
            >
              PLACE YOUR BET
            </h3>

            <div className="flex gap-2 flex-wrap mb-4">
              {QUICK_BETS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setBet(q.toString())}
                  className="px-4 py-2 rounded-lg text-xs font-black transition-all"
                  style={
                    bet === q.toString()
                      ? {
                          background: color,
                          color: "#fff",
                          boxShadow: `0 0 12px ${color}60`,
                        }
                      : {
                          background: "oklch(0.16 0.025 278)",
                          color: "oklch(0.60 0.02 270)",
                          border: "1px solid oklch(0.22 0.03 275)",
                        }
                  }
                  data-ocid="game.quickbet.button"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="bet-amount"
                  className="text-sm text-muted-foreground"
                >
                  Bet Amount (credits)
                </Label>
                <Input
                  id="bet-amount"
                  type="number"
                  min="1"
                  value={bet}
                  onChange={(e) => setBet(e.target.value)}
                  className="mt-1 bg-secondary border-border text-foreground text-lg font-bold"
                  data-ocid="game.bet.input"
                />
              </div>
              <Button
                onClick={handlePlay}
                disabled={isPending}
                className="w-full py-6 text-base font-black tracking-widest border-none"
                style={{
                  background: `linear-gradient(135deg, ${color}, oklch(0.55 0.25 290))`,
                  boxShadow: `0 0 20px ${color}50`,
                  color: "#fff",
                }}
                data-ocid="game.play_button"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> PLAYING...
                  </>
                ) : (
                  `🎮 PLAY FOR ${bet} CREDITS`
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
