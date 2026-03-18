import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import {
  Coins,
  Gift,
  History,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useClaimDailyCredits,
  useGetCallerUserRole,
  useGetPointsBalance,
  useGetWalletBalance,
} from "../hooks/useQueries";

export default function Layout() {
  const { identity, clear, isInitializing } = useInternetIdentity();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const isAuthenticated = !!identity;

  const { data: balance } = useGetWalletBalance();
  const { data: points } = useGetPointsBalance();
  const { data: role } = useGetCallerUserRole();
  const { mutateAsync: claimDaily, isPending: claiming } =
    useClaimDailyCredits();

  const _isStaff = role === "admin";

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
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "oklch(0.65 0.28 340)" }}
          />
          <p className="text-sm text-muted-foreground font-bold tracking-wider">
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/games", label: "Games", icon: LayoutDashboard },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/history", label: "History", icon: History },
    { to: "/shop", label: "Shop", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 md:px-6 gap-4 md:gap-6"
        style={{
          background: "oklch(0.09 0.012 280)",
          borderBottom: "2px solid oklch(0.65 0.28 340 / 0.5)",
          boxShadow:
            "0 0 20px oklch(0.65 0.28 340 / 0.15), 0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0"
          data-ocid="nav.link"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center animate-neon-pulse"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
              boxShadow: "0 0 16px oklch(0.65 0.28 340 / 0.6)",
            }}
          >
            <Zap className="w-5 h-5" style={{ color: "#fff" }} />
          </div>
          <span
            className="font-display font-black text-base tracking-widest hidden sm:block"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.88 0.14 76), oklch(0.70 0.20 190))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 8px oklch(0.65 0.28 340 / 0.7))",
            }}
          >
            CPM VEGAS AND ARCADE
          </span>
          <span
            className="font-display font-black text-sm tracking-wider sm:hidden"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.88 0.14 76))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            CPM VEGAS
          </span>
        </Link>

        {/* Center Nav — desktop */}
        <nav
          className="hidden md:flex items-center gap-1 mx-auto"
          data-ocid="nav.section"
        >
          {navLinks.map((link) => {
            const isShop = link.to === "/shop";
            const isActive = currentPath === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-md text-sm font-black tracking-wide transition-all flex items-center gap-1.5 ${
                  isActive
                    ? isShop
                      ? "neon-cyan"
                      : "neon-pink"
                    : isShop
                      ? "hover:text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                }`}
                style={{
                  ...(isActive
                    ? {
                        background: isShop
                          ? "oklch(0.70 0.20 190 / 0.12)"
                          : "oklch(0.65 0.28 340 / 0.12)",
                        textShadow: isShop
                          ? "0 0 10px oklch(0.70 0.20 190 / 0.8)"
                          : "0 0 10px oklch(0.65 0.28 340 / 0.8)",
                        boxShadow: isShop
                          ? "0 0 10px oklch(0.70 0.20 190 / 0.15)"
                          : "0 0 10px oklch(0.65 0.28 340 / 0.15)",
                      }
                    : isShop
                      ? {
                          color: "oklch(0.70 0.20 190)",
                          textShadow: "0 0 8px oklch(0.70 0.20 190 / 0.5)",
                        }
                      : {}),
                }}
                data-ocid={`nav.${link.label.toLowerCase()}.link`}
              >
                {isShop && <Star className="w-3.5 h-3.5" />}
                {link.label}
                {isShop && (
                  <span
                    className="text-xs font-black"
                    style={{ color: "oklch(0.70 0.20 190 / 0.7)" }}
                  >
                    PTS
                  </span>
                )}
              </Link>
            );
          })}
          <Link to="/staff" data-ocid="nav.staff.link">
            <Button
              size="sm"
              className="ml-2 font-black tracking-widest text-xs px-4 border-none"
              style={{
                background:
                  currentPath === "/staff"
                    ? "linear-gradient(135deg, oklch(0.72 0.30 340), oklch(0.60 0.27 290))"
                    : "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                boxShadow:
                  "0 0 16px oklch(0.65 0.28 340 / 0.6), 0 0 32px oklch(0.65 0.28 340 / 0.3)",
                color: "#fff",
                animation: "neon-pulse 2s ease-in-out infinite",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              STAFF PANEL
            </Button>
          </Link>
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          {/* Staff button — mobile */}
          <Link
            to="/staff"
            className="md:hidden"
            data-ocid="nav.staff.mobile.link"
          >
            <Button
              size="sm"
              className="font-black text-xs px-3 border-none"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                boxShadow: "0 0 12px oklch(0.65 0.28 340 / 0.5)",
                color: "#fff",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              STAFF
            </Button>
          </Link>

          {/* Points balance */}
          {points !== undefined && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{
                background: "oklch(0.14 0.025 278)",
                border: "1px solid oklch(0.55 0.25 290 / 0.4)",
                boxShadow: "0 0 8px oklch(0.55 0.25 290 / 0.12)",
              }}
              data-ocid="nav.points.card"
            >
              <Star
                className="w-3.5 h-3.5"
                style={{ color: "oklch(0.55 0.25 290)" }}
              />
              <span
                className="text-sm font-black"
                style={{ color: "oklch(0.55 0.25 290)" }}
              >
                {points.toString()}
              </span>
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          )}

          {/* Credits balance */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: "oklch(0.14 0.025 278)",
              border: "1px solid oklch(0.78 0.18 72 / 0.4)",
              boxShadow: "0 0 10px oklch(0.78 0.18 72 / 0.15)",
            }}
          >
            <Coins className="w-4 h-4 text-gold" />
            <span className="text-sm font-black text-gold">
              {balance !== undefined ? balance.toString() : "—"}
            </span>
            <span className="text-xs text-muted-foreground">credits</span>
          </div>

          <Button
            size="sm"
            onClick={handleClaimDaily}
            disabled={claiming}
            className="text-xs font-bold tracking-wider"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
              boxShadow: "0 0 12px oklch(0.65 0.28 340 / 0.4)",
              color: "#fff",
              border: "none",
            }}
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
            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
            data-ocid="auth.logout_button"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{
          background: "oklch(0.09 0.012 280)",
          borderTop: "2px solid oklch(0.65 0.28 340 / 0.4)",
          boxShadow: "0 -4px 20px oklch(0.65 0.28 340 / 0.15)",
        }}
        data-ocid="nav.mobile.section"
      >
        {navLinks.map((link) => {
          const isShop = link.to === "/shop";
          const isActive = currentPath === link.to;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all"
              style={{
                color: isActive
                  ? isShop
                    ? "oklch(0.70 0.20 190)"
                    : "oklch(0.65 0.28 340)"
                  : isShop
                    ? "oklch(0.70 0.20 190 / 0.65)"
                    : "oklch(0.55 0.15 280)",
                textShadow: isActive
                  ? isShop
                    ? "0 0 8px oklch(0.70 0.20 190 / 0.8)"
                    : "0 0 8px oklch(0.65 0.28 340 / 0.8)"
                  : "none",
              }}
              data-ocid={`nav.mobile.${link.label.toLowerCase()}.link`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-black tracking-wide">
                {isShop ? "SHOP ✦" : link.label.toUpperCase()}
              </span>
            </Link>
          );
        })}
        {/* Staff link in mobile bottom nav */}
        <Link
          to="/staff"
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all"
          style={{
            color:
              currentPath === "/staff"
                ? "oklch(0.65 0.28 340)"
                : "oklch(0.65 0.28 340 / 0.65)",
            textShadow:
              currentPath === "/staff"
                ? "0 0 8px oklch(0.65 0.28 340 / 0.8)"
                : "none",
          }}
          data-ocid="nav.mobile.staff.link"
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-black tracking-wide">STAFF</span>
        </Link>
      </nav>

      {/* Body */}
      <div className="flex flex-1 pt-16 pb-16 md:pb-0">
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer
        className="py-8 px-6 mb-16 md:mb-0"
        style={{
          background: "oklch(0.09 0.012 280)",
          borderTop: "2px solid oklch(0.65 0.28 340 / 0.3)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-black tracking-widest neon-pink mb-3">
                🎰 CASINO
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Slots</li>
                <li>Blackjack</li>
                <li>Roulette</li>
                <li>Poker</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-black tracking-widest neon-cyan mb-3">
                🕹️ ARCADE
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Plinko</li>
                <li>Crash Game</li>
                <li>Mines</li>
                <li>Coin Pusher</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-black tracking-widest text-gold mb-3">
                🏆 ACCOUNT
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>History</li>
                <li>Leaderboard</li>
                <li>Daily Bonus</li>
              </ul>
            </div>
            <div>
              <h4
                className="text-sm font-black tracking-widest mb-3"
                style={{ color: "oklch(0.55 0.25 290)" }}
              >
                ⚡ CPM VEGAS
              </h4>
              <p className="text-xs text-muted-foreground">
                Virtual casino & arcade gaming. Play responsibly.
              </p>
            </div>
          </div>
          <div
            className="pt-4 text-center text-xs text-muted-foreground"
            style={{ borderTop: "1px solid oklch(0.65 0.28 340 / 0.2)" }}
          >
            © {new Date().getFullYear()} CPM Vegas And Arcade. Built with ❤️
            using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="neon-pink hover:underline"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
