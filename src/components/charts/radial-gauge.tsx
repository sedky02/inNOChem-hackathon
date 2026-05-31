"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Animated circular progress ring with a custom center slot. */
export function RadialGauge({
  value,
  color,
  size = 132,
  stroke = 10,
  trackColor = "var(--color-muted)",
  className,
  children,
}: {
  value: number; // 0-100
  color: string;
  size?: number;
  stroke?: number;
  trackColor?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(value));
    return () => cancelAnimationFrame(t);
  }, [value]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, animated)) / 100) * circumference;
  const center = size / 2;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
