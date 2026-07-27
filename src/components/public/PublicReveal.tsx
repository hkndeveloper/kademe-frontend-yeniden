"use client";

import { motion, type MotionProps } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight" | "fadeZoom" | "fadeRotateX";

const hiddenByVariant: Record<RevealVariant, MotionProps["initial"]> = {
  fadeUp: { opacity: 0, y: 42 },
  fadeDown: { opacity: 0, y: -42 },
  fadeLeft: { opacity: 0, x: -42 },
  fadeRight: { opacity: 0, x: 42 },
  fadeZoom: { opacity: 0, scale: 0.92 },
  fadeRotateX: { opacity: 0, y: 42, rotateX: 18, transformPerspective: 700 },
};

export type PublicRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
  stagger?: boolean;
  variant?: RevealVariant;
};

export function PublicReveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  once = true,
  stagger = false,
  variant = "fadeUp",
}: PublicRevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={hiddenByVariant[variant]}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0 }}
      viewport={{ once, margin: "-8% 0px" }}
      transition={{
        delay,
        duration,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: stagger ? 0.08 : undefined,
      }}
    >
      {children}
    </motion.div>
  );
}