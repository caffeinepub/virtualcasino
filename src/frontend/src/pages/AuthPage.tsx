import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Coins, Gift, Loader2, Trophy, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function AuthPage() {
  const { login, identity, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) navigate({ to: "/" });
  }, [identity, navigate]);

  const features = [
    {
      icon: Coins,
      text: "10 free credits on sign up",
      color: "oklch(0.78 0.18 72)",
    },
    {
      icon: Gift,
      text: "5 free credits every day",
      color: "oklch(0.65 0.28 340)",
    },
    {
      icon: Trophy,
      text: "Compete on daily leaderboard",
      color: "oklch(0.70 0.20 190)",
    },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "oklch(0.08 0.01 280)" }}
    >
      {/* Neon grid */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.65 0.28 340 / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.65 0.28 340 / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
      {/* Glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-15"
        style={{ background: "oklch(0.55 0.25 290)", filter: "blur(100px)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15"
        style={{ background: "oklch(0.65 0.28 340)", filter: "blur(100px)" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10"
        style={{
          background: "oklch(0.70 0.20 190)",
          filter: "blur(80px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.65 0.28 340 / 0.4)",
            boxShadow:
              "0 0 40px oklch(0.65 0.28 340 / 0.15), 0 0 80px oklch(0.55 0.25 290 / 0.1)",
          }}
        >
          {/* Top accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290), oklch(0.70 0.20 190))",
            }}
          />

          <div className="flex flex-col items-center mb-8">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                boxShadow: "0 0 30px oklch(0.65 0.28 340 / 0.5)",
              }}
            >
              <Zap className="w-10 h-10" style={{ color: "#fff" }} />
            </motion.div>
            <h1
              className="font-display font-black text-3xl tracking-widest text-center mb-1"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.88 0.14 76), oklch(0.70 0.20 190))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              CPM VEGAS
            </h1>
            <p
              className="font-display font-black text-lg tracking-widest mb-2"
              style={{
                color: "oklch(0.55 0.25 290)",
                textShadow: "0 0 8px oklch(0.55 0.25 290 / 0.6)",
              }}
            >
              AND ARCADE
            </p>
            <p className="text-muted-foreground text-sm">
              Virtual casino & arcade gaming platform
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {features.map((f) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 text-sm"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: `${f.color}20`,
                    border: `1px solid ${f.color}40`,
                  }}
                >
                  <f.icon className="w-4 h-4" style={{ color: f.color }} />
                </div>
                <span className="text-foreground/80">{f.text}</span>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={() => login()}
            disabled={isInitializing || isLoggingIn}
            className="w-full py-6 text-base font-black tracking-widest border-none"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
              boxShadow: "0 0 25px oklch(0.65 0.28 340 / 0.4)",
              color: "#fff",
            }}
            data-ocid="auth.login_button"
          >
            {isInitializing || isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            {isLoggingIn ? "CONNECTING..." : "🎮 LOGIN / REGISTER"}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Powered by Internet Identity — secure, private, no passwords.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
