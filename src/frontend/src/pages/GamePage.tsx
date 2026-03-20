import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Coins, Loader2, Trophy, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GameResult, GameType } from "../backend.d";
import AirHockeyGame from "../components/games/AirHockeyGame";
import AsteroidsGame from "../components/games/AsteroidsGame";
import BaccaratGame from "../components/games/BaccaratGame";
import BallDropGame from "../components/games/BallDropGame";
import BlackjackGame from "../components/games/BlackjackGame";
import BombermanGame from "../components/games/BombermanGame";
import BreakoutGame from "../components/games/BreakoutGame";
import BurgerTimeGame from "../components/games/BurgerTimeGame";
import CaribbeanStudGame from "../components/games/CaribbeanStudGame";
import CasinoHoldemGame from "../components/games/CasinoHoldemGame";
import CentipedeGame from "../components/games/CentipedeGame";
import CoinPusherGame from "../components/games/CoinPusherGame";
import CrapsGame from "../components/games/CrapsGame";
import CrashGame from "../components/games/CrashGame";
import DanceDanceRevolutionGame from "../components/games/DanceDanceRevolutionGame";
import DaytonaUSAGame from "../components/games/DaytonaUSAGame";
import DiceGame from "../components/games/DiceGame";
import DigDugGame from "../components/games/DigDugGame";
import DonkeyKongGame from "../components/games/DonkeyKongGame";
import DuckHuntGame from "../components/games/DuckHuntGame";
import FroggerGame from "../components/games/FroggerGame";
import GalagaGame from "../components/games/GalagaGame";
import HiLoGame from "../components/games/HiLoGame";
import HouseOfTheDeadGame from "../components/games/HouseOfTheDeadGame";
import KenoGame from "../components/games/KenoGame";
import KungFuMasterGame from "../components/games/KungFuMasterGame";
import LetItRideGame from "../components/games/LetItRideGame";
import LimboGame from "../components/games/LimboGame";
import MetalSlugGame from "../components/games/MetalSlugGame";
import MinesGame from "../components/games/MinesGame";
import MortalKombatGame from "../components/games/MortalKombatGame";
import PacManGame from "../components/games/PacManGame";
import PaiGowPokerGame from "../components/games/PaiGowPokerGame";
import PenaltyShootoutGame from "../components/games/PenaltyShootoutGame";
import PinballGame from "../components/games/PinballGame";
import PlinkoGame from "../components/games/PlinkoGame";
import PuzzleBobbleGame from "../components/games/PuzzleBobbleGame";
import QbertGame from "../components/games/QbertGame";
import RouletteGame from "../components/games/RouletteGame";
import ScratchCardsGame from "../components/games/ScratchCardsGame";
import SicBoGame from "../components/games/SicBoGame";
import SkeeBallGame from "../components/games/SkeeBallGame";
import SlotsGame from "../components/games/SlotsGame";
import SnakeGame from "../components/games/SnakeGame";
import SpaceShooterGame from "../components/games/SpaceShooterGame";
import StreetFighterGame from "../components/games/StreetFighterGame";
import TetrisGame from "../components/games/TetrisGame";
import ThreeCardPokerGame from "../components/games/ThreeCardPokerGame";
import TimeCrisisGame from "../components/games/TimeCrisisGame";
import TrackAndFieldGame from "../components/games/TrackAndFieldGame";
import TronGame from "../components/games/TronGame";
import VideoPokerGame from "../components/games/VideoPokerGame";
import WarGame from "../components/games/WarGame";
import WhackAMoleGame from "../components/games/WhackAMoleGame";
import WheelOfFortuneGame from "../components/games/WheelOfFortuneGame";
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
  [GameType.snake]: {
    label: "Snake",
    emoji: "🐍",
    description: "Classic Snake!",
    rules:
      "Eat food to grow. Score 5=1.5x, 10=2x, 20=3x. Don't hit walls or yourself!",
    color: "oklch(0.68 0.22 150)",
  },
  [GameType.spaceShooter]: {
    label: "Space Shooter",
    emoji: "🚀",
    description: "Shoot aliens to win!",
    rules:
      "Destroy all alien waves to win 2x your bet. Arrow keys + Space to shoot.",
    color: "oklch(0.62 0.22 240)",
  },
  [GameType.breakout]: {
    label: "Breakout",
    emoji: "🧱",
    description: "Break all the bricks!",
    rules:
      "Break all 40 bricks to win 2x. Mouse/touch or arrow keys to move paddle.",
    color: "oklch(0.78 0.18 72)",
  },
  [GameType.pacmanStyle]: {
    label: "Pac-Man",
    emoji: "👾",
    description: "Eat all the dots!",
    rules: "Eat every dot to win 2x. Avoid ghosts! Arrow keys or WASD to move.",
    color: "oklch(0.65 0.28 340)",
  },
  [GameType.whackAMole]: {
    label: "Whack-a-Mole",
    emoji: "🔨",
    description: "Whack those moles!",
    rules: "Whack 8+ moles in 30 seconds to win 2x. Click/tap fast!",
    color: "oklch(0.60 0.24 20)",
  },
  [GameType.tetris]: {
    label: "Tetris",
    emoji: "🟦",
    description: "Stack the blocks!",
    rules: "Score 50=1.5x, 100=2x, 200=3x. Don't let blocks reach the top!",
    color: "oklch(0.62 0.22 240)",
  },
  [GameType.galaga]: {
    label: "Galaga",
    emoji: "🛸",
    description: "Destroy the alien fleet!",
    rules: "Shoot all 20 aliens to win 2x. Arrow keys + Space.",
    color: "oklch(0.65 0.28 30)",
  },
  [GameType.frogger]: {
    label: "Frogger",
    emoji: "🐸",
    description: "Cross safely!",
    rules: "Guide your frog across traffic and river to win 2x.",
    color: "oklch(0.68 0.22 150)",
  },
  [GameType.streetFighter]: {
    label: "Street Fighter",
    emoji: "🥊",
    description: "Fight the CPU!",
    rules: "Defeat the CPU fighter to win 2x. Arrow keys + Z/X to fight.",
    color: "oklch(0.60 0.28 15)",
  },
  [GameType.donkeyKong]: {
    label: "Donkey Kong",
    emoji: "🦍",
    description: "Climb to the top!",
    rules: "Dodge barrels and reach the top to win 2x.",
    color: "oklch(0.65 0.22 55)",
  },
  [GameType.asteroids]: {
    label: "Asteroids",
    emoji: "☄️",
    description: "Blast the asteroids!",
    rules: "Clear 3 waves of asteroids to win 2x. Arrow keys + Space to shoot.",
    color: "oklch(0.72 0.22 180)",
  },
  [GameType.centipede]: {
    label: "Centipede",
    emoji: "🐛",
    description: "Stop the centipede!",
    rules: "Shoot 3 centipede waves to win 2x. Arrow keys + Space.",
    color: "oklch(0.70 0.26 135)",
  },
  [GameType.digDug]: {
    label: "Dig Dug",
    emoji: "⛏️",
    description: "Dig and defeat!",
    rules: "Inflate all enemies to win 2x. Arrow keys to dig, Space to pump.",
    color: "oklch(0.72 0.22 55)",
  },
  [GameType.skeeBall]: {
    label: "Skee-Ball",
    emoji: "🎳",
    description: "Roll for the top ring!",
    rules: "Score 80+ total points across 3 throws to win 2x. Earns points!",
    color: "oklch(0.72 0.22 55)",
  },
  [GameType.pinball]: {
    label: "Pinball",
    emoji: "🕹️",
    description: "Flip and score big!",
    rules: "Score 500+ points before losing 3 balls to win 2x. Earns points!",
    color: "oklch(0.72 0.18 300)",
  },
  [GameType.danceDanceRevolution]: {
    label: "Dance Dance Revolution",
    emoji: "🕺",
    description: "Match the beat!",
    rules:
      "Score 50 pts in 30s to win 2x. Arrow keys on desktop, tap on mobile. Pure skill.",
    color: "oklch(0.65 0.28 330)",
  },
  [GameType.timeCrisis]: {
    label: "Time Crisis",
    emoji: "🔫",
    description: "Shoot to survive!",
    rules:
      "Eliminate 8 enemies before time runs out to win 2x. Click/tap to shoot.",
    color: "oklch(0.58 0.28 25)",
  },
  [GameType.duckHunt]: {
    label: "Duck Hunt",
    emoji: "🦆",
    description: "Fire away!",
    rules: "Hit 6 of 9 ducks across 3 rounds to win 2x. Click/tap to shoot.",
    color: "oklch(0.68 0.22 50)",
  },
  [GameType.airHockey]: {
    label: "Air Hockey",
    emoji: "🏒",
    description: "Goal streak!",
    rules:
      "First to 5 goals wins 2x. Move mouse/finger to control your paddle.",
    color: "oklch(0.65 0.22 220)",
  },
  [GameType.qbert]: {
    label: "Q*bert",
    emoji: "🟠",
    description: "Hop the pyramid!",
    rules:
      "Score 200 pts by coloring all cubes to win 2x. Arrow keys to hop, avoid enemies.",
    color: "oklch(0.68 0.24 55)",
  },
  [GameType.tron]: {
    label: "Tron",
    emoji: "🏍️",
    description: "Light cycle survival!",
    rules:
      "Survive 30 seconds without hitting a wall or your trail to win 2x. Arrow keys to steer. Pure skill.",
    color: "oklch(0.65 0.28 200)",
  },
  [GameType.burgerTime]: {
    label: "Burger Time",
    emoji: "🍔",
    description: "Stack the burger!",
    rules:
      "Complete 1 burger by walking over all 4 ingredients before losing 3 lives to win 2x. Arrow keys to move. Pure skill.",
    color: "oklch(0.68 0.24 55)",
  },
  [GameType.metalSlug]: {
    label: "Metal Slug",
    emoji: "🔫",
    description: "Run and gun!",
    rules:
      "Eliminate 10 enemies before time runs out to win 2x. Arrow keys to move, Space to shoot. Pure skill.",
    color: "oklch(0.62 0.26 25)",
  },
  [GameType.bomberman]: {
    label: "Bomberman",
    emoji: "💣",
    description: "Bomb the maze!",
    rules:
      "Clear all 3 enemies using bombs to win 2x. Arrow keys to move, Space to place bomb. Avoid your own blast. Pure skill.",
    color: "oklch(0.68 0.22 280)",
  },
  [GameType.daytonaUSA]: {
    label: "Daytona USA",
    emoji: "🏎️",
    description: "Race to the finish!",
    rules:
      "Hold ↑ to accelerate, ←/→ to steer. Complete 3 laps in 45s to win 2x. Pure skill.",
    color: "oklch(0.70 0.22 55)",
  },
  [GameType.mortalKombat]: {
    label: "Mortal Kombat",
    emoji: "⚔️",
    description: "Finish him!",
    rules:
      "←/→ move, Z=Punch, X=Kick, C=Special, S=Block. Defeat the enemy to win 2x. Pure skill.",
    color: "oklch(0.55 0.28 25)",
  },
  [GameType.puzzleBobble]: {
    label: "Puzzle Bobble",
    emoji: "🫧",
    description: "Pop all the bubbles!",
    rules:
      "Aim with ←/→, fire with Space. Match 3+ same color to clear. Empty the board to win 2x. Pure skill.",
    color: "oklch(0.70 0.22 320)",
  },
  [GameType.houseOfTheDead]: {
    label: "House of the Dead",
    emoji: "🧟",
    description: "Shoot the zombies!",
    rules:
      "Click/tap to shoot zombies. Kill 15 zombies in 30s to win 2x. R to reload. Pure skill.",
    color: "oklch(0.58 0.22 145)",
  },
  [GameType.kungFuMaster]: {
    label: "Kung Fu Master",
    emoji: "🥋",
    description: "Hi-Ya!",
    rules:
      "←/→ move, Z=Punch, X=Kick, ↓=Crouch. Score 500 points to win 2x. Pure skill.",
    color: "oklch(0.65 0.22 75)",
  },
  [GameType.trackAndField]: {
    label: "Track & Field",
    emoji: "🏃",
    description: "Sprint to victory!",
    rules:
      "Run 100m by rapidly alternating A and D keys (or Left/Right arrows). Beat 12 seconds to win 2x. Pure skill.",
    color: "oklch(0.70 0.22 130)",
  },
};

const FEATURED_GAMES = new Set([
  GameType.blackjack,
  GameType.roulette,
  GameType.slots,
  GameType.videoPoker,
  GameType.baccarat,
  GameType.craps,
  GameType.dice,
  GameType.war,
  GameType.wheelOfFortune,
  GameType.scratchCards,
  GameType.keno,
  GameType.threeCardPoker,
  GameType.paiGowPoker,
  GameType.sicBo,
  GameType.caribbeanStud,
  GameType.letItRide,
  GameType.casinoHoldem,
  GameType.coinPusher,
  GameType.plinko,
  GameType.crashGame,
  GameType.mines,
  GameType.limbo,
  GameType.hiLo,
  GameType.penaltyShootout,
  GameType.ballDrop,
  GameType.snake,
  GameType.spaceShooter,
  GameType.breakout,
  GameType.pacmanStyle,
  GameType.whackAMole,
  GameType.tetris,
  GameType.galaga,
  GameType.frogger,
  GameType.streetFighter,
  GameType.donkeyKong,
  GameType.asteroids,
  GameType.centipede,
  GameType.digDug,
  GameType.skeeBall,
  GameType.pinball,
  GameType.danceDanceRevolution,
  GameType.timeCrisis,
  GameType.duckHunt,
  GameType.airHockey,
  GameType.qbert,
  GameType.tron,
  GameType.burgerTime,
  GameType.metalSlug,
  GameType.bomberman,
  GameType.trackAndField,
  GameType.daytonaUSA,
  GameType.mortalKombat,
  GameType.puzzleBobble,
  GameType.houseOfTheDead,
  GameType.kungFuMaster,
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
          {gameType === GameType.baccarat && (
            <BaccaratGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.craps && (
            <CrapsGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.dice && (
            <DiceGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.war && (
            <WarGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.wheelOfFortune && (
            <WheelOfFortuneGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.scratchCards && (
            <ScratchCardsGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.keno && (
            <KenoGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.threeCardPoker && (
            <ThreeCardPokerGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.paiGowPoker && (
            <PaiGowPokerGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.sicBo && (
            <SicBoGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.caribbeanStud && (
            <CaribbeanStudGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.letItRide && (
            <LetItRideGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.casinoHoldem && (
            <CasinoHoldemGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.coinPusher && (
            <CoinPusherGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.plinko && (
            <PlinkoGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.crashGame && (
            <CrashGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.mines && (
            <MinesGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.limbo && (
            <LimboGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.hiLo && (
            <HiLoGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.penaltyShootout && (
            <PenaltyShootoutGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.ballDrop && (
            <BallDropGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.snake && (
            <SnakeGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.spaceShooter && (
            <SpaceShooterGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.breakout && (
            <BreakoutGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.pacmanStyle && (
            <PacManGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.whackAMole && (
            <WhackAMoleGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.tetris && (
            <TetrisGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.galaga && (
            <GalagaGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.frogger && (
            <FroggerGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.streetFighter && (
            <StreetFighterGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.donkeyKong && (
            <DonkeyKongGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.asteroids && (
            <AsteroidsGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.centipede && (
            <CentipedeGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.digDug && (
            <DigDugGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.skeeBall && (
            <SkeeBallGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.pinball && (
            <PinballGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.danceDanceRevolution && (
            <DanceDanceRevolutionGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.timeCrisis && (
            <TimeCrisisGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.duckHunt && (
            <DuckHuntGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.airHockey && (
            <AirHockeyGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.qbert && (
            <QbertGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.tron && (
            <TronGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.burgerTime && (
            <BurgerTimeGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.metalSlug && (
            <MetalSlugGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.bomberman && (
            <BombermanGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.trackAndField && (
            <TrackAndFieldGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.daytonaUSA && (
            <DaytonaUSAGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.mortalKombat && (
            <MortalKombatGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.puzzleBobble && (
            <PuzzleBobbleGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.houseOfTheDead && (
            <HouseOfTheDeadGame
              balance={balance ?? BigInt(0)}
              onGameComplete={onGameComplete}
            />
          )}
          {gameType === GameType.kungFuMaster && (
            <KungFuMasterGame
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
