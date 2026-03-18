import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { GameType } from "../backend.d";

const GAME_IMAGES: Partial<Record<GameType, string>> = {
  [GameType.slots]: "/assets/generated/game-slots.dim_600x400.jpg",
  [GameType.blackjack]: "/assets/generated/game-blackjack.dim_600x400.jpg",
  [GameType.roulette]: "/assets/generated/game-roulette.dim_600x400.jpg",
  [GameType.videoPoker]: "/assets/generated/game-video-poker.dim_600x400.jpg",
  [GameType.dice]: "/assets/generated/game-dice.dim_600x400.jpg",
  [GameType.baccarat]: "/assets/generated/game-baccarat.dim_600x400.jpg",
  [GameType.keno]: "/assets/generated/game-keno.dim_600x400.jpg",
  [GameType.scratchCards]:
    "/assets/generated/game-scratch-cards.dim_600x400.jpg",
  [GameType.craps]: "/assets/generated/game-craps.dim_600x400.jpg",
  [GameType.paiGowPoker]:
    "/assets/generated/game-pai-gow-poker.dim_600x400.jpg",
  [GameType.sicBo]: "/assets/generated/game-sic-bo.dim_600x400.jpg",
  [GameType.war]: "/assets/generated/game-war.dim_600x400.jpg",
  [GameType.caribbeanStud]:
    "/assets/generated/game-caribbean-stud.dim_600x400.jpg",
  [GameType.letItRide]: "/assets/generated/game-let-it-ride.dim_600x400.jpg",
  [GameType.threeCardPoker]:
    "/assets/generated/game-three-card-poker.dim_600x400.jpg",
  [GameType.casinoHoldem]:
    "/assets/generated/game-casino-holdem.dim_600x400.jpg",
  [GameType.wheelOfFortune]:
    "/assets/generated/game-wheel-of-fortune.dim_600x400.jpg",
  [GameType.coinPusher]: "/assets/generated/game-coin-pusher.dim_600x400.jpg",
  [GameType.plinko]: "/assets/generated/game-plinko.dim_600x400.jpg",
  [GameType.crashGame]: "/assets/generated/game-crash-game.dim_600x400.jpg",
  [GameType.mines]: "/assets/generated/game-mines.dim_600x400.jpg",
  [GameType.limbo]: "/assets/generated/game-limbo.dim_600x400.jpg",
  [GameType.hiLo]: "/assets/generated/game-hi-lo.dim_600x400.jpg",
  [GameType.penaltyShootout]:
    "/assets/generated/game-penalty-shootout.dim_600x400.jpg",
  [GameType.ballDrop]: "/assets/generated/game-ball-drop.dim_600x400.jpg",
};

export interface FlipGameCardProps {
  id: GameType;
  label: string;
  description: string;
  emoji: string;
  color: string;
  index?: number;
  featured?: boolean;
  /** If provided, navigates here instead of /game/:id (e.g. /auth for logged-out) */
  overrideHref?: string;
  ocid?: string;
}

export default function FlipGameCard({
  id,
  label,
  description,
  emoji,
  color,
  index = 0,
  featured = false,
  overrideHref,
  ocid,
}: FlipGameCardProps) {
  const navigate = useNavigate();
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const imageSrc = GAME_IMAGES[id];

  function handleClick() {
    if (isFlipping) return;
    setIsFlipping(true);
    setFlipped(true);
    setTimeout(() => {
      if (overrideHref) {
        navigate({ to: overrideHref as "/auth" });
      } else {
        navigate({ to: "/game/$gameType", params: { gameType: id } });
      }
    }, 650);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      data-ocid={ocid ?? `games.item.${index + 1}`}
      style={{ perspective: "1000px" }}
      className="cursor-pointer"
      onClick={handleClick}
    >
      {/* Card container with 3D transform */}
      <div
        style={{
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.65s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          aspectRatio: "3 / 2",
          borderRadius: "12px",
        }}
      >
        {/* ===== FRONT FACE ===== */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            borderRadius: "12px",
            overflow: "hidden",
            border: `1px solid ${color}50`,
            boxShadow: `0 4px 20px ${color}25`,
          }}
        >
          {/* Photo-realistic image */}
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={label}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: `radial-gradient(ellipse at center, ${color}30, oklch(0.10 0.012 280))`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem",
              }}
            >
              {emoji}
            </div>
          )}

          {/* Featured badge */}
          {featured && (
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                zIndex: 10,
                padding: "2px 8px",
                borderRadius: "999px",
                background:
                  "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.1em",
                boxShadow: "0 0 8px oklch(0.65 0.28 340 / 0.5)",
              }}
            >
              🔥 HOT
            </div>
          )}

          {/* Dark gradient overlay at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)",
              padding: "28px 12px 10px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                color: "#fff",
                textShadow: "0 0 8px rgba(0,0,0,0.8)",
                lineHeight: 1.2,
              }}
            >
              {label.toUpperCase()}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "9px",
                color: "rgba(255,255,255,0.65)",
                marginTop: 2,
              }}
            >
              {description}
            </p>
          </div>
        </div>

        {/* ===== BACK FACE ===== */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: "12px",
            overflow: "hidden",
            background: "oklch(0.10 0.02 280)",
            border: `1px solid ${color}80`,
            boxShadow: `0 0 30px ${color}50, inset 0 0 40px ${color}15`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 16,
          }}
        >
          {/* Neon glow radial bg */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse at 50% 40%, ${color}25, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          {/* Grid lines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(${color}18 1px, transparent 1px), linear-gradient(90deg, ${color}18 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div
              style={{
                fontSize: featured ? "2.5rem" : "2rem",
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {emoji}
            </div>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                color: "#fff",
                textShadow: `0 0 12px ${color}, 0 0 24px ${color}80`,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {label.toUpperCase()}
            </p>
            <p
              style={{
                fontSize: "9px",
                color: "rgba(255,255,255,0.55)",
                margin: "4px 0 10px",
              }}
            >
              {description}
            </p>

            {/* PLAY NOW button */}
            <div
              style={{
                padding: "6px 16px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                boxShadow:
                  "0 0 20px oklch(0.65 0.28 340 / 0.7), 0 0 40px oklch(0.65 0.28 340 / 0.3)",
                display: "inline-block",
              }}
            >
              ▶ PLAY NOW
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
