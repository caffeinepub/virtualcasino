import type { ReactNode } from "react";

interface ArcadeCabinetProps {
  title: string;
  color: string;
  children: ReactNode;
}

export default function ArcadeCabinet({
  title,
  color,
  children,
}: ArcadeCabinetProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background:
          "linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 40%, #111 100%)",
        border: `2px solid ${color}60`,
        boxShadow: `0 0 30px ${color}30, inset 0 0 60px rgba(0,0,0,0.8)`,
      }}
    >
      {/* Side decorative rivets */}
      <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col justify-around items-center py-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color, opacity: 0.5 }}
          />
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-3 flex flex-col justify-around items-center py-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color, opacity: 0.5 }}
          />
        ))}
      </div>

      {/* Marquee header */}
      <div
        className="px-6 py-3 text-center relative"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}20, transparent)`,
          borderBottom: `1px solid ${color}40`,
        }}
      >
        <h2
          className="text-xl font-black tracking-widest uppercase"
          style={{
            color,
            textShadow: `0 0 10px ${color}, 0 0 20px ${color}80`,
            letterSpacing: "0.2em",
          }}
        >
          {title}
        </h2>
        {/* Speaker dots */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {[0, 1, 2].map((j) => (
                <div
                  key={j}
                  className="w-1 h-1 rounded-full"
                  style={{ background: `${color}60` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Screen bezel */}
      <div
        className="mx-4 my-3 rounded-xl overflow-hidden relative"
        style={{
          background: "#000",
          border: `3px solid ${color}40`,
          boxShadow: `inset 0 0 20px rgba(0,0,0,0.9), 0 0 15px ${color}20`,
        }}
      >
        {/* Inner neon glow line */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          style={{ boxShadow: `inset 0 0 8px ${color}30` }}
        />
        {children}
      </div>

      {/* Bottom panel - coin slot + controls hint */}
      <div
        className="px-6 pb-4 flex items-center justify-between"
        style={{ borderTop: `1px solid ${color}20` }}
      >
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-2 rounded-full"
            style={{ background: `${color}40`, border: `1px solid ${color}60` }}
          />
          <span
            className="text-xs"
            style={{ color: `${color}60`, fontSize: "9px" }}
          >
            COIN
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: `${color}30` }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-8 h-8 rounded-full"
            style={{
              background: `${color}20`,
              border: `2px solid ${color}50`,
              boxShadow: `0 0 6px ${color}30`,
            }}
          />
          <span
            className="text-xs"
            style={{ color: `${color}60`, fontSize: "9px" }}
          >
            BTN
          </span>
        </div>
      </div>
    </div>
  );
}
