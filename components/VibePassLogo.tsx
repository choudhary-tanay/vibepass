"use client";

import { useId } from "react";

interface VibePassIconProps {
  size?: number;
  className?: string;
}

export function VibePassIcon({ size = 36, className }: VibePassIconProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `vpGrad-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="14" y1="6" x2="46" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B3CF7" />
          <stop offset="1" stopColor="#00C9A7" />
        </linearGradient>
      </defs>

      {/* Orbit arc */}
      <ellipse cx="32" cy="28" rx="20" ry="20" stroke="#8B3CF7" strokeWidth="1.2" strokeDasharray="2.5 3.5" opacity="0.35" />

      {/* Motion lines */}
      <line x1="1"  y1="16" x2="11" y2="16" stroke="#8B3CF7" strokeWidth="3"   strokeLinecap="round" />
      <line x1="3"  y1="22" x2="11" y2="22" stroke="#8B3CF7" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
      <line x1="5"  y1="28" x2="11" y2="28" stroke="#8B3CF7" strokeWidth="2"   strokeLinecap="round" opacity="0.35" />

      {/* Ticket (rotated) */}
      <g transform="rotate(-9 32 28)">
        <rect x="14" y="7" width="34" height="42" rx="7" fill={`url(#${gradId})`} />
        {/* Stub notch on right */}
        <circle cx="48" cy="28" r="4" fill="white" />
        {/* Instructor: head */}
        <circle cx="31" cy="18" r="4.5" fill="white" fillOpacity="0.95" />
        {/* Instructor: V/check body */}
        <path d="M22 27 L29 35 L40 20" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Sparkle */}
      <path
        d="M50 8 L51 10.4 L53.4 11.4 L51 12.4 L50 14.8 L49 12.4 L46.6 11.4 L49 10.4 Z"
        fill="#A78BFA"
      />
    </svg>
  );
}

interface VibePassLogoProps {
  portalLabel?: string;
  portalColor?: string;
  size?: "sm" | "md";
  className?: string;
}

export function VibePassLogo({
  portalLabel,
  portalColor = "text-indigo-600 dark:text-indigo-300",
  size = "md",
  className,
}: VibePassLogoProps) {
  const iconSize = size === "sm" ? 36 : 44;
  const nameSize = size === "sm" ? "text-base" : "text-lg";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <VibePassIcon size={iconSize} />
      <div className="leading-none">
        <span className={`block font-black ${nameSize} tracking-tight`}>
          <span className="text-slate-950 dark:text-white">Vibe</span>
          <span className="bg-gradient-to-r from-violet-600 to-teal-400 bg-clip-text text-transparent">Pass</span>
        </span>
        {portalLabel && (
          <span className={`block text-[10px] font-bold uppercase tracking-wider ${portalColor}`}>
            {portalLabel}
          </span>
        )}
      </div>
    </div>
  );
}
