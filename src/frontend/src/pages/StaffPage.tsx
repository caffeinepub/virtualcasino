import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Principal } from "@icp-sdk/core/principal";
import {
  CreditCard,
  Loader2,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { GameSettings } from "../backend.d";
import { GameType, UserRole } from "../backend.d";
import {
  useAddCredits,
  useAssignRole,
  useGetAllGameSettings,
  useGetAllUsers,
  useIsCallerAdmin,
  useSetGameSettings,
} from "../hooks/useQueries";

const GAME_LABELS: Record<string, string> = {
  slots: "🎰 Slots",
  blackjack: "🃏 Blackjack",
  roulette: "🎡 Roulette",
  videoPoker: "🎴 Video Poker",
  dice: "🎲 Dice",
  baccarat: "♠️ Baccarat",
  keno: "🔢 Keno",
  scratchCards: "🎟️ Scratch Cards",
  craps: "🎲 Craps",
  paiGowPoker: "🀄 Pai Gow Poker",
  sicBo: "🎲 Sic Bo",
  war: "⚔️ War",
  caribbeanStud: "🌴 Caribbean Stud",
  letItRide: "🏇 Let It Ride",
  threeCardPoker: "🃏 Three Card Poker",
  casinoHoldem: "♥️ Casino Hold'em",
  wheelOfFortune: "🎡 Wheel of Fortune",
  coinPusher: "🪙 Coin Pusher",
  plinko: "🔵 Plinko",
  crashGame: "📈 Crash Game",
  mines: "💣 Mines",
  limbo: "🌀 Limbo",
  hiLo: "⬆️ Hi-Lo",
  penaltyShootout: "⚽ Penalty Shootout",
  ballDrop: "🏀 Ball Drop",
};

const ALL_GAME_TYPES = Object.values(GameType);

const cardStyle = {
  background: "oklch(0.11 0.015 280)",
  border: "1px solid oklch(0.22 0.03 275)",
};

const neonPinkStyle = { color: "oklch(0.65 0.28 340)" };
const neonPinkBorder = "1px solid oklch(0.65 0.28 340 / 0.4)";

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab() {
  const { mutateAsync: addCredits, isPending: addingCredits } = useAddCredits();
  const { mutateAsync: assignRole, isPending: assigningRole } = useAssignRole();

  const [creditPrincipal, setCreditPrincipal] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [rolePrincipal, setRolePrincipal] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.user);

  const handleAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = Principal.fromText(creditPrincipal.trim());
      const amount = BigInt(Number.parseInt(creditAmount, 10));
      await addCredits({ user, amount });
      toast.success(`Added ${creditAmount} credits to user`);
      setCreditPrincipal("");
      setCreditAmount("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add credits");
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = Principal.fromText(rolePrincipal.trim());
      await assignRole({ user, role: selectedRole });
      toast.success(`Role '${selectedRole}' assigned successfully`);
      setRolePrincipal("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to assign role");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Add Credits */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-gold" />
          <h2 className="font-display font-black tracking-widest text-gold">
            ADD CREDITS
          </h2>
        </div>
        <form onSubmit={handleAddCredits} className="space-y-4">
          <div>
            <Label
              htmlFor="credit-principal"
              className="text-sm text-muted-foreground"
            >
              User Principal ID
            </Label>
            <Input
              id="credit-principal"
              value={creditPrincipal}
              onChange={(e) => setCreditPrincipal(e.target.value)}
              placeholder="e.g. aaaaa-aa"
              className="mt-1 bg-secondary border-border text-foreground font-mono text-xs"
              data-ocid="staff.credit.principal.input"
            />
          </div>
          <div>
            <Label
              htmlFor="credit-amount"
              className="text-sm text-muted-foreground"
            >
              Amount (credits)
            </Label>
            <Input
              id="credit-amount"
              type="number"
              min="1"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="e.g. 100"
              className="mt-1 bg-secondary border-border text-foreground"
              data-ocid="staff.credit.amount.input"
            />
          </div>
          <Button
            type="submit"
            className="w-full font-black border-none"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.18 72), oklch(0.65 0.22 55))",
              boxShadow: "0 0 12px oklch(0.78 0.18 72 / 0.3)",
              color: "#fff",
            }}
            disabled={addingCredits || !creditPrincipal || !creditAmount}
            data-ocid="staff.credit.submit_button"
          >
            {addingCredits ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Add Credits
          </Button>
        </form>
      </div>

      {/* Assign Role */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5" style={neonPinkStyle} />
          <h2
            className="font-display font-black tracking-widest"
            style={neonPinkStyle}
          >
            ASSIGN ROLE
          </h2>
        </div>
        <form onSubmit={handleAssignRole} className="space-y-4">
          <div>
            <Label
              htmlFor="role-principal"
              className="text-sm text-muted-foreground"
            >
              User Principal ID
            </Label>
            <Input
              id="role-principal"
              value={rolePrincipal}
              onChange={(e) => setRolePrincipal(e.target.value)}
              placeholder="e.g. aaaaa-aa"
              className="mt-1 bg-secondary border-border text-foreground font-mono text-xs"
              data-ocid="staff.role.principal.input"
            />
          </div>
          <div>
            <Label
              htmlFor="role-select"
              className="text-sm text-muted-foreground"
            >
              Role
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as UserRole)}
            >
              <SelectTrigger
                id="role-select"
                className="mt-1 bg-secondary border-border"
                data-ocid="staff.role.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "oklch(0.14 0.02 278)",
                  borderColor: "oklch(0.22 0.03 275)",
                }}
              >
                <SelectItem value={UserRole.user}>User</SelectItem>
                <SelectItem value={UserRole.admin}>Admin</SelectItem>
                <SelectItem value={UserRole.guest}>Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            className="w-full font-black border-none"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
              boxShadow: "0 0 12px oklch(0.65 0.28 340 / 0.3)",
              color: "#fff",
            }}
            disabled={assigningRole || !rolePrincipal}
            data-ocid="staff.role.submit_button"
          >
            {assigningRole ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Assign Role
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Game Controls Tab ────────────────────────────────────────────────────────
function GameRow({
  gameType,
  savedSettings,
}: {
  gameType: string;
  savedSettings: GameSettings | null;
}) {
  const { mutateAsync: setSettings, isPending } = useSetGameSettings();
  const [minBet, setMinBet] = useState(
    savedSettings ? savedSettings.minBet.toString() : "1",
  );
  const [maxBet, setMaxBet] = useState(
    savedSettings ? savedSettings.maxBet.toString() : "100",
  );
  const [winMult, setWinMult] = useState(
    savedSettings ? savedSettings.winMultiplier.toString() : "2",
  );

  const handleSave = async () => {
    try {
      const gt = gameType as GameType;
      const settings: GameSettings = {
        minBet: BigInt(Number.parseInt(minBet, 10) || 1),
        maxBet: BigInt(Number.parseInt(maxBet, 10) || 100),
        winMultiplier: Number.parseFloat(winMult) || 2,
      };
      await setSettings({ gameType: gt, settings });
      toast.success(`${GAME_LABELS[gameType] ?? gameType} settings saved!`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save settings");
    }
  };

  return (
    <TableRow
      style={{
        borderBottom: "1px solid oklch(0.20 0.025 278)",
      }}
    >
      <TableCell
        className="font-bold text-sm whitespace-nowrap"
        style={{ color: "oklch(0.90 0.05 290)" }}
      >
        {GAME_LABELS[gameType] ?? gameType}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="1"
          value={minBet}
          onChange={(e) => setMinBet(e.target.value)}
          className="w-24 bg-secondary border-border text-foreground text-sm"
          data-ocid="staff.game.min_bet.input"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="1"
          value={maxBet}
          onChange={(e) => setMaxBet(e.target.value)}
          className="w-24 bg-secondary border-border text-foreground text-sm"
          data-ocid="staff.game.max_bet.input"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.1"
          min="0.1"
          value={winMult}
          onChange={(e) => setWinMult(e.target.value)}
          className="w-24 bg-secondary border-border text-foreground text-sm"
          data-ocid="staff.game.win_multiplier.input"
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="font-bold text-xs border-none"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
            boxShadow: "0 0 8px oklch(0.65 0.28 340 / 0.4)",
            color: "#fff",
          }}
          data-ocid="staff.game.save_button"
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3 mr-1" />
          )}
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}

function GameControlsTab() {
  const { data: allSettings, isLoading } = useGetAllGameSettings();

  const settingsMap: Record<string, GameSettings> = {};
  if (allSettings) {
    for (const [key, val] of allSettings) {
      settingsMap[key] = val;
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "oklch(0.11 0.015 280)",
        border: neonPinkBorder,
      }}
    >
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ borderBottom: neonPinkBorder }}
      >
        <Settings className="w-5 h-5" style={neonPinkStyle} />
        <h2
          className="font-display font-black tracking-widest"
          style={neonPinkStyle}
        >
          GAME CONTROLS
        </h2>
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin ml-2 text-muted-foreground" />
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow
              style={{ borderBottom: "1px solid oklch(0.20 0.025 278)" }}
            >
              <TableHead
                className="font-black tracking-wider text-xs"
                style={neonPinkStyle}
              >
                GAME
              </TableHead>
              <TableHead className="font-black tracking-wider text-xs text-gold">
                MIN BET
              </TableHead>
              <TableHead className="font-black tracking-wider text-xs text-gold">
                MAX BET
              </TableHead>
              <TableHead
                className="font-black tracking-wider text-xs"
                style={{ color: "oklch(0.70 0.20 190)" }}
              >
                WIN MULT
              </TableHead>
              <TableHead className="font-black tracking-wider text-xs text-muted-foreground">
                ACTION
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_GAME_TYPES.map((gt) => (
              <GameRow
                key={gt}
                gameType={gt}
                savedSettings={settingsMap[gt] ?? null}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── User Directory Tab ───────────────────────────────────────────────────────
function UserDirectoryTab() {
  const { data: users, isLoading } = useGetAllUsers();

  const formatDate = (ts: bigint) => {
    try {
      const ms = Number(ts / BigInt(1_000_000));
      return new Date(ms).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const truncatePrincipal = (p: { toString: () => string }) => {
    const str = p.toString();
    if (str.length <= 14) return str;
    return `${str.slice(0, 7)}...${str.slice(-5)}`;
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "oklch(0.11 0.015 280)",
        border: neonPinkBorder,
      }}
    >
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ borderBottom: neonPinkBorder }}
      >
        <Users className="w-5 h-5" style={neonPinkStyle} />
        <h2
          className="font-display font-black tracking-widest"
          style={neonPinkStyle}
        >
          USER DIRECTORY
        </h2>
        {isLoading ? (
          <Loader2
            className="w-4 h-4 animate-spin ml-2 text-muted-foreground"
            data-ocid="staff.users.loading_state"
          />
        ) : (
          <span className="ml-2 text-xs text-muted-foreground">
            {users?.length ?? 0} registered
          </span>
        )}
      </div>

      {!isLoading && (!users || users.length === 0) ? (
        <div
          className="py-16 text-center text-muted-foreground"
          data-ocid="staff.users.empty_state"
        >
          No users registered yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow
                style={{ borderBottom: "1px solid oklch(0.20 0.025 278)" }}
              >
                <TableHead
                  className="font-black tracking-wider text-xs"
                  style={neonPinkStyle}
                >
                  USERNAME
                </TableHead>
                <TableHead className="font-black tracking-wider text-xs text-muted-foreground">
                  PRINCIPAL
                </TableHead>
                <TableHead className="font-black tracking-wider text-xs text-gold">
                  BALANCE
                </TableHead>
                <TableHead
                  className="font-black tracking-wider text-xs"
                  style={{ color: "oklch(0.70 0.20 190)" }}
                >
                  ROLE
                </TableHead>
                <TableHead className="font-black tracking-wider text-xs text-muted-foreground">
                  JOINED
                </TableHead>
                <TableHead className="font-black tracking-wider text-xs text-muted-foreground">
                  GAMES
                </TableHead>
                <TableHead className="font-black tracking-wider text-xs text-gold">
                  WON
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((user, i) => (
                <TableRow
                  key={user.principal.toString()}
                  style={{ borderBottom: "1px solid oklch(0.17 0.02 278)" }}
                  data-ocid={`staff.users.item.${i + 1}`}
                >
                  <TableCell
                    className="font-bold text-sm"
                    style={{ color: "oklch(0.90 0.05 290)" }}
                  >
                    {user.name || "Anonymous"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dashed border-muted-foreground/40">
                            {truncatePrincipal(user.principal)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          style={{
                            background: "oklch(0.14 0.02 278)",
                            border: neonPinkBorder,
                            color: "oklch(0.90 0.05 290)",
                            fontFamily: "monospace",
                            fontSize: "11px",
                          }}
                        >
                          {user.principal.toString()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="font-black text-gold">
                    {user.balance.toString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      style={
                        user.role === "admin"
                          ? {
                              background: "oklch(0.65 0.28 340 / 0.2)",
                              border: "1px solid oklch(0.65 0.28 340 / 0.5)",
                              color: "oklch(0.65 0.28 340)",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              fontSize: "10px",
                            }
                          : {
                              background: "oklch(0.20 0.02 275 / 0.6)",
                              border: "1px solid oklch(0.30 0.03 275)",
                              color: "oklch(0.60 0.05 280)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              fontSize: "10px",
                            }
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.joinDate)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.totalGamesPlayed.toString()}
                  </TableCell>
                  <TableCell
                    className="font-bold text-sm"
                    style={{ color: "oklch(0.78 0.18 72)" }}
                  >
                    {user.totalCreditsWon.toString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Main StaffPage ───────────────────────────────────────────────────────────
type Tab = "overview" | "game-controls" | "users";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    id: "game-controls",
    label: "GAME CONTROLS",
    icon: <Settings className="w-4 h-4" />,
  },
  { id: "users", label: "USER DIRECTORY", icon: <Users className="w-4 h-4" /> },
];

export default function StaffPage() {
  const { data: isAdmin, isLoading } = useIsCallerAdmin();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (isLoading) {
    return (
      <div
        className="flex justify-center py-20"
        data-ocid="staff.loading_state"
      >
        <Loader2 className="w-8 h-8 animate-spin" style={neonPinkStyle} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 px-4"
        data-ocid="staff.error_state"
      >
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="font-display font-black text-2xl mb-2">ACCESS DENIED</h2>
        <p className="text-muted-foreground text-center">
          You don't have permission to access the Staff Panel.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 mb-6 p-4 rounded-xl"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: neonPinkBorder,
            boxShadow: "0 0 20px oklch(0.65 0.28 340 / 0.1)",
          }}
        >
          <ShieldCheck
            className="w-7 h-7"
            style={{
              color: "oklch(0.65 0.28 340)",
              filter: "drop-shadow(0 0 6px oklch(0.65 0.28 340 / 0.7))",
            }}
          />
          <div>
            <h1
              className="font-display font-black text-2xl tracking-widest"
              style={{
                color: "oklch(0.65 0.28 340)",
                textShadow: "0 0 10px oklch(0.65 0.28 340 / 0.5)",
              }}
            >
              STAFF PANEL
            </h1>
            <p className="text-xs text-muted-foreground">
              Admin management console
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl"
          style={{ background: "oklch(0.10 0.012 280)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-lg text-xs font-black tracking-widest transition-all"
              style={
                activeTab === tab.id
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.65 0.28 340 / 0.25), oklch(0.55 0.25 290 / 0.25))",
                      color: "oklch(0.65 0.28 340)",
                      border: neonPinkBorder,
                      boxShadow: "0 0 12px oklch(0.65 0.28 340 / 0.2)",
                      textShadow: "0 0 8px oklch(0.65 0.28 340 / 0.6)",
                    }
                  : {
                      color: "oklch(0.55 0.04 280)",
                      border: "1px solid transparent",
                    }
              }
              data-ocid={`staff.${tab.id}.tab`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "game-controls" && <GameControlsTab />}
          {activeTab === "users" && <UserDirectoryTab />}
        </motion.div>
      </motion.div>
    </div>
  );
}
