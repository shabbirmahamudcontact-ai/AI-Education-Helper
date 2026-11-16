import React from "react";

interface BrandLogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md";
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "dark",
  size = "md",
}) => {
  const iconBoxSize = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const wordmarkSize = size === "sm" ? "text-base" : "text-lg";
  const wordmarkColor = variant === "dark" ? "text-white" : "text-[var(--primary-dark)]";

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      {/* Official Concept Mark: Indigo-Violet Squircle + Stylized White 'A' + Orbit Arc + Emerald Dot */}
      <span
        className={`${iconBoxSize} rounded-xl bg-gradient-to-br from-[#4338CA] to-[#7C3AED] flex items-center justify-center shadow-sm shrink-0`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Orbit arc over the 'A' */}
          <path
            d="M11 12.5C16.5 9.2 24.5 9.5 30 13"
            stroke="#CBD5E1"
            strokeOpacity="0.75"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Emerald dot at upper right */}
          <circle cx="27.5" cy="12" r="3" fill="#10B981" />
          {/* Stylized geometric 'A' */}
          <path
            d="M13.5 30L20 13.5L26.5 30"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.8 24.5H24.2"
            stroke="#FFFFFF"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {/* Wordmark + AI Accent Mark */}
      <span className={`inline-flex items-center gap-1.5 ${wordmarkSize} font-extrabold tracking-tight ${wordmarkColor}`}>
        <span>EduGenius</span>
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-[#10B981] text-white text-[11px] font-bold leading-none tracking-normal">
          AI
        </span>
      </span>
    </span>
  );
};
