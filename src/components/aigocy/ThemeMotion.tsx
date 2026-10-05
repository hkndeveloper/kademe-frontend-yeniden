"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Legacy application/detail forms retain their handlers. Apply the template's
// viewport reveal to their cards without adding jQuery DOM mutations to React.
export function ThemeMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.querySelector(".aigocy-site");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const cards = new Set<HTMLElement>();
    const animations = new Set<Animation>();
    const decorations = new Map<HTMLElement, Animation>();
    let frame = 0;
    const updateDecorations = () => {
      frame = 0;
      decorations.forEach((animation, element) => {
        const progress = Math.min(
          1,
          Math.max(
            0,
            (window.innerHeight * 0.6 - element.getBoundingClientRect().top) /
              Math.max(1, window.innerHeight * 0.1),
          ),
        );
        animation.currentTime = progress * 1000;
      });
    };
    const queueDecorations = () => {
      if (!frame) frame = requestAnimationFrame(updateDecorations);
    };
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            const animation = card.animate(
              [
                { opacity: 0, transform: "translateY(50px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 1000, easing: "cubic-bezier(.215,.61,.355,1)" },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
            observer.unobserve(card);
          }
        }),
      { threshold: 0.06 },
    );
    const scan = () => {
      root
        .querySelectorAll<HTMLElement>(".kdm-public-card,[data-theme-card]")
        .forEach((card) => {
          if (!cards.has(card) && card.getBoundingClientRect().height > 0) {
            cards.add(card);
            observer.observe(card);
          }
        });
      root
        .querySelectorAll<HTMLElement>(".img-transform-3")
        .forEach((element) => {
          if (decorations.has(element)) return;
          const animation = element.animate(
            [{ translate: "0px 0px" }, { translate: "-20px -20px" }],
            { duration: 1000, fill: "both", easing: "linear" },
          );
          animation.pause();
          decorations.set(element, animation);
        });
      queueDecorations();
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(root, { childList: true, subtree: true });
    window.addEventListener("scroll", queueDecorations, { passive: true });
    window.addEventListener("resize", queueDecorations, { passive: true });
    return () => {
      mutations.disconnect();
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      decorations.forEach((animation) => animation.cancel());
      window.removeEventListener("scroll", queueDecorations);
      window.removeEventListener("resize", queueDecorations);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);
  return null;
}
