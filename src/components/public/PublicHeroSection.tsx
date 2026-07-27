"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PublicHeroSectionProps = {
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  bottom?: ReactNode;
  bgImage?: string;
  align?: "left" | "center";
  className?: string;
};

export function PublicHeroSection({
  badge,
  title,
  description,
  aside,
  bottom,
  bgImage = "/aigocy/images/section/hero-1.jpg",
  align = "left",
  className,
}: PublicHeroSectionProps) {
  const isCenter = align === "center";

  return (
    <section
      className={cn("kdm-public-hero-wrap relative isolate overflow-hidden pb-0 pt-0", className)}
      style={{ padding: "16px 16px 0" }}
    >
      <div
        className="kdm-public-hero-bg-panel absolute overflow-hidden"
        style={{ inset: "0 0 0 0", borderRadius: "40px", zIndex: -1 }}
      >
        <Image
          src={bgImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ borderRadius: "40px" }}
        />
        {/* Aigocy tarzı sağ köşe kırmızı-turuncu blob */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-6%",
            right: "-8%",
            width: "54%",
            height: "88%",
            background: "radial-gradient(ellipse at 65% 32%, rgba(253,58,37,0.58) 0%, rgba(255,120,60,0.24) 40%, transparent 68%)",
            filter: "blur(68px)",
            pointerEvents: "none",
            borderRadius: "50%",
            willChange: "transform",
            animation: "kdm-blob-drift 12s ease-in-out infinite",
            animationPlayState: "running",
          }}
        />
        {/* Sol koyu blur blob */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "10%",
            left: "-8%",
            width: "38%",
            height: "55%",
            background: "radial-gradient(ellipse, rgba(20,20,22,0.55) 0%, transparent 64%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            borderRadius: "50%",
            willChange: "transform",
            animation: "kdm-blob-drift 14s ease-in-out infinite reverse",
            animationPlayState: "running",
          }}
        />
        <div className="kdm-public-hero-wash absolute inset-0" />
        <div className="kdm-public-hero-grid absolute inset-0" />
        <div className="kdm-public-hero-rings absolute inset-0 opacity-60" />
        <span className="kdm-public-hero-scanline" aria-hidden="true" />
      </div>

      <div
        className="container relative z-10 mx-auto px-4 sm:px-6"
        style={{ paddingTop: "clamp(7rem, 15vw, 11rem)", paddingBottom: "clamp(4rem, 8vw, 7.5rem)" }}
      >
        {aside ? (
          <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {badge ? <div className="mb-8">{badge}</div> : null}
              <div style={{ animation: "kdm-fade-rotate-x 0.65s cubic-bezier(0.22,1,0.36,1) both" }}>
                {title}
              </div>
              {description ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                >
                  {description}
                </motion.div>
              ) : null}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="lg:justify-self-end"
            >
              {aside}
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={cn(isCenter && "mx-auto max-w-5xl text-center")}
          >
            {badge ? <div className={cn("mb-8", isCenter && "flex justify-center")}>{badge}</div> : null}
            <div style={{ animation: "kdm-fade-rotate-x 0.65s cubic-bezier(0.22,1,0.36,1) both" }}>
              {title}
            </div>
            {description ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                {description}
              </motion.div>
            ) : null}
          </motion.div>
        )}

        {bottom ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="mt-10"
          >
            {bottom}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}