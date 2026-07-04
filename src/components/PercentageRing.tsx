import React from 'react';

interface PercentageRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  colorClass?: string;
}

export default function PercentageRing({
  percentage,
  size = 120,
  strokeWidth = 8,
  label,
  colorClass = 'text-indigo-500',
}: PercentageRingProps) {
  const radius = (size - strokeWidth - 12) / 2; // Extra space for glow effect
  const circumference = radius * 2 * Math.PI;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clampedPercentage / 100) * circumference;

  // Derive active glow color based on class
  const glowColor = colorClass.includes('emerald') 
    ? 'rgba(16, 185, 129, 0.4)' 
    : colorClass.includes('amber') 
      ? 'rgba(245, 158, 11, 0.4)' 
      : 'rgba(99, 102, 241, 0.45)';

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative select-none" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full overflow-visible">
          <defs>
            {/* Soft high-fidelity glow filter for the premium tech aesthetic */}
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Subtle color gradient */}
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>

          {/* Decorative outer subtle ring inspired by Dribbble design */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 6}
            className="text-slate-800/30"
            strokeWidth="1"
            stroke="currentColor"
            fill="transparent"
            strokeDasharray="4, 4"
          />

          {/* Background trace circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="text-slate-900"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
          />

          {/* Glowing under-layer for ambient backlight projection */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={colorClass}
            strokeWidth={strokeWidth + 2}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            style={{ 
              filter: 'url(#neon-glow)', 
              opacity: 0.45,
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />

          {/* Foreground high-precision progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`${colorClass} transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            style={{ 
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </svg>

        {/* Floating centered stat panel */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black font-mono tracking-tight text-slate-100 drop-shadow-md">
            {clampedPercentage}%
          </span>
          {label && (
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
