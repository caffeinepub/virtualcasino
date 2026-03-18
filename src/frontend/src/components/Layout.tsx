import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import {
  Coins,
  Crown,
  Gift,
  History,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useClaimDailyCredits,
  useGetCallerUserRole,
  useGetWalletBalance,
} from "../hooks/useQueries";

export default function Layout() {
  const { identity, clear, isInitializing } = useInternetIdentity();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const isAuthenticated = !!identity;

  const { data: balance } = useGetWalletBalance();
  const { data: role } = useGetCallerUserRole();
  const { mutateAsync: claimDaily, isPending: claiming } =
    useClaimDailyCredits();

  const isStaff = role === "admin";

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate({ to: "/auth" });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  const handleLogout = async () => {
    await clear();
    qc.clear();
    navigate({ to: "/auth" });
  };

  const handleClaimDaily = async () => {
    try {
      await claimDaily();
      toast.success("🎁 +5 daily credits claimed!");
    } catch {
      toast.error("Already claimed today or error occurred");
    }
  };

  const currentPath = router.state.location.pathname;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/games", label: "Games", icon: LayoutDashboard },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 gap-6"
        style={{
          background: "oklch(0.11 0.014 237)",
          borderBottom: "1px solid oklch(0.22 0.025 225)",
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0"
          data-ocid="nav.link"
        >
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
            <Crown
              className="w-4 h-4"
              style={{ color: "oklch(0.10 0.012 240)" }}
            />
          </div>
          <span className="font-display font-bold text-lg tracking-wider text-gold-gradient">
            ONYX CASINO
          </span>
        </Link>

        {/* Center Nav */}
        <nav
          className="hidden md:flex items-center gap-1 mx-auto"
          data-ocid="nav.section"
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPath === link.to
                  ? "text-gold bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              data-ocid={`nav.${link.label.toLowerCase()}.link`}
            >
              {link.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              to="/staff"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPath === "/staff"
                  ? "text-gold bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              data-ocid="nav.staff.link"
            >
              Staff Panel
            </Link>
          )}
        </nav>

        {/* Right: Balance + Actions */}
        <div className="ml-auto flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: "oklch(0.16 0.018 228)",
              border: "1px solid oklch(0.22 0.025 225)",
            }}
          >
            <Coins className="w-4 h-4 text-gold" />
            <span className="text-sm font-bold text-gold">
              {balance !== undefined ? balance.toString() : "—"}
            </span>
            <span className="text-xs text-muted-foreground">credits</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClaimDaily}
            disabled={claiming}
            className="border-gold/50 text-gold hover:bg-gold hover:text-primary-foreground text-xs"
            data-ocid="daily.claim_button"
          >
            {claiming ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Gift className="w-3 h-3" />
            )}
            <span className="ml-1 hidden sm:inline">Daily Bonus</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="auth.logout_button"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 pt-16">
        {/* Left Sidebar (staff only) */}
        {isStaff && (
          <aside
            className="hidden lg:flex flex-col w-56 shrink-0 pt-6 pb-4 px-3"
            style={{
              background: "oklch(0.13 0.015 232)",
              borderRight: "1px solid oklch(0.22 0.025 225)",
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground tracking-widest px-3 mb-2">
              ACCOUNT DASHBOARD
            </p>
            <nav className="flex flex-col gap-1">
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                data-ocid="sidebar.dashboard.link"
              >
                <Home className="w-4 h-4" /> Dashboard
              </Link>
            </nav>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest px-3 mt-6 mb-2">
              ADMIN PANEL
            </p>
            <nav className="flex flex-col gap-1">
              <Link
                to="/staff"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                data-ocid="sidebar.staff.link"
              >
                <Users className="w-4 h-4" /> Manage Users
              </Link>
              <Link
                to="/staff"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                data-ocid="sidebar.staffpanel.link"
              >
                <LayoutDashboard className="w-4 h-4" /> Staff Panel
              </Link>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer
        className="border-t border-border py-8 px-6"
        style={{ background: "oklch(0.11 0.014 237)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3 tracking-wider">
                GAMES
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Slots</li>
                <li>Blackjack</li>
                <li>Roulette</li>
                <li>Poker</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3 tracking-wider">
                ACCOUNT
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>History</li>
                <li>Leaderboard</li>
                <li>Daily Bonus</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3 tracking-wider">
                SUPPORT
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>FAQ</li>
                <li>Contact</li>
                <li>Terms</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3 tracking-wider">
                PAYMENT
              </h4>
              <div className="flex gap-2 flex-wrap">
                {["VISA", "MC", "CRYPTO"].map((m) => (
                  <span
                    key={m}
                    className="text-xs px-2 py-1 rounded border border-border text-muted-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
