import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Clock,
  Gamepad2,
  Loader2,
  Plus,
  Send,
  Swords,
  Trophy,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { GameType } from "../backend.d";
import {
  useCancelGameChallenge,
  useGetPendingChallenges,
  useGetSentChallenges,
  useRespondGameChallenge,
  useSendGameChallenge,
} from "../hooks/useChallenges";
import { useGetFriends } from "../hooks/useFriends";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { Match, MatchType } from "../hooks/useMultiplayer";
import {
  unwrapOption,
  useCancelMatch,
  useCreateMatch,
  useForfeitMatch,
  useGetMatch,
  useGetMyMatches,
  useGetOpenMatches,
  useGetUserRank,
  useJoinMatch,
  useSubmitArcadeScore,
  useSubmitTurn,
} from "../hooks/useMultiplayer";

const GAME_LABELS: Record<string, string> = {
  blackjack: "Blackjack",
  roulette: "Roulette",
  slots: "Slots",
  videoPoker: "Video Poker",
  baccarat: "Baccarat",
  craps: "Craps",
  dice: "Dice",
  keno: "Keno",
  war: "War",
  wheelOfFortune: "Wheel of Fortune",
  scratchCards: "Scratch Cards",
  threeCardPoker: "Three Card Poker",
  paiGowPoker: "Pai Gow Poker",
  sicBo: "Sic Bo",
  caribbeanStud: "Caribbean Stud",
  letItRide: "Let It Ride",
  casinoHoldem: "Casino Hold'em",
  plinko: "Plinko",
  crashGame: "Crash Game",
  mines: "Mines",
  limbo: "Limbo",
  hiLo: "Hi-Lo",
  penaltyShootout: "Penalty Shootout",
  ballDrop: "Ball Drop",
  coinPusher: "Coin Pusher",
  snake: "Snake",
  spaceShooter: "Space Shooter",
  breakout: "Breakout",
  pacmanStyle: "Pac-Man Style",
  whackAMole: "Whack-a-Mole",
};

const ARCADE_GAMES = new Set([
  "plinko",
  "crashGame",
  "mines",
  "limbo",
  "hiLo",
  "penaltyShootout",
  "ballDrop",
  "coinPusher",
  "snake",
  "spaceShooter",
  "breakout",
  "pacmanStyle",
  "whackAMole",
]);

const RANK_COLORS: Record<string, { color: string; glow: string }> = {
  Bronze: { color: "oklch(0.65 0.18 50)", glow: "oklch(0.65 0.18 50 / 0.5)" },
  Silver: { color: "oklch(0.75 0.05 270)", glow: "oklch(0.75 0.05 270 / 0.5)" },
  Gold: { color: "oklch(0.78 0.18 72)", glow: "oklch(0.78 0.18 72 / 0.5)" },
  Platinum: {
    color: "oklch(0.65 0.15 230)",
    glow: "oklch(0.65 0.15 230 / 0.5)",
  },
  Diamond: {
    color: "oklch(0.70 0.20 190)",
    glow: "oklch(0.70 0.20 190 / 0.5)",
  },
};

function RankBadge({ rank }: { rank: string }) {
  const colors = RANK_COLORS[rank] ?? RANK_COLORS.Bronze;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black tracking-widest"
      style={{
        background: `${colors.color}20`,
        border: `1px solid ${colors.color}`,
        color: colors.color,
        boxShadow: `0 0 8px ${colors.glow}`,
      }}
    >
      <Trophy className="w-3 h-3" />
      {rank.toUpperCase()}
    </span>
  );
}

function CountdownTimer({ lastActionAt }: { lastActionAt: bigint }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const lastMs = Number(lastActionAt) / 1_000_000;
      const deadline = lastMs + 3 * 60 * 60 * 1000;
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setRemaining("EXPIRED");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastActionAt]);

  const isExpired = remaining === "EXPIRED";
  return (
    <span
      className="flex items-center gap-1 text-xs font-mono font-bold"
      style={{
        color: isExpired ? "oklch(0.65 0.28 340)" : "oklch(0.70 0.20 190)",
      }}
    >
      <Clock className="w-3 h-3" />
      {remaining}
    </span>
  );
}

function MatchCard({
  match,
  currentPrincipal,
  onPlay,
  onCancel,
  onForfeit,
}: {
  match: Match;
  currentPrincipal: string;
  onPlay: (m: Match) => void;
  onCancel: (id: string) => void;
  onForfeit: (id: string) => void;
}) {
  const isPlayer1 = match.player1.toString() === currentPrincipal;
  const isWaiting = match.status === "waiting";
  const isActive = match.status === "active";
  const isCompleted =
    match.status === "completed" || match.status === "abandoned";
  const opponentName = unwrapOption(match.opponentUsername);
  const winner = unwrapOption(match.winner);
  const p1Score = unwrapOption(match.player1Score);
  const p2Score = unwrapOption(match.player2Score);
  const turnPlayer = unwrapOption(match.turnPlayer);
  const isMyTurn = turnPlayer?.toString() === currentPrincipal;
  const isArcade = ARCADE_GAMES.has(match.gameType);

  const matchTypeColor =
    {
      ranked: "oklch(0.78 0.18 72)",
      unranked: "oklch(0.70 0.20 190)",
      challenge: "oklch(0.65 0.28 340)",
    }[match.matchType] ?? "oklch(0.55 0.25 290)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "oklch(0.13 0.02 280)",
        border: `1px solid ${matchTypeColor}40`,
        boxShadow: `0 0 12px ${matchTypeColor}20`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-black text-sm tracking-wider"
              style={{ color: "oklch(0.92 0.02 280)" }}
            >
              {GAME_LABELS[match.gameType] ?? match.gameType}
            </span>
            <span
              className="text-xs font-black tracking-widest px-2 py-0.5 rounded-full"
              style={{
                background: `${matchTypeColor}20`,
                color: matchTypeColor,
                border: `1px solid ${matchTypeColor}60`,
              }}
            >
              {match.matchType.toUpperCase()}
            </span>
            {isArcade && (
              <span
                className="text-xs font-black tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.55 0.25 290 / 0.2)",
                  color: "oklch(0.55 0.25 290)",
                  border: "1px solid oklch(0.55 0.25 290 / 0.5)",
                }}
              >
                ARCADE
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Bet:{" "}
            <span className="text-gold font-black">
              {match.bet.toString()} credits
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isActive && isMyTurn && !isArcade && (
            <span
              className="text-xs font-black tracking-widest px-2 py-1 rounded-full animate-pulse"
              style={{
                background: "oklch(0.65 0.28 340 / 0.2)",
                color: "oklch(0.65 0.28 340)",
                border: "1px solid oklch(0.65 0.28 340)",
              }}
            >
              YOUR TURN
            </span>
          )}
          {isActive && isArcade && (
            <span
              className="text-xs font-black tracking-widest px-2 py-1 rounded-full"
              style={{
                background: "oklch(0.70 0.20 190 / 0.2)",
                color: "oklch(0.70 0.20 190)",
                border: "1px solid oklch(0.70 0.20 190)",
              }}
            >
              IN PROGRESS
            </span>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>
          {isPlayer1 ? "You" : "Player"}
          {" vs "}
          {isWaiting ? (
            <span className="text-muted-foreground italic">
              Waiting for opponent...
            </span>
          ) : opponentName ? (
            <span style={{ color: "oklch(0.70 0.20 190)" }}>
              {opponentName}
            </span>
          ) : (
            <span className="text-muted-foreground">Opponent</span>
          )}
        </span>
      </div>

      {/* Scores (completed) */}
      {isCompleted && (p1Score !== null || p2Score !== null) && (
        <div className="flex items-center gap-4 text-xs">
          <span>
            You:{" "}
            <span
              className="font-black"
              style={{ color: "oklch(0.78 0.18 72)" }}
            >
              {isPlayer1
                ? (p1Score?.toString() ?? "—")
                : (p2Score?.toString() ?? "—")}
            </span>
          </span>
          <span>
            Opp:{" "}
            <span
              className="font-black"
              style={{ color: "oklch(0.55 0.25 290)" }}
            >
              {isPlayer1
                ? (p2Score?.toString() ?? "—")
                : (p1Score?.toString() ?? "—")}
            </span>
          </span>
        </div>
      )}

      {/* Winner */}
      {isCompleted && winner && (
        <div
          className="text-xs font-black tracking-wider px-3 py-1.5 rounded-lg text-center"
          style={{
            background:
              winner.toString() === currentPrincipal
                ? "oklch(0.70 0.20 190 / 0.15)"
                : "oklch(0.65 0.28 340 / 0.15)",
            color:
              winner.toString() === currentPrincipal
                ? "oklch(0.70 0.20 190)"
                : "oklch(0.65 0.28 340)",
            border: `1px solid ${winner.toString() === currentPrincipal ? "oklch(0.70 0.20 190 / 0.5)" : "oklch(0.65 0.28 340 / 0.5)"}`,
          }}
        >
          {winner.toString() === currentPrincipal
            ? "🏆 YOU WON!"
            : "💀 YOU LOST"}
        </div>
      )}

      {/* Timer */}
      {(isActive || isWaiting) && (
        <CountdownTimer lastActionAt={match.lastActionAt} />
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {isActive && (
          <Button
            size="sm"
            className="font-black text-xs tracking-wider flex-1"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.25 290), oklch(0.65 0.28 340))",
              boxShadow: "0 0 12px oklch(0.55 0.25 290 / 0.4)",
              color: "#fff",
              border: "none",
            }}
            onClick={() => onPlay(match)}
            data-ocid="multiplayer.match.button"
          >
            <Swords className="w-3.5 h-3.5 mr-1" />
            PLAY
          </Button>
        )}
        {isWaiting && isPlayer1 && (
          <Button
            size="sm"
            variant="ghost"
            className="font-black text-xs text-muted-foreground flex-1"
            onClick={() => onCancel(match.id)}
            data-ocid="multiplayer.match.cancel_button"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            CANCEL
          </Button>
        )}
        {isActive && (
          <Button
            size="sm"
            variant="ghost"
            className="font-black text-xs"
            style={{ color: "oklch(0.65 0.28 340 / 0.7)" }}
            onClick={() => onForfeit(match.id)}
            data-ocid="multiplayer.match.delete_button"
          >
            FORFEIT
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function MatchDetailModal({
  match,
  currentPrincipal,
  onClose,
}: {
  match: Match;
  currentPrincipal: string;
  onClose: () => void;
}) {
  const isArcade = ARCADE_GAMES.has(match.gameType);
  const isPlayer1 = match.player1.toString() === currentPrincipal;
  const p1Score = unwrapOption(match.player1Score);
  const p2Score = unwrapOption(match.player2Score);
  const myScore = isPlayer1 ? p1Score : p2Score;
  const oppScore = isPlayer1 ? p2Score : p1Score;
  const turnPlayer = unwrapOption(match.turnPlayer);
  const isMyTurn = turnPlayer?.toString() === currentPrincipal;
  const winner = unwrapOption(match.winner);

  const [arcadeScore, setArcadeScore] = useState("");
  const [casinoAction, setCasinoAction] = useState("");

  const { mutateAsync: submitArcadeScore, isPending: submittingArcade } =
    useSubmitArcadeScore();
  const { mutateAsync: submitTurn, isPending: submittingTurn } =
    useSubmitTurn();

  const handleArcadeSubmit = async () => {
    const score = Number.parseInt(arcadeScore);
    if (Number.isNaN(score) || score < 0) {
      toast.error("Enter a valid score");
      return;
    }
    try {
      await submitArcadeScore({ matchId: match.id, score: BigInt(score) });
      toast.success("Score submitted!");
    } catch {
      toast.error("Failed to submit score");
    }
  };

  const handleCasinoAction = async (isComplete: boolean) => {
    try {
      await submitTurn({
        matchId: match.id,
        gameState: casinoAction || "{}",
        isComplete,
        callerScore: null,
      });
      toast.success(isComplete ? "Turn submitted!" : "Action taken!");
      setCasinoAction("");
    } catch {
      toast.error("Failed to submit turn");
    }
  };

  const isCompleted =
    match.status === "completed" || match.status === "abandoned";

  return (
    <div
      className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
      data-ocid="multiplayer.match.modal"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="font-black text-lg tracking-wider"
            style={{ color: "oklch(0.92 0.02 280)" }}
          >
            {GAME_LABELS[match.gameType] ?? match.gameType}
          </h3>
          <div className="text-xs text-muted-foreground">
            Bet:{" "}
            <span className="text-gold font-black">
              {match.bet.toString()} credits
            </span>
          </div>
        </div>
        <CountdownTimer lastActionAt={match.lastActionAt} />
      </div>

      {/* Winner announcement */}
      {isCompleted && winner && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-4 rounded-xl"
          style={{
            background:
              winner.toString() === currentPrincipal
                ? "oklch(0.70 0.20 190 / 0.12)"
                : "oklch(0.65 0.28 340 / 0.12)",
            border: `2px solid ${winner.toString() === currentPrincipal ? "oklch(0.70 0.20 190)" : "oklch(0.65 0.28 340)"}`,
          }}
        >
          <div className="text-2xl mb-1">
            {winner.toString() === currentPrincipal ? "🏆" : "💀"}
          </div>
          <div
            className="font-black text-xl tracking-widest"
            style={{
              color:
                winner.toString() === currentPrincipal
                  ? "oklch(0.70 0.20 190)"
                  : "oklch(0.65 0.28 340)",
            }}
          >
            {winner.toString() === currentPrincipal ? "YOU WON!" : "YOU LOST"}
          </div>
          {(p1Score !== null || p2Score !== null) && (
            <div className="flex justify-center gap-6 mt-3 text-sm">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">YOUR SCORE</div>
                <div
                  className="font-black text-lg"
                  style={{ color: "oklch(0.78 0.18 72)" }}
                >
                  {myScore?.toString() ?? "—"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">OPP SCORE</div>
                <div
                  className="font-black text-lg"
                  style={{ color: "oklch(0.55 0.25 290)" }}
                >
                  {oppScore?.toString() ?? "—"}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* In-progress game */}
      {!isCompleted && (
        <div>
          {isArcade ? (
            <div className="flex flex-col gap-4">
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "oklch(0.10 0.018 280)",
                  border: "1px solid oklch(0.55 0.25 290 / 0.4)",
                }}
              >
                <Gamepad2
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: "oklch(0.55 0.25 290)" }}
                />
                <p
                  className="text-sm font-bold"
                  style={{ color: "oklch(0.85 0.05 280)" }}
                >
                  Play <strong>{GAME_LABELS[match.gameType]}</strong> in solo
                  mode, then submit your score below.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Both players submit their scores — highest score wins!
                </p>
              </div>

              {myScore !== null ? (
                <div
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: "oklch(0.70 0.20 190 / 0.10)",
                    border: "1px solid oklch(0.70 0.20 190 / 0.4)",
                  }}
                >
                  <div className="text-xs text-muted-foreground">
                    YOUR SCORE SUBMITTED
                  </div>
                  <div
                    className="font-black text-2xl"
                    style={{ color: "oklch(0.70 0.20 190)" }}
                  >
                    {myScore.toString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Opponent: {oppScore !== null ? oppScore.toString() : "???"}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-black tracking-wider text-muted-foreground">
                    YOUR FINAL SCORE
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Enter your score..."
                    value={arcadeScore}
                    onChange={(e) => setArcadeScore(e.target.value)}
                    className="bg-background border-border text-foreground"
                    data-ocid="multiplayer.score.input"
                  />
                  <Button
                    onClick={handleArcadeSubmit}
                    disabled={submittingArcade || !arcadeScore}
                    className="font-black tracking-wider"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.55 0.25 290), oklch(0.70 0.20 190))",
                      color: "#fff",
                      border: "none",
                      boxShadow: "0 0 12px oklch(0.55 0.25 290 / 0.4)",
                    }}
                    data-ocid="multiplayer.score.submit_button"
                  >
                    {submittingArcade ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    SUBMIT SCORE
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {!isMyTurn ? (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "oklch(0.10 0.018 280)",
                    border: "1px solid oklch(0.55 0.25 290 / 0.3)",
                  }}
                >
                  <p className="text-sm text-muted-foreground">
                    Waiting for opponent's turn...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only you can see your own cards (blind mode)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: "oklch(0.65 0.28 340 / 0.08)",
                      border: "1px solid oklch(0.65 0.28 340 / 0.4)",
                    }}
                  >
                    <p
                      className="text-xs font-black tracking-wider"
                      style={{ color: "oklch(0.65 0.28 340)" }}
                    >
                      YOUR TURN
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submit your action to proceed. Cards are blind — opponent
                      can't see your hand.
                    </p>
                  </div>
                  <Label className="text-xs font-black tracking-wider text-muted-foreground">
                    GAME ACTION / MOVE
                  </Label>
                  <Input
                    placeholder='e.g. "hit", "stand", "fold", "call 50"'
                    value={casinoAction}
                    onChange={(e) => setCasinoAction(e.target.value)}
                    className="bg-background border-border text-foreground"
                    data-ocid="multiplayer.action.input"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCasinoAction(false)}
                      disabled={submittingTurn}
                      size="sm"
                      className="flex-1 font-black text-xs"
                      style={{
                        background: "oklch(0.55 0.25 290 / 0.2)",
                        border: "1px solid oklch(0.55 0.25 290)",
                        color: "oklch(0.55 0.25 290)",
                      }}
                      data-ocid="multiplayer.action.button"
                    >
                      TAKE ACTION
                    </Button>
                    <Button
                      onClick={() => handleCasinoAction(true)}
                      disabled={submittingTurn}
                      size="sm"
                      className="flex-1 font-black text-xs"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                        color: "#fff",
                        border: "none",
                        boxShadow: "0 0 10px oklch(0.65 0.28 340 / 0.4)",
                      }}
                      data-ocid="multiplayer.action.submit_button"
                    >
                      {submittingTurn ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : null}
                      COMPLETE TURN
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        onClick={onClose}
        className="text-muted-foreground text-xs font-bold"
        data-ocid="multiplayer.match.close_button"
      >
        CLOSE
      </Button>
    </div>
  );
}

function ChallengeFriendsList({
  gameType,
  bet,
  onSuccess,
}: {
  gameType: string;
  bet: string;
  onSuccess: () => void;
}) {
  const { data: friends = [], isLoading } = useGetFriends();
  const { mutateAsync: sendChallenge } = useSendGameChallenge();
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const handleChallenge = async (username: string) => {
    if (!gameType) {
      toast.error("Select a game first");
      return;
    }
    const betNum = Number.parseInt(bet);
    if (Number.isNaN(betNum) || betNum < 1) {
      toast.error("Enter a valid bet first");
      return;
    }
    setSendingTo(username);
    try {
      await sendChallenge({
        toUsername: username,
        gameType: gameType as GameType,
        bet: BigInt(betNum),
      });
      toast.success(`🎯 Challenge sent to @${username}!`);
      onSuccess();
    } catch {
      toast.error("Failed to send challenge");
    } finally {
      setSendingTo(null);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex justify-center py-6"
        data-ocid="challenge.friends.loading_state"
      >
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "oklch(0.65 0.28 340)" }}
        />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div
        className="text-center py-6 rounded-xl"
        style={{
          background: "oklch(0.11 0.02 280)",
          border: "1px solid oklch(0.65 0.28 340 / 0.2)",
        }}
        data-ocid="challenge.friends.empty_state"
      >
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-bold text-muted-foreground">
          No friends yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Add friends from your profile page to challenge them!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-black tracking-wider text-muted-foreground">
        CHALLENGE A FRIEND
      </Label>
      <ScrollArea className="max-h-48">
        <div className="flex flex-col gap-2 pr-2">
          {friends.map((friend, i) => (
            <div
              key={friend.principal.toString()}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
              style={{
                background: "oklch(0.12 0.02 280)",
                border: "1px solid oklch(0.65 0.28 340 / 0.25)",
              }}
              data-ocid={`challenge.friends.item.${i + 1}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                    color: "#fff",
                  }}
                >
                  {friend.username.charAt(0).toUpperCase()}
                </div>
                <span
                  className="text-sm font-black truncate"
                  style={{ color: "oklch(0.85 0.05 280)" }}
                >
                  @{friend.username}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => handleChallenge(friend.username)}
                disabled={sendingTo === friend.username}
                className="text-xs font-black tracking-widest shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 0 8px oklch(0.65 0.28 340 / 0.4)",
                }}
                data-ocid={`challenge.friends.button.${i + 1}`}
              >
                {sendingTo === friend.username ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    CHALLENGE
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function CreateMatchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [gameType, setGameType] = useState("");
  const [bet, setBet] = useState("10");
  const [matchType, setMatchType] = useState<MatchType>("unranked");
  const { mutateAsync: createMatch, isPending } = useCreateMatch();

  const handleCreate = async () => {
    if (!gameType) {
      toast.error("Select a game");
      return;
    }
    const betNum = Number.parseInt(bet);
    if (Number.isNaN(betNum) || betNum < 1) {
      toast.error("Enter a valid bet");
      return;
    }
    try {
      await createMatch({
        gameType,
        bet: BigInt(betNum),
        matchType,
        opponentUsername: null,
      });
      toast.success("Match created!");
      onClose();
    } catch {
      toast.error("Failed to create match");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md"
        style={{
          background: "oklch(0.10 0.018 280)",
          border: "1px solid oklch(0.65 0.28 340 / 0.5)",
          boxShadow: "0 0 40px oklch(0.65 0.28 340 / 0.2)",
        }}
        data-ocid="multiplayer.create.modal"
      >
        <DialogHeader>
          <DialogTitle
            className="font-black tracking-widest text-lg"
            style={{ color: "oklch(0.92 0.02 280)" }}
          >
            ⚔️ CREATE MATCH
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Game Selector */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-black tracking-wider text-muted-foreground">
              SELECT GAME
            </Label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger
                className="bg-background border-border"
                data-ocid="multiplayer.game.select"
              >
                <SelectValue placeholder="Choose a game..." />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "oklch(0.12 0.02 280)",
                  border: "1px solid oklch(0.65 0.28 340 / 0.4)",
                }}
              >
                {Object.entries(GAME_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bet */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-black tracking-wider text-muted-foreground">
              BET AMOUNT (CREDITS)
            </Label>
            <Input
              type="number"
              min={1}
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              className="bg-background border-border text-foreground"
              data-ocid="multiplayer.bet.input"
            />
          </div>

          {/* Match Type */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-black tracking-wider text-muted-foreground">
              MATCH TYPE
            </Label>
            <div className="flex gap-2">
              {(["ranked", "unranked", "challenge"] as MatchType[]).map(
                (type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setMatchType(type)}
                    className="flex-1 py-2 rounded-lg text-xs font-black tracking-widest transition-all"
                    style={
                      matchType === type
                        ? {
                            background:
                              type === "ranked"
                                ? "oklch(0.78 0.18 72 / 0.2)"
                                : type === "unranked"
                                  ? "oklch(0.70 0.20 190 / 0.2)"
                                  : "oklch(0.65 0.28 340 / 0.2)",
                            border: `2px solid ${type === "ranked" ? "oklch(0.78 0.18 72)" : type === "unranked" ? "oklch(0.70 0.20 190)" : "oklch(0.65 0.28 340)"}`,
                            color:
                              type === "ranked"
                                ? "oklch(0.78 0.18 72)"
                                : type === "unranked"
                                  ? "oklch(0.70 0.20 190)"
                                  : "oklch(0.65 0.28 340)",
                          }
                        : {
                            border: `2px solid ${type === "ranked" ? "oklch(0.78 0.18 72 / 0.3)" : type === "unranked" ? "oklch(0.70 0.20 190 / 0.3)" : "oklch(0.65 0.28 340 / 0.3)"}`,
                            color: "oklch(0.55 0.05 280)",
                          }
                    }
                    data-ocid={`multiplayer.${type}.toggle`}
                  >
                    {type === "ranked"
                      ? "🏆 RANKED"
                      : type === "unranked"
                        ? "⚡ UNRANKED"
                        : "🎯 CHALLENGE"}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Challenge friends list */}
          {matchType === "challenge" ? (
            <ChallengeFriendsList
              gameType={gameType}
              bet={bet}
              onSuccess={onClose}
            />
          ) : (
            <Button
              onClick={handleCreate}
              disabled={isPending}
              className="font-black tracking-widest text-sm"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                boxShadow: "0 0 20px oklch(0.65 0.28 340 / 0.4)",
                color: "#fff",
                border: "none",
              }}
              data-ocid="multiplayer.create.submit_button"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              CREATE MATCH
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChallengesPanel() {
  const navigate = useNavigate();
  const { data: incoming = [], isLoading: loadingIn } =
    useGetPendingChallenges();
  const { data: sent = [], isLoading: loadingSent } = useGetSentChallenges();
  const { mutateAsync: respond } = useRespondGameChallenge();
  const { mutateAsync: cancelChallenge } = useCancelGameChallenge();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleRespond = async (
    challengeId: string,
    accept: boolean,
    gameType: string,
  ) => {
    setRespondingId(challengeId);
    try {
      await respond({ challengeId, accept });
      if (accept) {
        toast.success("✅ Challenge accepted! Starting game...");
        navigate({ to: `/game/${gameType}` });
      } else {
        toast.success("Challenge declined");
      }
    } catch {
      toast.error("Failed to respond to challenge");
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancel = async (challengeId: string) => {
    setCancelingId(challengeId);
    try {
      await cancelChallenge(challengeId);
      toast.success("Challenge cancelled");
    } catch {
      toast.error("Failed to cancel challenge");
    } finally {
      setCancelingId(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === "Accepted") return "oklch(0.65 0.25 145)";
    if (status === "Declined") return "oklch(0.65 0.28 340)";
    if (status === "Expired") return "oklch(0.55 0.05 280)";
    return "oklch(0.78 0.18 72)";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Incoming challenges */}
      <div>
        <h3
          className="font-black text-sm tracking-widest mb-3 flex items-center gap-2"
          style={{ color: "oklch(0.65 0.28 340)" }}
        >
          <Bell className="w-4 h-4" />
          INCOMING CHALLENGES
          {incoming.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-black text-white"
              style={{ background: "oklch(0.65 0.28 340)" }}
            >
              {incoming.length}
            </span>
          )}
        </h3>
        {loadingIn ? (
          <div
            className="flex justify-center py-6"
            data-ocid="challenge.incoming.loading_state"
          >
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: "oklch(0.65 0.28 340)" }}
            />
          </div>
        ) : incoming.length === 0 ? (
          <div
            className="text-center py-8 rounded-xl"
            style={{
              background: "oklch(0.11 0.02 280)",
              border: "1px solid oklch(0.65 0.28 340 / 0.15)",
            }}
            data-ocid="challenge.incoming.empty_state"
          >
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">
              No incoming challenges
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {incoming.map((challenge, i) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    background: "oklch(0.13 0.02 280)",
                    border: "1px solid oklch(0.65 0.28 340 / 0.35)",
                    boxShadow: "0 0 12px oklch(0.65 0.28 340 / 0.1)",
                  }}
                  data-ocid={`challenge.incoming.item.${i + 1}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <UserCheck
                        className="w-4 h-4"
                        style={{ color: "oklch(0.65 0.28 340)" }}
                      />
                      <span
                        className="font-black text-sm"
                        style={{ color: "oklch(0.92 0.02 280)" }}
                      >
                        {GAME_LABELS[challenge.gameType] ?? challenge.gameType}
                      </span>
                      <span
                        className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{
                          background: "oklch(0.65 0.28 340 / 0.15)",
                          color: "oklch(0.65 0.28 340)",
                          border: "1px solid oklch(0.65 0.28 340 / 0.4)",
                        }}
                      >
                        CHALLENGE
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bet:{" "}
                      <span className="text-gold font-black">
                        {challenge.bet.toString()} credits
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleRespond(challenge.id, false, challenge.gameType)
                      }
                      disabled={respondingId === challenge.id}
                      variant="outline"
                      className="text-xs font-black tracking-wider border-red-500/40 text-red-400 hover:bg-red-500/10"
                      data-ocid={`challenge.incoming.decline_button.${i + 1}`}
                    >
                      {respondingId === challenge.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          DECLINE
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleRespond(challenge.id, true, challenge.gameType)
                      }
                      disabled={respondingId === challenge.id}
                      className="text-xs font-black tracking-wider"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.65 0.25 145), oklch(0.55 0.22 150))",
                        color: "#fff",
                        border: "none",
                        boxShadow: "0 0 10px oklch(0.65 0.25 145 / 0.4)",
                      }}
                      data-ocid={`challenge.incoming.accept_button.${i + 1}`}
                    >
                      {respondingId === challenge.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Swords className="w-3 h-3 mr-1" />
                          ACCEPT
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sent challenges */}
      <div>
        <h3
          className="font-black text-sm tracking-widest mb-3 flex items-center gap-2"
          style={{ color: "oklch(0.70 0.20 190)" }}
        >
          <Send className="w-4 h-4" />
          SENT CHALLENGES
        </h3>
        {loadingSent ? (
          <div
            className="flex justify-center py-6"
            data-ocid="challenge.sent.loading_state"
          >
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: "oklch(0.70 0.20 190)" }}
            />
          </div>
        ) : sent.length === 0 ? (
          <div
            className="text-center py-8 rounded-xl"
            style={{
              background: "oklch(0.11 0.02 280)",
              border: "1px solid oklch(0.70 0.20 190 / 0.15)",
            }}
            data-ocid="challenge.sent.empty_state"
          >
            <Send className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">No sent challenges</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sent.map((challenge, i) => (
              <div
                key={challenge.id}
                className="rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  background: "oklch(0.13 0.02 280)",
                  border: "1px solid oklch(0.70 0.20 190 / 0.3)",
                }}
                data-ocid={`challenge.sent.item.${i + 1}`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-black text-sm"
                      style={{ color: "oklch(0.92 0.02 280)" }}
                    >
                      {GAME_LABELS[challenge.gameType] ?? challenge.gameType}
                    </span>
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: `${statusColor(challenge.status)}20`,
                        color: statusColor(challenge.status),
                        border: `1px solid ${statusColor(challenge.status)}60`,
                      }}
                    >
                      {challenge.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Bet:{" "}
                    <span className="text-gold font-black">
                      {challenge.bet.toString()} credits
                    </span>
                  </div>
                </div>
                {challenge.status === "Pending" && (
                  <Button
                    size="sm"
                    onClick={() => handleCancel(challenge.id)}
                    disabled={cancelingId === challenge.id}
                    variant="outline"
                    className="text-xs font-black tracking-wider shrink-0"
                    style={{
                      borderColor: "oklch(0.55 0.05 280 / 0.5)",
                      color: "oklch(0.55 0.15 280)",
                    }}
                    data-ocid={`challenge.sent.cancel_button.${i + 1}`}
                  >
                    {cancelingId === challenge.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        CANCEL
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MultiplayerPage() {
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toString() ?? "";

  const { data: openMatches = [], isLoading: loadingOpen } =
    useGetOpenMatches();
  const { data: myMatches = [], isLoading: loadingMy } = useGetMyMatches();
  const { data: userRank = "Bronze" } = useGetUserRank();
  const { data: pendingChallenges = [] } = useGetPendingChallenges();
  const pendingChallengeCount = pendingChallenges.length;

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const { data: detailMatch } = useGetMatch(activeDetailId);

  const { mutateAsync: joinMatch, isPending: joining } = useJoinMatch();
  const { mutateAsync: cancelMatch } = useCancelMatch();
  const { mutateAsync: forfeitMatch } = useForfeitMatch();

  const activeMatches = myMatches.filter(
    (m) => m.status === "active" || m.status === "waiting",
  );
  const historyMatches = myMatches.filter(
    (m) => m.status === "completed" || m.status === "abandoned",
  );

  const handleJoin = async (id: string) => {
    try {
      await joinMatch(id);
      toast.success("Joined match!");
    } catch {
      toast.error("Failed to join match");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelMatch(id);
      toast.success("Match cancelled");
    } catch {
      toast.error("Failed to cancel match");
    }
  };

  const handleForfeit = async (id: string) => {
    try {
      await forfeitMatch(id);
      toast.success("Match forfeited");
    } catch {
      toast.error("Failed to forfeit");
    }
  };

  const handlePlay = (match: Match) => {
    setActiveDetailId(match.id);
    setSelectedMatch(match);
  };

  const displayMatch = detailMatch ?? selectedMatch;

  return (
    <div
      className="min-h-screen pb-8"
      style={{ background: "oklch(0.08 0.015 280)" }}
    >
      {/* Hero */}
      <div
        className="relative px-4 pt-8 pb-6 md:px-8"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.11 0.022 290 / 0.9) 0%, transparent 100%)",
          borderBottom: "1px solid oklch(0.55 0.25 290 / 0.3)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-black text-3xl md:text-4xl tracking-widest"
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290), oklch(0.70 0.20 190))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 12px oklch(0.55 0.25 290 / 0.6))",
                }}
              >
                ⚔️ MULTIPLAYER
              </motion.h1>
              <p className="text-sm text-muted-foreground mt-1">
                Challenge other players — ranked, unranked, or direct challenge.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RankBadge rank={userRank} />
              <Button
                onClick={() => setCreateOpen(true)}
                className="font-black tracking-widest"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                  boxShadow: "0 0 20px oklch(0.65 0.28 340 / 0.5)",
                  color: "#fff",
                  border: "none",
                }}
                data-ocid="multiplayer.create.open_modal_button"
              >
                <Plus className="w-4 h-4 mr-2" />
                CREATE MATCH
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-6">
        <Tabs defaultValue="open" data-ocid="multiplayer.tab">
          <TabsList
            className="w-full mb-6"
            style={{
              background: "oklch(0.11 0.02 280)",
              border: "1px solid oklch(0.55 0.25 290 / 0.3)",
            }}
          >
            <TabsTrigger
              value="open"
              className="flex-1 font-black tracking-wider text-xs"
              data-ocid="multiplayer.open.tab"
            >
              OPEN
              {openMatches.length > 0 && (
                <Badge
                  className="ml-1.5 text-xs"
                  style={{
                    background: "oklch(0.70 0.20 190)",
                    color: "#000",
                    border: "none",
                  }}
                >
                  {openMatches.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="flex-1 font-black tracking-wider text-xs"
              data-ocid="multiplayer.active.tab"
            >
              MY MATCHES
              {activeMatches.length > 0 && (
                <Badge
                  className="ml-1.5 text-xs"
                  style={{
                    background: "oklch(0.65 0.28 340)",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  {activeMatches.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="challenges"
              className="flex-1 font-black tracking-wider text-xs"
              data-ocid="multiplayer.challenges.tab"
            >
              CHALLENGES
              {pendingChallengeCount > 0 && (
                <Badge
                  className="ml-1.5 text-xs"
                  style={{
                    background: "oklch(0.65 0.28 340)",
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 0 6px oklch(0.65 0.28 340 / 0.6)",
                  }}
                >
                  {pendingChallengeCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 font-black tracking-wider text-xs"
              data-ocid="multiplayer.history.tab"
            >
              HISTORY
            </TabsTrigger>
          </TabsList>

          {/* Open Matches */}
          <TabsContent value="open">
            {loadingOpen ? (
              <div
                className="flex justify-center py-12"
                data-ocid="multiplayer.open.loading_state"
              >
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: "oklch(0.55 0.25 290)" }}
                />
              </div>
            ) : openMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
                data-ocid="multiplayer.open.empty_state"
              >
                <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground font-bold">
                  No open matches right now.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create one and wait for a challenger!
                </p>
              </motion.div>
            ) : (
              <div className="grid gap-3">
                <AnimatePresence>
                  {openMatches.map((match, i) => {
                    const isOwn = match.player1.toString() === currentPrincipal;
                    return (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
                        style={{
                          background: "oklch(0.13 0.02 280)",
                          border: "1px solid oklch(0.55 0.25 290 / 0.3)",
                        }}
                        data-ocid={`multiplayer.open.item.${i + 1}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="font-black text-sm"
                              style={{ color: "oklch(0.92 0.02 280)" }}
                            >
                              {GAME_LABELS[match.gameType] ?? match.gameType}
                            </span>
                            <span
                              className="text-xs font-black px-2 py-0.5 rounded-full"
                              style={{
                                background:
                                  match.matchType === "ranked"
                                    ? "oklch(0.78 0.18 72 / 0.15)"
                                    : "oklch(0.70 0.20 190 / 0.15)",
                                color:
                                  match.matchType === "ranked"
                                    ? "oklch(0.78 0.18 72)"
                                    : "oklch(0.70 0.20 190)",
                                border: `1px solid ${match.matchType === "ranked" ? "oklch(0.78 0.18 72 / 0.5)" : "oklch(0.70 0.20 190 / 0.5)"}`,
                              }}
                            >
                              {match.matchType.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Bet:{" "}
                            <span className="text-gold font-black">
                              {match.bet.toString()} credits
                            </span>
                          </div>
                        </div>
                        {!isOwn ? (
                          <Button
                            size="sm"
                            onClick={() => handleJoin(match.id)}
                            disabled={joining}
                            className="font-black text-xs tracking-wider shrink-0"
                            style={{
                              background:
                                "linear-gradient(135deg, oklch(0.70 0.20 190), oklch(0.55 0.25 290))",
                              color: "#fff",
                              border: "none",
                              boxShadow: "0 0 10px oklch(0.70 0.20 190 / 0.4)",
                            }}
                            data-ocid={`multiplayer.join.button.${i + 1}`}
                          >
                            {joining ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Swords className="w-3.5 h-3.5 mr-1" />
                            )}
                            JOIN
                          </Button>
                        ) : (
                          <Badge
                            style={{
                              background: "oklch(0.55 0.25 290 / 0.2)",
                              color: "oklch(0.55 0.25 290)",
                              border: "1px solid oklch(0.55 0.25 290 / 0.5)",
                            }}
                          >
                            YOUR MATCH
                          </Badge>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* My Active Matches */}
          <TabsContent value="active">
            {loadingMy ? (
              <div
                className="flex justify-center py-12"
                data-ocid="multiplayer.active.loading_state"
              >
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: "oklch(0.55 0.25 290)" }}
                />
              </div>
            ) : activeMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
                data-ocid="multiplayer.active.empty_state"
              >
                <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground font-bold">
                  No active matches.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create or join a match to start playing!
                </p>
              </motion.div>
            ) : (
              <div className="grid gap-3">
                <AnimatePresence>
                  {activeMatches.map((match, i) => (
                    <div
                      key={match.id}
                      data-ocid={`multiplayer.active.item.${i + 1}`}
                    >
                      <MatchCard
                        match={match}
                        currentPrincipal={currentPrincipal}
                        onPlay={handlePlay}
                        onCancel={handleCancel}
                        onForfeit={handleForfeit}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            {historyMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
                data-ocid="multiplayer.history.empty_state"
              >
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground font-bold">
                  No completed matches yet.
                </p>
              </motion.div>
            ) : (
              <div className="grid gap-3">
                <AnimatePresence>
                  {historyMatches.map((match, i) => (
                    <div
                      key={match.id}
                      data-ocid={`multiplayer.history.item.${i + 1}`}
                    >
                      <MatchCard
                        match={match}
                        currentPrincipal={currentPrincipal}
                        onPlay={handlePlay}
                        onCancel={handleCancel}
                        onForfeit={handleForfeit}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Challenges */}
          <TabsContent
            value="challenges"
            data-ocid="multiplayer.challenges.panel"
          >
            <ChallengesPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Match Modal */}
      <CreateMatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Match Detail Modal */}
      <Dialog
        open={!!displayMatch && !!activeDetailId}
        onOpenChange={(v) => {
          if (!v) {
            setActiveDetailId(null);
            setSelectedMatch(null);
          }
        }}
      >
        <DialogContent
          className="max-w-lg"
          style={{
            background: "oklch(0.10 0.018 280)",
            border: "1px solid oklch(0.55 0.25 290 / 0.5)",
            boxShadow: "0 0 40px oklch(0.55 0.25 290 / 0.2)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="font-black tracking-widest"
              style={{ color: "oklch(0.92 0.02 280)" }}
            >
              MATCH DETAIL
            </DialogTitle>
          </DialogHeader>
          {displayMatch && (
            <MatchDetailModal
              match={displayMatch}
              currentPrincipal={currentPrincipal}
              onClose={() => {
                setActiveDetailId(null);
                setSelectedMatch(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
