import React from "react";

export default function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#000000",
  className = "",
  children,
}) {
  const colors = Array.isArray(color)
    ? color.join(",")
    : color;

  return (
    <div
      style={{
        "--border-radius": `${borderRadius}px`,
        "--border-width": `${borderWidth}px`,
        "--duration": `${duration}s`,
        "--background-radial-gradient": `radial-gradient(
          transparent,
          transparent,
          ${colors},
          transparent,
          transparent
        )`,
      }}
      className={`
        relative
        w-full
        rounded-[var(--border-radius)]
        ${className}
      `}
    >
      {/* Animated Border */}
      <div
        className="
          absolute
          inset-0
          rounded-[var(--border-radius)]
          p-[var(--border-width)]
          pointer-events-none
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            inset-[-200%]
            animate-[shine_var(--duration)_linear_infinite]
          "
          style={{
            background:
              "var(--background-radial-gradient)",
            backgroundSize: "300% 300%",
          }}
        />
      </div>

      {/* Content */}
      <div
        className="
          relative
          rounded-[calc(var(--border-radius)-2px)]
          bg-white
          dark:bg-black
          text-black
          dark:text-white
        "
      >
        {children}
      </div>
    </div>
  );
}