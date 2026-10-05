"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Compass,
  Sparkles,
  Users,
} from "lucide-react";
import { plain, safeHref } from "@/lib/aigocy";
import type { ThemeFaq } from "./usePublicContent";

export function Reveal({
  children,
  className = "",
  delay = 0,
  effect = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  effect?: "up" | "rotate" | "zoom";
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: effect === "rotate" ? "100%" : effect === "up" ? 50 : 0,
        rotateX: effect === "rotate" ? 45 : 0,
        scale: effect === "zoom" ? 0.9 : 1,
      }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.05 }}
      style={
        effect === "rotate"
          ? { transformOrigin: "top center -50px" }
          : undefined
      }
      transition={{
        duration: reduced ? 0 : 1,
        delay: reduced ? 0 : delay,
        ease: [0.215, 0.61, 0.355, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
export function ThemeButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={secondary ? "tf-btn-2 animate-btn" : "tf-btn animate-btn"}
      href={safeHref(href)}
    >
      {children}
      <ArrowUpRight size={18} aria-hidden="true" />
    </Link>
  );
}
export function Heading({
  badge,
  title,
  description,
  center = false,
  dark = false,
}: {
  badge: string;
  title: string;
  description?: string;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <Reveal className={`heading-section ${center ? "center" : ""}`}>
      <div className={`heading-sub fw-semibold ${dark ? "style-1" : ""}`}>
        {badge}
      </div>
      <h2
        className={`heading-title ${dark ? "text-white" : "text-gradient-2"}`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`theme-description ${dark ? "text-neutral-400" : "text-secondary"}`}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
export function PageHero({
  title,
  description,
  badge,
  children,
  variant = "banner",
  decorations = [10, 11, 12],
}: {
  title: string;
  description?: string;
  badge: string;
  children?: ReactNode;
  variant?: "banner" | "page-title";
  decorations?: number[];
}) {
  if (variant === "page-title")
    return (
      <section className="section-page-title">
        <div className="container text-center">
          <Reveal effect="zoom">
            <h1 className="page-title fw-semibold text-gradient-1">{title}</h1>
          </Reveal>
          <Reveal className="breadcrumbs">
            <Link href="/" className="link1">
              Ana sayfa
            </Link>
            <span>/</span>
            <span>{badge}</span>
          </Reveal>
          {description && (
            <p className="theme-description mx-auto">{description}</p>
          )}
          {children}
        </div>
      </section>
    );
  return (
    <section className="section-hero v1">
      <div
        className="hero-image theme-gradient-background"
        aria-hidden="true"
      />
      <div className="container">
        <Reveal className="content-wrap text-center">
          <div className="sub fw-semibold">
            <Sparkles size={18} />
            {badge}
          </div>
          <h1 className="title text-display-2 fw-semibold d-flex gap-20 justify-content-center flex-wrap">
            <span className="text-gradient-1">{title}</span>
            <span className="title-icon" aria-hidden="true">
              <span className="box" />
              <span className="title-icon-wrap">
                {decorations.map((number, index) => (
                  <Image
                    key={number}
                    src={`/aigocy-original/images/item/item-${number}.svg`}
                    alt=""
                    width={100}
                    height={100}
                    unoptimized
                    className={`img-${index + 1} img-transform-3`}
                  />
                ))}
              </span>
            </span>
          </h1>
          {description && <p className="text">{description}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
export function ThemeImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return src && src !== failed ? (
    <Image
      src={safeHref(src, "/aigocy-original/images/item/earth.png")}
      alt={alt}
      width={1200}
      height={800}
      unoptimized
      priority={priority}
      className={className}
      onError={() => setFailed(src)}
    />
  ) : (
    <div
      className={`theme-media-placeholder ${className}`}
      role="img"
      aria-label={alt}
    >
      <Sparkles size={52} strokeWidth={1} />
      <span>{alt}</span>
    </div>
  );
}
export function ThemeIcon({
  name,
  size = 32,
}: {
  name?: string;
  size?: number;
}) {
  const Icon =
    (
      {
        compass: Compass,
        users: Users,
        award: Award,
        book: BookOpen,
        sparkles: Sparkles,
      } as const
    )[name as "compass"] || Sparkles;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}
export function Feedback({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return error ? (
    <div role="alert" className="theme-feedback container">
      {error}
      <button type="button" onClick={retry}>
        Tekrar dene
      </button>
    </div>
  ) : null;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="theme-empty">{children}</div>;
}
export function FaqAccordion({ items }: { items: ThemeFaq[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const reduced = useReducedMotion();
  return (
    <div className="accordion-faq_list theme-faq-list">
      {items.map((faq, index) => (
        <Reveal key={faq.id} delay={Math.min(index * 0.05, 0.25)}>
          <article className="accordion-faq_item">
            <h3>
              <button
                type="button"
                className={`accordion-action ${open === faq.id ? "" : "collapsed"}`}
                aria-expanded={open === faq.id}
                aria-controls={`faq-${faq.id}`}
                onClick={() => setOpen(open === faq.id ? null : faq.id)}
              >
                <span className="accordion-title">{faq.question}</span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {open === faq.id && (
                <motion.div
                  id={`faq-${faq.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3 }}
                  className="accordion-content theme-faq-answer"
                >
                  <p>{plain(faq.answer)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
