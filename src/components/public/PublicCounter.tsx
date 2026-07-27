"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type PublicCounterProps = {
  className?: string;
  duration?: number;
  formatter?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  value: number;
};

export function PublicCounter({
  className,
  duration = 1200,
  formatter,
  prefix = "",
  suffix = "",
  value,
}: PublicCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    let startTime = 0;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        frameId = window.requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [duration, value]);

  const formatted = formatter ? formatter(displayValue) : new Intl.NumberFormat("tr-TR").format(displayValue);

  return (
    <span ref={ref} className={cn("kdm-public-counter-value tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}