import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Coins, Crown, Gift, Loader2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function AuthPage() {
  const { login, identity, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) {
      navigate({ to: "/" });
    }
  }, [identity, navigate]);

  const features = [
    { icon: Coins, text: "10 free credits on sign up" },
    { icon: Gift, text: "5 free credits every day" },
    { icon: Trophy, text: "Compete on daily leaderboard" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: "oklch(0.24 0.12 295)", filter: "blur(80px)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
          style={{ background: "oklch(0.70 0.13 72)", filter: "blur(80px)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="card-dark rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="w-20 h-20 rounded-full bg-gold flex items-center justify-center mb-4 glow-gold"
            >
              <Crown
                className="w-10 h-10"
                style={{ color: "oklch(0.10 0.012 240)" }}
              />
            </motion.div>
            <h1 className="text-3xl font-display font-bold text-gold-gradient tracking-wider">
              ONYX CASINO
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Experience the thrill of virtual gambling
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {features.map((f) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.18 0.020 228)" }}
                >
                  <f.icon className="w-4 h-4 text-gold" />
                </div>
                {f.text}
              </motion.div>
            ))}
          </div>

          <Button
            onClick={() => login()}
            disabled={isInitializing || isLoggingIn}
            className="w-full bg-gold text-primary-foreground font-bold text-base py-6 hover:opacity-90 transition-opacity"
            data-ocid="auth.login_button"
          >
            {isInitializing || isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            {isLoggingIn ? "Connecting..." : "Login / Register"}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Powered by Internet Identity — secure, private, no passwords.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
