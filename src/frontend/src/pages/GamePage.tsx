import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Coins, Loader2, Trophy, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameResult, GameType } from "../backend.d";
import { useGetWalletBalance, usePlayGame } from "../hooks/useQueries";

const GAME_INFO: Record<
  string,
  { label: string; emoji: string; description: string; rules: string }
> = {
  [GameType.slots]: {
    label: "Slots",
    emoji: "🎰",
    description: "Spin the reels and match symbols!",
    rules: "Match 3 symbols to win. Higher bets, bigger wins!",
  },
  [GameType.blackjack]: {
    label: "Blackjack",
    emoji: "🃏",
    description: "Beat the dealer without going over 21!",
    rules: "Get closer to 21 than the dealer. Ace = 1 or 11.",
  },
  [GameType.roulette]: {
    label: "Roulette",
    emoji: "🎡",
    description: "Spin the wheel and place your bets!",
    rules: "The ball lands on a number. Bet wisely!",
  },
  [GameType.videoPoker]: {
    label: "Video Poker",
    emoji: "♠️",
    description: "Build the best poker hand!",
    rules: "Royal Flush pays 250x. Get the best 5-card hand.",
  },
  [GameType.dice]: {
    label: "Dice",
    emoji: "🎲",
    description: "Roll the dice and beat the house!",
    rules: "Roll higher than the dealer. Snake eyes loses!",
  },
  [GameType.baccarat]: {
    label: "Baccarat",
    emoji: "💎",
    description: "Bet on Player or Banker!",
    rules: "Closest to 9 wins. 8 or 9 = Natural win!",
  },
  [GameType.keno]: {
    label: "Keno",
    emoji: "🔢",
    description: "Pick your lucky numbers!",
    rules: "Choose up to 10 numbers. More matches = bigger wins!",
  },
  [GameType.scratchCards]: {
    label: "Scratch Cards",
    emoji: "🎫",
    description: "Instant win potential!",
    rules: "Scratch to reveal your prize. Match 3 symbols to win!",
  },
  [GameType.craps]: {
    label: "Craps",
    emoji: "🎲",
    description: "Roll the bones!",
    rules: "Bet on the dice outcome. Pass line bets are most popular.",
  },
  [GameType.paiGowPoker]: {
    label: "Pai Gow Poker",
    emoji: "🀄",
    description: "Ancient Chinese strategy!",
    rules: "Split 7 cards into two hands. Beat the banker's hands to win.",
  },
  [GameType.sicBo]: {
    label: "Sic Bo",
    emoji: "🎰",
    description: "Three dice action!",
    rules: "Predict the outcome of 3 dice. Big/Small bets are easiest.",
  },
  [GameType.war]: {
    label: "War",
    emoji: "🃏",
    description: "Simple card battle!",
    rules: "Higher card wins. Tie? Go to War for double or nothing!",
  },
  [GameType.caribbeanStud]: {
    label: "Caribbean Stud",
    emoji: "♣️",
    description: "Caribbean vibes!",
    rules: "Beat the dealer's 5-card poker hand to win.",
  },
  [GameType.letItRide]: {
    label: "Let It Ride",
    emoji: "🌊",
    description: "Ride the wave!",
    rules: "Let good hands ride for bigger payouts. Pull back bad ones.",
  },
  [GameType.threeCardPoker]: {
    label: "Three Card Poker",
    emoji: "🃏",
    description: "Three card magic!",
    rules: "Straight flush, three of a kind, or straight pays big.",
  },
  [GameType.casinoHoldem]: {
    label: "Casino Hold'em",
    emoji: "♠️",
    description: "Texas style poker!",
    rules: "Beat the dealer with the best 5-card hand using community cards.",
  },
  [GameType.wheelOfFortune]: {
    label: "Wheel of Fortune",
    emoji: "🎡",
    description: "Spin to win big!",
    rules: "Bet on which symbol the wheel stops on. 40x payout possible!",
  },
  [GameType.coinPusher]: {
    label: "Coin Pusher",
    emoji: "🪙",
    description: "Push to win!",
    rules: "Drop coins to push more coins off the edge and collect them.",
  },
  [GameType.plinko]: {
    label: "Plinko",
    emoji: "📍",
    description: "Drop the ball!",
    rules: "Drop the ball and watch it bounce for multiplied winnings.",
  },
  [GameType.crashGame]: {
    label: "Crash Game",
    emoji: "🚀",
    description: "Cash out in time!",
    rules: "The multiplier grows. Cash out before it crashes to win!",
  },
  [GameType.mines]: {
    label: "Mines",
    emoji: "💣",
    description: "Avoid the mines!",
    rules: "Reveal safe tiles to multiply your bet. Hit a mine and lose all.",
  },
  [GameType.limbo]: {
    label: "Limbo",
    emoji: "🌀",
    description: "How low can you go?",
    rules:
      "Set a target multiplier. The lower the target, the higher the chance to win.",
  },
  [GameType.hiLo]: {
    label: "Hi-Lo",
    emoji: "🃏",
    description: "Higher or lower?",
    rules:
      "Guess if the next card will be higher or lower. Chain correct guesses!",
  },
  [GameType.penaltyShootout]: {
    label: "Penalty Shootout",
    emoji: "⚽",
    description: "Score to win!",
    rules: "Pick your corner and shoot. Beat the goalkeeper to win!",
  },
  [GameType.ballDrop]: {
    label: "Ball Drop",
    emoji: "🎱",
    description: "Drop & win!",
    rules: "Drop the ball through pegs to land in a prize slot.",
  },
};

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

  const { data: balance } = useGetWalletBalance();
  const { mutateAsync: playGame, isPending } = usePlayGame();

  const gameInfo = GAME_INFO[gameType] ?? {
    label: gameType,
    emoji: "🎮",
    description: "",
    rules: "",
  };

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-dark rounded-2xl overflow-hidden mb-6"
      >
        <div
          className="h-40 flex flex-col items-center justify-center relative"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.18 0.08 300), oklch(0.24 0.12 295))",
          }}
        >
          <motion.div
            animate={
              isAnimating
                ? { rotate: [0, 10, -10, 10, 0], scale: [1, 1.2, 1] }
                : {}
            }
            transition={{ duration: 0.5 }}
            className="text-6xl mb-2"
          >
            {gameInfo.emoji}
          </motion.div>
          <h1 className="font-display text-2xl font-bold text-gold-gradient">
            {gameInfo.label.toUpperCase()}
          </h1>
          <p className="text-sm text-foreground/70 mt-1">
            {gameInfo.description}
          </p>
        </div>
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ background: "oklch(0.13 0.015 232)" }}
        >
          <p className="text-xs text-muted-foreground">{gameInfo.rules}</p>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <Coins className="w-4 h-4 text-gold" />
            <span className="text-gold font-bold text-sm">
              {balance?.toString() ?? "—"}
            </span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {lastResult && (
          <motion.div
            key={lastResult.result}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`rounded-xl p-4 mb-6 flex items-center gap-4 ${
              lastResult.result === GameResult.win
                ? "border border-gold/50"
                : "border border-destructive/50"
            }`}
            style={{
              background:
                lastResult.result === GameResult.win
                  ? "oklch(0.70 0.13 72 / 0.15)"
                  : "oklch(0.577 0.245 27 / 0.15)",
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
                className={`font-bold text-lg ${
                  lastResult.result === GameResult.win
                    ? "text-gold"
                    : "text-destructive"
                }`}
              >
                {lastResult.result === GameResult.win ? "YOU WIN!" : "YOU LOSE"}
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

      <div className="card-dark rounded-2xl p-6">
        <h3 className="font-display font-bold tracking-wider mb-4">
          PLACE YOUR BET
        </h3>

        <div className="flex gap-2 flex-wrap mb-4">
          {QUICK_BETS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setBet(q.toString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                bet === q.toString()
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={
                bet === q.toString()
                  ? { background: "oklch(0.70 0.13 72)" }
                  : { background: "oklch(0.18 0.020 228)" }
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
            className="w-full py-6 text-base font-bold tracking-wider bg-gold text-primary-foreground hover:opacity-90"
            data-ocid="game.play_button"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Playing...
              </>
            ) : (
              `🎲 PLAY FOR ${bet} CREDITS`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
