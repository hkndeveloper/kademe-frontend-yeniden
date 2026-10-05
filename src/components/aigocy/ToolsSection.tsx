"use client";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { safeHref, type ThemeItem } from "@/lib/aigocy";
import { Heading, ThemeButton, ThemeIcon, ThemeImage } from "./Primitives";

export function ToolsSection({
  items,
  title,
  description,
}: {
  items: ThemeItem[];
  title: string;
  description: string;
}) {
  const ref = useRef<HTMLElement>(null),
    reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);
  return (
    <section
      ref={ref}
      className="section-tools flat-spacing theme-template-tools"
    >
      {items.slice(0, 6).map((item, index) => (
        <motion.a
          key={item.id}
          href={safeHref(item.href)}
          className={`img-${index + 1} theme-tool-symbol`}
          style={{ y: reduced ? 0 : y }}
          aria-label={item.title}
        >
          {item.image_url ? (
            <ThemeImage src={item.image_url} alt="" />
          ) : (
            <ThemeIcon name={item.icon} size={44} />
          )}
        </motion.a>
      ))}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-5 col-md-8 text-center">
            <Heading
              center
              badge="Ekosistem"
              title={title}
              description={description}
            />
            <ThemeButton href="/projects">Projeleri keşfet</ThemeButton>
          </div>
        </div>
      </div>
    </section>
  );
}
