import { motion } from "motion/react";
import { type Card, type Suit, isRedSuit } from "./cardUtils";

export function RealisticCard({
  card,
  faceDown = false,
  index = 0,
  small = false,
}: {
  card: Card;
  faceDown?: boolean;
  index?: number;
  small?: boolean;
}) {
  const isRed = !faceDown && isRedSuit(card.suit as Suit);
  const w = small ? "w-10" : "w-14";
  const h = small ? "h-14" : "h-20";
  const textSm = small ? "text-[9px]" : "text-xs";
  const textLg = small ? "text-base" : "text-xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, rotateY: 90 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: index * 0.12, duration: 0.28, ease: "easeOut" }}
      className={`relative select-none ${w} ${h} rounded-lg shadow-xl flex-shrink-0`}
      style={{ perspective: "600px" }}
    >
      {faceDown ? (
        // Card back
        <div
          className={`${w} ${h} rounded-lg`}
          style={{
            background: "#1a237e",
            border: "2px solid #283593",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 10px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 10px)",
          }}
        >
          <div
            className="absolute inset-1.5 rounded"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              background:
                "repeating-linear-gradient(45deg, #b71c1c 0px, #b71c1c 3px, #1a237e 3px, #1a237e 9px)",
              opacity: 0.6,
            }}
          />
        </div>
      ) : (
        // Card face
        <div
          className={`${w} ${h} rounded-lg flex flex-col justify-between p-1 font-black`}
          style={{
            background: "#fff",
            border: "1.5px solid #e0e0e0",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9)",
            color: isRed ? "#c62828" : "#1a1a1a",
          }}
        >
          {/* Top-left corner */}
          <div className={`flex flex-col leading-none ${textSm}`}>
            <span className="font-black leading-none">{card.rank}</span>
            <span className="leading-none">{card.suit}</span>
          </div>
          {/* Center suit */}
          <div className={`self-center ${textLg} leading-none`}>
            {card.suit}
          </div>
          {/* Bottom-right corner (rotated) */}
          <div
            className={`flex flex-col leading-none self-end rotate-180 ${textSm}`}
          >
            <span className="font-black leading-none">{card.rank}</span>
            <span className="leading-none">{card.suit}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
